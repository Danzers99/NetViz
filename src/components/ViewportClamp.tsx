import { useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Plane, Raycaster, Vector2 } from 'three';
import { useAppStore } from '../store';

// Minimal interface for OrbitControls to avoid implicit dependency on three-stdlib
interface OrbitControlsImpl {
    target: Vector3;
    update: () => void;
    enabled: boolean;
    object: { position: Vector3 }; // Camera
}

// Workspace settings
// Assuming grid is roughly -20 to 20 based on device placement logic
const WORKSPACE_MIN_X = -20;
const WORKSPACE_MAX_X = 20;
const WORKSPACE_MIN_Z = -20;
const WORKSPACE_MAX_Z = 20;
const MARGIN = 5;

// Expanded bounds (Constraints)
const EXP_MIN_X = WORKSPACE_MIN_X - MARGIN;
const EXP_MAX_X = WORKSPACE_MAX_X + MARGIN;
const EXP_MIN_Z = WORKSPACE_MIN_Z - MARGIN;
const EXP_MAX_Z = WORKSPACE_MAX_Z + MARGIN;

const GROUND_PLANE = new Plane(new Vector3(0, 1, 0), 0);

export const ViewportClamp = () => {
    const { camera, controls: controlsContext } = useThree();
    const cameraResetTrigger = useAppStore(state => state.cameraResetTrigger);

    // Handle Camera Reset
    useEffect(() => {
        if (cameraResetTrigger === 0) return;

        const controls = controlsContext as unknown as OrbitControlsImpl;

        if (controls && controls.target) {
            // Keep current zoom/orientation by maintaining the offset vector
            const currentTarget = controls.target.clone();
            const currentPos = camera.position.clone();
            const offset = currentPos.sub(currentTarget);

            // New Target: Center of workspace (0,0,0)
            const newTarget = new Vector3(0, 0, 0);

            controls.target.copy(newTarget);
            camera.position.copy(newTarget).add(offset);

            controls.update();
        }
    }, [cameraResetTrigger, camera, controlsContext]);

    // Handle Clamping
    useFrame(() => {
        const controls = controlsContext as unknown as OrbitControlsImpl;
        if (!controls || !controls.enabled) return;

        // 1. Compute Viewport Bounds on Ground Plane
        const corners = [
            new Vector2(-1, -1), // Bottom Left
            new Vector2(1, -1),  // Bottom Right
            new Vector2(1, 1),   // Top Right
            new Vector2(-1, 1)   // Top Left
        ];

        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        let validPoints = 0;

        const raycaster = new Raycaster();

        for (const uv of corners) {
            raycaster.setFromCamera(uv, camera);
            const target = new Vector3();
            // intersectPlane returns target if hit, null otherwise
            const intersection = raycaster.ray.intersectPlane(GROUND_PLANE, target);

            if (intersection) {
                validPoints++;
                if (target.x < minX) minX = target.x;
                if (target.x > maxX) maxX = target.x;
                if (target.z < minZ) minZ = target.z;
                if (target.z > maxZ) maxZ = target.z;
            }
        }

        // 2. Determine Correction
        // If 0 points hit ground, we might be looking at sky. Hard to clamp.
        // If < 4 points hit ground, we are looking at horizon.
        // We only clamp if we are "drifting away".
        // If we can't see ANY ground logic: assume we are lost?
        // But usually in this app 50deg FOV top-downish view, we see ground.
        if (validPoints === 0) return;

        let deltaX = 0;
        let deltaZ = 0;

        // Clamp Logic:
        // Ensure viewport intersects workspace (expanded).
        // Intersection condition:
        // !(viewMax < expMin || viewMin > expMax)
        // If invalid, shift back.

        // Too far Left? (All view X < EXP_MIN_X)
        if (maxX < EXP_MIN_X) {
            deltaX = EXP_MIN_X - maxX;
        }
        // Too far Right? (All view X > EXP_MAX_X)
        else if (minX > EXP_MAX_X) {
            deltaX = EXP_MAX_X - minX;
        }

        // Too far Up (Z < min)? (All view Z < EXP_MIN_Z)
        if (maxZ < EXP_MIN_Z) {
            deltaZ = EXP_MIN_Z - maxZ;
        }
        // Too far Down (Z > max)? (All view Z > EXP_MAX_Z)
        else if (minZ > EXP_MAX_Z) {
            deltaZ = EXP_MAX_Z - minZ;
        }

        // 3. Apply Correction
        if (deltaX !== 0 || deltaZ !== 0) {
            camera.position.x += deltaX;
            camera.position.z += deltaZ;
            controls.target.x += deltaX;
            controls.target.z += deltaZ;
            controls.update();
        }
    });

    return null;
};
