import { useState, useEffect, useRef } from 'react';
import { Database, Search, Loader2, AlertCircle, Plus } from 'lucide-react';
import { useAppStore } from '../store';
import { searchAccounts, type AccountSearchResult } from '../utils/accountsApi';

export const AccountsPage = () => {
    const loadFromAccounts = useAppStore((state) => state.loadFromAccounts);
    const setProjectInfo = useAppStore((state) => state.setProjectInfo);
    const setActiveView = useAppStore((state) => state.setActiveView);
    const step = useAppStore((state) => state.step);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<AccountSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Debounced search
    useEffect(() => {
        clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await searchAccounts(query);
                setResults(data);
                setHasSearched(true);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Search failed');
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, query ? 300 : 0);

        return () => clearTimeout(debounceRef.current);
    }, [query]);

    const handleLoad = (cakeId: string) => {
        loadFromAccounts(cakeId);
    };

    const handleCreateNew = () => {
        const cakeId = query.trim();
        if (!cakeId) return;
        setProjectInfo({ cakeId });
        setActiveView('visualizer');
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });
    };

    const noResults = hasSearched && results.length === 0 && !loading && !error;

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <Database size={24} className="text-orange-500" />
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Accounts</h1>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-lg">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by Location Name or CAKE ID..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                            autoFocus
                        />
                        {loading && (
                            <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                        )}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Empty State */}
                {noResults && (
                    <div className="text-center py-16">
                        <Database size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                        <p className="text-slate-500 dark:text-slate-400 mb-1">
                            No maps found{query ? ` for "${query}"` : ''}.
                        </p>
                        {query.trim() && step === 'sandbox' && (
                            <button
                                onClick={handleCreateNew}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-lg shadow-orange-500/30 transition-all font-medium text-sm"
                            >
                                <Plus size={16} />
                                Create new map for CAKE {query.trim()}
                            </button>
                        )}
                    </div>
                )}

                {/* Results Table */}
                {results.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-4 py-3 font-medium">Location</th>
                                    <th className="px-4 py-3 font-medium">CAKE ID</th>
                                    <th className="px-4 py-3 font-medium text-center">Devices</th>
                                    <th className="px-4 py-3 font-medium">Last Edited</th>
                                    <th className="px-4 py-3 font-medium">By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((r) => (
                                    <tr
                                        key={r.cakeId}
                                        onClick={() => handleLoad(r.cakeId)}
                                        className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-orange-50 dark:hover:bg-orange-900/10 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 max-w-[200px] truncate" title={r.name}>
                                            {r.name}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">
                                            {r.cakeId}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                                            {r.deviceCount}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                                            {formatDate(r.lastEdited)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs max-w-[120px] truncate" title={r.lastEditedBy}>
                                            {r.lastEditedBy}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
