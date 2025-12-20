import { calculateInfrastructure, type WizardState } from '../../utils/wizardLogic';
import { WizardStepLayout } from './WizardStepLayout';
import { Network, Plug, Router, Radio, Monitor, Printer, Smartphone, Server } from 'lucide-react';

interface StepReviewProps {
    data: WizardState;
    onBack: () => void;
    onCreate: () => void;
}

export const StepReview = ({ data, onBack, onCreate }: StepReviewProps) => {
    const infra = calculateInfrastructure(data);

    // Aggregates for display
    const totalPos = Object.values(data.pos).reduce((a, b) => a + b, 0);
    const totalPrinters = Object.values(data.printers).reduce((a, b) => a + b, 0);
    const totalWireless = Object.values(data.wireless).reduce((a, b) => a + b, 0);
    const totalKds = Object.values(data.kds).reduce((a, b) => a + b, 0);

    const hasSelection = (totalPos + totalPrinters + totalWireless + totalKds) > 0;

    return (
        <WizardStepLayout
            title="Review Topology"
            description="We've calculated the necessary infrastructure for your device selection."
            onBack={onBack}
            onNext={onCreate}
            nextLabel="Create Sandbox"
            isNextDisabled={!hasSelection}
        >
            <div className="max-w-4xl mx-auto space-y-6">
                {!hasSelection && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-center">
                        Please select at least one device to continue.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* User Selections */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            Selected Devices
                        </h3>
                        <div className="space-y-3">
                            {totalPos > 0 && (
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Monitor size={18} className="text-slate-500" />
                                        <span className="text-slate-700 dark:text-slate-200">POS Terminals</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{totalPos}</span>
                                </div>
                            )}
                            {totalPrinters > 0 && (
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Printer size={18} className="text-slate-500" />
                                        <span className="text-slate-700 dark:text-slate-200">Printers</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{totalPrinters}</span>
                                </div>
                            )}
                            {totalKds > 0 && (
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Server size={18} className="text-slate-500" />
                                        <span className="text-slate-700 dark:text-slate-200">KDS Screens</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{totalKds}</span>
                                </div>
                            )}
                            {totalWireless > 0 && (
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Smartphone size={18} className="text-slate-500" />
                                        <span className="text-slate-700 dark:text-slate-200">Wireless Devices</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{totalWireless}</span>
                                </div>
                            )}
                            {/* Detail Breakdown (mini) */}
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                                {Object.entries(data.pos).map(([k, v]) => v > 0 && <span key={k} className="mr-3 inline-block">• {v} {k.replace('-pos', '')}</span>)}
                                {Object.entries(data.printers).map(([k, v]) => v > 0 && <span key={k} className="mr-3 inline-block">• {v} {k.replace('epson-', '')}</span>)}
                                {Object.entries(data.wireless).map(([k, v]) => v > 0 && <span key={k} className="mr-3 inline-block">• {v} {k}</span>)}
                            </div>
                        </div>
                    </div>

                    {/* Auto-Added Infrastructure */}
                    <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-6 shadow-sm border border-orange-100 dark:border-orange-800">
                        <h3 className="font-semibold text-orange-900 dark:text-orange-200 mb-4 flex items-center gap-2">
                            Auto-Added Infrastructure
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Router size={18} className="text-orange-600 dark:text-orange-400" />
                                    <span className="text-slate-700 dark:text-slate-200">Router & Modem</span>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-white">1 Each</span>
                            </div>

                            {infra.switches > 0 && (
                                <div className="flex justify-between items-center p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Network size={18} className="text-orange-600 dark:text-orange-400" />
                                        <span className="text-slate-700 dark:text-slate-200">Unmanaged Switches</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{infra.switches}</span>
                                </div>
                            )}

                            {infra.accessPoints > 0 && (
                                <div className="flex justify-between items-center p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Radio size={18} className="text-orange-600 dark:text-orange-400" />
                                        <span className="text-slate-700 dark:text-slate-200">Access Point & Injector</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{infra.accessPoints}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Plug size={18} className="text-orange-600 dark:text-orange-400" />
                                    <span className="text-slate-700 dark:text-slate-200">Power Outlets</span>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-white">{infra.outlets}</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800/30 text-xs text-orange-800 dark:text-orange-300">
                            <p>• Switches added based on 8-port capacity needs.</p>
                            <p>• Outlets added for power distribution (4 plugs per outlet).</p>

                            <div className="mt-3 p-3 bg-white/60 dark:bg-slate-800/40 border border-orange-200 dark:border-orange-800/50 rounded-lg">
                                <strong>Note:</strong> The ISP modem represents your internet provider. In NetViz it is assumed to always be powered on and online, so you can focus on your local network setup.
                            </div>
                        </div>
                    </div>

                    <div className="text-center text-sm text-slate-500 dark:text-slate-400 italic">
                        Devices will appear unconnected in the sandbox. You must wire them manually.
                    </div>
                </div>
            </div>
        </WizardStepLayout>
    );
};
