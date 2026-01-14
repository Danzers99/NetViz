import { useState, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import type { Room } from '../types';
import { RoomActionMenu } from './RoomActionMenu';
import { useDraggable } from '../hooks/useDraggable';

export const RoomNode = ({ room }: { room: Room }) => {
    const updateRoom = useAppStore((state) => state.updateRoom);
    const selectRoom = useAppStore((state) => state.selectRoom);
    const selectedRoomId = useAppStore((state) => state.selectedRoomId);
    const layoutMode = useAppStore((state) => state.layoutMode);
    const setDraggingRoom = useAppStore((state) => state.setDraggingRoom);
    const setHoveredElement = useAppStore((state) => state.setHoveredElement);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // Store start position for absolute updates
    const startPosRef = useRef<[number, number]>([0, 0]);

    const isSelected = selectedRoomId === room.id;

    // Standardized Drag Hook
    const { handlePointerDown, handlePointerUp, handlePointerMove } = useDraggable({
        snap: 0.5,
        onDragStart: (e) => {
            if (!layoutMode) return;
            e.stopPropagation();

            selectRoom(room.id);
            setIsDragging(true);
            setDraggingRoom(true);

            // Capture initial position (fix for jumping bug)
            startPosRef.current = [room.x, room.y];
        },
        onDrag: (delta) => {
            // Calculate new position based on start + delta
            const newX = startPosRef.current[0] + delta.x;
            const newZ = startPosRef.current[1] + delta.z; // Z is Y in logic
            updateRoom(room.id, { x: newX, y: newZ });
        },
        onDragEnd: () => {
            setIsDragging(false);
            setDraggingRoom(false);
        }
    });

    // We need to implement the OnDrag logic properly. 
    // Wait, `useDraggable` is generic.
    // Let's Refine the implementation below.

    const handleContextMenu = (e: ThreeEvent<PointerEvent>) => {
        if (!layoutMode) return;
        e.stopPropagation();
        setShowMenu(true);
    };

    return (
        <group position={[room.x, -0.1, room.y]}> {/* Slightly below devices (y=0) */}
            {/* Room Floor */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                onPointerDown={(e) => {
                    if (!layoutMode) return;
                    handlePointerDown(e);
                }}
                onPointerUp={handlePointerUp}
                onPointerMove={handlePointerMove}
                onContextMenu={handleContextMenu}
                receiveShadow
                onPointerOver={(e) => {
                    e.stopPropagation();
                    if (layoutMode) setHoveredElement({ type: 'room', id: room.id });
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    setHoveredElement(null);
                }}
            >
                <planeGeometry args={[room.width, room.height]} />
                <meshStandardMaterial
                    color={room.color}
                    transparent
                    opacity={isDragging ? 0.5 : (layoutMode || isSelected ? 0.3 : 0.15)}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Room Border (Outline) */}
            <lineSegments position={[0, 0.05, 0]}>
                <edgesGeometry args={[new THREE.BoxGeometry(room.width, 0.1, room.height)]} />
                <lineBasicMaterial color={isSelected ? "white" : room.color} linewidth={2} />
            </lineSegments>

            {/* Label */}
            {useAppStore(s => s.settings.showRoomNames) && (
                <Html position={[-room.width / 2 + 0.5, 0.5, -room.height / 2 + 0.5]} center pointerEvents="none" zIndexRange={[0, 0]}>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-black/50 px-1 rounded backdrop-blur-sm select-none">
                        {room.name}
                    </div>
                </Html>
            )}

            {/* Context Menu */}
            {showMenu && (
                <RoomActionMenu room={room} onClose={() => setShowMenu(false)} />
            )}
        </group>
    );
};
