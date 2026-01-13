import { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

interface DraggableOptions {
    onDragStart?: (e: ThreeEvent<PointerEvent>) => void;
    onDragEnd?: (e: ThreeEvent<PointerEvent>) => void;
    onDrag: (delta: THREE.Vector3, currentPoint: THREE.Vector3) => void;
    snap?: number; // Snap grid size (default 0.5)
}

export const useDraggable = ({ onDragStart, onDragEnd, onDrag, snap = 0.5 }: DraggableOptions) => {
    const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    const dragState = useRef<{
        active: boolean;
        startPoint: THREE.Vector3;
        rafId: number | null;
        lastPoint: THREE.Vector3;
    }>({
        active: false,
        startPoint: new THREE.Vector3(),
        lastPoint: new THREE.Vector3(),
        rafId: null
    });

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();

        const point = new THREE.Vector3();
        e.ray.intersectPlane(planeRef.current, point);

        dragState.current = {
            active: true,
            startPoint: point,
            lastPoint: point,
            rafId: null
        };

        // @ts-ignore
        e.target.setPointerCapture(e.pointerId);

        if (onDragStart) onDragStart(e);
    };

    const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
        if (!dragState.current.active) return;
        e.stopPropagation();

        if (dragState.current.rafId) {
            cancelAnimationFrame(dragState.current.rafId);
            dragState.current.rafId = null;
        }

        dragState.current.active = false;
        // @ts-ignore
        e.target.releasePointerCapture(e.pointerId);

        if (onDragEnd) onDragEnd(e);
    };

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        if (!dragState.current.active) return;
        e.stopPropagation();

        // Throttle
        if (dragState.current.rafId) return;

        const currentPoint = new THREE.Vector3();
        e.ray.intersectPlane(planeRef.current, currentPoint);

        dragState.current.rafId = requestAnimationFrame(() => {
            dragState.current.rafId = null;
            if (!dragState.current.active) return;

            // Calculate Accumulated Delta from Start to Current
            const delta = new THREE.Vector3().subVectors(currentPoint, dragState.current.startPoint);

            // Snap the delta itself to the grid
            const snappedDelta = new THREE.Vector3(
                Math.round(delta.x / snap) * snap,
                0,
                Math.round(delta.z / snap) * snap
            );

            // Notify consumer
            onDrag(snappedDelta, currentPoint);
        });
    };

    return {
        handlePointerDown,
        handlePointerUp,
        handlePointerMove
    };
};
