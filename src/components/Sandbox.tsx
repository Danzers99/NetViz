import { Suspense, useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { useAppStore } from '../store';
import { DeviceNode } from './DeviceNode';
import { Cables } from './Cables';

import { Toolbox } from './Toolbox';
import { WasdControls } from './WasdControls';
import { ViewportClamp } from './ViewportClamp';
import { RoomLayer } from './RoomLayer';
import { WireCancellationHandler } from './WireCancellationHandler';
import { ControlsPanel } from './ControlsPanel';
import * as THREE from 'three';

// Component to track camera center on ground plane
const CameraTracker = () => {
    const { camera } = useThree();
    const setCameraTarget = useAppStore(state => state.setCameraTarget);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const screenCenter = new THREE.Vector2(0, 0); // Normalized center

    useFrame(() => {
        raycaster.setFromCamera(screenCenter, camera);
        const target = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, target)) {
            // Snap to grid for cleanliness? No, raw is fine, addDevice handles snap if needed.
            // But let's snap to 0.5
            const snap = 0.5;
            target.x = Math.round(target.x / snap) * snap;
            target.z = Math.round(target.z / snap) * snap;

            // Only update if changed significantly to avoid churn?
            // Actually, store uses strict equality, array ref changes every time.
            // We should check distance.
            const current = useAppStore.getState().cameraTarget;
            if (Math.abs(current[0] - target.x) > 0.1 || Math.abs(current[2] - target.z) > 0.1) {
                setCameraTarget([target.x, 0, target.z]);
            }
        }
    });
    return null;
};

export const Sandbox = () => {
    const devices = useAppStore((state) => state.devices);
    const isDraggingDevice = useAppStore((state) => state.isDraggingDevice);
    const isDraggingRoom = useAppStore((state) => state.isDraggingRoom);
    const darkMode = useAppStore((state) => state.settings.darkMode);
    const layoutMode = useAppStore((state) => state.layoutMode);
    const controlsRef = useRef<any>(null);

    // Disable camera controls when dragging a device or room
    useEffect(() => {
        if (controlsRef.current) {
            controlsRef.current.enabled = !isDraggingDevice && !isDraggingRoom;
        }
    }, [isDraggingDevice, isDraggingRoom]);

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900 relative transition-colors duration-300">
            <Canvas camera={{ position: [0, 10, 10], fov: 50 }} shadows>
                <Suspense fallback={null}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} castShadow />
                    <Grid
                        infiniteGrid
                        fadeDistance={50}
                        sectionColor={darkMode ? "#4f4f4f" : "#cbd5e1"}
                        cellColor={darkMode ? "#2f2f2f" : "#e2e8f0"}
                        sectionSize={1}
                        cellSize={1}
                    />
                    <OrbitControls ref={controlsRef} makeDefault />
                    <WasdControls />
                    <CameraTracker />
                    <ViewportClamp />
                    <Environment preset="city" />
                    <WireCancellationHandler />

                    <RoomLayer />
                    {/* Hide cables in Layout Mode for cleaner view */}
                    {!layoutMode && <Cables />}

                    {devices.map((device) => (
                        <DeviceNode key={device.id} device={device} />
                    ))}
                </Suspense>
            </Canvas>

            <ControlsPanel />

            <Toolbox />
        </div>
    );
};
