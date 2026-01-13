import { X, History, User, Calendar } from 'lucide-react';
import { useAppStore } from '../store';

export const HistoryPanel = ({ onClose }: { onClose: () => void }) => {
    const revisions = useAppStore((state) => state.revisions);
    // Sort reverse chronological
    const sortedRevisions = [...revisions].sort((a, b) => b.timestamp - a.timestamp);

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <History size={20} className="text-orange-500" />
                    <h2 className="font-bold text-lg">Revision History</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {sortedRevisions.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <History size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No revision history found.</p>
                        <p className="text-xs mt-2">Save the project to create the first revision.</p>
                    </div>
                ) : (
                    sortedRevisions.map((rev) => (
                        <div key={rev.id} className="relative pl-6 pb-6 border-l-2 border-slate-200 dark:border-slate-700 last:border-0 last:pb-0 group">
                            {/* Timeline Dot */}
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border-2 border-orange-500 group-hover:scale-110 transition-transform" />

                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg p-3 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                                        <User size={12} />
                                        {rev.author}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <Calendar size={10} />
                                        {formatDate(rev.timestamp)}
                                    </div>
                                </div>

                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">
                                    {rev.summary}
                                </p>

                                {rev.manualNote && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700 mb-2">
                                        "{rev.manualNote}"
                                    </p>
                                )}

                                <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                                    <span>{rev.stats.deviceCount} Devices</span>
                                    <span>{rev.stats.roomCount} Rooms</span>
                                    <span>{rev.stats.cableCount} Cables</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
