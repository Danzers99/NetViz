import { X, Settings as SettingsIcon } from 'lucide-react';
import { useAppStore } from '../store';

export const SettingsPanel = ({ onClose }: { onClose: () => void }) => {
    const settings = useAppStore((state) => state.settings);
    const updateSettings = useAppStore((state) => state.updateSettings);

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <SettingsIcon size={20} />
                    <h2 className="font-bold text-lg">Settings</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="p-6 space-y-8">
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Visuals</h3>

                    <div className="flex items-center justify-between">
                        <label className="text-slate-700 dark:text-slate-300 font-medium">Dark Mode</label>
                        <button
                            onClick={() => updateSettings({ darkMode: !settings.darkMode })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${settings.darkMode ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-600'
                                }`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.darkMode ? 'left-7' : 'left-1'
                                }`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="text-slate-700 dark:text-slate-300 font-medium">Show Warnings</label>
                        <button
                            onClick={() => updateSettings({ showWarnings: !settings.showWarnings })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${settings.showWarnings ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-600'
                                }`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.showWarnings ? 'left-7' : 'left-1'
                                }`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="text-slate-700 dark:text-slate-300 font-medium">Compact Warnings</label>
                        <button
                            onClick={() => updateSettings({ compactWarnings: !settings.compactWarnings })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${settings.compactWarnings ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-600'
                                }`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.compactWarnings ? 'left-7' : 'left-1'
                                }`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 text-center">
                <p className="text-xs text-slate-400">Created by David Morales</p>
                <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">NetViz v{__APP_VERSION__}</p>
            </div>
        </div>
    );
};
