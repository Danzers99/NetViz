import { useState, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import type { Room } from '../types';
import { RoomActionMenu } from './RoomActionMenu';

export const RoomNode = ({ room }: { room: Room }) => {
    const updateRoom = useAppStore((state) => state.updateRoom);
    const selectRoom = useAppStore((state) => state.selectRoom);
    const selectedRoomId = useAppStore((state) => state.selectedRoomId);
    const layoutMode = useAppStore((state) => state.layoutMode);
    const setDraggingRoom = useAppStore((state) => state.setDraggingRoom);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    const offsetRef = useRef(new THREE.Vector3());

    const isSelected = selectedRoomId === room.id;

    const handleRoomPointerDown = (e: ThreeEvent<PointerEvent>) => {
        if (!layoutMode) return;
        e.stopPropagation();

        // Select room
        selectRoom(room.id);

        // Start Drag
        setIsDragging(true);
        setDraggingRoom(true);

        // Calculate offset so we don't snap center to cursor immediately
        const point = new THREE.Vector3();
        e.ray.intersectPlane(planeRef.current, point);
        offsetRef.current.subVectors(new THREE.Vector3(room.x, 0, room.y), point);

        // @ts-ignore
        e.target.setPointerCapture(e.pointerId);
    };

    const handleRoomPointerUp = (e: ThreeEvent<PointerEvent>) => {
        if (isDragging) {
            e.stopPropagation();
            setIsDragging(false);
            setDraggingRoom(false);
            // @ts-ignore
            e.target.releasePointerCapture(e.pointerId);
        }
    };

    const handleRoomPointerMove = (e: ThreeEvent<PointerEvent>) => {
        if (isDragging) {
            e.stopPropagation();
            const point = new THREE.Vector3();
            e.ray.intersectPlane(planeRef.current, point);

            // Add offset
            point.add(offsetRef.current);

            // Grid Snap (0.5 or 1)
            const snap = 0.5;
            const x = Math.round(point.x / snap) * snap;
            const z = Math.round(point.z / snap) * snap; // Z is Y in our logic

            updateRoom(room.id, { x, y: z });
        }
    };

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
                onPointerDown={handleRoomPointerDown}
                onPointerUp={handleRoomPointerUp}
                onPointerMove={handleRoomPointerMove}
                onContextMenu={handleContextMenu}
                receiveShadow
                onPointerOver={() => { if (layoutMode) document.body.style.cursor = 'move'; }}
                onPointerOut={() => { document.body.style.cursor = 'auto'; }}
            >
                <planeGeometry args={[room.width, room.height]} />
                <meshStandardMaterial
                    color={room.color}
                    transparent
                    opacity={layoutMode || isSelected ? 0.3 : 0.15}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Room Border (Outline) */}
            <lineSegments position={[0, 0.05, 0]}>
                <edgesGeometry args={[new THREE.BoxGeometry(room.width, 0.1, room.height)]} />
                <lineBasicMaterial color={isSelected ? "white" : room.color} linewidth={2} />
            </lineSegments>

            {/* Label */}
            <Html position={[-room.width / 2 + 0.5, 0.5, -room.height / 2 + 0.5]} center pointerEvents="none" zIndexRange={[0, 0]}>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-black/50 px-1 rounded backdrop-blur-sm select-none">
                    {room.name}
                </div>
            </Html>

            {/* Context Menu */}
            {showMenu && (
                <RoomActionMenu room={room} onClose={() => setShowMenu(false)} />
            )}
        </group>
    );
};
