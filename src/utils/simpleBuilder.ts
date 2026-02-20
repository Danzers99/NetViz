/**
 * Simple Topology Builder
 * Builds network topology from SimpleBuildConfig (role-based, no port selection)
 */

import type { Device, Room, RoomType, DeviceType, Port } from '../types';
import type { SimpleBuildConfig, BuildResult, BuildError } from './connectionTypes';
import { DEVICE_DEFINITIONS } from '../data/deviceDefinitions';
import { PortAllocator } from './portAllocator';

// Room colors
const ROOM_COLORS: Record<RoomType, string> = {
    office: '#ef4444',
    kitchen: '#3b82f6',
    dining: '#22c55e',
    bar: '#f97316',
    storage: '#6b7280',
};

// Generate unique device ID
function generateDeviceId(type: DeviceType, index: number): string {
    return `${type}-${Date.now()}-${index}`;
}

// Generate ports for a device
function generatePorts(type: DeviceType, deviceId: string): Port[] {
    const def = DEVICE_DEFINITIONS[type];
    if (!def) return [];

    return def.ports.map((portDef) => ({
        id: `${deviceId}-${portDef.id}`,
        name: portDef.label, // Required by Port interface and validation logic
        role: portDef.role,
        connectedTo: null,
    }));
}

/**
 * Build topology from simplified configuration
 */
export function buildSimpleTopology(config: SimpleBuildConfig): BuildResult | BuildError {
    const allocator = new PortAllocator();
    let deviceIndex = 0;

    // Collect rooms from devices
    const roomTypes = new Set<RoomType>();
    roomTypes.add('office'); // Always have office for infrastructure

    for (const dev of config.devices) {
        roomTypes.add(dev.room);
    }

    // Build rooms with grid layout
    const rooms: Room[] = [];
    const roomsArray = Array.from(roomTypes);
    const cols = Math.ceil(Math.sqrt(roomsArray.length));
    const roomWidth = 16;
    const roomHeight = 14;
    const roomSpacing = 2;

    roomsArray.forEach((type, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        rooms.push({
            id: `room-${Date.now()}-${index}`,
            type,
            name: type.charAt(0).toUpperCase() + type.slice(1),
            x: col * (roomWidth + roomSpacing),
            y: row * (roomHeight + roomSpacing),
            width: roomWidth,
            height: roomHeight,
            color: ROOM_COLORS[type],
        });
    });

    const roomById = new Map(rooms.map(r => [r.type, r]));
    const officeRoom = roomById.get('office')!;

    // === CREATE INFRASTRUCTURE ===
    const devices: Device[] = [];
    const connections: [string, string][] = [];

    // 1. ISP Modem (always created, office room)
    const ispId = generateDeviceId('isp-modem', deviceIndex++);
    const ispModem: Device = {
        id: ispId,
        type: 'isp-modem',
        name: 'ISP Modem',
        position: [0, 0, 0], // Will be positioned later
        roomId: officeRoom.id,
        ports: generatePorts('isp-modem', ispId),
        status: 'online',
    };
    devices.push(ispModem);

    // 2. Router (user-selected type)
    const routerId = generateDeviceId(config.routerType, deviceIndex++);
    const router: Device = {
        id: routerId,
        type: config.routerType,
        name: config.routerType === 'zyxel-router' ? 'ZyXEL Router' : 'Cradlepoint Router',
        position: [0, 0, 0],
        roomId: officeRoom.id,
        ports: generatePorts(config.routerType, routerId),
        status: 'online', // Will be powered
        wifiHosting: {
            enabled: true,
            configs: [{
                ssid: `cake-${Date.now() % 100000}`,
                password: 'cake10000',
                hidden: false,
                security: 'WPA2-PSK',
            }],
        },
    };
    devices.push(router);

    // Connect Router WAN to ISP Modem LAN
    const routerWanPort = router.ports.find(p => p.role === 'wan');
    const ispLanPort = ispModem.ports.find(p => p.role === 'lan');
    if (routerWanPort && ispLanPort) {
        connections.push([routerWanPort.id, ispLanPort.id]);
    }

    // === TOPOLOGY PLANNING ===
    // Classify user devices by role
    const switchConfigs = config.devices.filter(d => d.role === 'switch');
    const endpointConfigs = config.devices.filter(d => d.role !== 'switch');
    const lanDeviceCount = endpointConfigs.length;

    // Router LAN capacity
    const routerLanPortCount = router.ports.filter(p => p.role === 'lan').length;

    // Switch capacity (generic ports; 1 consumed by uplink)
    const switchDef = DEVICE_DEFINITIONS['unmanaged-switch'];
    const switchTotalPorts = switchDef.ports.filter(p => p.role === 'generic').length;
    const switchUsablePorts = switchTotalPorts - 1; // 1 port for uplink

    // Calculate minimum number of switches needed
    // With n switches directly on router:
    //   capacity = (routerLanPorts - n) + n * switchUsablePorts
    //            = routerLanPorts + n * (switchUsablePorts - 1)
    //   Solve: n >= (lanDeviceCount - routerLanPorts) / (switchUsablePorts - 1)
    let totalSwitchCount: number;
    if (lanDeviceCount <= routerLanPortCount && switchConfigs.length === 0) {
        totalSwitchCount = 0;
    } else if (lanDeviceCount <= routerLanPortCount) {
        // Devices fit on router, but user explicitly added switches
        totalSwitchCount = switchConfigs.length;
    } else {
        const denominator = Math.max(switchUsablePorts - 1, 1); // guard div-by-zero
        const minSwitchesNeeded = Math.ceil(
            (lanDeviceCount - routerLanPortCount) / denominator
        );
        totalSwitchCount = Math.max(switchConfigs.length, minSwitchesNeeded);
    }

    // How many switches connect directly to router vs daisy-chain
    const directSwitchCount = Math.min(totalSwitchCount, routerLanPortCount);
    // Router ports remaining for direct device connections
    const routerPortsForDevices = routerLanPortCount - directSwitchCount;
    // How many extra switches to auto-spawn beyond user-added ones
    const autoSwitchesToSpawn = Math.max(0, totalSwitchCount - switchConfigs.length);

    // === CREATE SWITCHES ===
    const deviceIdMap = new Map<string, string>();
    const switches: Device[] = [];

    // Create user-specified switches
    for (const simpleDevice of switchConfigs) {
        const room = roomById.get(simpleDevice.room) || officeRoom;
        const id = generateDeviceId(simpleDevice.type, deviceIndex++);
        const device: Device = {
            id,
            type: simpleDevice.type,
            name: simpleDevice.name,
            position: [0, 0, 0],
            roomId: room.id,
            ports: generatePorts(simpleDevice.type, id),
            status: 'online',
        };
        devices.push(device);
        switches.push(device);
        deviceIdMap.set(simpleDevice.id, id);
    }

    // Auto-spawn additional switches if needed
    for (let i = 0; i < autoSwitchesToSpawn; i++) {
        const id = generateDeviceId('unmanaged-switch', deviceIndex++);
        const device: Device = {
            id,
            type: 'unmanaged-switch',
            name: `Switch ${switches.length + 1}`,
            position: [0, 0, 0],
            roomId: officeRoom.id,
            ports: generatePorts('unmanaged-switch', id),
            status: 'online',
        };
        devices.push(device);
        switches.push(device);
    }

    // === CONNECT ALL SWITCHES TO NETWORK ===
    // Every switch gets an uplink BEFORE any devices are distributed
    for (let i = 0; i < switches.length; i++) {
        const sw = switches[i];

        if (i < directSwitchCount) {
            // Direct uplink to router LAN port
            const routerLanPort = allocator.getNextAvailablePort(routerId, config.routerType, ['lan']);
            const switchPort = allocator.getNextAvailablePort(sw.id, sw.type, ['generic']);
            if (routerLanPort && switchPort) {
                const rPort = router.ports.find(p => p.id.endsWith(`-${routerLanPort.portId}`));
                const sPort = sw.ports.find(p => p.id.endsWith(`-${switchPort.portId}`));
                if (rPort && sPort) {
                    connections.push([rPort.id, sPort.id]);
                    allocator.allocatePort(routerId, routerLanPort.portId);
                    allocator.allocatePort(sw.id, switchPort.portId);
                }
            }
        } else {
            // Daisy-chain: connect to the last directly-connected switch
            const upstreamSwitch = switches[directSwitchCount - 1];
            const prevPort = allocator.getNextAvailablePort(upstreamSwitch.id, upstreamSwitch.type, ['generic']);
            const newPort = allocator.getNextAvailablePort(sw.id, sw.type, ['generic']);
            if (prevPort && newPort) {
                const pPort = upstreamSwitch.ports.find(p => p.id.endsWith(`-${prevPort.portId}`));
                const nPort = sw.ports.find(p => p.id.endsWith(`-${newPort.portId}`));
                if (pPort && nPort) {
                    connections.push([pPort.id, nPort.id]);
                    allocator.allocatePort(upstreamSwitch.id, prevPort.portId);
                    allocator.allocatePort(sw.id, newPort.portId);
                }
            }
        }
    }

    // === DISTRIBUTE DEVICES ===
    // Track how many devices connected directly to router
    let routerDirectCount = 0;

    // Helper: get next connection target for a device
    // Priority: fill remaining router LAN ports, then switch ports
    function getConnectionTarget(): { device: Device; deviceId: string } | null {
        // 1. Router still has reserved direct-device ports available
        if (routerDirectCount < routerPortsForDevices) {
            return { device: router, deviceId: routerId };
        }

        // 2. Fill switches in order
        for (const sw of switches) {
            if (!allocator.isDeviceFull(sw.id, sw.type)) {
                return { device: sw, deviceId: sw.id };
            }
        }

        return null;
    }

    // Create endpoints and connect them
    for (const simpleDevice of endpointConfigs) {
        const room = roomById.get(simpleDevice.room) || officeRoom;
        const id = generateDeviceId(simpleDevice.type, deviceIndex++);
        const isAP = simpleDevice.role === 'ap';

        const device: Device = {
            id,
            type: simpleDevice.type,
            name: simpleDevice.name,
            position: [0, 0, 0],
            roomId: room.id,
            ports: generatePorts(simpleDevice.type, id),
            status: 'online',
            ...(isAP ? {
                wifiHosting: {
                    enabled: true,
                    configs: [{
                        ssid: `c0090-${11540000 + deviceIndex}`,
                        password: `cake${10000 + deviceIndex}`,
                        hidden: true,
                        security: 'WPA2-PSK'
                    }]
                }
            } : {})
        };

        devices.push(device);
        deviceIdMap.set(simpleDevice.id, id);

        // Special handling for Access Points – PoE injector chain
        if (isAP) {
            const poeId = generateDeviceId('poe-injector', deviceIndex++);
            const poeInjector: Device = {
                id: poeId,
                type: 'poe-injector',
                name: `PoE for ${simpleDevice.name}`,
                position: [0, 0, 0],
                roomId: room.id,
                ports: generatePorts('poe-injector', poeId),
                status: 'online',
            };
            devices.push(poeInjector);

            // AP ETH → PoE OUT
            const apPort = device.ports.find(p => p.role === 'poe_client');
            const poeOutPort = poeInjector.ports.find(p => p.role === 'poe_source');
            if (apPort && poeOutPort) {
                connections.push([apPort.id, poeOutPort.id]);
            }

            // PoE LAN IN → network target (smart allocation)
            const poeLanPort = poeInjector.ports.find(p => p.role === 'uplink');
            if (poeLanPort) {
                const target = getConnectionTarget();
                if (target) {
                    const targetPortInfo = allocator.getNextAvailablePort(
                        target.deviceId,
                        target.device.type,
                        target.device.type === config.routerType ? ['lan'] : ['generic']
                    );
                    if (targetPortInfo) {
                        const tPort = target.device.ports.find(p => p.id.endsWith(`-${targetPortInfo.portId}`));
                        if (tPort) {
                            connections.push([poeLanPort.id, tPort.id]);
                            allocator.allocatePort(target.deviceId, targetPortInfo.portId);
                            if (target.deviceId === routerId) routerDirectCount++;
                        }
                    }
                }
            }

            continue; // AP fully wired via PoE
        }

        // Regular endpoint: determine connection target
        let target: { device: Device; deviceId: string } | null = null;

        if (simpleDevice.connectTo && deviceIdMap.has(simpleDevice.connectTo)) {
            // Explicit connection target
            const tId = deviceIdMap.get(simpleDevice.connectTo)!;
            const tDev = devices.find(d => d.id === tId);
            target = tDev ? { device: tDev, deviceId: tId } : getConnectionTarget();
        } else {
            target = getConnectionTarget();
        }

        // Make the connection
        if (target) {
            const sourcePort = device.ports.find(p =>
                p.role === 'access' || p.role === 'lan' || p.role === 'generic' ||
                p.role === 'poe_client' || p.role === 'uplink'
            );

            const targetPortInfo = allocator.getNextAvailablePort(
                target.deviceId,
                target.device.type,
                target.device.type === config.routerType ? ['lan'] : ['generic']
            );

            if (sourcePort && targetPortInfo) {
                const tPort = target.device.ports.find(p => p.id.endsWith(`-${targetPortInfo.portId}`));
                if (tPort) {
                    connections.push([sourcePort.id, tPort.id]);
                    allocator.allocatePort(target.deviceId, targetPortInfo.portId);
                    if (target.deviceId === routerId) routerDirectCount++;
                }
            }
        }
    }

    // === CREATE POWER OUTLETS ===
    // Group devices by room
    const devicesByRoom = new Map<string, Device[]>();
    for (const device of devices) {
        const def = DEVICE_DEFINITIONS[device.type];
        if (def?.powerModel?.requiresPower && def.powerModel.powerSource === 'outlet') {
            const roomId = device.roomId || officeRoom.id;
            if (!devicesByRoom.has(roomId)) {
                devicesByRoom.set(roomId, []);
            }
            devicesByRoom.get(roomId)!.push(device);
        }
    }

    // Create outlets per room
    for (const [roomId, roomDevices] of devicesByRoom) {
        const outletCount = Math.ceil(roomDevices.length / 4);
        // const _room = rooms.find(r => r.id === roomId); // Used for potential debug

        for (let i = 0; i < outletCount; i++) {
            const outletId = generateDeviceId('power-outlet', deviceIndex++);
            const outlet: Device = {
                id: outletId,
                type: 'power-outlet',
                name: `Power Outlet`,
                position: [0, 0, 0],
                roomId: roomId,
                ports: generatePorts('power-outlet', outletId),
                status: 'online',
            };
            devices.push(outlet);

            // Connect devices to this outlet
            const devicesToConnect = roomDevices.slice(i * 4, (i + 1) * 4);
            let outletPortIndex = 0;

            for (const device of devicesToConnect) {
                const powerPort = device.ports.find(p => p.role === 'power_input');
                const outletPort = outlet.ports[outletPortIndex];

                if (powerPort && outletPort) {
                    connections.push([powerPort.id, outletPort.id]);
                    outletPortIndex++;
                }
            }
        }
    }

    // === LAYOUT DEVICES ===
    const layoutedDevices = layoutDevicesInRooms(devices, rooms);

    return {
        devices: layoutedDevices,
        rooms,
        connections,
    };
}

/**
 * Layout devices within rooms with proper positioning and clamping
 */
function layoutDevicesInRooms(devices: Device[], rooms: Room[]): Device[] {
    // Group by room
    const devicesByRoom = new Map<string | null, Device[]>();
    for (const device of devices) {
        const roomId = device.roomId || null;
        if (!devicesByRoom.has(roomId)) {
            devicesByRoom.set(roomId, []);
        }
        devicesByRoom.get(roomId)!.push(device);
    }

    const result: Device[] = [];
    const padding = 2.5;

    for (const [roomId, roomDevices] of devicesByRoom) {
        const room = roomId ? rooms.find(r => r.id === roomId) : null;

        if (!room) {
            // No room - stack devices at origin
            roomDevices.forEach((device, i) => {
                result.push({
                    ...device,
                    position: [-15 + i * 2, 0, 0],
                });
            });
            continue;
        }

        // Room bounds with padding
        // IMPORTANT: RoomNode uses centered PlaneGeometry, so room.x/room.y is the CENTER
        // not the corner. We need to calculate actual world bounds from center.
        const halfW = room.width / 2;
        const halfH = room.height / 2;
        const left = room.x - halfW + padding;
        const right = room.x + halfW - padding;
        const top = room.y - halfH + padding;
        const bottom = room.y + halfH - padding;
        const centerX = room.x;

        // Categorize devices
        const getDef = (d: Device) => DEVICE_DEFINITIONS[d.type];
        const modems = roomDevices.filter(d => getDef(d)?.capabilities?.isModem);
        const routers = roomDevices.filter(d => getDef(d)?.capabilities?.isRouter);
        const switches = roomDevices.filter(d => getDef(d)?.capabilities?.isSwitch);
        const endpoints = roomDevices.filter(d => getDef(d)?.capabilities?.isEndpoint);
        const outlets = roomDevices.filter(d => getDef(d)?.capabilities?.isOutlet);

        // Use direct capability checks for 'others' to avoid potential array errors
        const others = roomDevices.filter(d => {
            const caps = getDef(d)?.capabilities;
            return !caps?.isModem &&
                !caps?.isRouter &&
                !caps?.isSwitch &&
                !caps?.isEndpoint &&
                !caps?.isOutlet;
        });

        // Layout rows
        const infraDevices = [...modems, ...routers, ...switches, ...others];
        const rowSpacing = 3;

        // Infrastructure row (top)
        let currentZ = top + 1;
        if (infraDevices.length > 0) {
            const spacing = Math.min(3, (right - left) / Math.max(infraDevices.length, 1));
            infraDevices.forEach((device, i) => {
                const x = clamp(
                    centerX + (i - (infraDevices.length - 1) / 2) * spacing,
                    left, right
                );
                result.push({
                    ...device,
                    position: [x, 0, currentZ],
                });
            });
            currentZ += rowSpacing;
        }

        // Endpoints row (center-bottom)
        if (endpoints.length > 0) {
            currentZ = (top + bottom) / 2;
            const spacing = Math.min(3, (right - left) / Math.max(endpoints.length, 1));
            endpoints.forEach((device, i) => {
                const x = clamp(
                    centerX + (i - (endpoints.length - 1) / 2) * spacing,
                    left, right
                );
                result.push({
                    ...device,
                    position: [x, 0, currentZ],
                });
            });
        }

        // Outlets row (bottom right)
        if (outlets.length > 0) {
            const outletX = right - 1;
            const outletZ = bottom - 1;
            outlets.forEach((device, i) => {
                result.push({
                    ...device,
                    position: [clamp(outletX - i * 2, left, right), 0, outletZ],
                });
            });
        }
    }

    return result;
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Check if result is an error
 */
export function isSimpleBuildError(result: BuildResult | BuildError): result is BuildError {
    return 'message' in result;
}
