import { Suspense, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { useAppStore } from '../store';
import { DeviceNode } from './DeviceNode';
import { Cables } from './Cables';
import { Toolbox } from './Toolbox';

export const Sandbox = () => {
    const devices = useAppStore((state) => state.devices);
    const isDraggingDevice = useAppStore((state) => state.isDraggingDevice);
    const darkMode = useAppStore((state) => state.settings.darkMode);
    const controlsRef = useRef<any>(null);

    // Disable camera controls when dragging a device
    useEffect(() => {
        if (controlsRef.current) {
            controlsRef.current.enabled = !isDraggingDevice;
        }
    }, [isDraggingDevice]);

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
                    <Environment preset="city" />

                    <Cables />

                    {devices.map((device) => (
                        <DeviceNode key={device.id} device={device} />
                    ))}
                </Suspense>
            </Canvas>

            <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-800/80 p-4 rounded-lg text-slate-700 dark:text-white backdrop-blur-sm border border-slate-200 dark:border-slate-700 pointer-events-none select-none transition-colors duration-300">
                <h3 className="font-bold mb-2 text-blue-600 dark:text-blue-400">Controls</h3>
                <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-300">
                    <li>• Left Click + Drag to Rotate</li>
                    <li>• Right Click + Drag to Pan</li>
                    <li>• Scroll to Zoom</li>
                    <li>• Drag devices to move them</li>
                    <li>• Click ports to connect them</li>
                    <li>• Right Click ports to disconnect</li>
                </ul>
            </div>

            <Toolbox />
        </div>
    );
};
