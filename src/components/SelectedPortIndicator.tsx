import { useEffect } from 'react';
import { useAppStore } from '../store';

export const SelectedPortIndicator = () => {
    const selectedPortId = useAppStore((state) => state.selectedPortId);
    const devices = useAppStore((state) => state.devices);
    const selectPort = useAppStore((state) => state.selectPort);

    // Enable Esc to clear selection
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                selectPort(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectPort]);

    const getPortDetails = () => {
        if (!selectedPortId) return null;

        for (const device of devices) {
            const port = device.ports.find(p => p.id === selectedPortId);
            if (port) {
                // Format Role nicely
                let role = port.role.charAt(0).toUpperCase() + port.role.slice(1);
                if (port.role === 'wan') role = 'WAN';
                if (port.role === 'lan') role = 'LAN';
                if (port.role === 'poe_source') role = 'PoE Out';
                if (port.role === 'poe_client') role = 'PoE In';
                if (port.role === 'power_input') role = 'Power In';
                if (port.role === 'power_source') role = 'Power Out';

                return {
                    portName: `${port.name} (${role})`,
                    deviceName: device.name,
                    fullText: `${port.name} (${role}) on ${device.name}`
                };
            }
        }
        return null;
    };

    const details = getPortDetails();

    if (!details) {
        return (
            <div className="bg-white/90 dark:bg-slate-800/80 px-4 py-2 rounded-full text-slate-700 dark:text-slate-200 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm transition-colors text-xs font-medium flex items-center gap-2 pointer-events-auto select-none">
                Current Port Selected: <span className="text-slate-400 dark:text-slate-500 italic">None</span>
            </div>
        );
    }

    return (
        <div
            className="bg-white/90 dark:bg-slate-800/80 px-4 py-2 rounded-full text-slate-700 dark:text-slate-200 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm transition-colors text-xs font-medium flex items-center gap-2 pointer-events-auto select-none group relative cursor-help"
            title={`Current Port Selected: ${details.fullText}`}
        >
            <span>
                Current Port Selected: <span className="text-blue-600 dark:text-blue-400 font-bold">{details.portName}</span> on <span className="text-slate-900 dark:text-white font-semibold">{details.deviceName}</span>
            </span>
            <button
                onClick={(e) => { e.stopPropagation(); selectPort(null); }}
                className="ml-2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
                title="Clear Selection (Esc)"
                aria-label="Clear selection"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    );
};
