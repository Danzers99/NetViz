import { useState, useEffect } from 'react';
import { Save, User, FileText, Check, X, Sparkles, CloudUpload, Pencil, Loader2 } from 'lucide-react';
import { useAppStore } from '../store';

interface SaveDialogProps {
    isOpen: boolean;
    autoSummary: string;
    onSave: (note: string, cloudSync?: { name: string; cakeId: string }) => void;
    onCancel: () => void;
}

export const SaveDialog = ({ isOpen, autoSummary, onSave, onCancel }: SaveDialogProps) => {
    const settings = useAppStore((state) => state.settings);
    const setUserName = useAppStore((state) => state.setUserName);
    const isSupportMode = useAppStore((state) => state.isSupportMode);
    const projectInfo = useAppStore((state) => state.projectInfo);
    const isSaving = useAppStore((state) => state.isSavingToAccounts);

    const [name, setName] = useState(settings.userName || '');
    const [note, setNote] = useState('');

    // Cloud sync state
    const [syncToCloud, setSyncToCloud] = useState(false);
    const [accountName, setAccountName] = useState('');
    const [cakeIdInput, setCakeIdInput] = useState('');
    const [editingLinked, setEditingLinked] = useState(false);

    const isLinked = !!projectInfo.cakeId;

    // Sync name if settings change (e.g. from previously loaded file)
    useEffect(() => {
        if (settings.userName) setName(settings.userName);
    }, [settings.userName]);

    // Reset cloud sync state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setAccountName(projectInfo.name || '');
            setCakeIdInput(projectInfo.cakeId || '');
            setSyncToCloud(isLinked);
            setEditingLinked(false);
            setNote('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const cloudFieldsValid = accountName.trim().length >= 2 && cakeIdInput.trim().length > 0;
    const wantsCloudSync = isSupportMode && syncToCloud;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setUserName(name.trim());
        if (wantsCloudSync && cloudFieldsValid) {
            onSave(note.trim(), { name: accountName.trim(), cakeId: cakeIdInput.trim() });
        } else {
            onSave(note.trim());
        }
    };

    const formatSyncTime = (ts: number) => {
        return new Date(ts).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                        <Save size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Save Revision</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Commit changes to history</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Identity Section */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <User size={14} className="text-orange-500" />
                            Author Identity
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your Name (Required)"
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                            autoFocus={!name}
                        />
                    </div>

                    {/* Auto Summary Display */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Sparkles size={14} className="text-blue-500" />
                            Detected Changes
                        </label>
                        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                            {autoSummary}
                        </div>
                    </div>

                    {/* Manual Note Section */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <FileText size={14} className="text-slate-400" />
                            Manual Note <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add details about this version..."
                            rows={2}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Cloud Sync Section (Support Mode only) */}
                    {isSupportMode && (
                        <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <CloudUpload size={14} className="text-green-500" />
                                Cloud Sync
                            </label>

                            {isLinked && !editingLinked ? (
                                /* Linked — show read-only info */
                                <div className="space-y-2">
                                    <div className="px-4 py-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg text-sm space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-green-800 dark:text-green-200 font-medium">{projectInfo.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => setEditingLinked(true)}
                                                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                        </div>
                                        <div className="text-green-700 dark:text-green-300 text-xs font-mono">CAKE {projectInfo.cakeId}</div>
                                        {projectInfo.lastCloudSyncAt && (
                                            <div className="text-green-600 dark:text-green-400 text-[10px]">
                                                Last synced: {formatSyncTime(projectInfo.lastCloudSyncAt)}
                                            </div>
                                        )}
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={syncToCloud}
                                            onChange={(e) => setSyncToCloud(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Sync this revision to cloud</span>
                                    </label>
                                </div>
                            ) : (
                                /* Not linked or editing — show editable fields */
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <input
                                            type="text"
                                            value={accountName}
                                            onChange={(e) => setAccountName(e.target.value)}
                                            placeholder="Account Name (e.g. Taco Shop - Plant City)"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <input
                                            type="text"
                                            value={cakeIdInput}
                                            onChange={(e) => setCakeIdInput(e.target.value)}
                                            placeholder="CAKE ID"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                                        />
                                    </div>
                                    {editingLinked && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingLinked(false);
                                                setAccountName(projectInfo.name || '');
                                                setCakeIdInput(projectInfo.cakeId || '');
                                            }}
                                            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                        >
                                            Cancel edit
                                        </button>
                                    )}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={syncToCloud}
                                            onChange={(e) => setSyncToCloud(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                            {isLinked ? 'Sync this revision to cloud' : 'Create and sync new cloud record'}
                                        </span>
                                    </label>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Footer */}
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
                            disabled={!name.trim() || (wantsCloudSync && !cloudFieldsValid) || isSaving}
                            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-lg shadow-orange-500/30 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <Check size={18} />
                                    {wantsCloudSync ? 'Save & Sync' : 'Save'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
