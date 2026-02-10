import type { Device, PortRole } from '../types';

/**
 * Returns true if the port role represents a power-only connection.
 * Power ports MUST NOT be traversed for data path tracing or packet flow.
 */
export function isPowerPort(role: PortRole): boolean {
    return role === 'power_input' || role === 'power_source';
}

/**
 * Returns true if the port role can carry data traffic.
 * Includes PoE ports (poe_source / poe_client) which carry data + power.
 */
export function isDataCapablePort(role: PortRole): boolean {
    return !isPowerPort(role);
}

/**
 * BFS to find shortest DATA-ONLY path from a device to the nearest isp-modem.
 * Power-only links (power_input ↔ power_source) are never traversed.
 * Returns array of cable IDs (portA-portB format) in order from device → modem.
 * Returns empty array if no data path exists.
 */
export function findPathToModem(
    deviceId: string,
    devices: Device[]
): string[] {
    // Build port-to-device lookup AND port-to-port-object lookup
    const portToDevice = new Map<string, Device>();
    const portById = new Map<string, { role: PortRole }>();
    for (const d of devices) {
        for (const p of d.ports) {
            portToDevice.set(p.id, d);
            portById.set(p.id, { role: p.role });
        }
    }

    // BFS from the source device
    const visited = new Set<string>();
    // Queue entries: [currentDeviceId, pathOfCableIds[]]
    const queue: [string, string[]][] = [[deviceId, []]];
    visited.add(deviceId);

    while (queue.length > 0) {
        const [currentId, path] = queue.shift()!;
        const currentDevice = devices.find(d => d.id === currentId);
        if (!currentDevice) continue;

        // Check if we reached a modem
        if (currentDevice.type === 'isp-modem' && currentId !== deviceId) {
            return path;
        }

        // Explore neighbors via connected DATA ports only
        for (const port of currentDevice.ports) {
            if (!port.connectedTo) continue;

            // SEMANTIC CHECK: skip power-only ports
            if (isPowerPort(port.role)) continue;

            // Also check the target port — both ends must be data-capable
            const targetPortInfo = portById.get(port.connectedTo);
            if (targetPortInfo && isPowerPort(targetPortInfo.role)) continue;

            const neighborDevice = portToDevice.get(port.connectedTo);
            if (!neighborDevice || visited.has(neighborDevice.id)) continue;

            visited.add(neighborDevice.id);

            // Cable ID format matches Cables.tsx: `${port.id}-${port.connectedTo}`
            const cableId = `${port.id}-${port.connectedTo}`;
            queue.push([neighborDevice.id, [...path, cableId]]);
        }
    }

    return []; // No data path found
}

/**
 * Find cable IDs for DATA-ONLY links connected to a device + 1-hop neighbors.
 * Power-only links are excluded. Prioritizes uplink-role ports. Capped at maxLinks.
 */
export function findNeighborLinks(
    deviceId: string,
    devices: Device[],
    maxLinks: number = 8
): string[] {
    const portToDevice = new Map<string, Device>();
    const portById = new Map<string, { role: PortRole }>();
    for (const d of devices) {
        for (const p of d.ports) {
            portToDevice.set(p.id, d);
            portById.set(p.id, { role: p.role });
        }
    }

    const device = devices.find(d => d.id === deviceId);
    if (!device) return [];

    const cableIds: string[] = [];
    const neighborDeviceIds = new Set<string>();

    // Sort ports: uplink/wan first for priority, exclude power ports
    const sortedPorts = [...device.ports]
        .filter(p => isDataCapablePort(p.role))
        .sort((a, b) => {
            const priority = (role: string) => {
                if (role === 'wan' || role === 'uplink') return 0;
                if (role === 'lan') return 1;
                return 2;
            };
            return priority(a.role) - priority(b.role);
        });

    // Direct connections from selected device (data ports only)
    for (const port of sortedPorts) {
        if (!port.connectedTo || cableIds.length >= maxLinks) break;

        // Check target port is also data-capable
        const targetPortInfo = portById.get(port.connectedTo);
        if (targetPortInfo && isPowerPort(targetPortInfo.role)) continue;

        const neighborDevice = portToDevice.get(port.connectedTo);
        if (!neighborDevice) continue;

        cableIds.push(`${port.id}-${port.connectedTo}`);
        neighborDeviceIds.add(neighborDevice.id);
    }

    // +1 hop: data connections from neighbor devices (not back to original)
    for (const neighborId of neighborDeviceIds) {
        if (cableIds.length >= maxLinks) break;
        const neighbor = devices.find(d => d.id === neighborId);
        if (!neighbor) continue;

        for (const port of neighbor.ports) {
            if (!port.connectedTo || cableIds.length >= maxLinks) break;

            // Skip power ports
            if (isPowerPort(port.role)) continue;
            const targetPortInfo = portById.get(port.connectedTo);
            if (targetPortInfo && isPowerPort(targetPortInfo.role)) continue;

            const farDevice = portToDevice.get(port.connectedTo);
            if (!farDevice || farDevice.id === deviceId) continue;

            const cableId = `${port.id}-${port.connectedTo}`;
            // Avoid duplicates (reverse direction)
            const reverse = `${port.connectedTo}-${port.id}`;
            if (!cableIds.includes(cableId) && !cableIds.includes(reverse)) {
                cableIds.push(cableId);
            }
        }
    }

    return cableIds.slice(0, maxLinks);
}

/**
 * Evaluate a quadratic bezier curve at parameter t (0..1).
 * B(t) = (1-t)² * P0 + 2(1-t)t * P1 + t² * P2
 */
export function sampleBezierPoint(
    start: [number, number, number],
    mid: [number, number, number],
    end: [number, number, number],
    t: number
): [number, number, number] {
    const oneMinusT = 1 - t;
    const a = oneMinusT * oneMinusT;
    const b = 2 * oneMinusT * t;
    const c = t * t;

    return [
        a * start[0] + b * mid[0] + c * end[0],
        a * start[1] + b * mid[1] + c * end[1],
        a * start[2] + b * mid[2] + c * end[2],
    ];
}
