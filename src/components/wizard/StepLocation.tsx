import { useState, useEffect } from 'react';
import { WizardStepLayout } from './WizardStepLayout';
import { MapPin } from 'lucide-react';

interface StepLocationProps {
    projectName: string;
    updateProjectName: (name: string) => void;
    onBack: () => void;
    onNext: () => void;
}

export const StepLocation = ({ projectName, updateProjectName, onBack, onNext }: StepLocationProps) => {
    const [inputValue, setInputValue] = useState(projectName);
    const [touched, setTouched] = useState(false);

    useEffect(() => {
        setInputValue(projectName);
    }, [projectName]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        updateProjectName(e.target.value);
    };

    const handleBlur = () => {
        setTouched(true);
        // Clean up input on blur
        const trimmed = inputValue.trim();
        if (trimmed !== inputValue) {
            setInputValue(trimmed);
            updateProjectName(trimmed);
        }
    };

    const isValid = inputValue.trim().length >= 3 && inputValue.trim().length <= 40;
    const showValidationError = touched && !isValid;

    return (
        <WizardStepLayout
            title="Site Details"
            description="Give your new sandbox location a name to identify it later."
            onBack={onBack}
            onNext={onNext}
            nextLabel="Next"
            isNextDisabled={!isValid}
        >
            <div className="max-w-xl mx-auto">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                        Location Name <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Example: Taco Shop - Plant City"
                            className={`block w-full pl-10 pr-3 py-3 border rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 transition-all ${showValidationError
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30'
                                : 'border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-orange-200 dark:focus:ring-orange-900/30'
                                }`}
                            autoFocus
                        />
                    </div>

                    {showValidationError && (
                        <p className="mt-2 text-sm text-red-500 animate-in fade-in slide-in-from-top-1">
                            Location name must be between 3 and 40 characters.
                        </p>
                    )}

                    <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                        This name will be used for your saved configuration files and project headers.
                        Allowed characters: Letters, numbers, spaces, dashes, and underscores.
                    </p>
                </div>
            </div>
        </WizardStepLayout>
    );
};
