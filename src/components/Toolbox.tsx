import { useState } from 'react';
import { useAppStore } from '../store';
import type { DeviceType } from '../types';
import {
    Monitor,
    Printer,
    Server,
    Router,
    Network,
    Box,
    Wifi,
    HelpCircle,
    Smartphone,
    Tablet,
    Plus,
    ChevronDown
} from 'lucide-react';

const DEVICE_CATEGORIES = {
    infrastructure: [
        { type: 'isp-modem', label: 'ISP Modem', icon: Box },
        { type: 'zyxel-router', label: 'Zyxel Router', icon: Router },
        { type: 'cradlepoint-router', label: 'Cradlepoint', icon: Router },
        { type: 'unmanaged-switch', label: 'Unmanaged Switch', icon: Network },
        { type: 'datto-ap440', label: 'Datto AP440', icon: Wifi },
        { type: 'datto-ap62', label: 'Datto AP62', icon: Wifi },
        { type: 'poe-injector', label: 'PoE Injector', icon: Box },
        { type: 'power-outlet', label: 'Power Outlet', icon: Box },
    ],
    endDevices: [
        { type: 'datavan-pos', label: 'Datavan POS', icon: Monitor },
        { type: 'poindus-pos', label: 'Poindus POS', icon: Monitor },
        { type: 'v3-pos', label: 'V3 POS', icon: Monitor },
        { type: 'v4-pos', label: 'V4 POS', icon: Monitor },
        { type: 'epson-thermal', label: 'Epson Thermal', icon: Printer },
        { type: 'epson-impact', label: 'Epson Impact', icon: Printer },
        { type: 'elo-kds', label: 'ELO KDS', icon: Server },
        { type: 'orderpad', label: 'Orderpad', icon: Tablet },
        { type: 'cakepop', label: 'CakePop', icon: Smartphone },
        { type: 'unknown', label: 'Unknown', icon: HelpCircle },
    ]
} as const;

export const Toolbox = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'infrastructure' | 'endDevices'>('infrastructure');
    const addDevice = useAppStore((state) => state.addDevice);

    const handleAddDevice = (type: DeviceType) => {
        addDevice(type);
        // Optional: show a toast or feedback
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-semibold transition-all hover:scale-105 z-10"
            >
                <Plus size={20} />
                Add Device
            </button>
        );
    }

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('infrastructure')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'infrastructure'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        Infrastructure
                    </button>
                    <button
                        onClick={() => setActiveTab('endDevices')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'endDevices'
                            ? 'bg-green-100 text-green-700'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        End Devices
                    </button>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                >
                    <ChevronDown size={20} />
                </button>
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                {DEVICE_CATEGORIES[activeTab].map((device) => (
                    <button
                        key={device.type}
                        onClick={() => handleAddDevice(device.type as DeviceType)}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-center group"
                    >
                        <div className={`p-2 rounded-lg ${activeTab === 'infrastructure' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                            } group-hover:scale-110 transition-transform`}>
                            <device.icon size={24} />
                        </div>
                        <span className="text-xs font-medium text-slate-700">{device.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
