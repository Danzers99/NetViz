import type { Device, Room, RoomType, Port, DeviceType } from '../types';
import type { ConnectionBuildConfig, DeviceSpec, BuildResult, BuildError, ValidationIssue } from './connectionTypes';
import { DEVICE_DEFINITIONS, getDeviceDefinition } from '../data/deviceDefinitions';

/**
 * Parse text format into ConnectionBuildConfig
 * 
 * Format:
 * DeviceName (device-type) [room-type]
 * PortName → TargetDevice
 * PortName → (blank)
 * 
 * Example:
 * ZyXEL (zyxel-router) [office]
 * WAN → ISP
 * LAN1 → Switch A
 * 
 * Switch A (unmanaged-switch) [office]
 * Port 1 → ZyXEL
 */
export function parseTextFormat(text: string): ConnectionBuildConfig | BuildError {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const devices: DeviceSpec[] = [];
    let currentDevice: DeviceSpec | null = null;

    // Device header pattern: "DeviceName (device-type)" or "DeviceName (device-type) [room]"
    const deviceHeaderPattern = /^(.+?)\s*\(([a-z0-9-]+)\)(?:\s*\[([a-z]+)\])?$/i;
    // Connection pattern: "PortName → TargetDevice" or "PortName -> TargetDevice"
    const connectionPattern = /^(.+?)\s*(?:→|->)\s*(.*)$/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Try to match device header
        const headerMatch = line.match(deviceHeaderPattern);
        if (headerMatch) {
            // Save previous device if exists
            if (currentDevice) {
                devices.push(currentDevice);
            }

            const [, name, typeStr, roomStr] = headerMatch;
            const type = typeStr.toLowerCase();

            // Validate device type
            if (!DEVICE_DEFINITIONS[type as keyof typeof DEVICE_DEFINITIONS]) {
                return {
                    message: `Unknown device type: "${type}"`,
                    deviceName: name.trim(),
                    line: lineNum
                };
            }

            // Validate room type if provided
            const validRooms: RoomType[] = ['kitchen', 'dining', 'office', 'bar', 'storage'];
            let room: RoomType | undefined;
            if (roomStr) {
                const roomLower = roomStr.toLowerCase() as RoomType;
                if (!validRooms.includes(roomLower)) {
                    return {
                        message: `Unknown room type: "${roomStr}". Valid: ${validRooms.join(', ')}`,
                        deviceName: name.trim(),
                        line: lineNum
                    };
                }
                room = roomLower;
            }

            currentDevice = {
                name: name.trim(),
                type: type as DeviceType,
                room,
                connections: []
            };
            continue;
        }

        // Try to match connection
        const connMatch = line.match(connectionPattern);
        if (connMatch) {
            if (!currentDevice) {
                return {
                    message: `Connection defined before any device header`,
                    line: lineNum
                };
            }

            const [, portName, targetStr] = connMatch;
            const target = targetStr.trim();

            // Validate port names - block invalid WAN2, WAN3, etc. for routers
            const portNameLower = portName.trim().toLowerCase();
            if (portNameLower.match(/^wan\d+$/i) && portNameLower !== 'wan1') {
                const def = getDeviceDefinition(currentDevice.type);
                if (def.capabilities.isRouter) {
                    return {
                        message: `Invalid port "${portName}" - routers have only one WAN port`,
                        deviceName: currentDevice.name,
                        portName: portName.trim(),
                        line: lineNum
                    };
                }
            }

            currentDevice.connections.push({
                sourcePort: portName.trim(),
                targetDevice: target.length === 0 || target.toLowerCase() === '(blank)' ? null : target
            });
            continue;
        }

        // Unknown line format
        return {
            message: `Could not parse line: "${line}"`,
            line: lineNum
        };
    }

    // Don't forget the last device
    if (currentDevice) {
        devices.push(currentDevice);
    }

    if (devices.length === 0) {
        return { message: 'No devices defined in input' };
    }

    return { devices };
}

/**
 * Generate unique device ID
 */
function generateDeviceId(type: string, index: number): string {
    return `${type}-${Date.now()}-${index}`;
}

/**
 * Generate ports for a device based on its definition
 */
function generatePorts(type: string, deviceId: string): Port[] {
    const def = getDeviceDefinition(type as DeviceType);
    return def.ports.map(portDef => ({
        id: `${deviceId}-${portDef.id}`,
        name: portDef.label,
        role: portDef.role,
        connectedTo: null,
        linkStatus: 'down' as const
    }));
}

/**
 * Find a port by name (case-insensitive, partial match)
 */
function findPortByName(device: Device, portName: string): Port | undefined {
    const normalizedSearch = portName.toLowerCase().replace(/\s+/g, '');

    // Exact match first
    let port = device.ports.find(p =>
        p.name.toLowerCase().replace(/\s+/g, '') === normalizedSearch
    );
    if (port) return port;

    // Partial match (e.g., "LAN1" matches "LAN 1")
    port = device.ports.find(p => {
        const normalized = p.name.toLowerCase().replace(/\s+/g, '');
        return normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized);
    });
    if (port) return port;

    // Try matching by ID suffix (e.g., "lan1" matches port with id "...-lan1")
    port = device.ports.find(p => {
        const idSuffix = p.id.split('-').pop()?.toLowerCase() || '';
        return idSuffix === normalizedSearch || normalizedSearch.includes(idSuffix);
    });

    return port;
}

/**
 * Find first available (unconnected) port on a device that can connect to the source port
 */
function findAvailablePort(device: Device, preferredRole?: string): Port | undefined {
    // First try to find an unconnected port with matching role
    if (preferredRole) {
        const port = device.ports.find(p =>
            p.connectedTo === null && p.role === preferredRole
        );
        if (port) return port;
    }

    // Find any unconnected data port (not power)
    return device.ports.find(p =>
        p.connectedTo === null &&
        p.role !== 'power_input' &&
        p.role !== 'power_source'
    );
}

/**
 * Build rooms from device specifications
 */
function buildRooms(config: ConnectionBuildConfig): Room[] {
    const roomTypes = new Set<RoomType>();

    // Collect unique room types from devices
    for (const device of config.devices) {
        if (device.room) {
            roomTypes.add(device.room);
        }
    }

    // Always ensure office room exists (for ISP modem and infra)
    roomTypes.add('office');

    // Add explicit rooms from config
    if (config.rooms) {
        for (const roomSpec of config.rooms) {
            roomTypes.add(roomSpec.type);
        }
    }

    // Create room objects with layout positions
    const rooms: Room[] = [];
    const roomColors: Record<RoomType, string> = {
        office: '#ef4444',   // Red
        kitchen: '#3b82f6',  // Blue
        dining: '#22c55e',   // Green
        bar: '#f97316',      // Orange
        storage: '#6b7280',  // Gray
    };

    // Grid layout for rooms
    const roomsArray = Array.from(roomTypes);
    const cols = Math.ceil(Math.sqrt(roomsArray.length));
    const roomWidth = 14;  // Slightly larger for outlets
    const roomHeight = 12;
    const roomSpacing = 2;

    roomsArray.forEach((type, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);

        // Find custom name if provided in config
        const roomSpec = config.rooms?.find(r => r.type === type);
        const name = roomSpec?.name || type.charAt(0).toUpperCase() + type.slice(1);

        rooms.push({
            id: `room-${Date.now()}-${index}`,
            type,
            name,
            x: col * (roomWidth + roomSpacing),
            y: row * (roomHeight + roomSpacing),
            width: roomWidth,
            height: roomHeight,
            color: roomColors[type]
        });
    });

    return rooms;
}

/**
 * Layout devices within their assigned rooms
 * Devices are positioned in rows with proper spacing inside room bounds
 */
function layoutDevices(devices: Device[], rooms: Room[]): Device[] {
    // Group devices by room
    const devicesByRoom = new Map<string | null, Device[]>();

    for (const device of devices) {
        const roomId = device.roomId || null;
        if (!devicesByRoom.has(roomId)) {
            devicesByRoom.set(roomId, []);
        }
        devicesByRoom.get(roomId)!.push(device);
    }

    const layoutedDevices: Device[] = [];

    // Layout devices in each room
    for (const [roomId, roomDevices] of devicesByRoom) {
        const room = roomId ? rooms.find(r => r.id === roomId) : null;

        // Room bounds with padding (room coordinates are in 3D: x horizontal, z depth)
        const padding = 2;
        const roomLeft = room ? room.x + padding : -20;
        const roomRight = room ? room.x + room.width - padding : -5;
        const roomTop = room ? room.y + padding : -5;
        const roomBottom = room ? room.y + room.height - padding : 10;

        const roomCenterX = (roomLeft + roomRight) / 2;
        const availableWidth = roomRight - roomLeft;
        const availableHeight = roomBottom - roomTop;

        // Get device definition helper
        const getDef = (d: Device) => getDeviceDefinition(d.type);

        // Categorize devices
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

        // Combine infrastructure and network devices
        const infraDevices = [...modems, ...routers, ...switches, ...others];

        // Layout infrastructure row at top of room
        if (infraDevices.length > 0) {
            const rowZ = roomTop + 1;
            const spacing = Math.max(2.5, availableWidth / Math.max(infraDevices.length, 1));
            infraDevices.forEach((device, i) => {
                const x = roomCenterX + (i - (infraDevices.length - 1) / 2) * Math.min(spacing, 3);
                layoutedDevices.push({
                    ...device,
                    position: [x, 0, rowZ]
                });
            });
        }

        // Layout endpoint row at bottom of room
        if (endpoints.length > 0) {
            const rowZ = roomBottom - 1;
            const spacing = Math.max(2.5, availableWidth / Math.max(endpoints.length, 1));
            endpoints.forEach((device, i) => {
                const x = roomCenterX + (i - (endpoints.length - 1) / 2) * Math.min(spacing, 3);
                layoutedDevices.push({
                    ...device,
                    position: [x, 0, rowZ]
                });
            });
        }

        // Layout outlets on right side of room (inside bounds)
        if (outlets.length > 0) {
            const outletX = roomRight - 1;
            const centerZ = (roomTop + roomBottom) / 2;
            const spacing = Math.min(2, availableHeight / Math.max(outlets.length + 1, 2));
            outlets.forEach((outlet, i) => {
                const offsetZ = (i - (outlets.length - 1) / 2) * spacing;
                layoutedDevices.push({
                    ...outlet,
                    position: [outletX, 0, centerZ + offsetZ]
                });
            });
        }
    }

    return layoutedDevices;
}

/**
 * Validate configuration and return issues (non-blocking)
 */
export function validateConfig(config: ConnectionBuildConfig): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for routers
    const routers = config.devices.filter(d => {
        const def = getDeviceDefinition(d.type);
        return def.capabilities.isRouter;
    });

    // Check if any router has WAN → ISP connection
    const hasISPConnection = routers.some(router =>
        router.connections.some(conn =>
            conn.sourcePort.toLowerCase().includes('wan') &&
            conn.targetDevice?.toLowerCase() === 'isp'
        )
    );

    if (routers.length > 0 && !hasISPConnection) {
        issues.push({
            type: 'warning',
            message: 'Router WAN not connected to ISP - will auto-connect',
            deviceName: routers[0].name
        });
    }

    // Check for switches without uplink
    const switches = config.devices.filter(d => {
        const def = getDeviceDefinition(d.type);
        return def.capabilities.isSwitch;
    });

    for (const sw of switches) {
        const hasUplink = sw.connections.some(conn => {
            const targetDef = config.devices.find(d => d.name.toLowerCase() === conn.targetDevice?.toLowerCase());
            if (!targetDef) return false;
            const def = getDeviceDefinition(targetDef.type);
            return def.capabilities.isRouter;
        });

        if (!hasUplink && sw.connections.length === 0) {
            issues.push({
                type: 'warning',
                message: 'Switch has no uplink to router',
                deviceName: sw.name
            });
        }
    }

    // Check for WAN connections to non-ISP devices (error)
    for (const device of config.devices) {
        const def = getDeviceDefinition(device.type);
        if (def.capabilities.isRouter) {
            for (const conn of device.connections) {
                if (conn.sourcePort.toLowerCase() === 'wan' && conn.targetDevice) {
                    const targetLower = conn.targetDevice.toLowerCase();
                    if (targetLower !== 'isp' && targetLower !== 'isp modem') {
                        // Check if target is a switch
                        const targetDevice = config.devices.find(d => d.name.toLowerCase() === targetLower);
                        if (targetDevice) {
                            const targetDef = getDeviceDefinition(targetDevice.type);
                            if (targetDef.capabilities.isSwitch) {
                                issues.push({
                                    type: 'error',
                                    message: `WAN port should connect to ISP, not to switch "${conn.targetDevice}"`,
                                    deviceName: device.name
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // Check for isolated devices
    for (const device of config.devices) {
        if (device.connections.length === 0) {
            const def = getDeviceDefinition(device.type);
            // Mobile devices are okay without connections
            if (!def.capabilities.isMobile) {
                issues.push({
                    type: 'info',
                    message: 'Device has no connections defined',
                    deviceName: device.name
                });
            }
        }
    }

    return issues;
}

/**
 * Build complete topology from configuration
 */
export function buildTopology(config: ConnectionBuildConfig): BuildResult | BuildError {
    // Check for blocking validation errors
    const issues = validateConfig(config);
    const blockingErrors = issues.filter(i => i.type === 'error');
    if (blockingErrors.length > 0) {
        return {
            message: blockingErrors[0].message,
            deviceName: blockingErrors[0].deviceName
        };
    }

    // Create rooms first
    const rooms = buildRooms(config);
    const roomByType = new Map(rooms.map(r => [r.type, r]));
    const officeRoom = roomByType.get('office')!;

    // Create devices
    const devices: Device[] = [];
    const deviceByName = new Map<string, Device>();
    let deviceIndex = 0;

    // === FIX #2: Auto-insert ISP Modem ===    // Check if any router is defined
    const routers = config.devices.filter(d => {
        const def = getDeviceDefinition(d.type);
        return def.capabilities.isRouter;
    });

    // Create ISP Modem if we have routers (always needed for internet)
    let ispModem: Device | null = null;
    if (routers.length > 0) {
        const ispId = generateDeviceId('isp-modem', deviceIndex++);
        ispModem = {
            id: ispId,
            type: 'isp-modem',
            name: 'ISP Modem',
            position: [0, 0, 0],
            roomId: officeRoom.id,
            ports: generatePorts('isp-modem', ispId),
            status: 'online', // ISP modem is always online (magic power)
            wifiHosting: {
                enabled: false,
                configs: []
            }
        };
        devices.push(ispModem);
        deviceByName.set('isp modem', ispModem);
        deviceByName.set('isp', ispModem); // Also map "ISP" to the modem
    }

    // First pass: create all user-defined devices
    for (const spec of config.devices) {
        const id = generateDeviceId(spec.type, deviceIndex++);
        const room = spec.room ? roomByType.get(spec.room) : officeRoom;

        const device: Device = {
            id,
            type: spec.type,
            name: spec.name,
            position: [0, 0, 0], // Will be set by layout
            roomId: room?.id || null,
            ports: generatePorts(spec.type, id),
            status: 'offline' // Will be set to online after power connection
        };

        // Add wifi hosting for routers/APs
        const def = getDeviceDefinition(spec.type);
        if (def.capabilities.wifiHosting) {
            device.wifiHosting = {
                enabled: true,
                configs: [{
                    ssid: `c0090-${11540000 + deviceIndex}`,
                    password: `cake10000`,
                    hidden: true,
                    security: 'WPA2-PSK'
                }]
            };
        }

        // Add wireless for mobile devices
        if (def.capabilities.isMobile) {
            device.wireless = { ssid: '', password: '' };
            device.connectionState = 'disconnected';
        }

        devices.push(device);
        deviceByName.set(spec.name.toLowerCase(), device);
    }

    // === FIX #1: Auto-create power outlets ===
    // Group devices by room and count power needs
    const powerNeedsByRoom = new Map<string, Device[]>();

    for (const device of devices) {
        const def = getDeviceDefinition(device.type);
        if (def.powerModel.requiresPower && def.powerModel.powerSource === 'outlet') {
            const roomId = device.roomId || officeRoom.id;
            if (!powerNeedsByRoom.has(roomId)) {
                powerNeedsByRoom.set(roomId, []);
            }
            powerNeedsByRoom.get(roomId)!.push(device);
        }
    }

    // Create outlets for each room
    const outlets: Device[] = [];
    for (const [roomId, devicesNeedingPower] of powerNeedsByRoom) {
        const outletCount = Math.ceil(devicesNeedingPower.length / 4); // 4 ports per outlet

        for (let i = 0; i < outletCount; i++) {
            const outletId = generateDeviceId('power-outlet', deviceIndex++);
            const outlet: Device = {
                id: outletId,
                type: 'power-outlet',
                name: `Power Outlet ${outlets.length + 1}`,
                position: [0, 0, 0],
                roomId: roomId,
                ports: generatePorts('power-outlet', outletId),
                status: 'online' // Outlets are always online (magic power)
            };
            outlets.push(outlet);
            devices.push(outlet);
            deviceByName.set(outlet.name.toLowerCase(), outlet);
        }
    }

    // Layout devices (including outlets)
    const layoutedDevices = layoutDevices(devices, rooms);

    // Build connections array
    const connections: [string, string][] = [];

    // === FIX #1 continued: Connect power ===
    // Track outlet usage per room
    const outletUsage = new Map<string, { outlet: Device; usedPorts: number }[]>();

    for (const outlet of outlets) {
        const roomId = outlet.roomId || officeRoom.id;
        if (!outletUsage.has(roomId)) {
            outletUsage.set(roomId, []);
        }
        outletUsage.get(roomId)!.push({ outlet, usedPorts: 0 });
    }

    // Connect power for each device
    for (const device of layoutedDevices) {
        const def = getDeviceDefinition(device.type);
        if (def.powerModel.requiresPower && def.powerModel.powerSource === 'outlet') {
            const roomId = device.roomId || officeRoom.id;
            const roomOutlets = outletUsage.get(roomId);

            if (roomOutlets) {
                // Find outlet with available port
                for (const usage of roomOutlets) {
                    if (usage.usedPorts < 4) { // 4 ports per outlet
                        // Find device's power input port
                        const powerPort = device.ports.find(p => p.role === 'power_input');
                        // Find outlet's available power source port
                        const outletDevice = layoutedDevices.find(d => d.id === usage.outlet.id)!;
                        const outletPort = outletDevice.ports[usage.usedPorts];

                        if (powerPort && outletPort) {
                            connections.push([powerPort.id, outletPort.id]);
                            usage.usedPorts++;
                        }
                        break;
                    }
                }
            }
        }
    }

    // === FIX #2 continued: Connect router WAN to ISP Modem ===
    if (ispModem) {
        const ispDevice = layoutedDevices.find(d => d.id === ispModem!.id)!;
        const ispLanPort = ispDevice.ports.find(p => p.role === 'lan');

        for (const spec of config.devices) {
            const def = getDeviceDefinition(spec.type);
            if (def.capabilities.isRouter) {
                const routerDevice = layoutedDevices.find(d => d.name.toLowerCase() === spec.name.toLowerCase())!;
                const wanPort = routerDevice.ports.find(p => p.role === 'wan');

                // Check if user specified WAN → ISP
                const hasExplicitISPConn = spec.connections.some(c =>
                    c.sourcePort.toLowerCase() === 'wan' &&
                    c.targetDevice?.toLowerCase() === 'isp'
                );

                // Auto-connect if explicit or no WAN connection specified
                const hasAnyWanConn = spec.connections.some(c =>
                    c.sourcePort.toLowerCase() === 'wan'
                );

                if (wanPort && ispLanPort && (hasExplicitISPConn || !hasAnyWanConn)) {
                    connections.push([wanPort.id, ispLanPort.id]);
                }
            }
        }
    }

    // Second pass: resolve user-defined connections
    for (const spec of config.devices) {
        const sourceDevice = deviceByName.get(spec.name.toLowerCase());
        if (!sourceDevice) continue;

        // Find the layouted version
        const device = layoutedDevices.find(d => d.id === sourceDevice.id)!;

        for (const conn of spec.connections) {
            if (!conn.targetDevice) continue; // Skip blank connections

            // Skip ISP connections (already handled above)
            if (conn.targetDevice.toLowerCase() === 'isp') {
                continue;
            }

            // Find source port
            const sourcePort = findPortByName(device, conn.sourcePort);
            if (!sourcePort) {
                return {
                    message: `Port "${conn.sourcePort}" not found on device "${spec.name}"`,
                    deviceName: spec.name,
                    portName: conn.sourcePort
                };
            }

            // === FIX #3: Block WAN to non-ISP connections ===
            if (sourcePort.role === 'wan') {
                const targetLower = conn.targetDevice.toLowerCase();
                if (targetLower !== 'isp' && targetLower !== 'isp modem') {
                    const targetSpec = config.devices.find(d => d.name.toLowerCase() === targetLower);
                    if (targetSpec) {
                        const targetDef = getDeviceDefinition(targetSpec.type);
                        if (targetDef.capabilities.isSwitch) {
                            return {
                                message: `Cannot connect router WAN to switch "${conn.targetDevice}". WAN must connect to ISP. Use a LAN port instead.`,
                                deviceName: spec.name,
                                portName: conn.sourcePort
                            };
                        }
                    }
                }
            }

            // Find target device
            const targetDevice = layoutedDevices.find(
                d => d.name.toLowerCase() === conn.targetDevice!.toLowerCase() ||
                    deviceByName.get(conn.targetDevice!.toLowerCase())?.id === d.id
            );

            if (!targetDevice) {
                // Auto-create as unknown device
                const id = generateDeviceId('unknown', deviceIndex++);
                const unknownDevice: Device = {
                    id,
                    type: 'unknown',
                    name: conn.targetDevice,
                    position: [0, 0, 0],
                    roomId: device.roomId,
                    ports: generatePorts('unknown', id),
                    status: 'offline'
                };
                layoutedDevices.push(unknownDevice);
                deviceByName.set(conn.targetDevice.toLowerCase(), unknownDevice);

                // Connect to the unknown device
                const targetPort = findAvailablePort(unknownDevice, sourcePort.role);
                if (targetPort) {
                    connections.push([sourcePort.id, targetPort.id]);
                }
                continue;
            }

            // Find target port
            let targetPort: Port | undefined;
            if (conn.targetPort) {
                targetPort = findPortByName(targetDevice, conn.targetPort);
            } else {
                // Auto-select an available port
                targetPort = findAvailablePort(targetDevice, sourcePort.role);
            }

            if (!targetPort) {
                return {
                    message: `No available port on "${conn.targetDevice}" to connect from "${spec.name}/${conn.sourcePort}"`,
                    deviceName: spec.name,
                    portName: conn.sourcePort
                };
            }

            // Check if this connection already exists (from the other side)
            const existingConn = connections.find(([a, b]) =>
                (a === sourcePort.id && b === targetPort!.id) ||
                (a === targetPort!.id && b === sourcePort.id)
            );

            if (!existingConn) {
                connections.push([sourcePort.id, targetPort.id]);
            }
        }
    }

    return {
        devices: layoutedDevices,
        rooms,
        connections
    };
}

/**
 * Check if a BuildResult or BuildError is an error
 */
export function isBuildError(result: BuildResult | BuildError): result is BuildError {
    return 'message' in result;
}
