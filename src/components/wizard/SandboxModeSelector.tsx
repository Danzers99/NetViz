import { ArrowRight, Zap, List } from 'lucide-react';

interface SandboxModeSelectorProps {
    onSelectWizard: () => void;
    onSelectConnections: () => void;
    onBack: () => void;
}

export const SandboxModeSelector = ({
    onSelectWizard,
    onSelectConnections,
    onBack
}: SandboxModeSelectorProps) => {
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 text-center">
                Choose Your Setup Method
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-10 text-center max-w-lg">
                How would you like to build your network topology?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                {/* Option A: Guided Wizard */}
                <button
                    onClick={onSelectWizard}
                    className="group relative flex flex-col items-center p-8 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-400 hover:shadow-xl transition-all duration-300"
                >
                    <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full group-hover:scale-110 transition-transform duration-300">
                        <List size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        Guided Wizard
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-4">
                        Step-by-step setup with device counts. You'll manually place and connect devices in the sandbox.
                    </p>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                        Best for: Custom, specific layouts
                    </span>
                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500">
                        <ArrowRight size={24} />
                    </div>
                </button>

                {/* Option B: Build from Connections */}
                <button
                    onClick={onSelectConnections}
                    className="group relative flex flex-col items-center p-8 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-xl transition-all duration-300"
                >
                    <div className="mb-6 p-4 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-full group-hover:scale-110 transition-transform duration-300">
                        <Zap size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        Build from Connections
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-4">
                        Paste your device & connection list. We'll automatically build and arrange the topology.
                    </p>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                        Best for: Fast, standard setups
                    </span>
                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-violet-500">
                        <ArrowRight size={24} />
                    </div>
                </button>
            </div>

            {/* Back button */}
            <button
                onClick={onBack}
                className="mt-8 px-6 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
                ← Back to Welcome
            </button>
        </div>
    );
};
