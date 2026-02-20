/**
 * graphLayout.ts
 * 
 * Extracts a 2D graph from NetViz's Device/Port model and computes
 * a deterministic hierarchical layout (BFS, top-down tiers).
 * No external dependencies — outputs positioned nodes + edges for SVG rendering.
 */

import type { Device, DeviceType, DeviceStatus, ConnectionState, PortRole } from '../types';
import { getDeviceDefinition } from '../data/deviceDefinitions';

// ─── Types ──────────────────────────────────────────────────

export interface GraphNode {
    id: string;
    label: string;
    type: DeviceType;
    category: 'infra' | 'endpoint' | 'wireless' | 'power' | 'pos' | 'printer';
    status: DeviceStatus;
    ip?: string;
    room?: string;
    connectionState?: ConnectionState;
    x: number;
    y: number;
}

export interface GraphEdge {
    sourceId: string;
    targetId: string;
    sourcePort: string;
    targetPort: string;
}

export interface NetworkGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
    width: number;
    height: number;
}

// ─── Helpers (mirrored from exportReport.ts) ────────────────

const isPowerRole = (role: PortRole): boolean =>
    role === 'power_input' || role === 'power_source';

const isPowerInfrastructure = (device: Device): boolean => {
    const def = getDeviceDefinition(device.type);
    return !!def.capabilities.isOutlet;
};

const rootPriority = (device: Device): number => {
    const cap = getDeviceDefinition(device.type).capabilities;
    if (cap.isModem) return 0;
    if (cap.isRouter) return 1;
    if (cap.isSwitch) return 2;
    if (cap.isPoEInjector) return 3;
    if (cap.isAP) return 4;
    return 5;
};

// ─── Graph Extraction ───────────────────────────────────────

interface AdjEntry {
    targetId: string;
    srcPort: string;
    dstPort: string;
}

function buildAdjacency(devices: Device[]): Map<string, AdjEntry[]> {
    const portOwner = new Map<string, Device>();
    const portById = new Map<string, { role: PortRole; name: string }>();
    for (const d of devices) {
        for (const p of d.ports) {
            portOwner.set(p.id, d);
            portById.set(p.id, { role: p.role, name: p.name });
        }
    }

    const adjacency = new Map<string, AdjEntry[]>();

    for (const device of devices) {
        if (isPowerInfrastructure(device)) continue;
        for (const port of device.ports) {
            if (!port.connectedTo) continue;
            // Skip power-only links
            if (isPowerRole(port.role)) continue;
            const targetPortInfo = portById.get(port.connectedTo);
            if (!targetPortInfo || isPowerRole(targetPortInfo.role)) continue;
            // Skip connections to power infrastructure
            const targetDevice = portOwner.get(port.connectedTo);
            if (!targetDevice || isPowerInfrastructure(targetDevice)) continue;

            if (!adjacency.has(device.id)) adjacency.set(device.id, []);
            adjacency.get(device.id)!.push({
                targetId: targetDevice.id,
                srcPort: port.name,
                dstPort: targetPortInfo.name,
            });
        }
    }

    return adjacency;
}

// ─── Layout ─────────────────────────────────────────────────

const NODE_SPACING_X = 160;
const NODE_SPACING_Y = 120;
const PADDING = 80;

/**
 * Build a positioned 2D graph from the current device list.
 * Rooms are passed separately for node labeling.
 */
export function buildNetworkGraph(
    devices: Device[],
    rooms: { id: string; name: string }[]
): NetworkGraph {
    if (devices.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };

    const roomMap = new Map(rooms.map(r => [r.id, r.name]));
    const adjacency = buildAdjacency(devices);

    // Filter out power infrastructure for nodes
    const networkDevices = devices.filter(d => !isPowerInfrastructure(d));

    // Build node map
    const nodeMap = new Map<string, GraphNode>();
    for (const d of networkDevices) {
        const def = getDeviceDefinition(d.type);
        nodeMap.set(d.id, {
            id: d.id,
            label: d.name,
            type: d.type,
            category: def.category,
            status: d.status,
            ip: d.ip,
            room: d.roomId ? roomMap.get(d.roomId) : undefined,
            connectionState: d.connectionState,
            x: 0,
            y: 0,
        });
    }

    // Build edges (deduplicated)
    const edges: GraphEdge[] = [];
    const edgeSet = new Set<string>();
    for (const [sourceId, neighbors] of adjacency) {
        for (const n of neighbors) {
            const key = [sourceId, n.targetId].sort().join('|');
            if (edgeSet.has(key)) continue;
            edgeSet.add(key);
            edges.push({
                sourceId,
                targetId: n.targetId,
                sourcePort: n.srcPort,
                targetPort: n.dstPort,
            });
        }
    }

    // ── Hierarchical BFS layout ──
    // Assign tiers (y) and spread (x) via BFS from root devices

    const sorted = [...networkDevices].sort((a, b) => rootPriority(a) - rootPriority(b));
    const visited = new Set<string>();
    const tiers = new Map<string, number>(); // deviceId → tier
    const tierBuckets: string[][] = []; // tier index → device IDs

    // BFS from each root
    for (const device of sorted) {
        if (visited.has(device.id)) continue;
        // Skip wireless-only (mobile) devices — they'll be added to their AP's tier+1
        const def = getDeviceDefinition(device.type);
        if (def.capabilities.isMobile) continue;

        const queue: { id: string; tier: number }[] = [{ id: device.id, tier: 0 }];
        visited.add(device.id);

        while (queue.length > 0) {
            const { id, tier } = queue.shift()!;
            tiers.set(id, tier);
            while (tierBuckets.length <= tier) tierBuckets.push([]);
            tierBuckets[tier].push(id);

            // Traverse neighbors
            const neighbors = adjacency.get(id) || [];
            const childIds = new Set<string>();
            for (const n of neighbors) {
                if (visited.has(n.targetId)) continue;
                if (childIds.has(n.targetId)) continue;
                childIds.add(n.targetId);
                visited.add(n.targetId);
                queue.push({ id: n.targetId, tier: tier + 1 });
            }
        }
    }

    // Add wireless-only (mobile) devices under their associated AP
    for (const d of networkDevices) {
        if (visited.has(d.id)) continue;
        const def = getDeviceDefinition(d.type);
        if (def.capabilities.isMobile && d.wireless?.associatedApId) {
            const apTier = tiers.get(d.wireless.associatedApId);
            const tier = apTier !== undefined ? apTier + 1 : 0;
            tiers.set(d.id, tier);
            while (tierBuckets.length <= tier) tierBuckets.push([]);
            tierBuckets[tier].push(d.id);
            visited.add(d.id);
        }
    }

    // Any remaining unvisited devices go to tier 0
    for (const d of networkDevices) {
        if (visited.has(d.id)) continue;
        tiers.set(d.id, 0);
        if (tierBuckets.length === 0) tierBuckets.push([]);
        tierBuckets[0].push(d.id);
    }

    // Assign x, y positions
    let maxWidth = 0;
    for (let tier = 0; tier < tierBuckets.length; tier++) {
        const bucket = tierBuckets[tier];
        const tierWidth = bucket.length * NODE_SPACING_X;
        if (tierWidth > maxWidth) maxWidth = tierWidth;
    }

    for (let tier = 0; tier < tierBuckets.length; tier++) {
        const bucket = tierBuckets[tier];
        const tierWidth = bucket.length * NODE_SPACING_X;
        const offsetX = (maxWidth - tierWidth) / 2; // center within max width

        for (let i = 0; i < bucket.length; i++) {
            const node = nodeMap.get(bucket[i]);
            if (node) {
                node.x = PADDING + offsetX + i * NODE_SPACING_X + NODE_SPACING_X / 2;
                node.y = PADDING + tier * NODE_SPACING_Y + NODE_SPACING_Y / 2;
            }
        }
    }

    const totalWidth = maxWidth + PADDING * 2;
    const totalHeight = tierBuckets.length * NODE_SPACING_Y + PADDING * 2;

    return {
        nodes: Array.from(nodeMap.values()),
        edges,
        width: Math.max(totalWidth, 400),
        height: Math.max(totalHeight, 300),
    };
}
