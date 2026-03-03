/**
 * HelpPanel.tsx
 *
 * Full-screen quick-reference overlay for CAKE network setup.
 * Replaces the old external Guru link with an in-app panel that
 * follows the same overlay pattern as RackView / NetworkDiagram.
 *
 * Design constraints:
 * - No vertical scrolling — everything fits in the viewport
 * - Scannable in under 10 seconds
 * - Not a documentation page — a quick reference card
 */

import { useEffect } from 'react';
import { useAppStore } from '../store';
import {
    X,
    HelpCircle,
    AlertTriangle,
    Router,
    Wifi,
    Cable,
    Monitor,
    Printer,
    Smartphone,
    Server,
    Plug,
} from 'lucide-react';

interface HelpPanelProps {
    onClose: () => void;
}

export const HelpPanel = ({ onClose }: HelpPanelProps) => {
    const darkMode = useAppStore((state) => state.settings.darkMode);

    // ESC to close — capture phase so it fires before other handlers
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopImmediatePropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', handler, true);
        return () => window.removeEventListener('keydown', handler, true);
    }, [onClose]);

    return (
        <div className={`fixed inset-0 z-[90] flex flex-col backdrop-blur-sm animate-in fade-in duration-200 ${
            darkMode ? 'bg-slate-950/95' : 'bg-slate-200/95'
        }`}>
            {/* ── Header ──────────────────────────────────────── */}
            <div className={`flex items-center justify-between px-5 py-3 border-b ${
                darkMode
                    ? 'border-slate-800 bg-slate-900/80'
                    : 'border-slate-300 bg-white/80'
            }`}>
                <div className="flex items-center gap-2">
                    <HelpCircle size={20} className="text-violet-500" />
                    <h2 className="text-slate-900 dark:text-white font-bold text-base">Quick Reference</h2>
                    <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm">CAKE Network Setup</span>
                </div>
                <button
                    onClick={onClose}
                    className={`p-2 rounded-lg transition-colors ${
                        darkMode
                            ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                            : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                    }`}
                    title="Close (ESC)"
                >
                    <X size={20} />
                </button>
            </div>

            {/* ── Body — 3-column grid, no scroll ─────────────── */}
            <div className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 overflow-hidden">

                {/* ── Column 1: Setup Flow ─────────────────────── */}
                <div className={`rounded-xl border p-4 flex flex-col gap-3 ${
                    darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                    <div className="flex items-center gap-2">
                        <Cable size={14} className="text-violet-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Setup Flow
                        </h3>
                    </div>

                    {/* Connection map */}
                    <div className="flex flex-col gap-1.5 text-sm">
                        <FlowItem
                            icon={<Server size={13} className="text-emerald-500" />}
                            label="ISP Modem"
                            port="LAN"
                            portColor="text-yellow-500"
                            darkMode={darkMode}
                        />
                        <FlowArrow darkMode={darkMode} />
                        <FlowItem
                            icon={<Router size={13} className="text-blue-500" />}
                            label="CAKE Router"
                            port="WAN (blue)"
                            portColor="text-blue-500"
                            darkMode={darkMode}
                        />
                        <FlowDivider darkMode={darkMode} />
                        <FlowItem
                            icon={<Monitor size={13} className="text-green-500" />}
                            label="POS Terminal"
                            port="→ Router LAN (yellow)"
                            portColor="text-yellow-500"
                            darkMode={darkMode}
                        />
                        <FlowItem
                            icon={<Printer size={13} className="text-orange-500" />}
                            label="Printer"
                            port="→ Router LAN (yellow)"
                            portColor="text-yellow-500"
                            darkMode={darkMode}
                        />
                        <FlowItem
                            icon={<Plug size={13} className="text-slate-400" />}
                            label="Cash Drawer"
                            port="→ Thermal Printer"
                            portColor="text-orange-400"
                            darkMode={darkMode}
                        />
                        <FlowItem
                            icon={<Monitor size={13} className="text-indigo-400" />}
                            label="Payment Cube"
                            port="→ POS USB (neck)"
                            portColor="text-green-400"
                            darkMode={darkMode}
                        />
                    </div>

                    {/* Warning */}
                    <div className={`mt-auto flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                        darkMode
                            ? 'bg-amber-900/20 border border-amber-800/40 text-amber-300'
                            : 'bg-amber-50 border border-amber-200 text-amber-700'
                    }`}>
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                        <span>Never plug printer or cash drawer directly into POS. Always trace cables during troubleshooting.</span>
                    </div>
                </div>

                {/* ── Column 2: Hardware Rules ─────────────────── */}
                <div className={`rounded-xl border p-4 flex flex-col gap-2.5 ${
                    darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                    <div className="flex items-center gap-2">
                        <Router size={14} className="text-violet-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Hardware Rules
                        </h3>
                    </div>

                    <RuleItem
                        title="Routers"
                        detail="ZyXEL EMG6726-B10A (vertical) or EMG3425-Q10A (horizontal). Same function. Only CAKE devices connect to CAKE router."
                        darkMode={darkMode}
                    />
                    <RuleItem
                        title="Access Point"
                        detail="Must initialize from CAKE router. Place in open area. Required for handhelds and optional KDS Wi-Fi."
                        darkMode={darkMode}
                    />
                    <RuleItem
                        title="Ethernet"
                        detail="All POS terminals and printers must be hardwired. No Wi-Fi for these devices."
                        darkMode={darkMode}
                    />
                    <RuleItem
                        title="Switches"
                        detail="Must be unmanaged (dumb). Netgear (current) / TrendNet (older). Merchants can supply their own."
                        darkMode={darkMode}
                    />
                    <RuleItem
                        title="IP Rule"
                        detail="CAKE devices must be 10.10.10.x — if showing 192.168.x.x, the device is not on the CAKE router."
                        darkMode={darkMode}
                    />
                    <RuleItem
                        title="Cash Drawer"
                        detail="Drawer connects to printer's cash drawer port. If printer is offline, drawer will not open."
                        darkMode={darkMode}
                    />
                </div>

                {/* ── Column 3: Wireless & Tips ────────────────── */}
                <div className={`rounded-xl border p-4 flex flex-col gap-2.5 ${
                    darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                    <div className="flex items-center gap-2">
                        <Wifi size={14} className="text-violet-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Wireless & Tips
                        </h3>
                    </div>

                    <RuleItem
                        title="OrderPad / CAKEpop"
                        detail="Connect via CAKE AP Wi-Fi. Require AP password from Datto. Needs 1 Master POS online."
                        icon={<Smartphone size={12} className="text-purple-400" />}
                        darkMode={darkMode}
                    />
                    <RuleItem
                        title="KDS / Kiosk"
                        detail="Can be wired (Ethernet to router/switch) or wireless via CAKE AP. Wired is preferred."
                        icon={<Monitor size={12} className="text-cyan-400" />}
                        darkMode={darkMode}
                    />

                    <div className={`mt-1 p-2.5 rounded-lg text-xs ${
                        darkMode ? 'bg-slate-700/60' : 'bg-slate-50'
                    }`}>
                        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Troubleshooting</p>
                        <ul className="space-y-1 text-slate-500 dark:text-slate-400">
                            <li className="flex items-start gap-1.5">
                                <span className="text-violet-400 mt-0.5">•</span>
                                Always trace cables verbally with the merchant
                            </li>
                            <li className="flex items-start gap-1.5">
                                <span className="text-violet-400 mt-0.5">•</span>
                                192.168.x.x IP = device not on CAKE router
                            </li>
                            <li className="flex items-start gap-1.5">
                                <span className="text-violet-400 mt-0.5">•</span>
                                Reboot sequence: Modem → Router → Switch → Endpoints
                            </li>
                            <li className="flex items-start gap-1.5">
                                <span className="text-violet-400 mt-0.5">•</span>
                                Check all link lights before escalating
                            </li>
                        </ul>
                    </div>

                    {/* ESC hint */}
                    <div className={`mt-auto text-center text-xs ${
                        darkMode ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                        Press <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
                        }`}>ESC</kbd> to close
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Sub-components ─────────────────────────────────────────── */

const FlowItem = ({ icon, label, port, portColor, darkMode }: {
    icon: React.ReactNode;
    label: string;
    port: string;
    portColor: string;
    darkMode: boolean;
}) => (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
        darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
    }`}>
        {icon}
        <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">{label}</span>
        <span className={`ml-auto text-xs font-mono ${portColor}`}>{port}</span>
    </div>
);

const FlowArrow = ({ darkMode }: { darkMode: boolean }) => (
    <div className="flex justify-center">
        <div className={`w-px h-3 ${darkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />
    </div>
);

const FlowDivider = ({ darkMode }: { darkMode: boolean }) => (
    <div className={`border-t my-1 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />
);

const RuleItem = ({ title, detail, icon, darkMode }: {
    title: string;
    detail: string;
    icon?: React.ReactNode;
    darkMode: boolean;
}) => (
    <div className={`px-2.5 py-2 rounded-lg ${
        darkMode ? 'bg-slate-700/40' : 'bg-slate-50'
    }`}>
        <div className="flex items-center gap-1.5">
            {icon}
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{title}</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{detail}</p>
    </div>
);
