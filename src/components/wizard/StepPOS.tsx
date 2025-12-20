import { Monitor } from 'lucide-react';
import { WizardStepLayout } from './WizardStepLayout';
import { DeviceQuantityInput } from './DeviceQuantityInput';
import type { WizardState } from '../../utils/wizardLogic';

interface StepPOSProps {
    data: WizardState['pos'];
    updateData: (updates: Partial<WizardState['pos']>) => void;
    onBack: () => void;
    onNext: () => void;
}

export const StepPOS = ({ data, updateData, onBack, onNext }: StepPOSProps) => {
    return (
        <WizardStepLayout
            title="Point of Sale Devices"
            description="How many POS terminals do you have at this location?"
            onBack={onBack}
            onNext={onNext}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
                <DeviceQuantityInput
                    id="poindus"
                    label="Poindus POS"
                    icon={Monitor}
                    value={data['poindus-pos']}
                    onChange={(val) => updateData({ 'poindus-pos': val })}
                />
                <DeviceQuantityInput
                    id="datavan"
                    label="Datavan POS"
                    icon={Monitor}
                    value={data['datavan-pos']}
                    onChange={(val) => updateData({ 'datavan-pos': val })}
                />
                <DeviceQuantityInput
                    id="v3"
                    label="V3 POS"
                    icon={Monitor}
                    value={data['v3-pos']}
                    onChange={(val) => updateData({ 'v3-pos': val })}
                />
                <DeviceQuantityInput
                    id="v4"
                    label="V4 POS"
                    icon={Monitor}
                    value={data['v4-pos']}
                    onChange={(val) => updateData({ 'v4-pos': val })}
                />
            </div>
        </WizardStepLayout>
    );
};
