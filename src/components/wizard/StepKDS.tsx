import { Server, Monitor } from 'lucide-react';
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
            title="Kitchen Screens & Kiosks"
            description="Are you using any Kitchen Display Systems or customer-facing kiosks?"
            onBack={onBack}
            onNext={onNext}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <DeviceQuantityInput
                    id="kds"
                    label="Elo KDS"
                    icon={Server}
                    value={data['elo-kds']}
                    onChange={(val) => updateData({ 'elo-kds': val })}
                />
                <DeviceQuantityInput
                    id="kiosk"
                    label="Kiosk"
                    icon={Monitor}
                    value={data['kiosk']}
                    onChange={(val) => updateData({ 'kiosk': val })}
                />
            </div>
        </WizardStepLayout>
    );
};
