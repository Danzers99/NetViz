/**
 * RackView.tsx
 *
 * Full-screen overlay showing a close-up 3D render of a device
 * with permanently labeled port locations. Ports are interactive:
 * clicking a port uses the same selection/connection system as the
 * sandbox (selectPort → connectPorts flow).
 *
 * Theme-aware: reads global darkMode setting and adapts Canvas
 * background, lighting, and all Tailwind classes accordingly.
 */

import { useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, PerspectiveCamera } from '@react-three/drei';
import { useAppStore } from '../store';
import { getPortPosition } from '../utils/layout';
import { getDeviceDefinition } from '../data/deviceDefinitions';
import { RACK_VIEW_CONFIGS } from '../data/rackViewConfig';
import { getEffectiveStatus } from '../utils/deviceStatus';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import type { Device, Port } from '../types';

// ── Reuse the real PortNode for full interaction ─────────────
import { PortNode } from './PortNode';

// ── Model imports (same as DeviceNode) ───────────────────────
import { RouterModel, ModemModel } from './models/RouterModel';
import { APModel, InjectorModel, PowerOutletModel } from './models/AccessoryModel';
import { SwitchModel, POSModel, PrinterModel, CakePOPModel, OrderPadModel } from './models/EndpointModel';
import { EloKDSModel } from './models/EloKDSModel';

/* ── Theme presets for Canvas scene ───────────────────────────── */

const rackViewTheme = {
    light: {
        sceneBackground: '#e2e8f0',   // slate-200 — neutral light backdrop
        ambientIntensity: 1.0,         // Brighter ambient for well-lit feel
        keyLightIntensity: 0.8,        // Slightly reduced key since ambient is higher
        fillLightIntensity: 0.3,
        rimLightIntensity: 0.2,
    },
    dark: {
        sceneBackground: '#1e293b',    // slate-800 — the previous dark value
        ambientIntensity: 0.8,         // Existing dark mode value
        keyLightIntensity: 1.0,
        fillLightIntensity: 0.4,
        rimLightIntensity: 0.3,
    },
};

/* ── Render the correct 3D model for a device ───────────────── */

const DeviceModel = ({ device }: { device: Device }) => {
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
        case 'kiosk':
            return <EloKDSModel status={status} connectionState={device.connectionState} />;
        case 'kds':
            return <POSModel status={status} connectionState={device.connectionState} />;
        case 'printer':
        case 'epson-thermal':
        case 'epson-impact':
        case 'epson-label':
            return <PrinterModel status={status} connectionState={device.connectionState} />;
        case 'cakepop':
            return <CakePOPModel status={status} connectionState={device.connectionState} />;
        case 'orderpad':
            return <OrderPadModel status={status} connectionState={device.connectionState} />;
        case 'power-outlet':
            return <PowerOutletModel status={status} />;
        default:
            return (
                <mesh position={[0, 0.5, 0]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="#94a3b8" />
                </mesh>
            );
    }
};

/* ── Port role helpers (for legend + labels) ─────────────────── */

const getPortRoleColor = (role: string): string => {
    switch (role) {
        case 'wan':
        case 'uplink':
            return '#3b82f6';   // Blue
        case 'poe_source':
        case 'poe_client':
            return '#f59e0b';   // Amber
        case 'power_input':
        case 'power_source':
            return '#4b5563';   // Grey
        default:
            return '#eab308';   // Yellow (LAN / generic / access)
    }
};

const getPortRoleLabel = (role: string): string => {
    switch (role) {
        case 'wan': return 'WAN';
        case 'lan': return 'LAN';
        case 'uplink': return 'Uplink';
        case 'access': return 'ETH';
        case 'generic': return 'Port';
        case 'poe_source': return 'PoE Out';
        case 'poe_client': return 'PoE In';
        case 'power_input': return 'Power';
        case 'power_source': return 'Outlet';
        default: return role.toUpperCase();
    }
};

/* ── Interactive port with always-visible label ──────────────── */

const RackViewPort = ({ device, port, index, isDark }: { device: Device; port: Port; index: number; isDark: boolean }) => {
    const position = getPortPosition(device, port, index);
    const isConnected = !!port.connectedTo;

    return (
        <group>
            {/* Real PortNode — handles click-to-select, click-to-connect, right-click-to-disconnect */}
            <PortNode port={port} position={position} />

            {/* Always-visible label below the port */}
            <group position={position}>
                <Html position={[0, -0.18, 0]} center pointerEvents="none" zIndexRange={[0, 0]}>
                    <div className="flex flex-col items-center gap-0.5 select-none">
                        <span className={`text-[11px] font-bold whitespace-nowrap drop-shadow-md ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {port.name}
                        </span>
                        <span className={`text-[9px] font-medium whitespace-nowrap ${isConnected ? 'text-green-500' : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                            {isConnected ? '● Connected' : '○ Empty'}
                        </span>
                    </div>
                </Html>
            </group>
        </group>
    );
};

/* ── Port color legend ──────────────────────────────────────── */

const PortLegend = ({ ports }: { ports: Port[] }) => {
    const roles = Array.from(new Set(ports.map(p => p.role)));
    return (
        <div className="flex items-center gap-4 flex-wrap">
            {roles.map(role => (
                <div key={role} className="flex items-center gap-1.5">
                    <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: getPortRoleColor(role) }}
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{getPortRoleLabel(role)}</span>
                </div>
            ))}
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-300 dark:border-slate-700">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Link Up</span>
            </div>
        </div>
    );
};

/* ── Port selection status bar ──────────────────────────────── */

const PortSelectionBar = ({ currentDeviceId }: { currentDeviceId: string }) => {
    const selectedPortId = useAppStore((state) => state.selectedPortId);
    const devices = useAppStore((state) => state.devices);
    const selectPort = useAppStore((state) => state.selectPort);

    if (!selectedPortId) return null;

    // Find the port and its device
    let portName = '';
    let deviceName = '';
    let sourceDeviceId = '';
    for (const dev of devices) {
        const port = dev.ports.find(p => p.id === selectedPortId);
        if (port) {
            portName = port.name;
            deviceName = dev.name;
            sourceDeviceId = dev.id;
            break;
        }
    }

    if (!portName) return null;

    // Source is on a different device → user is ready to connect
    const isArmedForConnection = sourceDeviceId !== currentDeviceId;

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isArmedForConnection
            ? 'bg-amber-600/20 border-amber-500/30'
            : 'bg-blue-600/20 border-blue-500/30'
            }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isArmedForConnection ? 'bg-amber-400' : 'bg-blue-400'}`} />
            <span className="text-xs">
                <span className={isArmedForConnection ? 'text-amber-600 dark:text-amber-300' : 'text-blue-600 dark:text-blue-300'}>
                    Connecting from:{' '}
                </span>
                <span className={`font-bold ${isArmedForConnection ? 'text-amber-700 dark:text-amber-200' : 'text-blue-700 dark:text-blue-200'}`}>
                    {deviceName} {portName}
                </span>
            </span>
            {isArmedForConnection && (
                <>
                    <span className="text-amber-500 text-xs mx-0.5">→</span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Click a target port</span>
                </>
            )}
            {!isArmedForConnection && (
                <>
                    <span className="text-blue-500 text-xs mx-0.5">—</span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">Open another device to connect</span>
                </>
            )}
            <button
                onClick={() => selectPort(null)}
                className={`ml-1 p-0.5 rounded transition-colors ${isArmedForConnection
                    ? 'hover:bg-amber-500/30 text-amber-500 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-200'
                    : 'hover:bg-blue-500/30 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-200'
                    }`}
                title="Clear Selection"
            >
                <X size={12} />
            </button>
        </div>
    );
};

/* ── Inline notification (Toast is z-60, hidden under z-90 overlay) ── */

const RackViewNotification = () => {
    const notification = useAppStore((state) => state.notification);
    const setNotification = useAppStore((state) => state.setNotification);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification, setNotification]);

    if (!notification) return null;

    const styles = {
        error: { bg: 'bg-red-500/90', Icon: AlertCircle },
        success: { bg: 'bg-green-500/90', Icon: CheckCircle },
        info: { bg: 'bg-blue-500/90', Icon: Info },
    };
    const { bg, Icon } = styles[notification.type];

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className={`${bg} text-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2.5 min-w-[280px] justify-between backdrop-blur-sm`}>
                <div className="flex items-center gap-2">
                    <Icon size={18} />
                    <span className="font-medium text-sm">{notification.message}</span>
                </div>
                <button
                    onClick={() => setNotification(null)}
                    className="hover:bg-white/20 p-0.5 rounded-full transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

/* ── Main RackView Overlay ──────────────────────────────────── */

interface RackViewProps {
    deviceId: string;
    onClose: () => void;
}

export const RackView = ({ deviceId, onClose }: RackViewProps) => {
    const devices = useAppStore((state) => state.devices);
    const darkMode = useAppStore((state) => state.settings.darkMode);
    const device = devices.find(d => d.id === deviceId);

    // Pick theme preset based on global dark mode setting
    const theme = darkMode ? rackViewTheme.dark : rackViewTheme.light;

    // ESC to close — use capture phase + stopImmediatePropagation so
    // SelectedPortIndicator's ESC handler does NOT also clear the
    // port selection when the user simply wants to close Rack View.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopImmediatePropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', handler, true); // capture phase
        return () => window.removeEventListener('keydown', handler, true);
    }, [onClose]);

    if (!device) return null;

    const config = RACK_VIEW_CONFIGS[device.type];
    if (!config) return null;

    const def = getDeviceDefinition(device.type);
    const effectiveStatus = getEffectiveStatus(device);

    return (
        <div className={`fixed inset-0 z-[90] flex flex-col backdrop-blur-sm animate-in fade-in duration-200 ${
            darkMode ? 'bg-slate-950/95' : 'bg-slate-200/95'
        }`}>
            {/* ── Header ────────────────────────────────────── */}
            <div className={`flex items-center justify-between px-5 py-3 border-b ${
                darkMode
                    ? 'border-slate-800 bg-slate-900/80'
                    : 'border-slate-300 bg-white/80'
            }`}>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-slate-900 dark:text-white font-bold text-base">{device.name}</h2>
                        <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">—</span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm">{config.viewLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                        <div className={`w-2 h-2 rounded-full ${effectiveStatus.cssClass}`} />
                        <span className="text-xs text-slate-500 font-medium uppercase">{device.status}</span>
                    </div>
                    {/* Port selection indicator — inline in header */}
                    <div className="ml-4">
                        <PortSelectionBar currentDeviceId={deviceId} />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-600 hidden sm:block">
                        {device.ports.length} port{device.ports.length !== 1 ? 's' : ''} · {def.displayName}
                    </span>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${
                            darkMode
                                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                                : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                        }`}
                        title="Close (ESC)"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* ── 3D Canvas ─────────────────────────────────── */}
            <div className="flex-1 relative">
                {/* Inline notification (since Toast at z-60 is hidden under this z-90 overlay) */}
                <RackViewNotification />

                <Canvas shadows>
                    <Suspense fallback={null}>
                        <PerspectiveCamera
                            makeDefault
                            position={config.cameraPosition}
                            fov={40}
                        />
                        <OrbitControls
                            target={config.cameraTarget}
                            enablePan={false}
                            minDistance={0.5}
                            maxDistance={5}
                        />

                        {/* Scene background — adapts to theme */}
                        <color attach="background" args={[theme.sceneBackground]} />

                        {/* Lighting — adapts to theme for proper contrast */}
                        <ambientLight intensity={theme.ambientIntensity} />
                        <directionalLight position={[3, 5, 3]} intensity={theme.keyLightIntensity} castShadow />
                        <directionalLight position={[-2, 3, -2]} intensity={theme.fillLightIntensity} />
                        <directionalLight position={[0, 2, -3]} intensity={theme.rimLightIntensity} />

                        {/* Device model */}
                        <group>
                            <DeviceModel device={device} />

                            {/* Interactive ports with labels */}
                            {device.ports.map((port, index) => (
                                <RackViewPort
                                    key={port.id}
                                    device={device}
                                    port={port}
                                    index={index}
                                    isDark={darkMode}
                                />
                            ))}
                        </group>
                    </Suspense>
                </Canvas>

                {/* Drag hint */}
                <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-xs pointer-events-none ${
                    darkMode ? 'text-slate-600' : 'text-slate-400'
                }`}>
                    Click a port to select · Right-click to disconnect · Drag to rotate
                </div>
            </div>

            {/* ── Footer / Legend ────────────────────────────── */}
            <div className={`px-5 py-2.5 border-t flex items-center justify-between ${
                darkMode
                    ? 'border-slate-800 bg-slate-900/80'
                    : 'border-slate-300 bg-white/80'
            }`}>
                <PortLegend ports={device.ports} />
                <button
                    onClick={onClose}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors px-3 py-1"
                >
                    ESC to close
                </button>
            </div>
        </div>
    );
};
