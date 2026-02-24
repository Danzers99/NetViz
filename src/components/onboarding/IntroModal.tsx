import { useState } from 'react';
import { useAppStore } from '../../store';
import { X, ArrowRight, Check, Network, Save, ShieldCheck, Box, LayoutGrid, AlertTriangle, Route, Wifi } from 'lucide-react';

export const IntroModal = () => {
    const [slideIndex, setSlideIndex] = useState(0);
    const [nameInput, setNameInput] = useState('');
    const setHasSeenIntro = useAppStore(state => state.setHasSeenIntro);
    const setUserName = useAppStore(state => state.setUserName);

    const handleDismiss = () => {
        setHasSeenIntro(true);
    };

    const handleFinish = () => {
        if (nameInput.trim()) {
            setUserName(nameInput.trim());
        }
        setHasSeenIntro(true);
    };

    const slides = [
        // Slide 1: Welcome — dual-view paradigm
        {
            icon: Network,
            title: "Welcome to NetViz",
            subtitle: "Your network, two ways.",
            content: (
                <div className="space-y-4 text-left">
                    <p className="text-slate-600 dark:text-slate-300 text-center text-sm">
                        Map and troubleshoot retail network topologies.
                    </p>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded text-orange-600 shrink-0">
                            <Box size={18} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">3D Sandbox</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Build, wire, and arrange devices in an interactive 3D environment.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded text-blue-600 shrink-0">
                            <LayoutGrid size={18} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">2D Diagram</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Auto-generated topology you can drag, edit, and export as PNG.</p>
                        </div>
                    </div>
                </div>
            )
        },
        // Slide 2: Smart Diagnostics — NEW
        {
            icon: ShieldCheck,
            title: "Built-in Intelligence",
            subtitle: "Your network checks itself.",
            content: (
                <div className="space-y-4 text-left">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded text-amber-600 shrink-0">
                            <AlertTriangle size={18} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Warnings</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Real-time alerts for misconfigurations and capacity issues.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded text-emerald-600 shrink-0">
                            <Route size={18} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Trace to Internet</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Visualize the data path from any device to the WAN.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-cyan-100 dark:bg-cyan-900/20 rounded text-cyan-600 shrink-0">
                            <Wifi size={18} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Wi-Fi Coverage</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Signal visualization with wall-aware attenuation.</p>
                        </div>
                    </div>
                </div>
            )
        },
        // Slide 3: Save & Share
        {
            icon: Save,
            title: "Living Documents",
            subtitle: "Save, share, iterate.",
            content: (
                <div className="space-y-4 text-left">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded text-emerald-600 shrink-0">
                            <Save size={18} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Portable JSON</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Save your entire topology to a file. Reload anywhere, anytime.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-violet-100 dark:bg-violet-900/20 rounded text-violet-600 shrink-0">
                            <Check size={18} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Revision History</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Every save records who changed what. Your name helps attribute changes.</p>
                        </div>
                    </div>
                </div>
            )
        },
        // Slide 4: Identity (unchanged)
        {
            icon: Save,
            title: "One last thing...",
            subtitle: "Who are you?",
            content: (
                <div className="space-y-4">
                    <p className="text-center text-slate-600 dark:text-slate-300 text-sm">
                        We track changes in this session. Who should we attribute them to?
                    </p>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-400 block">Your Name (Optional)</label>
                        <input
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            placeholder="e.g. Jane Doe"
                            className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                            autoFocus
                        />
                        <p className="text-[10px] text-slate-400">
                            This name will appear in the Revision History of your saved files.
                        </p>
                    </div>
                </div>
            )
        }
    ];

    const currentSlide = slides[slideIndex];
    const isLastSlide = slideIndex === slides.length - 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">

                {/* Header */}
                <div className="relative h-32 bg-slate-900 flex flex-col items-center justify-center text-white overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 opacity-20" />
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/10"
                    >
                        <X size={20} />
                    </button>
                    <div className="z-10 p-3 bg-white/10 rounded-xl mb-2 backdrop-blur-md border border-white/20">
                        <currentSlide.icon size={32} />
                    </div>
                </div>

                {/* Body */}
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{currentSlide.title}</h2>
                        <p className="text-slate-500 font-medium">{currentSlide.subtitle}</p>
                    </div>

                    <div className="mb-8 min-h-[120px]">
                        {currentSlide.content}
                    </div>

                    {/* Footer / Controls */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                        {/* Dots */}
                        <div className="flex gap-1.5">
                            {slides.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === slideIndex ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                                        }`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-3">
                            {!isLastSlide ? (
                                <>
                                    <button
                                        onClick={handleDismiss}
                                        className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                                    >
                                        Skip
                                    </button>
                                    <button
                                        onClick={() => setSlideIndex(prev => prev + 1)}
                                        className="flex items-center gap-2 px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-medium hover:opacity-90 transition-opacity"
                                    >
                                        Next
                                        <ArrowRight size={16} />
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleFinish}
                                    className="flex items-center gap-2 px-8 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                                >
                                    Get Started
                                    <Check size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
