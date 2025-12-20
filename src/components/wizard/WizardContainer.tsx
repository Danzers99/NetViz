import { useState } from 'react';
import { useAppStore } from '../../store';
import { initialWizardState, type WizardState, buildSandboxConfigFromWizard } from '../../utils/wizardLogic';
import { StepWelcome } from './StepWelcome';
import { StepPOS } from './StepPOS';
import { StepPrinters } from './StepPrinters';
import { StepWireless } from './StepWireless';
import { StepKDS } from './StepKDS';
import { StepReview } from './StepReview';


export const WizardContainer = () => {
    // Component State
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [wizardData, setWizardData] = useState<WizardState>(initialWizardState);

    // Store Actions

    const generateSandbox = useAppStore((state) => state.generateSandbox);
    const setDeviceCountStore = useAppStore((state) => state.setDeviceCount);

    // Access Layout refs/actions for file input if needed? 
    // Actually, the Layout component handles the file input rendering and change event.
    // We can simulate the "Load" button click by triggering the input on the layout?
    // Or we can simple use the same logic here.
    // Best approach: "Load Previous" button in Wizard should trigger the file input click.
    // Since Layout wraps everything, we might need to pass a prop or use a ref from store or context.
    // But Layout.tsx has the input hidden.
    // Alternative: We can make the Load button in StepWelcome trigger a document.getElementById click.
    // ID: 'config-input' (defined in Layout.tsx)

    const handleLoadClick = () => {
        const fileInput = document.getElementById('config-input');
        if (fileInput) fileInput.click();
    };

    const handleCreateSandbox = () => {
        // 1. Convert wizard state to proper device counts
        const configCounts = buildSandboxConfigFromWizard(wizardData);

        // 2. Update the store with these counts
        // We need to iterate and set each count, or simpler: modify store to accept bulk update?
        // store `setDeviceCount` is one by one. 
        // Iterate:
        Object.entries(configCounts).forEach(([type, count]) => {
            // @ts-ignore - dynamic type check is safe here due to buildSandboxConfigFromWizard return type
            setDeviceCountStore(type, count);
        });

        // 3. Trigger generate
        generateSandbox();
    };

    const updateWizardData = (section: keyof WizardState, updates: any) => {
        setWizardData(prev => ({
            ...prev,
            [section]: { ...prev[section], ...updates }
        }));
    };

    const steps = [
        // 0: Welcome
        <StepWelcome
            onStartNew={() => setCurrentStep(1)}
            onLoadPrevious={handleLoadClick}
        />,
        // 1: POS
        <StepPOS
            data={wizardData.pos}
            updateData={(u) => updateWizardData('pos', u)}
            onBack={() => setCurrentStep(0)}
            onNext={() => setCurrentStep(2)}
        />,
        // 2: Printers
        <StepPrinters
            data={wizardData.printers}
            updateData={(u) => updateWizardData('printers', u)}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
        />,
        // 3: Wireless
        <StepWireless
            data={wizardData.wireless}
            updateData={(u) => updateWizardData('wireless', u)}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
        />,
        // 4: KDS
        <StepKDS
            data={wizardData.kds}
            updateData={(u) => updateWizardData('kds', u)}
            onBack={() => setCurrentStep(3)}
            onNext={() => setCurrentStep(5)}
        />,
        // 5: Review
        <StepReview
            data={wizardData}
            onBack={() => setCurrentStep(4)}
            onCreate={handleCreateSandbox}
        />
    ];

    return (
        <div className="h-full w-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            {steps[currentStep]}
        </div>
    );
};
