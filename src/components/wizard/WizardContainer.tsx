import { useState } from 'react';
import { useAppStore } from '../../store';
import { initialWizardState, type WizardState, buildSandboxConfigFromWizard } from '../../utils/wizardLogic';
import { StepWelcome } from './StepWelcome';
import { StepLocation } from './StepLocation';
import { StepPOS } from './StepPOS';
import { StepPrinters } from './StepPrinters';
import { StepWireless } from './StepWireless';
import { StepKDS } from './StepKDS';
import { StepReview } from './StepReview';

// @ts-ignore
import quickStartData from '../../data/quickStartLocation.json';


export const WizardContainer = () => {
    // Component State
    // Component State
    const [currentStep, setCurrentStep] = useState<number>(0);
    // Deep clone initial state to ensure no mutation issues across resets
    const [wizardData, setWizardData] = useState<WizardState>(JSON.parse(JSON.stringify(initialWizardState)));

    // Store Actions
    const generateSandbox = useAppStore((state) => state.generateSandbox);
    const setDeviceCountStore = useAppStore((state) => state.setDeviceCount);
    const setProjectInfoStore = useAppStore((state) => state.setProjectInfo);
    const importConfig = useAppStore((state) => state.importConfig);

    // Quick Start Data
    // see top level import


    // Force step 0 on mount/reset
    // useEffect(() => setCurrentStep(0), []); // Strict mode might double invoke, but 0 is safe.


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

    const handleQuickStart = () => {
        // @ts-ignore
        importConfig(quickStartData);
    };

    const handleCreateSandbox = () => {
        // 1. Set Project Info
        setProjectInfoStore({
            name: wizardData.projectInfo.name,
            createdAt: new Date().toISOString()
        });

        // 2. Convert wizard state to proper device counts
        const configCounts = buildSandboxConfigFromWizard(wizardData);

        // 3. Update the store with these counts
        // We need to iterate and set each count, or simpler: modify store to accept bulk update?
        // store `setDeviceCount` is one by one. 
        // Iterate:
        Object.entries(configCounts).forEach(([type, count]) => {
            // @ts-ignore - dynamic type check is safe here due to buildSandboxConfigFromWizard return type
            setDeviceCountStore(type, count);
        });

        // 4. Trigger generate
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
            key="welcome"
            onStartNew={() => setCurrentStep(1)}
            onLoadPrevious={handleLoadClick}
            onQuickStart={handleQuickStart}
        />,
        // 1: Location Name
        <StepLocation
            key="location"
            projectName={wizardData.projectInfo.name}
            updateProjectName={(name) => updateWizardData('projectInfo', { name })}
            onBack={() => setCurrentStep(0)}
            onNext={() => setCurrentStep(2)}
        />,
        // 2: POS
        <StepPOS
            key="pos"
            data={wizardData.pos}
            updateData={(u) => updateWizardData('pos', u)}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
        />,
        // 3: Printers
        <StepPrinters
            key="printers"
            data={wizardData.printers}
            updateData={(u) => updateWizardData('printers', u)}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
        />,
        // 4: Wireless
        <StepWireless
            key="wireless"
            data={wizardData.wireless}
            updateData={(u) => updateWizardData('wireless', u)}
            onBack={() => setCurrentStep(3)}
            onNext={() => setCurrentStep(5)}
        />,
        // 5: KDS
        <StepKDS
            key="kds"
            data={wizardData.kds}
            updateData={(u) => updateWizardData('kds', u)}
            onBack={() => setCurrentStep(4)}
            onNext={() => setCurrentStep(6)}
        />,
        // 6: Review
        <StepReview
            key="review"
            data={wizardData}
            onBack={() => setCurrentStep(5)}
            onCreate={handleCreateSandbox}
        />
    ];

    return (
        <div className="h-full w-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            {steps[currentStep]}
        </div>
    );
};
