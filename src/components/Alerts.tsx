import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { AlertTriangle, XCircle, ChevronDown, ChevronUp, AlertOctagon } from 'lucide-react';

export const Alerts = () => {
    const errors = useAppStore((state) => state.validationErrors);
    const settings = useAppStore((state) => state.settings);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [prevErrorCount, setPrevErrorCount] = useState(0);

    // Auto-expand on new errors
    useEffect(() => {
        if (errors.length > prevErrorCount) {
            setIsCollapsed(false);
        }
        setPrevErrorCount(errors.length);
    }, [errors.length]);

    if (!settings.showWarnings || errors.length === 0) return null;

    const criticalCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;

    return (
        <div className="flex flex-col gap-2 max-w-md w-full pointer-events-none transition-all duration-300">
            {/* Header / Summary */}
            <div
                className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl overflow-hidden pointer-events-auto transition-all"
            >
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${criticalCount > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}>
                            {criticalCount > 0 ? <AlertOctagon size={14} /> : <AlertTriangle size={14} />}
                            <span>{errors.length} Issue{errors.length !== 1 && 's'}</span>
                        </div>
                        {isCollapsed && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {criticalCount} Critical, {warningCount} Warnings
                            </span>
                        )}
                    </div>
                    {isCollapsed ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
                </button>

                {/* List */}
                {!isCollapsed && (
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {errors.map((error) => (
                            <div
                                key={error.id}
                                className={`border-t border-slate-100 dark:border-slate-700 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${settings.compactWarnings ? 'p-3' : 'p-4'
                                    } ${settings.darkMode ? 'text-slate-300' : 'text-slate-700'}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 shrink-0 ${error.severity === 'error' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'
                                        }`}>
                                        {error.severity === 'error' ? <XCircle size={18} /> : <AlertTriangle size={18} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {!settings.compactWarnings && (
                                            <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${error.severity === 'error' ? 'text-red-600' : 'text-amber-600'
                                                }`}>
                                                {error.severity}
                                            </h4>
                                        )}
                                        <p className={`leading-relaxed ${settings.compactWarnings ? 'text-xs' : 'text-sm'
                                            } ${settings.darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            {error.message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
