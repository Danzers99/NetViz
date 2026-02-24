import { useState } from 'react';
import { X, Settings as SettingsIcon, Play, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store';

interface SectionProps {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

const CollapsibleSection = ({ title, defaultOpen = true, children }: SectionProps) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-1.5 group cursor-pointer"
            >
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
                    {title}
                </h3>
                <span className="text-slate-400 group-hover:text-slate-500 transition-colors">
                    {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
            </button>
            <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${open ? 'max-h-[600px] opacity-100 mt-3' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="space-y-3">
                    {children}
                </div>
            </div>
        </div>
    );
};

interface ToggleRowProps {
    label: string;
    description?: string;
    shortcut?: string;
    active: boolean;
    onToggle: () => void;
}

const ToggleRow = ({ label, description, shortcut, active, onToggle }: ToggleRowProps) => (
    <div className="flex items-center justify-between">
        <div className="min-w-0 mr-3">
            <label className="text-slate-700 dark:text-slate-300 text-sm font-medium block">{label}</label>
            {description && <span className="text-[10px] text-slate-400 leading-tight">{description}</span>}
            {shortcut && <span className="text-[10px] text-slate-400 font-mono">{shortcut}</span>}
        </div>
        <button
            onClick={onToggle}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${active ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-600'
                }`}
        >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${active ? 'left-6' : 'left-1'
                }`} />
        </button>
    </div>
);

export const SettingsPanel = ({ onClose }: { onClose: () => void }) => {
    const settings = useAppStore((state) => state.settings);
    const updateSettings = useAppStore((state) => state.updateSettings);

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-700 flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
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

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* ── Visuals ── */}
                <CollapsibleSection title="Visuals">
                    <ToggleRow
                        label="Device Names"
                        shortcut="Shortcut: N"
                        active={!!settings.showDeviceNames}
                        onToggle={() => settings.showDeviceNames !== undefined && useAppStore.getState().toggleShowDeviceNames()}
                    />
                    <ToggleRow
                        label="Room Names"
                        shortcut="Shortcut: Shift + R"
                        active={!!settings.showRoomNames}
                        onToggle={() => settings.showRoomNames !== undefined && useAppStore.getState().toggleShowRoomNames()}
                    />
                    <ToggleRow
                        label="Dark Mode"
                        active={!!settings.darkMode}
                        onToggle={() => updateSettings({ darkMode: !settings.darkMode })}
                    />
                    <ToggleRow
                        label="Link Animation"
                        description="Animate links around selected device"
                        active={!!settings.enableLinkAnimation}
                        onToggle={() => {
                            const current = settings.enableLinkAnimation;
                            updateSettings({ enableLinkAnimation: !current });
                            const store = useAppStore.getState();
                            if (!current) {
                                store.setPacketFlowMode('troubleshoot');
                            } else {
                                store.setPacketFlowMode('off');
                            }
                        }}
                    />
                    <ToggleRow
                        label="Show Warnings"
                        active={!!settings.showWarnings}
                        onToggle={() => updateSettings({ showWarnings: !settings.showWarnings })}
                    />
                    <ToggleRow
                        label="Compact Warnings"
                        active={!!settings.compactWarnings}
                        onToggle={() => updateSettings({ compactWarnings: !settings.compactWarnings })}
                    />
                    <ToggleRow
                        label="Show Wi-Fi Coverage"
                        description="Visual range for APs"
                        active={!!settings.showWifiCoverage}
                        onToggle={() => updateSettings({ showWifiCoverage: !settings.showWifiCoverage })}
                    />
                </CollapsibleSection>

                <hr className="border-slate-100 dark:border-slate-700" />

                {/* ── Project ── */}
                <CollapsibleSection title="Project">
                    <div className="space-y-2">
                        <label className="text-slate-700 dark:text-slate-300 font-medium text-sm flex justify-between">
                            <span>Scale Calibration</span>
                            <span className="text-slate-400 font-normal">1 Grid Unit = {settings.canvasScale || 5} ft</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="1"
                                max="20"
                                step="0.5"
                                value={settings.canvasScale || 5}
                                onChange={(e) => updateSettings({ canvasScale: parseFloat(e.target.value) })}
                                className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                            <input
                                type="number"
                                min="1"
                                max="50"
                                value={settings.canvasScale || 5}
                                onChange={(e) => updateSettings({ canvasScale: parseFloat(e.target.value) })}
                                className="w-12 text-center p-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                            />
                            <span className="text-xs text-slate-500">ft</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            Adjusts the physical scale of the grid for accurate coverage visualization.
                        </p>
                    </div>
                </CollapsibleSection>

                <hr className="border-slate-100 dark:border-slate-700" />

                {/* ── Camera ── */}
                <CollapsibleSection title="Camera">
                    <div className="flex items-center justify-between">
                        <label className="text-slate-700 dark:text-slate-300 font-medium text-sm">Reset View</label>
                        <button
                            onClick={() => useAppStore.getState().triggerCameraReset()}
                            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors"
                        >
                            Center
                        </button>
                    </div>
                </CollapsibleSection>

                <hr className="border-slate-100 dark:border-slate-700" />

                {/* ── Help & About ── */}
                <CollapsibleSection title="Help & About">
                    <div className="flex items-center justify-between">
                        <label className="text-slate-700 dark:text-slate-300 font-medium text-sm flex items-center gap-2">
                            Replay Intro
                        </label>
                        <button
                            onClick={() => {
                                useAppStore.getState().setHasSeenIntro(false);
                                onClose();
                            }}
                            className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded text-sm text-blue-600 dark:text-blue-400 font-medium transition-colors flex items-center gap-2"
                        >
                            <Play size={14} />
                            Replay
                        </button>
                    </div>
                </CollapsibleSection>
            </div>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 text-center flex-shrink-0">
                <p className="text-xs text-slate-400">Created by David Morales</p>
                <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">NetViz v{__APP_VERSION__}</p>
            </div>
        </div >
    );
};
