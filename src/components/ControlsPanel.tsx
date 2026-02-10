import { useState } from 'react';
import { useAppStore } from '../store';
import { getGroupedControls } from '../controlsMap';

export const ControlsPanel = () => {
    const layoutMode = useAppStore((state) => state.layoutMode);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const groups = getGroupedControls(layoutMode);

    return (
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-800/80 rounded-lg backdrop-blur-sm border border-slate-200 dark:border-slate-700 pointer-events-auto shadow-sm select-none transition-all duration-300 overflow-hidden">
            <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <h3 className="font-bold text-orange-500 dark:text-orange-400 mr-4">Controls</h3>
                <button
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none"
                    aria-label={isCollapsed ? "Expand controls" : "Collapse controls"}
                >
                    {isCollapsed ? 'Show' : 'Hide'}
                </button>
            </div>

            {!isCollapsed && (
                <div className="px-4 pb-4 pt-0 space-y-3 max-h-[60vh] overflow-y-auto">
                    {Array.from(groups.entries()).map(([category, entries]) => (
                        <div key={category}>
                            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                {category}
                            </h4>
                            <ul className="text-sm space-y-0.5 text-slate-600 dark:text-slate-300">
                                {entries.map((entry, i) => (
                                    <li key={`${category}-${i}`} className="flex items-baseline gap-2">
                                        <kbd className="text-[11px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-200 whitespace-nowrap min-w-[70px] text-center inline-block">
                                            {entry.input}
                                        </kbd>
                                        <span className="text-slate-500 dark:text-slate-400">{entry.action}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
