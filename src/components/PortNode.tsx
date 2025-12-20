import { useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useAppStore } from '../store';
import type { Port } from '../types';

const getRoleLabel = (role: string) => {
    switch (role) {
        case 'wan': return 'Internet (WAN)';
        case 'uplink': return 'LAN / Uplink';
        case 'poe_source': return 'PoE Out';
        case 'poe_client': return 'PoE In';
        case 'power_input': return 'Power In';
        case 'power_source': return 'Power Out';
        default: return role.toUpperCase().replace('_', ' ');
    }
};

export const PortNode = ({ port, position, orientation = [0, 0, 0] }: { port: Port; position: [number, number, number], orientation?: [number, number, number] }) => {
    const selectedPortId = useAppStore((state) => state.selectedPortId);
    const selectPort = useAppStore((state) => state.selectPort);
    const connectPorts = useAppStore((state) => state.connectPorts);
    const disconnectPort = useAppStore((state) => state.disconnectPort);

    // Global Hover State
    const setHoveredElement = useAppStore((state) => state.setHoveredElement);
    const highlightedPorts = useAppStore((state) => state.highlightedPorts);
    const isHighlighted = highlightedPorts.has(port.id);

    const [localHovered, setLocalHovered] = useState(false);

    const isSelected = selectedPortId === port.id;
    const isConnected = !!port.connectedTo;

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (isSelected) {
            selectPort(null);
        } else if (selectedPortId) {
            connectPorts(selectedPortId, port.id);
        } else {
            selectPort(port.id);
        }
    };

    const handleRightClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (isConnected) {
            disconnectPort(port.id);
        }
    };

    // Color code ports by role (Plastic color)
    const getPortColor = () => {
        if (isSelected) return '#ffffff';
        if (isHighlighted) return '#3b82f6'; // Highlight Neon Blue (Circuit Trace)
        if (localHovered) return '#60a5fa'; // Hover Blue (Individual)

        switch (port.role) {
            case 'wan': return '#ef4444'; // Red/Yellow plastic for WAN
            case 'uplink': return '#3b82f6'; // Blue for Uplink
            case 'poe_source': return '#f59e0b'; // Amber for PoE Out
            case 'poe_client': return '#f59e0b'; // Amber for PoE In
            case 'power_input': return '#facc15'; // Yellow for Power Visibility
            case 'power_source': return '#facc15'; // Yellow for Power Visibility
            default: return '#334155'; // Dark Slate for LAN
        }
    };

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setLocalHovered(true);
        setHoveredElement({ type: 'port', id: port.id });
        document.body.style.cursor = 'pointer';
    };

    const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setLocalHovered(false);
        setHoveredElement(null);
        document.body.style.cursor = 'auto';
    };

    // Link Light Color
    const getLinkLightColor = () => {
        if (!isConnected) return '#1f2937'; // Off/Black
        switch (port.linkStatus) {
            case 'up': return '#22c55e'; // Green
            case 'negotiating': return '#f59e0b'; // Amber
            case 'down': return '#1f2937'; // Off
            default: return '#1f2937';
        }
    };

    const lightIntensity = port.linkStatus === 'up' ? 2 : 0;

    return (
        <group position={position} rotation={orientation as any}>
            {/* The Port Socket */}
            <mesh
                onClick={handleClick}
                onContextMenu={handleRightClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                <boxGeometry args={[0.12, 0.12, 0.05]} />
                <meshStandardMaterial
                    color={getPortColor()}
                    emissive={isSelected ? '#ffffff' : '#000000'}
                    emissiveIntensity={0.5}
                />
            </mesh>

            {/* Link Light LED */}
            {/* Positioned slightly above or to the side */}
            <mesh position={[0.08, 0.08, 0]}>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshStandardMaterial
                    color={getLinkLightColor()}
                    emissive={getLinkLightColor()}
                    emissiveIntensity={lightIntensity}
                    toneMapped={false}
                />
            </mesh>

            {localHovered && (
                <Html position={[0, 0.2, 0]} center pointerEvents="none" zIndexRange={[0, 0]}>
                    <div className="bg-black/90 text-white px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap border border-slate-700 z-0">
                        {port.name} ({getRoleLabel(port.role)})
                    </div>
                </Html>
            )}
        </group>
    );
};
