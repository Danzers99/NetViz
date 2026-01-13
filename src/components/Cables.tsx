import { useMemo } from 'react';
import { QuadraticBezierLine } from '@react-three/drei';
import { useAppStore } from '../store';
import type { Device } from '../types';


import { getPortPosition } from '../utils/layout';

export const Cables = () => {
    const devices = useAppStore((state) => state.devices);

    const connections = useMemo(() => {
        const lines: { start: [number, number, number]; end: [number, number, number]; id: string }[] = [];
        const processedPorts = new Set<string>();

        // Create a Map for O(1) lookup
        const deviceMap = new Map(devices.map(d => [d.id, d]));

        devices.forEach((device) => {
            device.ports.forEach((port, index) => {
                // Determine Connection ID (Cable ID)
                // Use a consistent ID generation regardless of direction (e.g. sort IDs)
                // But existing logic uses `processedPorts` to dedupe.

                if (port.connectedTo && !processedPorts.has(port.id)) {
                    // Find target device
                    // Optimization: Use Map instead of .find()
                    // But we also need targetPortIndex to use getPortPosition
                    // Let's get the device first

                    // The connectedTo string is a PORT ID, NOT a Device ID?
                    // "connectedTo": "deviceA-port1"
                    // Port IDs are typically "deviceId-portId".
                    // But `connectedTo` stores the TARGET PORT ID.

                    // We need to find the device that OWNS this port.
                    // The store structure puts ports INSIDE devices.
                    // We don't have a flat Port -> Device map.

                    // So `deviceMap.get(port.connectedTo)` won't work because `port.connectedTo` is a port ID.

                    // Wait, existing code:
                    // for (const d of devices) { const pIndex = d.ports.findIndex(...) }

                    // Optimization Strategy Revised:
                    // We can pre-calculate a PortID -> Device Map. O(TotalPorts).
                    // Or, since PortID usually contains DeviceID prefix?
                    // port.id: `${deviceId}-${p.id}` (helper `generatePorts`).
                    // BUT `p.id` might contain dashes.

                    // Let's rely on the Lookup Map construction.
                    // Map<PortID, { device, portIndex }>

                    // But constructing this map every frame is O(TotalPorts).
                    // Original loop was O(Devices * Devices * Ports).
                    // O(TotalPorts) construction + O(TotalConnections) lookup is way better.
                }
            });
        });

        // ACTUALLY IMPLEMENTATION:
        const portLookup = new Map<string, { device: Device; index: number }>();
        devices.forEach(d => {
            d.ports.forEach((p, i) => {
                portLookup.set(p.id, { device: d, index: i });
            });
        });

        devices.forEach((device) => {
            device.ports.forEach((port, index) => {
                if (port.connectedTo && !processedPorts.has(port.id)) {
                    const target = portLookup.get(port.connectedTo);

                    if (target) {
                        const targetDevice = target.device;
                        const targetPortIndex = target.index;

                        // Use shared layout logic
                        const startLocalPos = getPortPosition(device, port, index);
                        const startPos: [number, number, number] = [
                            device.position[0] + startLocalPos[0],
                            device.position[1] + startLocalPos[1],
                            device.position[2] + startLocalPos[2],
                        ];

                        const targetLocalPos = getPortPosition(targetDevice, targetDevice.ports[targetPortIndex], targetPortIndex);
                        const endPos: [number, number, number] = [
                            targetDevice.position[0] + targetLocalPos[0],
                            targetDevice.position[1] + targetLocalPos[1],
                            targetDevice.position[2] + targetLocalPos[2],
                        ];

                        lines.push({ start: startPos, end: endPos, id: `${port.id}-${port.connectedTo}` });
                        processedPorts.add(port.id);
                        processedPorts.add(port.connectedTo!);
                    }
                }
            });
        });

        return lines;
    }, [devices]);

    const highlightedCables = useAppStore((state) => state.highlightedCables);
    const setHoveredElement = useAppStore((state) => state.setHoveredElement);

    return (
        <group>
            {connections.map((conn) => {
                const isHighlighted = highlightedCables.has(conn.id);
                return (
                    <QuadraticBezierLine
                        key={conn.id}
                        start={conn.start}
                        end={conn.end}
                        mid={[
                            (conn.start[0] + conn.end[0]) / 2,
                            Math.max(conn.start[1], conn.end[1]) + 2, // Arc up
                            (conn.start[2] + conn.end[2]) / 2,
                        ]}
                        color={isHighlighted ? '#3b82f6' : '#94a3b8'} // Neon or Grey
                        lineWidth={isHighlighted ? 4 : 2}
                        dashed={false}
                        onPointerOver={(e) => {
                            e.stopPropagation();
                            setHoveredElement({ type: 'cable', id: conn.id });
                        }}
                        onPointerOut={(e) => {
                            e.stopPropagation();
                            setHoveredElement(null);
                        }}
                    />
                );
            })}
        </group>
    );
};
