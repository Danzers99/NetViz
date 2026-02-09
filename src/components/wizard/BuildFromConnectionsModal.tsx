import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Zap, Router, Server, Monitor, Printer, Wifi, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import type { DeviceType, RoomType } from '../../types';
import type { SimpleBuildConfig, SimpleDevice, ValidationIssue } from '../../utils/connectionTypes';

interface BuildFromConnectionsModalProps {
    onBuild: (config: SimpleBuildConfig) => void;
    onCancel: () => void;
}

// Room options
const ROOM_OPTIONS: { type: RoomType; label: string }[] = [
    { type: 'office', label: 'Office' },
    { type: 'dining', label: 'Dining' },
    { type: 'kitchen', label: 'Kitchen' },
    { type: 'bar', label: 'Bar' },
    { type: 'storage', label: 'Storage' },
];

// Device role definitions with icons and defaults
const DEVICE_ROLES = {
    switch: {
        label: 'Switch',
        icon: Server,
        defaultType: 'unmanaged-switch' as DeviceType,
        defaultRoom: 'office' as RoomType,
        color: 'text-blue-500',
    },
    pos: {
        label: 'POS Station',
        icon: Monitor,
        defaultType: 'v4-pos' as DeviceType,
        defaultRoom: 'dining' as RoomType,
        color: 'text-green-500',
    },
    printer: {
        label: 'Printer',
        icon: Printer,
        defaultType: 'epson-thermal' as DeviceType,
        defaultRoom: 'dining' as RoomType,
        color: 'text-orange-500',
    },
    ap: {
        label: 'Access Point',
        icon: Wifi,
        defaultType: 'access-point' as DeviceType,
        defaultRoom: 'dining' as RoomType,
        color: 'text-purple-500',
    },
    kds: {
        label: 'Kitchen Display',
        icon: Monitor,
        defaultType: 'kds' as DeviceType,
        defaultRoom: 'kitchen' as RoomType,
        color: 'text-cyan-500',
    },
    router: {
        label: 'Router',
        icon: Router,
        defaultType: 'zyxel-router' as DeviceType,
        defaultRoom: 'office' as RoomType,
        color: 'text-blue-600',
    },
};

// Generate unique ID
const generateId = () => `dev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const BuildFromConnectionsModal = ({ onBuild, onCancel }: BuildFromConnectionsModalProps) => {
    // Router selection (ZyXEL or Cradlepoint)
    const [routerType, setRouterType] = useState<DeviceType>('zyxel-router');

    // User-added devices
    const [devices, setDevices] = useState<SimpleDevice[]>([]);

    // Validation
    const [error, setError] = useState<string | null>(null);

    // Get all switches for connection dropdown
    const switches = useMemo(() =>
        devices.filter(d => d.role === 'switch'),
        [devices]
    );

    // Auto-name counter per role
    const getNextName = (role: SimpleDevice['role']): string => {
        const existing = devices.filter(d => d.role === role);
        const roleLabel = DEVICE_ROLES[role]?.label || role;
        return `${roleLabel} ${existing.length + 1}`;
    };

    // Add a device
    const addDevice = (role: SimpleDevice['role']) => {
        const roleDef = DEVICE_ROLES[role];
        const newDevice: SimpleDevice = {
            id: generateId(),
            role,
            type: roleDef.defaultType,
            name: getNextName(role),
            room: roleDef.defaultRoom,
            connectTo: switches.length > 0 ? switches[0].id : undefined,
        };
        setDevices([...devices, newDevice]);
        setError(null);
    };

    // Remove a device
    const removeDevice = (id: string) => {
        // Also clear connectTo references
        setDevices(devices
            .filter(d => d.id !== id)
            .map(d => d.connectTo === id ? { ...d, connectTo: undefined } : d)
        );
    };

    // Update a device
    const updateDevice = (id: string, updates: Partial<SimpleDevice>) => {
        setDevices(devices.map(d => d.id === id ? { ...d, ...updates } : d));
    };

    // Validate configuration
    const validationIssues = useMemo((): ValidationIssue[] => {
        const issues: ValidationIssue[] = [];

        // Check for orphaned endpoints (no switch and they need one)
        const endpoints = devices.filter(d => d.role !== 'switch' && d.role !== 'router');
        const hasSwitches = switches.length > 0;

        if (!hasSwitches && endpoints.length > 4) {
            issues.push({
                type: 'warning',
                message: 'No switch added. Router has limited LAN ports. Consider adding a switch.',
            });
        }

        // Check for endpoints without connection
        for (const endpoint of endpoints) {
            if (!endpoint.connectTo && hasSwitches) {
                issues.push({
                    type: 'info',
                    message: `${endpoint.name} will auto-connect to first available switch`,
                    deviceName: endpoint.name,
                });
            }
        }

        return issues;
    }, [devices, switches]);

    // Build the topology
    const handleBuild = () => {
        setError(null);

        if (devices.length === 0) {
            setError('Add at least one device (switch, POS, or printer)');
            return;
        }

        // Create the simplified config
        const config: SimpleBuildConfig = {
            routerType,
            devices,
        };

        onBuild(config);
    };

    // Load a preset
    const loadPreset = (presetId: string) => {
        if (presetId === 'basic') {
            setDevices([
                { id: generateId(), role: 'switch', type: 'unmanaged-switch', name: 'Main Switch', room: 'office' },
                { id: generateId(), role: 'pos', type: 'v4-pos', name: 'POS 1', room: 'dining' },
                { id: generateId(), role: 'printer', type: 'epson-thermal', name: 'Receipt Printer', room: 'dining' },
                { id: generateId(), role: 'printer', type: 'epson-impact', name: 'Kitchen Printer', room: 'kitchen' },
            ]);
        } else if (presetId === 'extended') {
            setDevices([
                { id: generateId(), role: 'switch', type: 'unmanaged-switch', name: 'Main Switch', room: 'office' },
                { id: generateId(), role: 'pos', type: 'v4-pos', name: 'POS 1', room: 'dining' },
                { id: generateId(), role: 'pos', type: 'v4-pos', name: 'POS 2', room: 'dining' },
                { id: generateId(), role: 'pos', type: 'v4-pos', name: 'Bar POS', room: 'bar' },
                { id: generateId(), role: 'printer', type: 'epson-thermal', name: 'Receipt Printer', room: 'dining' },
                { id: generateId(), role: 'printer', type: 'epson-impact', name: 'Kitchen Printer', room: 'kitchen' },
                { id: generateId(), role: 'ap', type: 'access-point', name: 'WiFi AP', room: 'dining' },
            ]);
        }
        setError(null);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Zap className="text-violet-500" size={24} />
                            Quick Build
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Add your devices - we'll handle the wiring
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Presets */}
                    <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400 self-center">
                            Quick start:
                        </span>
                        <button
                            onClick={() => loadPreset('basic')}
                            className="px-3 py-1.5 text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                        >
                            Basic Store
                        </button>
                        <button
                            onClick={() => loadPreset('extended')}
                            className="px-3 py-1.5 text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                        >
                            Extended Store
                        </button>
                    </div>

                    {/* Infrastructure (Locked) */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <Lock size={12} />
                            Infrastructure (Auto-managed)
                        </div>

                        {/* ISP Modem */}
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <CheckCircle size={16} className="text-emerald-500" />
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-slate-900 dark:text-white">ISP Modem</div>
                                <div className="text-xs text-slate-500">Always online • Internet source</div>
                            </div>
                            <span className="text-xs text-emerald-500 font-medium">ONLINE</span>
                        </div>

                        {/* Router Selection */}
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Router size={16} className="text-blue-500" />
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-slate-900 dark:text-white">Cake Router</div>
                                <div className="text-xs text-slate-500">WAN → ISP Modem (locked)</div>
                            </div>
                            <select
                                value={routerType}
                                onChange={(e) => setRouterType(e.target.value as DeviceType)}
                                className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 border-0 rounded-lg focus:ring-2 focus:ring-violet-500"
                            >
                                <option value="zyxel-router">ZyXEL</option>
                                <option value="cradlepoint-router">Cradlepoint</option>
                            </select>
                        </div>
                    </div>

                    {/* Add Device Buttons */}
                    <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                            Add Devices
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(DEVICE_ROLES).map(([role, def]) => {
                                const Icon = def.icon;
                                return (
                                    <button
                                        key={role}
                                        onClick={() => addDevice(role as SimpleDevice['role'])}
                                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-violet-300 dark:hover:border-violet-500 hover:shadow-sm transition-all"
                                    >
                                        <Icon size={16} className={def.color} />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {def.label}
                                        </span>
                                        <Plus size={14} className="text-slate-400" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Device List */}
                    {devices.length > 0 && (
                        <div>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                                Your Devices ({devices.length})
                            </div>
                            <div className="space-y-2">
                                {devices.map((device) => {
                                    const roleDef = DEVICE_ROLES[device.role];
                                    const Icon = roleDef?.icon || Monitor;
                                    const isSwitch = device.role === 'switch';

                                    return (
                                        <div
                                            key={device.id}
                                            className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                                        >
                                            {/* Icon */}
                                            <div className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${roleDef?.color || ''}`}>
                                                <Icon size={16} />
                                            </div>

                                            {/* Name */}
                                            <input
                                                type="text"
                                                value={device.name}
                                                onChange={(e) => updateDevice(device.id, { name: e.target.value })}
                                                className="flex-1 min-w-0 px-2 py-1 text-sm bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-violet-500 focus:outline-none text-slate-900 dark:text-white"
                                            />

                                            {/* Room */}
                                            <select
                                                value={device.room}
                                                onChange={(e) => updateDevice(device.id, { room: e.target.value as RoomType })}
                                                className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border-0 rounded focus:ring-1 focus:ring-violet-500"
                                            >
                                                {ROOM_OPTIONS.map(r => (
                                                    <option key={r.type} value={r.type}>{r.label}</option>
                                                ))}
                                            </select>

                                            {/* Connect To (only for non-switches) */}
                                            {!isSwitch && switches.length > 0 && (
                                                <select
                                                    value={device.connectTo || ''}
                                                    onChange={(e) => updateDevice(device.id, { connectTo: e.target.value || undefined })}
                                                    className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border-0 rounded focus:ring-1 focus:ring-violet-500"
                                                >
                                                    <option value="">(Auto)</option>
                                                    {switches.map(sw => (
                                                        <option key={sw.id} value={sw.id}>{sw.name}</option>
                                                    ))}
                                                </select>
                                            )}

                                            {/* Delete */}
                                            <button
                                                onClick={() => removeDevice(device.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Validation Issues */}
                    {validationIssues.length > 0 && (
                        <div className="space-y-2">
                            {validationIssues.map((issue, idx) => (
                                <div
                                    key={idx}
                                    className={`p-2.5 rounded-lg flex items-start gap-2 text-sm ${issue.type === 'warning'
                                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        }`}
                                >
                                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                    <span>{issue.message}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {devices.length === 0
                            ? 'Add devices to get started'
                            : `${devices.length} device${devices.length === 1 ? '' : 's'} • Ports auto-assigned`
                        }
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleBuild}
                            disabled={devices.length === 0}
                            className="px-6 py-2.5 text-sm font-medium bg-violet-600 hover:bg-violet-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg shadow-lg shadow-violet-500/25 transition-colors flex items-center gap-2"
                        >
                            <Zap size={16} />
                            Build Network
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
