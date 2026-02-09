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
import { SandboxModeSelector } from './SandboxModeSelector';
import { BuildFromConnectionsModal } from './BuildFromConnectionsModal';
import { buildSimpleTopology, isSimpleBuildError } from '../../utils/simpleBuilder';
import type { SimpleBuildConfig } from '../../utils/connectionTypes';
import { propagatePowerState, updateLinkStatuses, updateWirelessAssociation, updateConnectionStates } from '../../utils/simulation';




export const WizardContainer = () => {
    // Component State
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [showConnectionsModal, setShowConnectionsModal] = useState(false);
    // Deep clone initial state to ensure no mutation issues across resets
    const [wizardData, setWizardData] = useState<WizardState>(JSON.parse(JSON.stringify(initialWizardState)));

    // Store Actions
    const generateSandbox = useAppStore((state) => state.generateSandbox);
    const setDeviceCountStore = useAppStore((state) => state.setDeviceCount);
    const setProjectInfoStore = useAppStore((state) => state.setProjectInfo);

    // Direct state setters for connection building
    const setStep = useAppStore((state) => state.setStep);
    const setDevices = useAppStore((state) => state.setDevices);
    const setRooms = useAppStore((state) => state.setRooms);

    const setNotification = useAppStore((state) => state.setNotification);

    const handleLoadClick = () => {
        const fileInput = document.getElementById('config-input');
        if (fileInput) fileInput.click();
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
        Object.entries(configCounts).forEach(([type, count]) => {
            // @ts-ignore - dynamic type check is safe here due to buildSandboxConfigFromWizard return type
            setDeviceCountStore(type, count);
        });

        // 4. Trigger generate
        generateSandbox();
    };

    // Handle building from connections
    const handleBuildFromConnections = (config: SimpleBuildConfig) => {
        try {
            const result = buildSimpleTopology(config);

            if (isSimpleBuildError(result)) {
                setNotification({ message: result.message, type: 'error' });
                return;
            }

            // Set project info
            setProjectInfoStore({
                name: 'Quick Build',
                createdAt: new Date().toISOString()
            });

            // Run simulation on devices before setting
            // 2. Apply connections in-memory first (Batching)
            // This prevents running simulation on a partially connected graph, which would
            // turn devices Offline immediately (e.g. AP connected to Injector but Injector not yet to Outlet).
            for (const [portIdA, portIdB] of result.connections) {
                let foundA = false;
                let foundB = false;

                // We must search all devices because port IDs are unique but we need the parent device
                for (const device of result.devices) {
                    if (!foundA) {
                        const portA = device.ports.find(p => p.id === portIdA);
                        if (portA) {
                            portA.connectedTo = portIdB;
                            foundA = true;
                        }
                    }
                    if (!foundB) {
                        const portB = device.ports.find(p => p.id === portIdB);
                        if (portB) {
                            portB.connectedTo = portIdA;
                            foundB = true;
                        }
                    }
                    if (foundA && foundB) break;
                }
            }

            // 3. Run simulation ONCE on the fully connected graph
            let devices = result.devices;
            devices = propagatePowerState(devices);
            devices = updateLinkStatuses(devices);
            devices = updateWirelessAssociation(devices);
            devices = updateConnectionStates(devices);

            // 4. Update Store (Validation runs automatically in setDevices)
            setRooms(result.rooms);
            setDevices(devices);

            // Close modal and go to sandbox
            setShowConnectionsModal(false);
            setStep('sandbox');

            // Show success notification
            setNotification({
                message: `Created ${result.devices.length} devices, ${result.rooms.length} rooms, and ${result.connections.length} connections`,
                type: 'success'
            });
        } catch (err) {
            console.error('Build failed:', err);
            setNotification({
                message: `Build failed: ${err instanceof Error ? err.message : String(err)}`,
                type: 'error'
            });
        }
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
            onStartNew={() => setCurrentStep(1)} // Go to mode selector
            onLoadPrevious={handleLoadClick}
        />,
        // 1: Mode Selector (NEW)
        <SandboxModeSelector
            key="mode-selector"
            onSelectWizard={() => setCurrentStep(2)} // Go to Location step
            onSelectConnections={() => setShowConnectionsModal(true)}
            onBack={() => setCurrentStep(0)}
        />,
        // 2: Location Name
        <StepLocation
            key="location"
            projectName={wizardData.projectInfo.name}
            updateProjectName={(name) => updateWizardData('projectInfo', { name })}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
        />,
        // 3: POS
        <StepPOS
            key="pos"
            data={wizardData.pos}
            updateData={(u) => updateWizardData('pos', u)}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
        />,
        // 4: Printers
        <StepPrinters
            key="printers"
            data={wizardData.printers}
            updateData={(u) => updateWizardData('printers', u)}
            onBack={() => setCurrentStep(3)}
            onNext={() => setCurrentStep(5)}
        />,
        // 5: Wireless
        <StepWireless
            key="wireless"
            data={wizardData.wireless}
            updateData={(u) => updateWizardData('wireless', u)}
            onBack={() => setCurrentStep(4)}
            onNext={() => setCurrentStep(6)}
        />,
        // 6: KDS
        <StepKDS
            key="kds"
            data={wizardData.kds}
            updateData={(u) => updateWizardData('kds', u)}
            onBack={() => setCurrentStep(5)}
            onNext={() => setCurrentStep(7)}
        />,
        // 7: Review
        <StepReview
            key="review"
            data={wizardData}
            onBack={() => setCurrentStep(6)}
            onCreate={handleCreateSandbox}
        />
    ];

    return (
        <div className="h-full w-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            {steps[currentStep]}

            {/* Build from Connections Modal */}
            {showConnectionsModal && (
                <BuildFromConnectionsModal
                    onBuild={handleBuildFromConnections}
                    onCancel={() => setShowConnectionsModal(false)}
                />
            )}
        </div>
    );
};
