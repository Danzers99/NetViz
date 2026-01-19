import { create } from 'zustand';
import { validateNetwork } from './validation';
import { getDeviceDefinition } from './data/deviceDefinitions';
import { isWifiCapable } from './utils/wifi';
import { propagatePowerState, updateLinkStatuses, updateConnectionStates, updateWirelessAssociation } from './utils/simulation';
import { getRoomAt } from './utils/geometry';
import type { ValidationError } from './validation';
import type { Device, DeviceType, Port, Settings, DeviceAction, ConfigData, ProjectInfo, Room, RoomType, Revision } from './types';
import { migrateConfig, validateAndSanitizeConfig, CURRENT_SCHEMA_VERSION, loadSettingsFromStorage, saveSettingsToStorage } from './utils/persistence';

interface AppState {
    step: 'wizard' | 'sandbox';
    settings: Settings;
    projectInfo: ProjectInfo; // Current project metadata
    deviceCounts: Record<DeviceType, number>;
    devices: Device[];
    rooms: Room[]; // Added for Layout Mode
    revisions: Revision[];
    sessionChanges: Set<string>; // Tracks categories of changes in current session
    layoutMode: boolean; // Toggle for Layout Mode
    selectedPortId: string | null;
    selectedDeviceId: string | null;
    selectedRoomId: string | null; // Track selected room
    propertiesPanelDeviceId: string | null;
    isDraggingDevice: boolean;
    isDraggingRoom: boolean;
    validationErrors: ValidationError[];

    // Multi-select & Visibility
    selectedDeviceIds: Set<string>;
    cameraTarget: [number, number, number]; // Center of screen on ground plane

    toggleShowDeviceNames: () => void;
    toggleShowRoomNames: () => void;

    // Enhanced Actions
    setCameraTarget: (target: [number, number, number]) => void;
    updateDevicePositions: (updates: Record<string, [number, number, number]>) => void; // Batch update

    setDeviceCount: (type: DeviceType, count: number) => void;
    setProjectInfo: (info: Partial<ProjectInfo>) => void;
    updateSettings: (settings: Partial<Settings>) => void;
    setUserName: (name: string) => void;
    setHasSeenIntro: (seen: boolean) => void;
    addSessionChange: (category: string) => void;
    addRevision: (revision: Revision) => void;
    generateSandbox: () => void;
    updateDevicePosition: (id: string, position: [number, number, number]) => void;
    updateDevice: (id: string, updates: Partial<Device>) => void;
    connectPorts: (portIdA: string, portIdB: string) => void;
    disconnectPort: (portId: string) => void;
    selectPort: (portId: string | null) => void;
    selectDevice: (deviceId: string | null) => void;
    toggleSelection: (deviceId: string) => void;
    clearSelection: () => void;
    selectRoom: (roomId: string | null) => void; // Action
    setPropertiesPanelDeviceId: (deviceId: string | null) => void;
    setDraggingDevice: (dragging: boolean) => void;
    reset: () => void;

    // Layout Mode Actions
    toggleLayoutMode: () => void;
    addRoom: (type: RoomType) => void;
    updateRoom: (id: string, updates: Partial<Room>) => void;
    removeRoom: (id: string) => void;
    setDraggingRoom: (dragging: boolean) => void;

    // Hover/Tracing State
    hoveredElement: { type: 'port' | 'cable' | 'room'; id: string } | null;
    highlightedPorts: Set<string>;
    highlightedCables: Set<string>;
    highlightedDevices: Set<string>;
    setHoveredElement: (element: { type: 'port' | 'cable' | 'room'; id: string } | null) => void;
    // Actions
    triggerAction: (deviceId: string, action: DeviceAction) => void;
    addDevice: (type: DeviceType) => void;
    removeDevice: (deviceId: string) => void;

    // Save/Load
    exportConfig: () => ConfigData;
    importConfig: (data: ConfigData) => void;

    // Notifications
    notification: { message: string; type: 'error' | 'success' | 'info' } | null;
    setNotification: (notification: { message: string; type: 'error' | 'success' | 'info' } | null) => void;

    // Right Panel State (Mutually Exclusive)
    isHistoryOpen: boolean;
    setHistoryOpen: (open: boolean) => void;
    isSettingsOpen: boolean;
    setSettingsOpen: (open: boolean) => void;

    // Camera
    cameraResetTrigger: number;
    triggerCameraReset: () => void;
}

export const generatePorts = (type: DeviceType, deviceId: string): Port[] => {
    const def = getDeviceDefinition(type);
    return def.ports.map(p => ({
        id: `${deviceId}-${p.id}`,
        name: p.label,
        role: p.role,
        connectedTo: null,
        linkStatus: 'down'
    }));
};

export const useAppStore = create<AppState>((set, get) => ({
    step: 'wizard',
    settings: {
        showDeviceNames: true,
        showRoomNames: true,
        ...loadSettingsFromStorage()
    },
    projectInfo: {
        name: 'New Project',
        createdAt: new Date().toISOString()
    },
    deviceCounts: {
        'isp-modem': 1,
        'zyxel-router': 1,
        'cradlepoint-router': 0,
        'managed-switch': 0,
        'unmanaged-switch': 1,
        'access-point': 0,
        'datto-ap440': 0,
        'datto-ap62': 0,
        'poe-injector': 0,
        'power-outlet': 1,
        'pos': 0,
        'datavan-pos': 0,
        'poindus-pos': 0,
        'v3-pos': 0,
        'v4-pos': 1,
        'printer': 0,
        'epson-thermal': 1,
        'epson-impact': 1,
        'kds': 0,
        'elo-kds': 0,
        'orderpad': 0,
        'cakepop': 0,
        'unknown': 0,
    },
    devices: [],
    rooms: [], // Initialize rooms
    revisions: [],
    sessionChanges: new Set(),
    isHistoryOpen: false,
    isSettingsOpen: false,
    layoutMode: false, // Initialize layoutMode
    selectedPortId: null,
    selectedDeviceId: null,
    selectedRoomId: null,
    propertiesPanelDeviceId: null,
    isDraggingDevice: false,
    selectedDeviceIds: new Set(),
    cameraTarget: [0, 0, 0],
    validationErrors: [],

    toggleShowDeviceNames: () => set(state => {
        const newSettings = { ...state.settings, showDeviceNames: !state.settings.showDeviceNames };
        saveSettingsToStorage(newSettings);
        return { settings: newSettings };
    }),
    toggleShowRoomNames: () => set(state => {
        const newSettings = { ...state.settings, showRoomNames: !state.settings.showRoomNames };
        saveSettingsToStorage(newSettings);
        return { settings: newSettings };
    }),

    setCameraTarget: (target) => set({ cameraTarget: target }),

    setUserName: (name) => set(state => {
        const newSettings = { ...state.settings, userName: name };
        saveSettingsToStorage(newSettings);
        return { settings: newSettings };
    }),

    setHasSeenIntro: (seen) => set(state => {
        const newSettings = { ...state.settings, hasSeenIntro: seen };
        saveSettingsToStorage(newSettings);
        return { settings: newSettings };
    }),

    addSessionChange: (category) => set(state => {
        const newSet = new Set(state.sessionChanges);
        newSet.add(category);
        return { sessionChanges: newSet };
    }),

    addRevision: (revision) => set(state => ({
        revisions: [...state.revisions, revision],
        sessionChanges: new Set() // Clear session changes after commit
    })),

    updateDevicePositions: (updates) => set(state => {
        // Optimistic update for drag performance
        state.addSessionChange('Layout/Floorplan');
        return {
            devices: state.devices.map(d => {
                if (updates[d.id]) {
                    // Re-calculate room for each modified device
                    const [x, , z] = updates[d.id];
                    const room = getRoomAt(x, z, state.rooms);
                    const roomId = room ? room.id : null;
                    return { ...d, position: updates[d.id], roomId };
                }
                return d;
            })
        }
    }),

    notification: null,
    setNotification: (notification) => set({ notification }),

    cameraResetTrigger: 0,
    triggerCameraReset: () => set(state => ({ cameraResetTrigger: state.cameraResetTrigger + 1 })),

    hoveredElement: null,
    highlightedPorts: new Set(),
    highlightedCables: new Set(),
    highlightedDevices: new Set(),
    setDeviceCount: (type, count) =>
        set((state) => ({
            deviceCounts: { ...state.deviceCounts, [type]: count },
        })),
    setProjectInfo: (info) =>
        set((state) => {
            state.addSessionChange('Project Settings');
            return {
                projectInfo: { ...state.projectInfo, ...info }
            };
        }),
    updateSettings: (newSettings) =>
        set((state) => {
            const updatedSettings = { ...state.settings, ...newSettings };
            saveSettingsToStorage(updatedSettings);
            state.addSessionChange('Settings');
            return { settings: updatedSettings };
        }),
    generateSandbox: () => {
        get().addSessionChange('New Sandbox Created');
        const { deviceCounts } = get();
        const newDevices: Device[] = [];
        let idCounter = 1;
        let ssidCounter = 1;

        let x = -5;
        let z = -5;
        const spacing = 2.5;

        Object.entries(deviceCounts).forEach(([type, count]) => {
            for (let i = 0; i < count; i++) {
                const id = `${type}-${idCounter++}`;
                newDevices.push({
                    id,
                    type: type as DeviceType,
                    name: `${type.toUpperCase().replace('-', ' ')} ${i + 1}`,
                    position: [x, 0, z],
                    ports: generatePorts(type as DeviceType, id),
                    // Default to offline except for "Magic Power" devices (Modem, Outlet)
                    status: (type === 'isp-modem' || type === 'power-outlet') ? 'online' : 'offline',
                    // Initialize Wireless
                    ...(
                        ['access-point', 'datto-ap440', 'datto-ap62', 'zyxel-router', 'cradlepoint-router', 'isp-modem'].includes(type)
                            ? {
                                wifiHosting: {
                                    enabled: true,
                                    configs: [
                                        {
                                            ssid: `c0090-${11540000 + ssidCounter++}`,
                                            password: `cake${10000 + i}`,
                                            hidden: true,
                                            security: 'WPA2-PSK'
                                        }
                                    ]
                                }
                            }
                            : {}
                    ),
                    ...(
                        ['orderpad', 'cakepop'].includes(type)
                            ? {
                                wireless: { ssid: '', password: '' },
                                connectionState: 'disconnected' as const
                            }
                            : {}
                    )
                });
                x += spacing;
                if (x > 5) {
                    x = -5;
                    z += spacing;
                }
            }
        });

        // Run simulation on initial state to ensure correct status (e.g. offline if disconnected)
        let devices = newDevices;
        devices = propagatePowerState(devices);
        devices = updateLinkStatuses(devices);
        devices = updateWirelessAssociation(devices);
        devices = updateConnectionStates(devices);

        const errors = validateNetwork(devices);
        set({ devices, step: 'sandbox', validationErrors: errors, rooms: [], layoutMode: false }); // Reset rooms/mode on gen
    },
    updateDevicePosition: (id, position) =>
        set((state) => {
            state.addSessionChange('Layout/Floorplan');
            // Check if device is inside any room
            const [x, , z] = position;
            const room = getRoomAt(x, z, state.rooms);
            const roomId = room ? room.id : null;

            return {
                devices: state.devices.map((d) =>
                    d.id === id ? { ...d, position, roomId } : d
                ),
            };
        }),
    updateDevice: (id, updates) =>
        set((state) => {
            state.addSessionChange('Device Configuration');
            let devices = state.devices.map((d) =>
                d.id === id ? { ...d, ...updates } : d
            );

            // Run simulation
            devices = propagatePowerState(devices);
            devices = updateLinkStatuses(devices);
            devices = updateWirelessAssociation(devices);
            devices = updateConnectionStates(devices);

            const errors = validateNetwork(devices);

            return { devices, validationErrors: errors };
        }),
    connectPorts: (portIdA, portIdB) =>
        set((state) => {
            state.addSessionChange('Cabling/Connectivity');
            // Create deep copies to ensure React detects changes
            let devices = state.devices.map(device => ({
                ...device,
                ports: device.ports.map(port => ({ ...port }))
            }));

            let portA: Port | undefined;
            let portB: Port | undefined;
            let deviceA: typeof devices[0] | undefined;
            let deviceB: typeof devices[0] | undefined;

            // Find the ports and their devices
            for (const device of devices) {
                for (const port of device.ports) {
                    if (port.id === portIdA) {
                        portA = port;
                        deviceA = device;
                    }
                    if (port.id === portIdB) {
                        portB = port;
                        deviceB = device;
                    }
                }
            }

            if (!portA || !portB || !deviceA || !deviceB) {
                return { devices };
            }

            // Connection Validation Logic
            const isPowerPort = (role: string) => role === 'power_input' || role === 'power_source';
            const isDataPort = (role: string) => !isPowerPort(role);

            const roleA = portA.role;
            const roleB = portB.role;

            // 1. Strict Power Strip Validation (Requirement)
            // If one is power and the other is data, BLOCK.
            if ((isPowerPort(roleA) && isDataPort(roleB)) || (isDataPort(roleA) && isPowerPort(roleB))) {
                // Determine specific message
                let msg = "Cannot connect Power cable to Data port.";

                // Specific message for Power Strip
                if (deviceA.type === 'power-outlet' || deviceB.type === 'power-outlet') {
                    msg = "Power Strip only accepts power connections.";
                }

                set({ notification: { message: msg, type: 'error' } });

                // Auto-clear after 3s (or handle in component, but setting here ensures state update)
                // Actually component handles clearing usually, but we need to set it.
                return { devices }; // Return early, do not connect
            }

            // Disconnect existing connections
            if (portA.connectedTo) {
                for (const device of devices) {
                    const connectedPort = device.ports.find(p => p.id === portA.connectedTo);
                    if (connectedPort) {
                        connectedPort.connectedTo = null;
                    }
                }
            }
            if (portB.connectedTo) {
                for (const device of devices) {
                    const connectedPort = device.ports.find(p => p.id === portB.connectedTo);
                    if (connectedPort) {
                        connectedPort.connectedTo = null;
                    }
                }
            }

            // Create new connection
            portA.connectedTo = portIdB;
            // Link status will be handled by updateLinkStatuses
            // portA.linkStatus = 'up'; 
            portB.connectedTo = portIdA;
            // portB.linkStatus = 'up';

            // Run simulation
            devices = propagatePowerState(devices);
            devices = updateLinkStatuses(devices);
            devices = updateWirelessAssociation(devices);
            devices = updateConnectionStates(devices);

            const errors = validateNetwork(devices);
            return { devices, selectedPortId: null, validationErrors: errors };
        }),
    disconnectPort: (portId) =>
        set((state) => {
            state.addSessionChange('Cabling/Connectivity');
            // 1. Identify valid targets first without mutating anything
            let targetDeviceId: string | null = null;
            let targetPortId: string | null = null;
            let sourceDeviceId: string | null = null;

            // Find valid source
            for (const d of state.devices) {
                const p = d.ports.find(x => x.id === portId);
                if (p) {
                    sourceDeviceId = d.id;
                    targetPortId = p.connectedTo;
                    break;
                }
            }

            if (!sourceDeviceId || !targetPortId) return {}; // Nothing to disconnect

            // Find valid target device
            for (const d of state.devices) {
                const p = d.ports.find(x => x.id === targetPortId);
                if (p) {
                    targetDeviceId = d.id;
                    break;
                }
            }

            // 2. Create New State Immutably
            let devices = state.devices.map(d => {
                // Return new object for affected devices
                if (d.id === sourceDeviceId || d.id === targetDeviceId) {
                    return {
                        ...d,
                        ports: d.ports.map(p => {
                            // Clear Source Port
                            if (p.id === portId) {
                                return { ...p, connectedTo: null, linkStatus: 'down' as const };
                            }
                            // Clear Target Port
                            if (p.id === targetPortId) {
                                return { ...p, connectedTo: null, linkStatus: 'down' as const };
                            }
                            return p;
                        })
                    };
                }
                return d;
            });

            // 3. Re-run Simulation
            devices = propagatePowerState(devices);
            devices = updateLinkStatuses(devices);
            devices = updateWirelessAssociation(devices);
            devices = updateConnectionStates(devices);

            const errors = validateNetwork(devices);

            return { devices, validationErrors: errors };
        }),
    selectPort: (portId) => set({ selectedPortId: portId }),
    selectDevice: (deviceId) => set(() => {
        // Multi-select logic would go here if we passed a modifier flag to selectDevice
        // For now, simpler implementation:
        // If shift key usage is handled at component level, we might need a separate toggleSelection action
        // But to keep interface clean, let's assume this is single select unless we add a new action.

        // Revised plan: We need to support toggle.
        // Actually, let's just make a new action or update this one if we can pass the modifier.
        // Since we can't easily change signature in useAppStore without updating callsites...
        // Let's rely on a separate 'toggleSelectDevice' or 'setSelection' if needed.
        // BUT, for now, let's implement standard single select here and handle multi in components using a new action?
        // No, let's just use `selectedDeviceId` as "Primary" and sync `selectedDeviceIds`.

        const newSet = new Set<string>();
        if (deviceId) newSet.add(deviceId);
        return { selectedDeviceId: deviceId, selectedDeviceIds: newSet };
    }),
    toggleSelection: (deviceId: string) => set(state => {
        const newSet = new Set(state.selectedDeviceIds);
        if (newSet.has(deviceId)) {
            newSet.delete(deviceId);
        } else {
            newSet.add(deviceId);
        }
        // Update primary selected ID to the last one added, or null
        const last = Array.from(newSet).pop() || null;
        return { selectedDeviceIds: newSet, selectedDeviceId: last };
    }),
    clearSelection: () => set({ selectedDeviceIds: new Set(), selectedDeviceId: null }),
    selectRoom: (roomId) => set({ selectedRoomId: roomId }),
    setDraggingDevice: (dragging) => set({ isDraggingDevice: dragging }),

    // Layout Mode Actions
    toggleLayoutMode: () => set((state) => ({ layoutMode: !state.layoutMode })),
    addRoom: (type) => set((state) => {
        state.addSessionChange('Layout/Floorplan');
        const id = `room-${Date.now()}`;
        const defaultSizes = {
            width: 10,
            height: 10,
        };
        const defaultColors: Record<RoomType, string> = {
            office: '#ef4444', // Red
            kitchen: '#3b82f6', // Blue
            dining: '#22c55e', // Green
            bar: '#f97316', // Orange
            storage: '#6b7280', // Gray
        };

        const newRoom: Room = {
            id,
            type,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
            x: 0,
            y: 0,
            width: defaultSizes.width,
            height: defaultSizes.height,
            color: defaultColors[type]
        };

        return { rooms: [...state.rooms, newRoom], selectedRoomId: id };
    }),
    updateRoom: (id, updates) => set((state) => {
        state.addSessionChange('Layout/Floorplan');
        return {
            rooms: state.rooms.map((r) => r.id === id ? { ...r, ...updates } : r)
        };
    }),
    removeRoom: (id) => set((state) => {
        state.addSessionChange('Layout/Floorplan');
        return {
            rooms: state.rooms.filter((r) => r.id !== id),
            selectedRoomId: state.selectedRoomId === id ? null : state.selectedRoomId,
            // Optional: clear roomId from devices in this room?
            devices: state.devices.map(d => d.roomId === id ? { ...d, roomId: null } : d)
        };
    }),

    // UI State for interaction
    isDraggingRoom: false,
    setDraggingRoom: (dragging: boolean) => set({ isDraggingRoom: dragging }),

    setHoveredElement: (element) => {
        set((state) => {
            if (!element) {
                return {
                    hoveredElement: null,
                    highlightedPorts: new Set(),
                    highlightedCables: new Set(),
                    highlightedDevices: new Set()
                };
            }

            // Calculate connected component (BFS)
            const visitedPorts = new Set<string>();
            const visitedCables = new Set<string>();
            const visitedDevices = new Set<string>();
            const queue: string[] = [];

            // Initialize queue based on element
            if (element.type === 'port') {
                queue.push(element.id);
            } else if (element.type === 'cable') {
                // Cable ID is "portA-portB"
                const [pA, pB] = element.id.split('-');
                queue.push(pA, pB);
                visitedCables.add(element.id); // Add self
                visitedCables.add(`${pB}-${pA}`); // Add reverse just in case
            } else if (element.type === 'room') {
                // Rooms don't highlight networks
                return {
                    hoveredElement: element,
                    highlightedPorts: new Set(),
                    highlightedCables: new Set(),
                    highlightedDevices: new Set()
                };
            }

            const devices = state.devices;

            // Helper to get device by port ID
            const getDeviceByPort = (portId: string) => devices.find(d => d.ports.some(p => p.id === portId));

            while (queue.length > 0) {
                const portId = queue.shift()!;
                if (visitedPorts.has(portId)) continue;
                visitedPorts.add(portId);

                const device = getDeviceByPort(portId);
                if (device) visitedDevices.add(device.id);

                // Find port object
                let port: any = null;
                if (device) port = device.ports.find(p => p.id === portId);
                if (!port) continue;

                if (port.connectedTo) {
                    const neighborId = port.connectedTo;
                    if (!visitedPorts.has(neighborId)) {
                        queue.push(neighborId);
                        // Add cable to highlight
                        // Cables.tsx generates ID as `${port.id}-${port.connectedTo}`
                        visitedCables.add(`${port.id}-${neighborId}`);
                        visitedCables.add(`${neighborId}-${port.id}`);
                    }
                }
            }

            return {
                hoveredElement: element,
                highlightedPorts: visitedPorts,
                highlightedCables: visitedCables,
                highlightedDevices: visitedDevices
            };
        });
    },

    setHistoryOpen: (open) => set({
        isHistoryOpen: open,
        // If opening history, close properties and settings
        ...(open ? { propertiesPanelDeviceId: null, isSettingsOpen: false } : {})
    }),

    setPropertiesPanelDeviceId: (id: string | null) => set({
        propertiesPanelDeviceId: id,
        // If opening properties, close history and settings
        ...(id ? { isHistoryOpen: false, isSettingsOpen: false } : {})
    }),

    setSettingsOpen: (open: boolean) => set({
        isSettingsOpen: open,
        // If opening settings, close history and properties
        ...(open ? { isHistoryOpen: false, propertiesPanelDeviceId: null } : {})
    }),

    reset: () => set({
        step: 'wizard',
        devices: [],
        rooms: [],
        revisions: [],
        sessionChanges: new Set(),
        layoutMode: false,
        selectedPortId: null,
        selectedDeviceId: null,
        selectedRoomId: null,
        propertiesPanelDeviceId: null,
        validationErrors: [],
        hoveredElement: null,
        highlightedPorts: new Set(),
        highlightedCables: new Set(),
        highlightedDevices: new Set(),
        projectInfo: { // Reset project info default
            name: 'New Project',
            createdAt: new Date().toISOString()
        }
    }),

    triggerAction: (deviceId, action) => {
        const { updateDevice } = get();
        const devices = get().devices;
        const device = devices.find(d => d.id === deviceId);
        if (!device) return;

        // Helper to schedule status change
        const scheduleStatus = (status: Device['status'], delayMs: number) => {
            setTimeout(() => {
                updateDevice(deviceId, { status });
            }, delayMs);
        };

        switch (action) {
            case 'reboot':
                // Booting -> Online
                updateDevice(deviceId, { status: 'booting' });
                scheduleStatus('online', 10000); // 10s boot
                break;
            case 'power_off':
                updateDevice(deviceId, { status: 'offline' });
                break;
            case 'power_on':
                updateDevice(deviceId, { status: 'booting' });
                scheduleStatus('online', 10000);
                break;
            case 'power_cycle':
                // Offline -> Booting -> Online
                updateDevice(deviceId, { status: 'offline' });
                scheduleStatus('booting', 2000); // 2s off
                setTimeout(() => {
                    scheduleStatus('online', 10000); // 10s boot
                }, 2000);
                break;
        }
    },
    addDevice: (type) =>
        set((state) => {
            state.addSessionChange('Device Inventory');
            const existingOfType = state.devices.filter((d) => d.type === type);
            const nextIndex = existingOfType.length + 1;
            const id = `${type}-${Date.now()}`;

            const newDevice: Device = {
                id,
                type,
                name: `${type.toUpperCase().replace('-', ' ')} ${nextIndex}`,
                position: state.cameraTarget || [0, 0, 0], // Use camera target
                ports: generatePorts(type, id),
                status: (type === 'isp-modem' || type === 'power-outlet') ? 'online' : 'offline',
                ...(
                    ['access-point', 'datto-ap440', 'datto-ap62', 'zyxel-router', 'cradlepoint-router', 'isp-modem'].includes(type)
                        ? {
                            wifiHosting: {
                                enabled: true,
                                configs: [
                                    {
                                        ssid: `c0090-${11540000 + Math.floor(Date.now() % 10000)}`, // Use timestamp for uniqueness in addDevice
                                        password: `cake${10000 + nextIndex}`,
                                        hidden: true,
                                        security: 'WPA2-PSK'
                                    }
                                ]
                            }
                        }
                        : {}
                ),
                ...(
                    isWifiCapable(type)
                        ? {
                            wireless: { ssid: '', password: '' },
                            connectionState: 'disconnected' as const
                        }
                        : {}
                )
            };

            const devices = [...state.devices, newDevice];

            // Run simulation/validation
            const updatedDevices = propagatePowerState(devices);
            const linkDevices = updateLinkStatuses(updatedDevices);
            const wifiDevices = updateWirelessAssociation(linkDevices);
            const finalDevices = updateConnectionStates(wifiDevices);
            const errors = validateNetwork(finalDevices);

            return { devices: finalDevices, validationErrors: errors };
        }),
    removeDevice: (deviceId) =>
        set((state) => {
            state.addSessionChange('Device Inventory');
            const deviceToRemove = state.devices.find((d) => d.id === deviceId);
            if (!deviceToRemove) return {};

            // Get IDs of all ports on this device to check connections against
            const removingPortIds = new Set(deviceToRemove.ports.map((p) => p.id));

            // Filter out the device
            let devices = state.devices.filter((d) => d.id !== deviceId);

            // Disconnect other devices that were connected to this one
            devices = devices.map((d) => ({
                ...d,
                ports: d.ports.map((p) => {
                    if (p.connectedTo && removingPortIds.has(p.connectedTo)) {
                        return { ...p, connectedTo: null, linkStatus: 'down' as const };
                    }
                    return p;
                }),
            }));

            // Re-run simulation
            devices = propagatePowerState(devices);
            devices = updateLinkStatuses(devices);
            devices = updateWirelessAssociation(devices);
            devices = updateConnectionStates(devices);
            const errors = validateNetwork(devices);

            return {
                devices,
                validationErrors: errors,
                selectedDeviceId: state.selectedDeviceId === deviceId ? null : state.selectedDeviceId,
                selectedPortId: (state.selectedPortId && removingPortIds.has(state.selectedPortId)) ? null : state.selectedPortId,
            };
        }),
    exportConfig: () => {
        const { settings, deviceCounts, devices, rooms, projectInfo, revisions } = get();
        return {
            version: CURRENT_SCHEMA_VERSION, // Use schema version
            schemaVersion: CURRENT_SCHEMA_VERSION,
            timestamp: Date.now(),
            settings,
            deviceCounts,
            devices,
            rooms, // Export Rooms
            revisions: revisions || [],
            projectInfo: {
                ...projectInfo,
                updatedAt: new Date().toISOString()
            }
        };
    },
    importConfig: (data: ConfigData) => {
        try {
            // 1. Migration
            const migratedData = migrateConfig(data);

            // 2. Validation & Sanitization (includes re-simulation)
            const result = validateAndSanitizeConfig(migratedData);

            if (!result.valid || !result.cleanedData) {
                console.error('Import failed:', result.error);
                alert(`Failed to load configuration: ${result.error}`);
                return;
            }

            const cleanData = result.cleanedData;

            // 3. Update State
            const errors = validateNetwork(cleanData.devices);

            set({
                settings: cleanData.settings,
                deviceCounts: cleanData.deviceCounts,
                devices: cleanData.devices,
                rooms: cleanData.rooms || [], // Import Rooms
                revisions: cleanData.revisions || [],
                projectInfo: cleanData.projectInfo, // Load project info
                step: 'sandbox',
                validationErrors: errors,
                selectedPortId: null,
                selectedDeviceId: null,
                selectedRoomId: null,
                propertiesPanelDeviceId: null,
                layoutMode: false,
            });
        } catch (error) {
            console.error('Unexpected error loading config:', error);
            alert('An unexpected error occurred while loading the configuration.');
        }
    },
}));
