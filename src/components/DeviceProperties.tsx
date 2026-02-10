import { X } from 'lucide-react';
import { useAppStore } from '../store';

export const DeviceProperties = () => {
    const propertiesPanelDeviceId = useAppStore((state) => state.propertiesPanelDeviceId);
    const setPropertiesPanelDeviceId = useAppStore((state) => state.setPropertiesPanelDeviceId);
    const updateDevice = useAppStore((state) => state.updateDevice);
    const devices = useAppStore((state) => state.devices);
    const setNotification = useAppStore((state) => state.setNotification);

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
                            title="Reset to Automatic. Device will only come online if powered."
                            onClick={() => {
                                updateDevice(device.id, { overrideStatus: null });
                                // Feedback check: if device has no power, it will be offline.
                                // We can't check 'new' status here easily without async/wait for store update.
                                // But we can check if it currently has power? No, logic is complex.
                                // Let's just set it. The simulations runs immediately in store.
                            }}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${device.status === 'online'
                                ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                                }`}
                        >
                            Online
                        </button>
                        <button
                            title="Force Device OFF. Simulates power failure or shutdown."
                            onClick={() => updateDevice(device.id, { overrideStatus: 'offline' })}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${device.status === 'offline'
                                ? 'bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                                }`}
                        >
                            Offline
                        </button>
                        <button
                            title="Force Device into Booting state."
                            onClick={() => updateDevice(device.id, { overrideStatus: 'booting' })}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${device.status === 'booting'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                                }`}
                        >
                            Booting
                        </button>
                        <button
                            title="Force Device into Error state."
                            onClick={() => updateDevice(device.id, { overrideStatus: 'error' })}
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
                {/* Connections */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Connections</label>
                    <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 space-y-2">
                        {/* List Existing Cable Connections */}
                        {device.ports
                            .filter(p => p.connectedTo)
                            .map(p => {
                                const connectedPortId = p.connectedTo!;
                                const targetDevice = devices.find(d => d.ports.some(dp => dp.id === connectedPortId));
                                return (
                                    <div key={p.id} className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-600">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-600 dark:text-slate-400">{p.name} ({p.role})</span>
                                            <span className="text-slate-800 dark:text-slate-200">→ {targetDevice?.name}</span>
                                        </div>
                                        <button
                                            onClick={() => useAppStore.getState().disconnectPort(p.id)}
                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                );
                            })
                        }

                        {/* Add New Connection */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Connect to...</label>
                            <select
                                className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                                onChange={(e) => {
                                    const targetId = e.target.value;
                                    if (!targetId) return;

                                    const targetDevice = devices.find(d => d.id === targetId);
                                    if (!targetDevice) return;

                                    // Auto-find first available compatible ports
                                    // Logic: If this device has free 'generic'/'lan'/'access' port, and target looks free...
                                    // Simplified approach: Find FIRST null connectedTo port on Source that matches role logic?
                                    // Or just find *any* free pair since validation handles the rest.

                                    const sourcePort = device.ports.find(p => !p.connectedTo && p.role !== 'wan'); // Prefer LAN/Access
                                    // Fallback
                                    const sourcePortFinal = sourcePort || device.ports.find(p => !p.connectedTo);

                                    const targetPort = targetDevice.ports.find(p => !p.connectedTo);

                                    if (sourcePortFinal && targetPort) {
                                        useAppStore.getState().connectPorts(sourcePortFinal.id, targetPort.id);
                                        // Reset select
                                        e.target.value = "";
                                        // Check if connectPorts set an error notification (e.g. power/data mismatch)
                                        const currentNotification = useAppStore.getState().notification;
                                        if (!currentNotification || currentNotification.type !== 'error') {
                                            setNotification({ message: `Connected ${sourcePortFinal.name} → ${targetDevice.name} (${targetPort.name})`, type: 'success' });
                                        }
                                    } else {
                                        setNotification({ message: 'No free ports available on one or both devices.', type: 'error' });
                                        e.target.value = "";
                                    }
                                }}
                                value=""
                            >
                                <option value="">Select a device...</option>
                                {devices
                                    .filter(d => d.id !== device.id) // Can't connect to self
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map(d => (
                                        <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
                                    ))
                                }
                            </select>
                        </div>
                    </div>
                </div>

            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-400 text-center">
                ID: {device.id}
            </div>
        </div>
    );
};
