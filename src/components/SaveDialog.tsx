import { useState, useEffect } from 'react';
import { Save, User, FileText, Check, X, Sparkles, CloudUpload, Download, Pencil, Loader2 } from 'lucide-react';
import { useAppStore } from '../store';

interface SaveOptions {
    cloudSync?: { name: string; cakeId: string };
    downloadLocal: boolean;
}

interface SaveDialogProps {
    isOpen: boolean;
    autoSummary: string;
    onSave: (author: string, note: string, options: SaveOptions) => void;
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
    const [downloadLocal, setDownloadLocal] = useState(true);
    const [accountName, setAccountName] = useState('');
    const [cakeIdInput, setCakeIdInput] = useState('');
    const [editingLinked, setEditingLinked] = useState(false);

    const isLinked = !!projectInfo.cakeId;
    const hasCloudOption = isSupportMode;

    // Sync name if settings change (e.g. from previously loaded file)
    useEffect(() => {
        if (settings.userName) setName(settings.userName);
    }, [settings.userName]);

    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setAccountName(projectInfo.name || '');
            setCakeIdInput(projectInfo.cakeId || '');
            setSyncToCloud(isLinked);
            setEditingLinked(false);
            setNote('');
            // Default: if cloud-linked, don't auto-download (cloud is primary).
            // If no cloud, always download (local file is the only save target).
            setDownloadLocal(!isLinked || !isSupportMode);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const cloudFieldsValid = accountName.trim().length >= 2 && cakeIdInput.trim().length > 0;
    const wantsCloudSync = hasCloudOption && syncToCloud;

    // Must have at least one save target
    const hasValidTarget = (wantsCloudSync && cloudFieldsValid) || downloadLocal;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const author = name.trim();
        if (!author || !hasValidTarget) return;

        // Remember the name locally for next time (UI convenience only — not the save metadata source)
        setUserName(author);

        const options: SaveOptions = {
            downloadLocal,
        };

        if (wantsCloudSync && cloudFieldsValid) {
            options.cloudSync = { name: accountName.trim(), cakeId: cakeIdInput.trim() };
        }

        // Author is passed explicitly as save metadata — the single canonical source
        onSave(author, note.trim(), options);
    };

    const formatSyncTime = (ts: number) => {
        return new Date(ts).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });
    };

    // Describe what will happen on save
    const getSaveDescription = () => {
        const actions: string[] = [];
        if (wantsCloudSync && cloudFieldsValid) actions.push('synced to cloud');
        if (downloadLocal) actions.push('downloaded as local file');
        if (actions.length === 0) return null;
        return `Revision will be ${actions.join(' and ')}.`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[calc(100vh-2rem)] border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header — sticky */}
                <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 flex-shrink-0">
                    <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                        <Save size={18} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Save Revision</h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Commit changes to history</p>
                    </div>
                </div>

                {/* Scrollable body */}
                <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                        {/* Identity Section */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <User size={14} className="text-orange-500" />
                                Author Identity
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your Name (Required)"
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                                autoFocus={!name}
                            />
                        </div>

                        {/* Auto Summary Display */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Sparkles size={14} className="text-blue-500" />
                                Detected Changes
                            </label>
                            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                                {autoSummary}
                            </div>
                        </div>

                        {/* Manual Note Section */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <FileText size={14} className="text-slate-400" />
                                Manual Note <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Add details about this version..."
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all resize-none text-sm"
                            />
                        </div>

                        {/* Save Destination Section */}
                        <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-700 pt-4">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Save to
                            </label>

                            {/* Cloud Sync Option (Support Mode only) */}
                            {hasCloudOption && (
                                <div className="space-y-2">
                                    <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={syncToCloud}
                                            onChange={(e) => setSyncToCloud(e.target.checked)}
                                            className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-600 text-green-500 focus:ring-green-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <CloudUpload size={14} className="text-green-500 flex-shrink-0" />
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    Cloud
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-400 mt-0.5 block">
                                                Save to shared cloud location, accessible from any device
                                            </span>
                                        </div>
                                    </label>

                                    {/* Cloud details (expanded when checked) */}
                                    {syncToCloud && (
                                        <div className="ml-7 space-y-2">
                                            {isLinked && !editingLinked ? (
                                                <div className="px-3 py-2 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg text-sm space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-green-800 dark:text-green-200 font-medium text-xs">{projectInfo.name}</span>
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
                                            ) : (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={accountName}
                                                        onChange={(e) => setAccountName(e.target.value)}
                                                        placeholder="Account Name (e.g. Taco Shop - Plant City)"
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={cakeIdInput}
                                                        onChange={(e) => setCakeIdInput(e.target.value)}
                                                        placeholder="CAKE ID"
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                                                    />
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
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Local File Download Option */}
                            <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={downloadLocal}
                                    onChange={(e) => setDownloadLocal(e.target.checked)}
                                    className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-600 text-orange-500 focus:ring-orange-500"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Download size={14} className="text-orange-500 flex-shrink-0" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Export Local File
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-400 mt-0.5 block">
                                        Download a .json backup to your computer
                                    </span>
                                </div>
                            </label>

                            {/* Save outcome description */}
                            {getSaveDescription() && (
                                <p className="text-[11px] text-slate-400 italic px-1">
                                    {getSaveDescription()}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Footer — sticky at bottom */}
                    <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSaving}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium flex items-center gap-2 text-sm"
                        >
                            <X size={16} />
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || !hasValidTarget || (wantsCloudSync && !cloudFieldsValid) || isSaving}
                            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-lg shadow-orange-500/30 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <Check size={16} />
                                    {wantsCloudSync && cloudFieldsValid
                                        ? (downloadLocal ? 'Save & Sync' : 'Save to Cloud')
                                        : 'Save'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
