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
import { isWifiCapable } from '../utils/wifi';

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
    const toggleSelection = useAppStore((state) => state.toggleSelection);
    const selectedDeviceIds = useAppStore((state) => state.selectedDeviceIds);
    const selectedDeviceId = useAppStore((state) => state.selectedDeviceId);
    const updateDevicePositions = useAppStore((state) => state.updateDevicePositions);
    const layoutMode = useAppStore((state) => state.layoutMode);

    // Visibility
    const showDeviceNames = useAppStore((state) => state.settings.showDeviceNames);

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

            // Single Device Move (Standard) OR Multi-Select Move ?
            // Logic: Calculate delta from original position? 
            // Simplified: If this device is selected, move ALL selected devices by the delta from THIS device's position?
            // Actually, simpler: Just set position for this device, BUT we need delta for others.

            // Current approach (simplest): If selected, move all.
            const currentPos = new THREE.Vector3().fromArray(device.position);
            const newPos = new THREE.Vector3(x, 0, z);
            const delta = new THREE.Vector3().subVectors(newPos, currentPos);

            // Optimization: If delta is zero (snapped), don't update
            if (delta.lengthSq() < 0.001) return;

            if (selectedDeviceIds.has(device.id)) {
                // Move ALL selected devices
                const devices = useAppStore.getState().devices;
                const updates: Record<string, [number, number, number]> = {};

                selectedDeviceIds.forEach(id => {
                    const d = devices.find(dev => dev.id === id);
                    if (d) {
                        updates[id] = [d.position[0] + delta.x, 0, d.position[2] + delta.z];
                    }
                });

                // Add *this* device (ensure it snaps exactly to cursor regardless of float drift)
                updates[device.id] = [x, 0, z];

                updateDevicePositions(updates);
            } else {
                // Move just this one
                updateDevicePosition(device.id, [x, 0, z]);
            }
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
                    if (e.shiftKey) {
                        toggleSelection(device.id);
                    } else {
                        // If not shifting, select this one. 
                        // Check if already selected? If dragging, we handled logic elsewhere.
                        // Standard click: select only this one.
                        selectDevice(device.id);
                    }
                    selectPort(null);
                }}
                onPointerOver={() => { document.body.style.cursor = 'grab'; }}
                onPointerOut={() => { document.body.style.cursor = 'auto'; }}
                onContextMenu={(e) => {
                    e.stopPropagation();
                    if (!layoutMode) { // Disable menu in Layout Mode
                        setShowMenu(true);
                    }
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
                            return <SwitchModel type={device.type} status={status} connectionState={device.connectionState} />;
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
                            return <PrinterModel status={status} connectionState={device.connectionState} />;
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
            {showDeviceNames && (
                <Html position={[0, 1.2, 0]} center pointerEvents="none" zIndexRange={[0, 0]}>
                    <div className={`bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 px-2 py-1 rounded text-xs whitespace-nowrap backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm select-none font-mono flex items-center gap-2 transition-colors ${selectedDeviceIds.has(device.id) ? 'ring-2 ring-blue-500' : ''}`}>
                        <div className={`w-2 h-2 rounded-full ${(() => {
                            if (device.status === 'error') return 'bg-red-500';
                            if (device.status === 'booting') return 'bg-amber-500 animate-pulse';
                            if (device.status === 'offline') return 'bg-slate-500';

                            // Device is Powered On ('online')
                            if (isWifiCapable(device.type)) {
                                switch (device.connectionState) {
                                    case 'auth_failed': return 'bg-red-500';
                                    case 'disconnected': return 'bg-slate-400';
                                    case 'associating_wifi': return 'bg-amber-500 animate-pulse';
                                    case 'associated_no_ip':
                                    case 'associated_no_internet':
                                        return 'bg-amber-500';
                                    case 'online': return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
                                    default: return 'bg-slate-400';
                                }
                            }

                            // Wired/Infrastructure
                            return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
                        })()}`} />
                        {device.name}
                    </div>
                </Html>
            )}

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
        </group >
    );
};
