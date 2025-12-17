import type { ComponentType } from 'react';
import { useAppStore } from '../store';
import type { DeviceType } from '../types';
import { Monitor, Printer, Server, Router, Network, Box, ArrowRight, Wifi, HelpCircle, Smartphone, Tablet } from 'lucide-react';

const DeviceInput = ({
    type,
    icon: Icon,
    label
}: {
    type: DeviceType;
    icon: ComponentType<{ size?: number; className?: string }>;
    label: string
}) => {
    const count = useAppStore((state) => state.deviceCounts[type]);
    const setDeviceCount = useAppStore((state) => state.setDeviceCount);

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 rounded-lg shrink-0">
                    <Icon size={20} />
                </div>
                <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm leading-tight">{label}</h3>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setDeviceCount(type, Math.max(0, count - 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold transition-colors"
                >
                    -
                </button>
                <input
                    type="number"
                    value={count}
                    onChange={(e) => setDeviceCount(type, Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 h-8 text-center border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-sm text-slate-900 dark:text-white"
                />
                <button
                    onClick={() => setDeviceCount(type, count + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold transition-colors"
                >
                    +
                </button>
            </div>
        </div>
    );
};

export const Wizard = () => {
    const generateSandbox = useAppStore((state) => state.generateSandbox);

    return (
        <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="flex-none pt-8 px-4 pb-6 text-center">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Network Visualizer Setup</h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Configure your network topology and devices.
                </p>
            </div>

            {/* Scrollable Content Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Infrastructure Section */}
                        <div className="space-y-4">
                            <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm py-2 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
                                <Router className="text-orange-500" />
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Infrastructure</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <DeviceInput type="isp-modem" icon={Box} label="ISP Modem" />
                                <DeviceInput type="zyxel-router" icon={Router} label="Zyxel Router" />
                                <DeviceInput type="cradlepoint-router" icon={Router} label="Cradlepoint Router" />
                                <DeviceInput type="unmanaged-switch" icon={Network} label="Unmanaged Switch" />
                                <DeviceInput type="datto-ap440" icon={Wifi} label="Datto AP440" />
                                <DeviceInput type="datto-ap62" icon={Wifi} label="Datto AP62" />
                                <DeviceInput type="poe-injector" icon={Box} label="PoE Injector" />
                                <DeviceInput type="power-outlet" icon={Box} label="Power Outlet" />
                            </div>
                        </div>

                        {/* End Devices Section */}
                        <div className="space-y-4">
                            <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm py-2 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
                                <Monitor className="text-green-600 dark:text-green-500" />
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">End Devices</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <DeviceInput type="datavan-pos" icon={Monitor} label="Datavan POS" />
                                <DeviceInput type="poindus-pos" icon={Monitor} label="Poindus POS" />
                                <DeviceInput type="v3-pos" icon={Monitor} label="V3 POS" />
                                <DeviceInput type="v4-pos" icon={Monitor} label="V4 POS" />
                                <DeviceInput type="epson-thermal" icon={Printer} label="Epson Thermal" />
                                <DeviceInput type="epson-impact" icon={Printer} label="Epson Impact" />
                                <DeviceInput type="elo-kds" icon={Server} label="ELO KDS" />
                                <DeviceInput type="orderpad" icon={Tablet} label="Orderpad (iPad)" />
                                <DeviceInput type="cakepop" icon={Smartphone} label="CakePop (M60)" />
                                <DeviceInput type="unknown" icon={HelpCircle} label="Unknown Device" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed Bottom CTA */}
            <div className="flex-none p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
                <button
                    onClick={generateSandbox}
                    className="group flex items-center gap-3 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                >
                    Start Sandbox
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
};
