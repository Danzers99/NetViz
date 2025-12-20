import { Smartphone, Tablet } from 'lucide-react';
import { WizardStepLayout } from './WizardStepLayout';
import { DeviceQuantityInput } from './DeviceQuantityInput';
import type { WizardState } from '../../utils/wizardLogic';

interface StepWirelessProps {
    data: WizardState['wireless'];
    updateData: (updates: Partial<WizardState['wireless']>) => void;
    onBack: () => void;
    onNext: () => void;
}

export const StepWireless = ({ data, updateData, onBack, onNext }: StepWirelessProps) => {
    return (
        <WizardStepLayout
            title="Wireless Handhelds"
            description="Select any mobile ordering devices."
            onBack={onBack}
            onNext={onNext}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <DeviceQuantityInput
                    id="orderpad"
                    label="OrderPad (iPad)"
                    icon={Tablet}
                    value={data.orderpad}
                    onChange={(val) => updateData({ orderpad: val })}
                />
                <DeviceQuantityInput
                    id="cakepop"
                    label="CakePop (M60)"
                    icon={Smartphone}
                    value={data.cakepop}
                    onChange={(val) => updateData({ cakepop: val })}
                />
            </div>

            {(data.orderpad > 0 || data.cakepop > 0) && (
                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 text-center animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-sm font-medium">
                        ✨ Access Point and PoE Injector will be automatically added for wireless devices.
                    </p>
                </div>
            )}
        </WizardStepLayout>
    );
};
