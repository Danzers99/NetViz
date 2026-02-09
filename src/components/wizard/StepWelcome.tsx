import { ArrowRight, Upload, PlaySquare } from 'lucide-react';

interface StepWelcomeProps {
    onStartNew: () => void;
    onLoadPrevious: () => void;
}

export const StepWelcome = ({ onStartNew, onLoadPrevious }: StepWelcomeProps) => {
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 text-center">
                Welcome to NetViz
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-12 text-center max-w-lg text-lg">
                Design, visualize, and simulate your store network.
                <br />
                Start from scratch using a guided setup or build instantly from device connections.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                {/* Option A: Load Configuration */}
                <button
                    onClick={onLoadPrevious}
                    className="group relative flex flex-col items-center p-8 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left"
                >
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full group-hover:scale-110 transition-transform duration-300">
                        <Upload size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        Load Configuration
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
                        Import a previously saved JSON configuration file to resume your work.
                    </p>
                </button>

                {/* Option B: Start New Sandbox */}
                <button
                    onClick={onStartNew}
                    className="group relative flex flex-col items-center p-8 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-400 hover:shadow-xl transition-all duration-300 text-left"
                >
                    <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full group-hover:scale-110 transition-transform duration-300">
                        <PlaySquare size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        Start New Sandbox
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
                        Create a fresh network topology using our guided wizard or connection data.
                    </p>
                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500">
                        <ArrowRight size={24} />
                    </div>
                </button>
            </div>
        </div>
    );
};
