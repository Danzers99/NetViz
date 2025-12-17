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

        devices.forEach((device) => {
            device.ports.forEach((port, index) => {
                if (port.connectedTo && !processedPorts.has(port.id)) {
                    // Find target device and port
                    let targetDevice: Device | undefined;
                    let targetPortIndex = -1;

                    for (const d of devices) {
                        const pIndex = d.ports.findIndex((p) => p.id === port.connectedTo);
                        if (pIndex !== -1) {
                            targetDevice = d;
                            targetPortIndex = pIndex;
                            break;
                        }
                    }

                    if (targetDevice) {
                        // Calculate positions
                        // Device position is center bottom of the box (y=0)
                        // Port is at y=0.5 (center of box) + relative z=0.51
                        // Actually in DeviceNode: group pos = device.pos. mesh pos = [0, 0.5, 0].
                        // Ports group pos = [0, 0.5, 0.51].
                        // Port local pos = [startX + index * spacing, 0, 0] relative to Ports group.
                        // So world pos = device.pos + [0, 0.5, 0.51] + [startX + index * spacing, 0, 0]

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
                            document.body.style.cursor = 'pointer';
                        }}
                        onPointerOut={(e) => {
                            e.stopPropagation();
                            setHoveredElement(null);
                            document.body.style.cursor = 'auto';
                        }}
                    />
                );
            })}
        </group>
    );
};
