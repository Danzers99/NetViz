import { useState } from 'react';
import { CloudUpload, X, Check } from 'lucide-react';
import { useAppStore } from '../store';

interface SaveToAccountsDialogProps {
    isOpen: boolean;
    onSave: () => void;
    onCancel: () => void;
}

export const SaveToAccountsDialog = ({ isOpen, onSave, onCancel }: SaveToAccountsDialogProps) => {
    const projectInfo = useAppStore((state) => state.projectInfo);
    const setProjectInfo = useAppStore((state) => state.setProjectInfo);
    const isSaving = useAppStore((state) => state.isSavingToAccounts);

    const [cakeIdInput, setCakeIdInput] = useState('');

    if (!isOpen) return null;

    const hasCakeId = !!projectInfo.cakeId;
    const effectiveCakeId = hasCakeId ? projectInfo.cakeId : cakeIdInput.trim();
    const canSave = !!effectiveCakeId && !isSaving;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSave) return;

        if (!hasCakeId) {
            setProjectInfo({ cakeId: cakeIdInput.trim() });
        }
        onSave();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                        <CloudUpload size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Save to Accounts</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Persist this map to cloud storage</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Location Name (read-only) */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Location Name</label>
                        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200">
                            {projectInfo.name || 'Untitled Location'}
                        </div>
                    </div>

                    {/* CAKE ID */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">CAKE ID</label>
                        {hasCakeId ? (
                            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 font-mono">
                                {projectInfo.cakeId}
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={cakeIdInput}
                                onChange={(e) => setCakeIdInput(e.target.value)}
                                placeholder="Enter CAKE ID for this location"
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                                autoFocus
                            />
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSaving}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium flex items-center gap-2"
                        >
                            <X size={18} />
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!canSave}
                            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-lg shadow-orange-500/30 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check size={18} />
                                    Save
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
