import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface WizardStepLayoutProps {
    title: string;
    description: string;
    children: ReactNode;
    onBack?: () => void;
    onNext: () => void;
    nextLabel?: string;
    isNextDisabled?: boolean;
}

export const WizardStepLayout = ({
    title,
    description,
    children,
    onBack,
    onNext,
    nextLabel = 'Next',
    isNextDisabled = false
}: WizardStepLayoutProps) => {
    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto px-4 w-full animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex-none py-8 text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg">{description}</p>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 py-2">
                {children}
            </div>

            <div className="flex-none py-8 flex justify-between items-center border-t border-slate-200 dark:border-slate-800 mt-4">
                {onBack ? (
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-6 py-3 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Back
                    </button>
                ) : (
                    <div /> // Spacer
                )}

                <button
                    onClick={onNext}
                    disabled={isNextDisabled}
                    className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5
                        ${isNextDisabled
                            ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none'
                            : 'bg-orange-500 hover:bg-orange-600 hover:shadow-orange-500/25'
                        }`}
                >
                    {nextLabel}
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};
