import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useAppStore } from '../store';

export const WireCancellationHandler = () => {
    const { gl } = useThree();
    const selectPort = useAppStore((state) => state.selectPort);
    const selectedPortId = useAppStore((state) => state.selectedPortId);

    // Refs to track drag state
    const isPointerDown = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = gl.domElement;

        const handlePointerDown = (e: PointerEvent) => {
            if (!selectedPortId) return;
            isPointerDown.current = true;
            startPos.current = { x: e.clientX, y: e.clientY };
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (!selectedPortId || !isPointerDown.current) return;
            isPointerDown.current = false;

            // Calculate distance moved
            const dx = e.clientX - startPos.current.x;
            const dy = e.clientY - startPos.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If movement is minimal, treat as a click -> Cancel Selection
            // Threshold: 5 pixels
            if (distance < 5) {
                // Ensure we don't block other interactions if they were handled?
                // Actually, if this event bubbled to canvas (and wasn't stopped by a port/device),
                // it means we clicked empty space.
                selectPort(null);
            }
        };

        const handlePointerLeave = () => {
            isPointerDown.current = false;
        };

        // Attach listeners to the canvas DOM element
        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointerleave', handlePointerLeave);

        return () => {
            canvas.removeEventListener('pointerdown', handlePointerDown);
            canvas.removeEventListener('pointerup', handlePointerUp);
            canvas.removeEventListener('pointerleave', handlePointerLeave);
        };
    }, [gl, selectedPortId, selectPort]);

    return null;
};
