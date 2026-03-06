import { useState, useRef, type ReactNode } from 'react';
import { useAppStore } from '../store';
import { LayoutGrid, Settings, HelpCircle, RotateCcw, Save as SaveIcon, FolderOpen, History, Database } from 'lucide-react';
import { NetworkDiagram } from './NetworkDiagram';
import { RackView } from './RackView';
import { HelpPanel } from './HelpPanel';
import { Alerts } from './Alerts';
import { SettingsPanel } from './SettingsPanel';
import { DeviceProperties } from './DeviceProperties';
import { SelectedPortIndicator } from './SelectedPortIndicator';
import { RuntimeNotifications } from './RuntimeNotifications';
import { Toast } from './Toast';
import { useEffect } from 'react';
import { SaveDialog } from './SaveDialog';
import { HistoryPanel } from './HistoryPanel';
import { AccountsPage } from './AccountsPage';
import { SupportCodeModal } from './SupportCodeModal';
import { CloudSyncIndicator } from './CloudSyncIndicator';
import { generateUUID } from '../utils/uuid';
import type { Revision } from '../types';


export const Layout = ({ children }: { children: ReactNode }) => {
    const reset = useAppStore((state) => state.reset);
    const step = useAppStore((state) => state.step);
    const exportConfig = useAppStore((state) => state.exportConfig);
    const importConfig = useAppStore((state) => state.importConfig);
    const devices = useAppStore((state) => state.devices);
    const rooms = useAppStore((state) => state.rooms);
    const addRevision = useAppStore((state) => state.addRevision);
    const darkMode = useAppStore((state) => state.settings.darkMode);

    const isHistoryOpen = useAppStore((state) => state.isHistoryOpen);
    const setHistoryOpen = useAppStore((state) => state.setHistoryOpen);
    const isSettingsOpen = useAppStore((state) => state.isSettingsOpen);
    const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
    const isSupportMode = useAppStore((state) => state.isSupportMode);
    const activeView = useAppStore((state) => state.activeView);
    const setActiveView = useAppStore((state) => state.setActiveView);

    const showDiagram = useAppStore((state) => state.showDiagram);
    const setShowDiagram = useAppStore((state) => state.setShowDiagram);
    const rackViewDeviceId = useAppStore((state) => state.rackViewDeviceId);
    const setRackViewDeviceId = useAppStore((state) => state.setRackViewDeviceId);

    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [pendingAutoSummary, setPendingAutoSummary] = useState('');
    const [showSupportCodeModal, setShowSupportCodeModal] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // Hidden unlock: Shift+click logo 5 times
    const [shiftClickCount, setShiftClickCount] = useState(0);
    const shiftClickTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const lastSavedDevicesRef = useRef<string>('');

    const handleLogoClick = (e: React.MouseEvent) => {
        if (!e.shiftKey) return;
        clearTimeout(shiftClickTimerRef.current);
        const newCount = shiftClickCount + 1;
        if (newCount >= 5) {
            setShiftClickCount(0);
            setShowSupportCodeModal(true);
        } else {
            setShiftClickCount(newCount);
            shiftClickTimerRef.current = setTimeout(() => setShiftClickCount(0), 3000);
        }
    };

    // Commit a revision to the store (always happens on save)
    const commitRevision = (manualNote: string) => {
        const currentSettings = useAppStore.getState().settings;

        const stats = {
            deviceCount: devices.length,
            roomCount: rooms.length,
            cableCount: devices.reduce((acc, d) => acc + d.ports.filter(p => p.connectedTo).length, 0) / 2
        };

        const revision: Revision = {
            id: generateUUID(),
            timestamp: Date.now(),
            author: currentSettings.userName || 'Unknown User',
            summary: pendingAutoSummary,
            manualNote: manualNote,
            stats
        };

        addRevision(revision);
    };

    // Download a local JSON file copy
    const downloadLocalCopy = () => {
        const config = exportConfig();
        const projectName = config.projectInfo.name || "Untitled_Location";
        const sanitizedName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40);
        const dateStr = new Date().toISOString().slice(0, 10);
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;

        const filename = `NetViz_${sanitizedName}_${dateStr}_${timeStr}.json`;

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Update baseline for unsaved changes
        lastSavedDevicesRef.current = JSON.stringify(config.devices);
    };

    const handleSaveClick = () => {
        // Calculate summary immediately when clicking save
        const currentSessionChanges = useAppStore.getState().sessionChanges;
        const summaryArr = Array.from(currentSessionChanges);
        const summary = summaryArr.length > 0
            ? summaryArr.join(', ') + " modified"
            : "No significant changes detected";

        setPendingAutoSummary(summary);
        setShowSaveDialog(true);
    };

    const handleLoadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const config = JSON.parse(event.target?.result as string);
                importConfig(config);
                // Update baseline for unsaved changes
                lastSavedDevicesRef.current = JSON.stringify(config.devices);
            } catch (error) {
                console.error('Failed to load config', error);
                alert('Failed to load configuration file');
            }
        };
        reader.readAsText(file);
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    // Track initial state when entering sandbox
    useEffect(() => {
        if (step === 'sandbox') {
            lastSavedDevicesRef.current = JSON.stringify(devices);
        }
    }, [step]); // Only update on step change (Generate/Load)

    // Warn on unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (step !== 'sandbox') return;

            const current = JSON.stringify(devices);
            if (current !== lastSavedDevicesRef.current) {
                e.preventDefault();
                e.returnValue = ''; // Legacy requirement for Chrome
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [devices, step]);

    // Close history if we leave sandbox mode
    useEffect(() => {
        if (step !== 'sandbox' && isHistoryOpen) {
            setHistoryOpen(false);
        }
    }, [step, isHistoryOpen, setHistoryOpen]);

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans relative overflow-hidden">
            <SaveDialog
                isOpen={showSaveDialog}
                autoSummary={pendingAutoSummary}
                onSave={(note, options) => {
                    setShowSaveDialog(false);
                    setTimeout(() => {
                        // 1. Always commit the revision to history
                        commitRevision(note);

                        // 2. Cloud sync (if requested)
                        if (options?.cloudSync) {
                            useAppStore.getState().saveToAccountsFromDialog(
                                options.cloudSync.name,
                                options.cloudSync.cakeId
                            );
                        }

                        // 3. Local file download (if requested)
                        if (options?.downloadLocal) {
                            downloadLocalCopy();
                        }

                        // Update baseline even without download (revision committed = baseline updated)
                        if (!options?.downloadLocal) {
                            const config = exportConfig();
                            lastSavedDevicesRef.current = JSON.stringify(config.devices);
                        }
                    }, 0);
                }}
                onCancel={() => setShowSaveDialog(false)}
            />

            {showSupportCodeModal && (
                <SupportCodeModal onClose={() => setShowSupportCodeModal(false)} />
            )}

            {isSettingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
            {isHistoryOpen && step === 'sandbox' && <HistoryPanel onClose={() => setHistoryOpen(false)} />}
            {showDiagram && <NetworkDiagram onClose={() => setShowDiagram(false)} />}
            {rackViewDeviceId && <RackView deviceId={rackViewDeviceId} onClose={() => setRackViewDeviceId(null)} />}
            {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

            <DeviceProperties />

            {/* Sidebar */}
            <div className="w-16 md:w-64 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex flex-col border-r border-slate-200 dark:border-slate-700 z-30 relative">
                <div
                    className="p-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 cursor-default select-none"
                    onClick={handleLogoClick}
                >
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/30">
                        N
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white hidden md:block tracking-tight">NetViz</span>
                    {isSupportMode && (
                        <span className="ml-auto text-[9px] font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded hidden md:block">
                            SUPPORT
                        </span>
                    )}
                </div>

                <nav className="flex-1 p-2 space-y-1">
                    <button
                        onClick={() => setActiveView('visualizer')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                            activeView === 'visualizer'
                                ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        <LayoutGrid size={20} />
                        <span className="hidden md:block">Visualizer</span>
                    </button>

                    <button
                        onClick={() => setSettingsOpen(!isSettingsOpen)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium ${isSettingsOpen ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                    >
                        <Settings size={20} />
                        <span className="hidden md:block">Settings</span>
                    </button>

                    {step === 'sandbox' && activeView === 'visualizer' && (
                        <button
                            onClick={() => setHistoryOpen(!isHistoryOpen)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium ${isHistoryOpen ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                        >
                            <History size={20} />
                            <span className="hidden md:block">History</span>
                        </button>
                    )}

                    {isSupportMode && (
                        <button
                            onClick={() => setActiveView(activeView === 'accounts' ? 'visualizer' : 'accounts')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium ${
                                activeView === 'accounts'
                                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Database size={20} />
                            <span className="hidden md:block">Accounts</span>
                        </button>
                    )}
                </nav>

                <div className="p-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                    {step === 'sandbox' && activeView === 'visualizer' && (
                        <>
                            <button
                                onClick={handleSaveClick}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium"
                                title="Save Configuration"
                            >
                                <SaveIcon size={20} />
                                <span className="hidden md:block">Save</span>
                            </button>
                            <button
                                onClick={handleLoadClick}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium"
                                title="Load Configuration"
                            >
                                <FolderOpen size={20} />
                                <span className="hidden md:block">Load</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm('Reset will discard all devices, rooms, and revision history. Continue?')) {
                                        reset();
                                    }
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                            >
                                <RotateCcw size={20} />
                                <span className="hidden md:block">Reset</span>
                            </button>
                        </>
                    )}
                    {isSupportMode && step === 'sandbox' && (
                        <CloudSyncIndicator />
                    )}
                    <button
                        onClick={() => setShowHelp(true)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium text-slate-600 dark:text-slate-400"
                    >
                        <HelpCircle size={20} />
                        <span className="hidden md:block">Help</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-slate-900 flex flex-col">
                {activeView === 'visualizer' ? (
                    <>
                        {/* Responsive HUD Container */}
                        <div className="absolute top-0 left-0 w-full z-50 pointer-events-none p-4 flex flex-col sm:flex-row sm:items-start gap-4">
                            {/* Left: Alerts & Notifications */}
                            <div className="flex flex-col gap-2 items-start max-w-md w-full sm:w-auto">
                                <Alerts />
                                <RuntimeNotifications />
                            </div>
                        </div>
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none z-10">
                            {step === 'sandbox' && <SelectedPortIndicator />}
                        </div>
                        <Toast />
                        {children}
                    </>
                ) : (
                    <>
                        <Toast />
                        <AccountsPage />
                    </>
                )}
            </main>

            <input
                id="config-input"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
            />
        </div>
    );
};
