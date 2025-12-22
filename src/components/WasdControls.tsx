import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useAppStore } from '../store';

const MOVEMENT_SPEED = 10; // Units per second

export const WasdControls = () => {
    const { camera } = useThree();

    // Track keys
    const keys = useRef({
        w: false,
        a: false,
        s: false,
        d: false,
        q: false,
        e: false
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 1. Scope Check: Sandbox Only
            if (useAppStore.getState().step !== 'sandbox') return;

            // 2. Safety Guards
            // Input Protection
            if (document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            // State Protection
            const state = useAppStore.getState();
            if (state.isDraggingDevice) return;
            // if (state.selectedPortId !== null) return; // Allow movement during wiring
            if (state.propertiesPanelDeviceId !== null) return; // Properties panel open

            const key = e.key.toLowerCase();
            if (key in keys.current) {
                keys.current[key as keyof typeof keys.current] = true;
                // Only prevent default for navigation keys to avoid scrolling/browser interactions
                // while in the sandbox context
                e.preventDefault();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key in keys.current) {
                keys.current[key as keyof typeof keys.current] = false;
            }
        };

        // Reset keys on window blur to prevent "stuck" movement
        const handleBlur = () => {
            Object.keys(keys.current).forEach(k => {
                keys.current[k as keyof typeof keys.current] = false;
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    useFrame((state, delta) => {
        // Validation: Ensure controls exist and we are in sandbox
        const controls = state.controls as any;

        // If OrbitControls isn't the active controller or doesn't exist, we skip
        if (!controls || !controls.target) return;

        // Double check state in loop (optional, but safer for immediate stops)
        const appState = useAppStore.getState();
        if (appState.isDraggingDevice || appState.propertiesPanelDeviceId !== null) {
            return;
        }

        const { w, a, s, d, q, e } = keys.current;
        if (!w && !a && !s && !d && !e && !q) return;

        // Calculate Move Vector
        // Calculate Camera Forward/Right vectors on the Horizontal Plane (XZ)
        const forward = new Vector3();
        camera.getWorldDirection(forward);

        // Flatten forward vector to XZ plane to prevent "flying" into the ground when looking down
        forward.y = 0;
        forward.normalize();

        const right = new Vector3();
        right.crossVectors(forward, camera.up).normalize();

        const moveVector = new Vector3();

        if (w) moveVector.add(forward);
        if (s) moveVector.sub(forward);
        if (d) moveVector.add(right);
        if (a) moveVector.sub(right);

        // Normalize speed
        if (moveVector.lengthSq() > 0) {
            moveVector.normalize().multiplyScalar(MOVEMENT_SPEED * delta);
        }

        // Vertical movement (Q/E) - World Up/Down
        if (e) moveVector.y += MOVEMENT_SPEED * delta;
        if (q) moveVector.y -= MOVEMENT_SPEED * delta;

        // Apply movement to both Camera and OrbitControls Target (Panning)
        camera.position.add(moveVector);
        controls.target.add(moveVector);

        controls.update();
    });

    return null;
};
