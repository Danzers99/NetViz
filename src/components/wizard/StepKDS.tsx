import { Server } from 'lucide-react';
import { WizardStepLayout } from './WizardStepLayout';
import { DeviceQuantityInput } from './DeviceQuantityInput';
import type { WizardState } from '../../utils/wizardLogic';

interface StepKDSProps {
    data: WizardState['kds'];
    updateData: (updates: Partial<WizardState['kds']>) => void;
    onBack: () => void;
    onNext: () => void;
}

export const StepKDS = ({ data, updateData, onBack, onNext }: StepKDSProps) => {
    return (
        <WizardStepLayout
            title="Kitchen Screens"
            description="Are you using any Kitchen Display Systems?"
            onBack={onBack}
            onNext={onNext}
        >
            <div className="flex justify-center">
                <div className="w-full max-w-sm">
                    <DeviceQuantityInput
                        id="kds"
                        label="Elo KDS"
                        icon={Server}
                        value={data['elo-kds']}
                        onChange={(val) => updateData({ 'elo-kds': val })}
                    />
                </div>
            </div>
        </WizardStepLayout>
    );
};
