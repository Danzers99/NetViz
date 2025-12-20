import type { ComponentType } from 'react';
import { Plus, Minus } from 'lucide-react';

interface DeviceQuantityInputProps {
    id: string;
    label: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    value: number;
    onChange: (value: number) => void;
}

export const DeviceQuantityInput = ({
    label,
    icon: Icon,
    value,
    onChange
}: DeviceQuantityInputProps) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 flex flex-col items-center gap-4 group">
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Icon size={32} />
            </div>

            <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-center leading-tight min-h-[40px] flex items-center justify-center w-full">
                {label}
            </h3>

            <div className="flex items-center gap-3 w-full justify-center bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <button
                    onClick={() => onChange(Math.max(0, value - 1))}
                    disabled={value === 0}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                    <Minus size={18} strokeWidth={2.5} />
                </button>

                <div className="flex-1 text-center font-bold text-2xl text-slate-900 dark:text-white tabular-nums">
                    {value}
                </div>

                <button
                    onClick={() => onChange(value + 1)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                >
                    <Plus size={18} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
};
