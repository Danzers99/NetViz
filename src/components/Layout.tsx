import { useState, useRef, type ReactNode } from 'react';
import { useAppStore } from '../store';
import { LayoutGrid, Settings, HelpCircle, RotateCcw, Download, Upload } from 'lucide-react';
import { Alerts } from './Alerts';
import { SettingsPanel } from './SettingsPanel';
import { DeviceProperties } from './DeviceProperties';
import { SelectedPortIndicator } from './SelectedPortIndicator';
import { RuntimeNotifications } from './RuntimeNotifications';
import { Toast } from './Toast';
import { useEffect } from 'react';


export const Layout = ({ children }: { children: ReactNode }) => {
    const reset = useAppStore((state) => state.reset);
    const step = useAppStore((state) => state.step);
    const exportConfig = useAppStore((state) => state.exportConfig);
    const importConfig = useAppStore((state) => state.importConfig);
    const darkMode = useAppStore((state) => state.settings.darkMode);
    const [showSettings, setShowSettings] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        const config = exportConfig();
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `netviz-config-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans relative overflow-hidden">


            <Toast />

            {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

            <DeviceProperties />

            {/* Sidebar */}
            <div className="w-16 md:w-64 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex flex-col border-r border-slate-200 dark:border-slate-700 z-30 relative">
                <div className="p-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/30">
                        N
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white hidden md:block tracking-tight">NetViz</span>
                </div>

                <nav className="flex-1 p-2 space-y-1">
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium">
                        <LayoutGrid size={20} />
                        <span className="hidden md:block">Visualizer</span>
                    </button>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium ${showSettings ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                    >
                        <Settings size={20} />
                        <span className="hidden md:block">Settings</span>
                    </button>
                </nav>

                <div className="p-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                    {step === 'sandbox' && (
                        <>
                            <button
                                onClick={handleSave}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium"
                                title="Save Configuration"
                            >
                                <Download size={20} />
                                <span className="hidden md:block">Save</span>
                            </button>
                            <button
                                onClick={handleLoadClick}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium"
                                title="Load Configuration"
                            >
                                <Upload size={20} />
                                <span className="hidden md:block">Load</span>
                            </button>
                            <button
                                onClick={reset}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                            >
                                <RotateCcw size={20} />
                                <span className="hidden md:block">Reset</span>
                            </button>
                        </>
                    )}
                    <a
                        href="https://app.getguru.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium text-slate-600 dark:text-slate-400"
                    >
                        <HelpCircle size={20} />
                        <span className="hidden md:block">Help</span>
                    </a>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-slate-900">
                {/* Responsive HUD Container */}
                <div className="absolute top-0 left-0 w-full z-50 pointer-events-none p-4 flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Left: Alerts & Notifications */}
                    <div className="flex flex-col gap-2 items-start max-w-md w-full sm:w-auto">
                        <Alerts />
                        <RuntimeNotifications />
                    </div>

                    {/* Center/Right (moves to new row on mobile): Selected Port Indicator */}
                    <div className="flex-1 flex justify-center sm:justify-center">
                        {step === 'sandbox' && <SelectedPortIndicator />}
                    </div>

                    {/* Spacer for symmetry if needed, or just let flex handle it */}
                    <div className="hidden sm:block w-0 sm:w-auto flex-1"></div>
                </div>
                {children}
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
