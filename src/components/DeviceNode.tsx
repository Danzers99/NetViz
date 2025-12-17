import { useState, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useAppStore } from '../store';
import type { Device } from '../types';
import * as THREE from 'three';
import { RouterModel, ModemModel } from './models/RouterModel';
import { APModel, InjectorModel, PowerOutletModel } from './models/AccessoryModel';
import { SwitchModel, POSModel, PrinterModel, CakePOPModel, OrderPadModel } from './models/EndpointModel';
import { EloKDSModel } from './models/EloKDSModel';
import { getPortPosition } from '../utils/layout';

const DEVICE_COLORS: Record<string, string> = {
    // Infrastructure
    'isp-modem': '#f97316', // Orange
    'zyxel-router': '#a855f7', // Purple
    'cradlepoint-router': '#d946ef', // Fuchsia
    'managed-switch': '#15803d', // Dark Green
    'unmanaged-switch': '#22c55e', // Green
    'access-point': '#06b6d4', // Cyan
    'datto-ap440': '#0891b2', // Cyan-700
    'datto-ap62': '#0e7490', // Cyan-800
    'poe-injector': '#f59e0b', // Amber-500
    'power-outlet': '#facc15', // Yellow-400

    // POS
    'pos': '#3b82f6', // Blue
    'datavan-pos': '#2563eb', // Blue-600
    'poindus-pos': '#1d4ed8', // Blue-700
    'v3-pos': '#1e40af', // Blue-800
    'v4-pos': '#1e3a8a', // Blue-900

    // Printers
    'printer': '#eab308', // Yellow
    'epson-thermal': '#ca8a04', // Yellow-600
    'epson-impact': '#a16207', // Yellow-700

    // KDS
    'kds': '#ef4444', // Red
    'elo-kds': '#dc2626', // Red-600

    // Mobile
    'orderpad': '#f472b6', // Pink-400
    'cakepop': '#fb7185', // Rose-400

    'unknown': '#64748b', // Slate
};

import { PortNode } from './PortNode';

import { DeviceActionMenu } from './DeviceActionMenu';

export const DeviceNode = ({ device }: { device: Device }) => {
    const updateDevicePosition = useAppStore((state) => state.updateDevicePosition);
    const setDraggingDevice = useAppStore((state) => state.setDraggingDevice);
    const selectPort = useAppStore((state) => state.selectPort);
    const selectDevice = useAppStore((state) => state.selectDevice);
    const [isDragging, setIsDragging] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setIsDragging(true);
        setDraggingDevice(true);
        // @ts-ignore
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setIsDragging(false);
        setDraggingDevice(false);
        // @ts-ignore
        e.target.releasePointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        if (isDragging) {
            e.stopPropagation();
            const point = new THREE.Vector3();
            e.ray.intersectPlane(planeRef.current, point);
            const snap = 0.5;
            const x = Math.round(point.x / snap) * snap;
            const z = Math.round(point.z / snap) * snap;
            updateDevicePosition(device.id, [x, 0, z]);
        }
    };

    // Calculate port positions (handled by layout.ts now)

    return (
        <group position={device.position}>
            {/* Device Body */}
            <group
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerMove={handlePointerMove}
                onClick={(e) => {
                    e.stopPropagation();
                    selectDevice(device.id);
                    selectPort(null);
                }}
                onPointerOver={() => { document.body.style.cursor = 'grab'; }}
                onPointerOut={() => { document.body.style.cursor = 'auto'; }}
                onContextMenu={(e) => {
                    e.stopPropagation();
                    setShowMenu(true);
                }}
            >


                {(() => {
                    const status = device.status;
                    switch (device.type) {
                        case 'zyxel-router':
                        case 'cradlepoint-router':
                            return <RouterModel type={device.type} status={status} connectionState={device.connectionState} />;
                        case 'isp-modem':
                            return <ModemModel status={status} />;
                        case 'datto-ap440':
                        case 'datto-ap62':
                        case 'access-point':
                            return <APModel type={device.type} status={status} />;
                        case 'poe-injector':
                            return <InjectorModel status={status} />;
                        case 'managed-switch':
                        case 'unmanaged-switch':
                            return <SwitchModel type={device.type} status={status} />;
                        case 'pos':
                        case 'datavan-pos':
                        case 'poindus-pos':
                        case 'v3-pos':
                        case 'v4-pos':
                        case 'elo-kds':
                            return <EloKDSModel status={status} connectionState={device.connectionState} />;
                        case 'kds':
                            return <POSModel status={status} connectionState={device.connectionState} />;
                        case 'printer':
                        case 'epson-thermal':
                        case 'epson-impact':
                            return <PrinterModel status={status} />;
                        case 'cakepop':
                            return <CakePOPModel status={status} connectionState={device.connectionState} />;
                        case 'orderpad':
                            return <OrderPadModel status={status} connectionState={device.connectionState} />;
                        case 'power-outlet':
                            return <PowerOutletModel status={status} />;
                        default:
                            // Fallback generic box (status aware)
                            const baseColor = DEVICE_COLORS[device.type] || '#94a3b8';
                            const color = status === 'offline' ? '#1f2937' : baseColor;
                            const emissive = status === 'booting' ? '#f59e0b' : '#000000';
                            return (
                                <mesh position={[0, 0.5, 0]}>
                                    <boxGeometry args={[1, 1, 1]} />
                                    <meshStandardMaterial
                                        color={color}
                                        emissive={emissive}
                                        emissiveIntensity={status === 'booting' ? 0.5 : 0}
                                    />
                                </mesh>
                            );
                    }
                })()}
            </group>

            {showMenu && (
                <DeviceActionMenu device={device} onClose={() => setShowMenu(false)} />
            )}

            {/* Label */}
            <Html position={[0, 1.2, 0]} center pointerEvents="none" zIndexRange={[0, 0]}>
                <div className="bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 px-2 py-1 rounded text-xs whitespace-nowrap backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm select-none font-mono flex items-center gap-2 transition-colors">
                    <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                        device.status === 'booting' ? 'bg-amber-500 animate-pulse' :
                            device.status === 'error' ? 'bg-red-500' :
                                'bg-slate-500'
                        }`} />
                    {device.name}
                </div>
            </Html>

            {/* Ports */}
            <group>
                {device.ports.map((port, index) => (
                    <PortNode
                        key={port.id}
                        port={port}
                        position={getPortPosition(device, port, index)}
                    />
                ))}
            </group>
        </group>
    );
};
