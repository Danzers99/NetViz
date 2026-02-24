/**
 * deviceStatus.ts
 *
 * Single source of truth for device status indicators.
 *
 * Two layers:
 *  1. Network connectivity (connectionState) — shared by 2D and 3D
 *  2. Power + Network (device.status + connectionState) — 3D only
 *
 * The 2D diagram is a network-layer-only visualization (no power modelling),
 * so it uses getNetworkStatus().
 * The 3D sandbox models power connections, so it uses getEffectiveStatus()
 * which layers power validation on top of network status.
 */

import type { DeviceStatus, ConnectionState } from '../types';

export interface EffectiveStatus {
    /** Hex color for SVG / inline styles */
    color: string;
    /** Human-readable label */
    label: string;
    /** Tailwind CSS class for the status dot */
    cssClass: string;
}

// ─── Network Layer (used by 2D diagram) ─────────────────────

/**
 * Derive status from network connectivity alone (connectionState).
 * Does NOT consider power state — suitable for the 2D network diagram.
 */
export function getNetworkStatus(connectionState?: ConnectionState): EffectiveStatus {
    switch (connectionState) {
        case 'online':
            return { color: '#22c55e', label: 'online', cssClass: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' };
        case 'associated_no_internet':
            return { color: '#f59e0b', label: 'no internet', cssClass: 'bg-amber-500' };
        case 'associated_no_ip':
            return { color: '#f59e0b', label: 'no IP', cssClass: 'bg-amber-500' };
        case 'associating_wifi':
            return { color: '#f59e0b', label: 'associating', cssClass: 'bg-amber-500 animate-pulse' };
        case 'auth_failed':
            return { color: '#ef4444', label: 'auth failed', cssClass: 'bg-red-500' };
        case 'disconnected':
            return { color: '#ef4444', label: 'disconnected', cssClass: 'bg-red-500' };
        default:
            // connectionState undefined (infra devices like routers/switches)
            // If they're in the graph, they're considered active
            return { color: '#22c55e', label: 'online', cssClass: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' };
    }
}

// ─── Power + Network Layer (used by 3D sandbox) ─────────────

interface DeviceStatusInput {
    status: DeviceStatus;
    connectionState?: ConnectionState;
}

/**
 * Derive effective status from power state AND network connectivity.
 * Power validation is checked first; if the device is powered on,
 * falls through to the shared network connectivity logic.
 * Use this in the 3D sandbox where power connections are modelled.
 */
export function getEffectiveStatus(device: DeviceStatusInput): EffectiveStatus {
    // Power layer — takes priority
    if (device.status === 'offline') return { color: '#6b7280', label: 'offline', cssClass: 'bg-slate-500' };
    if (device.status === 'booting') return { color: '#f59e0b', label: 'booting', cssClass: 'bg-amber-500 animate-pulse' };
    if (device.status === 'error') return { color: '#ef4444', label: 'error', cssClass: 'bg-red-500' };

    // Device is powered on — delegate to network layer
    return getNetworkStatus(device.connectionState);
}
