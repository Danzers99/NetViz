import { useState } from 'react';
import { useAppStore } from '../store';
import type { DeviceType, RoomType } from '../types';
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
    ChevronDown,
    LayoutTemplate,
    Grid,
    Armchair,
    Utensils,
    Briefcase,
    Wine,
    Warehouse
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

const ROOM_TYPES: Array<{ type: RoomType, label: string, icon: any }> = [
    { type: 'kitchen', label: 'Kitchen', icon: Utensils },
    { type: 'dining', label: 'Dining', icon: Armchair },
    { type: 'office', label: 'Office', icon: Briefcase },
    { type: 'bar', label: 'Bar', icon: Wine },
    { type: 'storage', label: 'Storage', icon: Warehouse },
];

export const Toolbox = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'infrastructure' | 'endDevices'>('infrastructure');
    const addDevice = useAppStore((state) => state.addDevice);
    const layoutMode = useAppStore((state) => state.layoutMode);
    const toggleLayoutMode = useAppStore((state) => state.toggleLayoutMode);
    const addRoom = useAppStore((state) => state.addRoom);

    const handleAddDevice = (type: DeviceType) => {
        addDevice(type);
    };

    const handleAddRoom = (type: RoomType) => {
        addRoom(type);
    };

    if (!isOpen) {
        return (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 animate-in fade-in slide-in-from-bottom-4">
                <button
                    onClick={toggleLayoutMode}
                    className={`px-4 py-3 rounded-full shadow-lg flex items-center gap-2 font-semibold transition-all hover:scale-105 ${layoutMode
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                >
                    <Grid size={20} />
                    {layoutMode ? 'Layout ON' : 'Layout Mode'}
                </button>

                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-semibold transition-all hover:scale-105"
                >
                    <Plus size={20} />
                    {layoutMode ? 'Add Room' : 'Add Device'}
                </button>
            </div>
        );
    }

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
                <div className="flex gap-2">
                    {layoutMode ? (
                        <div className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700 flex items-center gap-2">
                            <LayoutTemplate size={16} />
                            Room Layout
                        </div>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleLayoutMode}
                        className={`p-2 rounded-lg transition-colors ${layoutMode
                                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                : 'text-slate-500 hover:bg-slate-100'
                            }`}
                        title="Toggle Layout Mode"
                    >
                        <Grid size={20} />
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                    >
                        <ChevronDown size={20} />
                    </button>
                </div>
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                {layoutMode ? (
                    ROOM_TYPES.map((room) => (
                        <button
                            key={room.type}
                            onClick={() => handleAddRoom(room.type)}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-center group"
                        >
                            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform">
                                <room.icon size={24} />
                            </div>
                            <span className="text-xs font-medium text-slate-700">{room.label}</span>
                        </button>
                    ))
                ) : (
                    DEVICE_CATEGORIES[activeTab].map((device) => (
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
                    ))
                )}
            </div>
        </div>
    );
};
