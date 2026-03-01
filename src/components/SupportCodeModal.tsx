import { useState } from 'react';
import { Lock, X, Loader2 } from 'lucide-react';
import { useAppStore } from '../store';
import { unlockSupportMode, activateSupportMode } from '../utils/supportMode';

interface SupportCodeModalProps {
    onClose: () => void;
}

export const SupportCodeModal = ({ onClose }: SupportCodeModalProps) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || loading) return;

        setLoading(true);
        setError(null);

        try {
            const success = await unlockSupportMode(code.trim());
            if (success) {
                activateSupportMode();
                useAppStore.getState().enableSupportMode();
                onClose();
            } else {
                setError('Invalid support code');
            }
        } catch {
            setError('Connection error. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            onKeyDown={handleKeyDown}
        >
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Support Mode</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Enter code to enable</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <input
                        type="password"
                        value={code}
                        onChange={(e) => { setCode(e.target.value); setError(null); }}
                        placeholder="Support code"
                        className={`w-full px-4 py-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm ${error ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'}`}
                        autoFocus
                    />
                    {error && <p className="text-xs text-red-500">{error}</p>}

                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!code.trim() || loading}
                            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-lg shadow-orange-500/30 transition-all font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                            {loading ? 'Verifying...' : 'Unlock'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
