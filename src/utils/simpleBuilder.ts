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

    // === CREATE USER DEVICES ===
    // Map simple device IDs to created device IDs
    const deviceIdMap = new Map<string, string>();

    // First pass: create switches
    const switches: Device[] = [];
    for (const simpleDevice of config.devices) {
        if (simpleDevice.role !== 'switch') continue;

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

    // Connect first switch to router LAN 1
    if (switches.length > 0) {
        const mainSwitch = switches[0];
        const routerLanPort = allocator.getNextAvailablePort(routerId, config.routerType, ['lan']);
        const switchPort = allocator.getNextAvailablePort(mainSwitch.id, mainSwitch.type, ['generic']);

        if (routerLanPort && switchPort) {
            const routerPort = router.ports.find(p => p.id.endsWith(`-${routerLanPort.portId}`));
            const swPort = mainSwitch.ports.find(p => p.id.endsWith(`-${switchPort.portId}`));
            if (routerPort && swPort) {
                connections.push([routerPort.id, swPort.id]);
                allocator.allocatePort(routerId, routerLanPort.portId);
                allocator.allocatePort(mainSwitch.id, switchPort.portId);
            }
        }
    }

    // Second pass: create endpoints and connect them
    for (const simpleDevice of config.devices) {
        if (simpleDevice.role === 'switch') continue;

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

        // Special handling for Access Points - need PoE injector chain
        if (isAP) {
            // Create PoE injector for this AP
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

            // Connect AP to PoE injector (AP ETH → PoE OUT)
            const apPort = device.ports.find(p => p.role === 'poe_client');
            const poeOutPort = poeInjector.ports.find(p => p.role === 'poe_source');
            if (apPort && poeOutPort) {
                connections.push([apPort.id, poeOutPort.id]);
            }

            // Connect PoE injector to switch (PoE LAN IN → Switch port)
            const poeLanPort = poeInjector.ports.find(p => p.role === 'uplink');
            if (poeLanPort && switches.length > 0) {
                const targetSwitch = switches[0];
                const switchPortInfo = allocator.getNextAvailablePort(targetSwitch.id, targetSwitch.type, ['generic']);
                if (switchPortInfo) {
                    const swPort = targetSwitch.ports.find(p => p.id.endsWith(`-${switchPortInfo.portId}`));
                    if (swPort) {
                        connections.push([poeLanPort.id, swPort.id]);
                        allocator.allocatePort(targetSwitch.id, switchPortInfo.portId);
                    }
                }
            } else if (poeLanPort) {
                // No switch - connect to router LAN
                const routerLanInfo = allocator.getNextAvailablePort(routerId, config.routerType, ['lan']);
                if (routerLanInfo) {
                    const rPort = router.ports.find(p => p.id.endsWith(`-${routerLanInfo.portId}`));
                    if (rPort) {
                        connections.push([poeLanPort.id, rPort.id]);
                        allocator.allocatePort(routerId, routerLanInfo.portId);
                    }
                }
            }

            // AP is fully wired via PoE - skip normal connection logic
            continue;
        }

        // Determine connection target
        let targetDevice: Device | null = null;
        let targetDeviceId: string | null = null;

        if (simpleDevice.connectTo && deviceIdMap.has(simpleDevice.connectTo)) {
            // Connect to specified switch
            targetDeviceId = deviceIdMap.get(simpleDevice.connectTo)!;
            targetDevice = devices.find(d => d.id === targetDeviceId) || null;
        } else if (switches.length > 0) {
            // Auto-connect to first switch with available port
            for (const sw of switches) {
                if (!allocator.isDeviceFull(sw.id, sw.type)) {
                    targetDevice = sw;
                    targetDeviceId = sw.id;
                    break;
                }
            }

            // All switches full - create a new one
            if (!targetDevice) {
                const newSwitchId = generateDeviceId('unmanaged-switch', deviceIndex++);
                const newSwitch: Device = {
                    id: newSwitchId,
                    type: 'unmanaged-switch',
                    name: `Switch ${switches.length + 1}`,
                    position: [0, 0, 0],
                    roomId: room.id,
                    ports: generatePorts('unmanaged-switch', newSwitchId),
                    status: 'online',
                };
                devices.push(newSwitch);
                switches.push(newSwitch);
                targetDevice = newSwitch;
                targetDeviceId = newSwitchId;

                // Connect new switch to previous switch (cascade)
                const prevSwitch = switches[switches.length - 2];
                const prevPort = allocator.getNextAvailablePort(prevSwitch.id, prevSwitch.type, ['generic']);
                const newPort = allocator.getNextAvailablePort(newSwitchId, 'unmanaged-switch', ['generic']);

                if (prevPort && newPort) {
                    const pPort = prevSwitch.ports.find(p => p.id.endsWith(`-${prevPort.portId}`));
                    const nPort = newSwitch.ports.find(p => p.id.endsWith(`-${newPort.portId}`));
                    if (pPort && nPort) {
                        connections.push([pPort.id, nPort.id]);
                        allocator.allocatePort(prevSwitch.id, prevPort.portId);
                        allocator.allocatePort(newSwitchId, newPort.portId);
                    }
                }
            }
        } else {
            // No switches - connect to router LAN
            targetDevice = router;
            targetDeviceId = routerId;
        }

        // Make the connection
        if (targetDevice && targetDeviceId) {
            // Find source port (ETH port for endpoints)
            // Roles: access (POS/printers/KDS), poe_client (AP), lan, generic, uplink
            const sourcePort = device.ports.find(p =>
                p.role === 'access' || p.role === 'lan' || p.role === 'generic' ||
                p.role === 'poe_client' || p.role === 'uplink'
            );

            // Find target port
            const targetPortInfo = allocator.getNextAvailablePort(
                targetDeviceId,
                targetDevice.type,
                targetDevice.type === config.routerType ? ['lan'] : ['generic']
            );

            if (sourcePort && targetPortInfo) {
                const tPort = targetDevice.ports.find(p => p.id.endsWith(`-${targetPortInfo.portId}`));
                if (tPort) {
                    connections.push([sourcePort.id, tPort.id]);
                    allocator.allocatePort(targetDeviceId, targetPortInfo.portId);
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
