import { useState } from 'react';
import { Html } from '@react-three/drei';
import { useAppStore } from '../store';
import type { Device, DeviceAction } from '../types';
import { isWifiCapable } from '../utils/wifi';

import { Trash2, Wifi, Settings, ArrowLeft, Save } from 'lucide-react';

interface DeviceActionMenuProps {
    device: Device;
    onClose: () => void;
}

type MenuState = 'main' | 'wifi_connect' | 'wifi_host' | 'identity';

const WifiConnectMenu = ({ device, onClose, onBack }: { device: Device, onClose: () => void, onBack: () => void }) => {
    const updateDevice = useAppStore((state) => state.updateDevice);

    const [ssid, setSsid] = useState(device.wireless?.ssid || '');
    const [password, setPassword] = useState(device.wireless?.password || '');
    const [status, setStatus] = useState<'idle' | 'connecting' | 'done'>('idle');

    // Use device state for feedback directly
    const connectionState = device.connectionState;

    const handleConnect = () => {
        if (!ssid) return;
        setStatus('connecting');

        // Simulate network negotiation delay
        setTimeout(() => {
            // We do NOT validate here. We let the device try to connect.
            // The simulation loop will determine connectionState (AuthFailed, etc.)

            updateDevice(device.id, {
                wireless: {
                    ssid: ssid,
                    password: password
                }
            });
            setStatus('done');
            // Do NOT close immediately. Let user see the result.
        }, 1200);
    };

    const getFeedback = () => {
        if (status === 'connecting') return null;
        if (status === 'idle') return null; // Initial state

        // After 'done'
        if (connectionState === 'online') {
            return <div className="text-green-600 dark:text-green-400 text-[11px] font-bold text-center bg-green-50 dark:bg-green-900/20 py-1 rounded">✅ Connected Successfully</div>;
        }
        if (connectionState === 'auth_failed') {
            return <div className="text-red-500 dark:text-red-400 text-[11px] font-bold text-center bg-red-50 dark:bg-red-900/20 py-1 rounded">❌ Authentication Failed</div>;
        }
        if (connectionState === 'associated_no_internet') {
            return <div className="text-amber-500 dark:text-amber-400 text-[11px] font-bold text-center bg-amber-50 dark:bg-amber-900/20 py-1 rounded">⚠️ No Internet Access</div>;
        }
        if (connectionState === 'disconnected') {
            // If we tried connecting but are still disconnected, it means SSID not found
            return <div className="text-slate-500 dark:text-slate-400 text-[11px] font-bold text-center bg-slate-100 dark:bg-slate-800 py-1 rounded">❌ Network Not Found</div>;
        }
        return null;
    };

    return (
        <div className="p-2 space-y-2">
            <div className="flex items-center gap-2 mb-2">
                <button onClick={onBack} className="hover:bg-slate-700 p-1 rounded">
                    <ArrowLeft size={14} />
                </button>
                <span className="font-bold text-xs uppercase text-slate-400">Connect to WiFi</span>
            </div>

            {getFeedback()}

            <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Network Name (SSID)</label>
                <input
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={ssid}
                    onChange={e => {
                        setSsid(e.target.value);
                        setStatus('idle'); // Reset status on edit
                    }}
                    placeholder="Enter SSID"
                    disabled={status === 'connecting'}
                />
            </div>
            <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Password</label>
                <input
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={password}
                    onChange={e => {
                        setPassword(e.target.value);
                        setStatus('idle');
                    }}
                    placeholder="Password"
                    type="text"
                    disabled={status === 'connecting'}
                />
            </div>

            <button
                onClick={handleConnect}
                className={`w-full text-white rounded py-1 text-xs flex items-center justify-center gap-1 mt-2
                    ${status === 'connecting' ? 'bg-slate-400 dark:bg-slate-600 cursor-wait' : 'bg-blue-600 hover:bg-blue-500'}
                    ${!ssid ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                disabled={status === 'connecting' || !ssid}
            >
                {status === 'connecting' ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <><Save size={12} /> {status === 'done' ? 'Update Network' : 'Join Network'}</>
                )}
            </button>
        </div >
    );
};

const WifiHostMenu = ({ device, onClose, onBack }: { device: Device, onClose: () => void, onBack: () => void }) => {
    const updateDevice = useAppStore((state) => state.updateDevice);

    // Edit the first config for now
    // We assume index 0 exists due to initialization
    const initialConfig = device.wifiHosting?.configs[0];

    const [ssid, setSsid] = useState(initialConfig?.ssid || 'CakeGuest');
    const [password, setPassword] = useState(initialConfig?.password || '');

    const handleSave = () => {
        updateDevice(device.id, {
            wifiHosting: {
                ...device.wifiHosting!,
                configs: [
                    {
                        ...device.wifiHosting!.configs[0],
                        ssid: ssid,
                        password: password
                    },
                    ...device.wifiHosting!.configs.slice(1)
                ]
            }
        });
        onClose();
    };

    return (
        <div className="p-2 space-y-2">
            <div className="flex items-center gap-2 mb-2">
                <button onClick={onBack} className="hover:bg-slate-700 p-1 rounded">
                    <ArrowLeft size={14} />
                </button>
                <span className="font-bold text-xs uppercase text-slate-400">Configure WiFi</span>
            </div>
            <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">SSID</label>
                <input
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={ssid}
                    onChange={e => setSsid(e.target.value)}
                    placeholder="SSID"
                />
            </div>
            <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Password</label>
                <input
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type="text"
                />
            </div>
            <button
                onClick={handleSave}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded py-1 text-xs flex items-center justify-center gap-1 mt-2"
            >
                <Save size={12} /> Save Settings
            </button>
        </div>
    );
};

export const DeviceActionMenu = ({ device, onClose }: DeviceActionMenuProps) => {
    const triggerAction = useAppStore((state) => state.triggerAction);
    const removeDevice = useAppStore((state) => state.removeDevice);
    const setPropertiesPanelDeviceId = useAppStore((state) => state.setPropertiesPanelDeviceId);

    const [view, setView] = useState<MenuState>('main');

    const handleAction = (action: DeviceAction) => {
        triggerAction(device.id, action);
        onClose();
    };

    const isWirelessClient = isWifiCapable(device.type);
    const isWirelessHost = !!device.wifiHosting;

    if (view === 'wifi_connect') return (
        <Html position={[0, 0.5, 0]} center zIndexRange={[100, 0]}>
            <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded shadow-xl flex flex-col min-w-[160px] overflow-hidden text-sm">
                <WifiConnectMenu device={device} onClose={onClose} onBack={() => setView('main')} />
            </div>
        </Html>
    );

    if (view === 'wifi_host') return (
        <Html position={[0, 0.5, 0]} center zIndexRange={[100, 0]}>
            <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded shadow-xl flex flex-col min-w-[160px] overflow-hidden text-sm">
                <WifiHostMenu device={device} onClose={onClose} onBack={() => setView('main')} />
            </div>
        </Html>
    );

    // Helper text for connection state
    const getConnectionText = () => {
        if (!device.connectionState) return 'Connect WiFi';
        switch (device.connectionState) {
            case 'online': return 'Online';
            case 'associated_no_internet': return 'No Internet';
            case 'associated_no_ip': return 'No IP';
            case 'auth_failed': return 'Auth Failed';
            case 'associating_wifi': return 'Associating...';
            case 'disconnected': return 'Disconnected';
            default: return 'Connect WiFi';
        }
    };

    // Status color
    const getConnectionColor = () => {
        if (!device.connectionState) return 'text-sky-600 dark:text-sky-400';
        if (device.connectionState === 'online') return 'text-green-600 dark:text-green-400';
        if (device.connectionState === 'auth_failed') return 'text-red-500 dark:text-red-400';
        if (device.connectionState === 'disconnected') return 'text-slate-400 dark:text-slate-400';
        return 'text-amber-500 dark:text-amber-400';
    };

    return (
        <Html position={[0, 0.5, 0]} center zIndexRange={[100, 0]}>
            <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 rounded shadow-xl flex flex-col min-w-[140px] overflow-hidden text-sm">
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {device.name}
                </div>

                <button
                    onClick={() => {
                        setPropertiesPanelDeviceId(device.id);
                        onClose();
                    }}
                    className="px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-slate-700 dark:text-slate-200"
                >
                    <Settings size={14} />
                    Properties
                </button>
                <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>

                {isWirelessClient && (
                    <button
                        onClick={() => setView('wifi_connect')}
                        className={`px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 ${getConnectionColor()}`}
                    >
                        <Wifi size={14} />
                        {getConnectionText()}
                    </button>
                )}

                {isWirelessHost && (
                    <button
                        onClick={() => setView('wifi_host')}
                        className="px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-amber-600 dark:text-amber-400"
                    >
                        <Settings size={14} />
                        Configure ID & WiFi
                    </button>
                )}

                <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>



                <button
                    onClick={() => handleAction('power_cycle')}
                    className="px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-slate-700 dark:text-slate-200"
                >
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Power Cycle
                </button>

                <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>

                {device.status === 'online' || device.status === 'booting' ? (
                    <button
                        onClick={() => handleAction('power_off')}
                        className="px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-slate-500 dark:text-slate-300"
                    >
                        Power Off
                    </button>
                ) : (
                    <button
                        onClick={() => handleAction('power_on')}
                        className="px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold"
                    >
                        Power On
                    </button>
                )}

                <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>

                <button
                    onClick={() => {
                        removeDevice(device.id);
                        onClose();
                    }}
                    className="px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                >
                    <Trash2 size={14} />
                    Remove Device
                </button>

                <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>

                <button
                    onClick={onClose}
                    className="px-3 py-1 text-center hover:bg-slate-100 dark:hover:bg-slate-700 text-xs text-slate-400 dark:text-slate-500"
                >
                    Close
                </button>
            </div>
        </Html>
    );
};
