import { create } from 'zustand';
import { validateNetwork } from './validation';
import { propagatePowerState, updateLinkStatuses, updateConnectionStates } from './utils/simulation';
import type { ValidationError } from './validation';
import type { Device, DeviceType, Port, Settings, DeviceAction, ConfigData } from './types';
import { migrateConfig, validateAndSanitizeConfig, CURRENT_SCHEMA_VERSION, loadSettingsFromStorage, saveSettingsToStorage } from './utils/persistence';

interface AppState {
    step: 'wizard' | 'sandbox';
    settings: Settings;
    deviceCounts: Record<DeviceType, number>;
    devices: Device[];
    selectedPortId: string | null;
    selectedDeviceId: string | null;
    isDraggingDevice: boolean;
    validationErrors: ValidationError[];

    setDeviceCount: (type: DeviceType, count: number) => void;
    updateSettings: (settings: Partial<Settings>) => void;
    generateSandbox: () => void;
    updateDevicePosition: (id: string, position: [number, number, number]) => void;
    updateDevice: (id: string, updates: Partial<Device>) => void;
    connectPorts: (portIdA: string, portIdB: string) => void;
    disconnectPort: (portId: string) => void;
    selectPort: (portId: string | null) => void;
    selectDevice: (deviceId: string | null) => void;
    setDraggingDevice: (dragging: boolean) => void;
    reset: () => void;

    // Hover/Tracing State
    hoveredElement: { type: 'port' | 'cable'; id: string } | null;
    highlightedPorts: Set<string>;
    highlightedCables: Set<string>;
    highlightedDevices: Set<string>;
    setHoveredElement: (element: { type: 'port' | 'cable'; id: string } | null) => void;
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
}

const generatePorts = (type: DeviceType, deviceId: string): Port[] => {
    const ports: Port[] = [];

    switch (type) {
        case 'isp-modem':
            ports.push({ id: `${deviceId}-wan`, name: 'ISP/Coax', role: 'wan', connectedTo: null, linkStatus: 'down' });
            ports.push({ id: `${deviceId}-lan`, name: 'LAN', role: 'lan', connectedTo: null, linkStatus: 'down' });
            break;
        case 'zyxel-router':
        case 'cradlepoint-router':
            ports.push({ id: `${deviceId}-wan`, name: 'WAN', role: 'wan', connectedTo: null, linkStatus: 'down' });
            for (let i = 1; i <= 4; i++) {
                ports.push({ id: `${deviceId}-lan${i}`, name: `LAN ${i}`, role: 'lan', connectedTo: null, linkStatus: 'down' });
            }
            ports.push({ id: `${deviceId}-pwr`, name: 'Power', role: 'power_input', connectedTo: null, linkStatus: 'down' });
            break;
        case 'managed-switch':
        case 'unmanaged-switch':
            for (let i = 1; i <= 8; i++) {
                ports.push({ id: `${deviceId}-p${i}`, name: `Port ${i}`, role: 'generic', connectedTo: null, linkStatus: 'down' });
            }
            ports.push({ id: `${deviceId}-pwr`, name: 'Power', role: 'power_input', connectedTo: null, linkStatus: 'down' });
            break;
        case 'access-point':
        case 'datto-ap62':
            ports.push({ id: `${deviceId}-eth`, name: 'ETH', role: 'poe_client', connectedTo: null, linkStatus: 'down' });
            break;
        case 'datto-ap440':
            // AP440 requires PoE, so it uses poe_client role
            ports.push({ id: `${deviceId}-eth_poe`, name: 'ETH/PoE', role: 'poe_client', connectedTo: null, linkStatus: 'down' });
            break;
        case 'poe-injector':
            ports.push({ id: `${deviceId}-poe_out`, name: 'PoE OUT', role: 'poe_source', connectedTo: null, linkStatus: 'down' });
            ports.push({ id: `${deviceId}-lan_in`, name: 'LAN IN', role: 'uplink', connectedTo: null, linkStatus: 'down' });
            ports.push({ id: `${deviceId}-power`, name: 'POWER', role: 'power_input', connectedTo: null, linkStatus: 'down' });
            break;
        case 'power-outlet':
            // Power outlet can have multiple outlets
            for (let i = 1; i <= 4; i++) {
                ports.push({ id: `${deviceId}-outlet${i}`, name: `Outlet ${i}`, role: 'power_source', connectedTo: null, linkStatus: 'down' });
            }
            break;
        case 'pos':
        case 'datavan-pos':
        case 'poindus-pos':
        case 'v3-pos':
        case 'v4-pos':
        case 'printer':
        case 'epson-thermal':
        case 'epson-impact':
        case 'kds':
        case 'elo-kds':
            ports.push({ id: `${deviceId}-eth`, name: 'ETH', role: 'access', connectedTo: null, linkStatus: 'down' });
            ports.push({ id: `${deviceId}-pwr`, name: 'Power', role: 'power_input', connectedTo: null, linkStatus: 'down' });
            break;
        case 'orderpad':
        case 'cakepop':
            // No physical ports for these mobile devices
            break;
        case 'unknown':
            ports.push({ id: `${deviceId}-p1`, name: 'Port 1', role: 'generic', connectedTo: null, linkStatus: 'down' });
            ports.push({ id: `${deviceId}-p2`, name: 'Port 2', role: 'generic', connectedTo: null, linkStatus: 'down' });
            break;
    }
    return ports;
};

export const useAppStore = create<AppState>((set, get) => ({
    step: 'wizard',
    settings: loadSettingsFromStorage(),
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
    selectedPortId: null,
    selectedDeviceId: null,
    isDraggingDevice: false,
    validationErrors: [],

    notification: null,
    setNotification: (notification) => set({ notification }),

    hoveredElement: null,
    highlightedPorts: new Set(),
    highlightedCables: new Set(),
    highlightedDevices: new Set(),
    setDeviceCount: (type, count) =>
        set((state) => ({
            deviceCounts: { ...state.deviceCounts, [type]: count },
        })),
    updateSettings: (newSettings) =>
        set((state) => {
            const updatedSettings = { ...state.settings, ...newSettings };
            saveSettingsToStorage(updatedSettings);
            return { settings: updatedSettings };
        }),
    generateSandbox: () => {
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
        devices = updateConnectionStates(devices);

        const errors = validateNetwork(devices);
        set({ devices, step: 'sandbox', validationErrors: errors });
    },
    updateDevicePosition: (id, position) =>
        set((state) => ({
            devices: state.devices.map((d) =>
                d.id === id ? { ...d, position } : d
            ),
        })),
    updateDevice: (id, updates) =>
        set((state) => {
            let devices = state.devices.map((d) =>
                d.id === id ? { ...d, ...updates } : d
            );

            // Run simulation
            devices = propagatePowerState(devices);
            devices = updateLinkStatuses(devices);
            devices = updateConnectionStates(devices);

            const errors = validateNetwork(devices);

            return { devices, validationErrors: errors };
        }),
    connectPorts: (portIdA, portIdB) =>
        set((state) => {
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
            devices = updateConnectionStates(devices);

            const errors = validateNetwork(devices);
            return { devices, selectedPortId: null, validationErrors: errors };
        }),
    disconnectPort: (portId) =>
        set((state) => {
            // Create deep copies to ensure React detects changes
            let devices = state.devices.map(device => ({
                ...device,
                ports: device.ports.map(port => ({ ...port }))
            }));

            let targetId: string | null = null;

            // Find the port to disconnect and its connected port
            for (const device of devices) {
                const port = device.ports.find(p => p.id === portId);
                if (port) {
                    targetId = port.connectedTo;
                    port.connectedTo = null;
                    port.linkStatus = 'down';
                    break;
                }
            }

            // Disconnect the other end
            if (targetId) {
                for (const device of devices) {
                    const port = device.ports.find(p => p.id === targetId);
                    if (port) {
                        port.connectedTo = null;
                        port.linkStatus = 'down';
                        break;
                    }
                }
            }

            const errors = validateNetwork(devices);

            // Run simulation
            devices = propagatePowerState(devices);
            devices = updateLinkStatuses(devices); // Cables disconnected, so link status updates
            devices = updateConnectionStates(devices);

            return { devices, validationErrors: errors };
        }),
    selectPort: (portId) => set({ selectedPortId: portId }),
    selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),
    setDraggingDevice: (dragging) => set({ isDraggingDevice: dragging }),

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

    reset: () => set({
        step: 'wizard',
        devices: [],
        selectedPortId: null,
        selectedDeviceId: null,
        validationErrors: [],
        hoveredElement: null,
        highlightedPorts: new Set(),
        highlightedCables: new Set(),
        highlightedDevices: new Set()
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
            const existingOfType = state.devices.filter((d) => d.type === type);
            const nextIndex = existingOfType.length + 1;
            const id = `${type}-${Date.now()}`;

            const newDevice: Device = {
                id,
                type,
                name: `${type.toUpperCase().replace('-', ' ')} ${nextIndex}`,
                position: [0, 0, 0],
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
                    ['orderpad', 'cakepop', 'elo-kds'].includes(type)
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
            const finalDevices = updateConnectionStates(linkDevices);
            const errors = validateNetwork(finalDevices);

            return { devices: finalDevices, validationErrors: errors };
        }),
    removeDevice: (deviceId) =>
        set((state) => {
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
            devices = updateConnectionStates(devices);
            const errors = validateNetwork(devices);

            return {
                devices,
                validationErrors: errors,
                selectedDeviceId: state.selectedDeviceId === deviceId ? null : state.selectedDeviceId,
            };
        }),
    exportConfig: () => {
        const { settings, deviceCounts, devices } = get();
        return {
            version: CURRENT_SCHEMA_VERSION, // Use schema version
            schemaVersion: CURRENT_SCHEMA_VERSION,
            timestamp: Date.now(),
            settings,
            deviceCounts,
            devices,
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
                step: 'sandbox',
                validationErrors: errors,
                selectedPortId: null,
                selectedDeviceId: null,
            });
        } catch (error) {
            console.error('Unexpected error loading config:', error);
            alert('An unexpected error occurred while loading the configuration.');
        }
    },
}));
