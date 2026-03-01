import { useState, useEffect } from 'react';
import { CloudUpload, X, Check } from 'lucide-react';
import { useAppStore } from '../store';

interface SaveToAccountsDialogProps {
    isOpen: boolean;
    onSave: (name: string, cakeId: string) => void;
    onCancel: () => void;
}

export const SaveToAccountsDialog = ({ isOpen, onSave, onCancel }: SaveToAccountsDialogProps) => {
    const projectInfo = useAppStore((state) => state.projectInfo);
    const isSaving = useAppStore((state) => state.isSavingToAccounts);

    const [nameInput, setNameInput] = useState('');
    const [cakeIdInput, setCakeIdInput] = useState('');
    const [nameError, setNameError] = useState('');

    // Sync from store when dialog opens
    useEffect(() => {
        if (isOpen) {
            setNameInput(projectInfo.name || '');
            setCakeIdInput(projectInfo.cakeId || '');
            setNameError('');
        }
    }, [isOpen, projectInfo.name, projectInfo.cakeId]);

    if (!isOpen) return null;

    const trimmedName = nameInput.trim();
    const trimmedCakeId = cakeIdInput.trim();
    const canSave = trimmedName.length >= 2 && trimmedCakeId.length > 0 && !isSaving;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (trimmedName.length < 2) {
            setNameError('Account name must be at least 2 characters');
            return;
        }
        if (!trimmedCakeId) return;
        onSave(trimmedName, trimmedCakeId);
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
                    {/* Account Name (editable) */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Account Name</label>
                        <input
                            type="text"
                            value={nameInput}
                            onChange={(e) => { setNameInput(e.target.value); setNameError(''); }}
                            placeholder="e.g. Taco Shop - Plant City"
                            className={`w-full px-4 py-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm ${nameError ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'}`}
                            autoFocus
                        />
                        {nameError && <p className="text-xs text-red-500">{nameError}</p>}
                    </div>

                    {/* CAKE ID (editable) */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">CAKE ID</label>
                        <input
                            type="text"
                            value={cakeIdInput}
                            onChange={(e) => setCakeIdInput(e.target.value)}
                            placeholder="Enter CAKE ID for this location"
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                        />
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
