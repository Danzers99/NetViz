import { Printer } from 'lucide-react';
import { WizardStepLayout } from './WizardStepLayout';
import { DeviceQuantityInput } from './DeviceQuantityInput';
import type { WizardState } from '../../utils/wizardLogic';

interface StepPrintersProps {
    data: WizardState['printers'];
    updateData: (updates: Partial<WizardState['printers']>) => void;
    onBack: () => void;
    onNext: () => void;
}

export const StepPrinters = ({ data, updateData, onBack, onNext }: StepPrintersProps) => {
    return (
        <WizardStepLayout
            title="Printers"
            description="How many receipt and kitchen printers are installed?"
            onBack={onBack}
            onNext={onNext}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <DeviceQuantityInput
                    id="thermal"
                    label="Epson Thermal (Receipt)"
                    icon={Printer}
                    value={data['epson-thermal']}
                    onChange={(val) => updateData({ 'epson-thermal': val })}
                />
                <DeviceQuantityInput
                    id="impact"
                    label="Epson Impact (Kitchen)"
                    icon={Printer}
                    value={data['epson-impact']}
                    onChange={(val) => updateData({ 'epson-impact': val })}
                />
            </div>
        </WizardStepLayout>
    );
};
