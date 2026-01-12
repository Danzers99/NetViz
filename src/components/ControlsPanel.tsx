import { useState } from 'react';
import { useAppStore } from '../store';
// import { ChevronDown, ChevronUp } from 'lucide-react'; 

export const ControlsPanel = () => {
    const layoutMode = useAppStore((state) => state.layoutMode);
    const [isCollapsed, setIsCollapsed] = useState(false);

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
                <div className="px-4 pb-4 pt-0">
                    <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-300">
                        <li>• WASD to Move Camera</li>
                        <li>• Left Click + Drag to Rotate Camera</li>
                        <li>• "N" to toggle Device Names</li>
                        <li>• "Shift+R" to toggle Room Names</li>
                        <li>• Shift+Click to multi-select</li>
                        <li>• Right Click + Drag to Pan</li>
                        <li>• Scroll to Zoom</li>
                        <li>• Drag devices to move them</li>
                        {!layoutMode && <li>• Click ports to connect them</li>}
                        {!layoutMode && <li>• Right Click ports to disconnect</li>}
                        {layoutMode && <li>• Click + Drag Room edges to resize</li>}
                    </ul>
                </div>
            )}
        </div>
    );
};
