import { X } from 'lucide-react';
import { useAppStore } from '../store';

export const DeviceProperties = () => {
    const propertiesPanelDeviceId = useAppStore((state) => state.propertiesPanelDeviceId);
    const setPropertiesPanelDeviceId = useAppStore((state) => state.setPropertiesPanelDeviceId);
    const updateDevice = useAppStore((state) => state.updateDevice);
    const devices = useAppStore((state) => state.devices);

    const device = devices.find(d => d.id === propertiesPanelDeviceId);

    if (!device) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex flex-col">
                    <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">{device.name}</h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{device.type}</span>
                </div>
                <button
                    onClick={() => setPropertiesPanelDeviceId(null)}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Status */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</label>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => updateDevice(device.id, { status: 'online' })}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${device.status === 'online'
                                ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                                }`}
                        >
                            Online
                        </button>
                        <button
                            onClick={() => updateDevice(device.id, { status: 'offline' })}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${device.status === 'offline'
                                ? 'bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                                }`}
                        >
                            Offline
                        </button>
                        <button
                            onClick={() => updateDevice(device.id, { status: 'booting' })}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${device.status === 'booting'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                                }`}
                        >
                            Booting
                        </button>
                        <button
                            onClick={() => updateDevice(device.id, { status: 'error' })}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${device.status === 'error'
                                ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                                }`}
                        >
                            Error
                        </button>
                    </div>
                </div>

                {/* IP Address */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">IP Address</label>
                    <input
                        type="text"
                        value={device.ip || ''}
                        onChange={(e) => updateDevice(device.id, { ip: e.target.value })}
                        placeholder="e.g. 192.168.1.50"
                        className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-mono bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notes</label>
                    <textarea
                        value={device.notes || ''}
                        onChange={(e) => updateDevice(device.id, { notes: e.target.value })}
                        placeholder="Add notes about this device..."
                        rows={4}
                        className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-400 text-center">
                ID: {device.id}
            </div>
        </div>
    );
};
