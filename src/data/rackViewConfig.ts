import type { DeviceType } from '../types';
import { getDeviceDefinition } from './deviceDefinitions';

export interface RackViewCameraConfig {
    /** Camera position relative to device origin [x, y, z] */
    cameraPosition: [number, number, number];
    /** Camera look-at target relative to device origin [x, y, z] */
    cameraTarget: [number, number, number];
    /** Which face the primary ports are on */
    portFace: 'front' | 'back' | 'top';
    /** Label shown in the overlay header (e.g. "Rear Panel") */
    viewLabel: string;
}

/**
 * Per-device-type camera presets for the Rack View overlay.
 * Camera positions are derived from the port face Z-values in layout.ts
 * so the camera always looks directly at the port panel.
 */
export const RACK_VIEW_CONFIGS: Partial<Record<DeviceType, RackViewCameraConfig>> = {
    // ── Routers ──────────────────────────────────────────────
    'zyxel-router': {
        // Vertical tower, ports on back (Z=-0.46), stacked vertically
        cameraPosition: [0, 0.5, -2.0],
        cameraTarget: [0, 0.5, -0.46],
        portFace: 'back',
        viewLabel: 'Rear Panel',
    },
    'cradlepoint-router': {
        // Low-profile chassis, ports on rear (Z=-0.52), horizontal spread
        cameraPosition: [0, 0.25, -2.2],
        cameraTarget: [0, 0.12, -0.52],
        portFace: 'back',
        viewLabel: 'Rear Panel',
    },

    // ── Modem ────────────────────────────────────────────────
    'isp-modem': {
        // Vertical tower, ports on back (Z=-0.41)
        cameraPosition: [0, 0.6, -1.8],
        cameraTarget: [0, 0.7, -0.41],
        portFace: 'back',
        viewLabel: 'Rear Panel',
    },

    // ── Switches ─────────────────────────────────────────────
    'managed-switch': {
        // Rack-mount, 8 data ports on front (Z=+0.52), power on back
        cameraPosition: [0, 0.35, 2.8],
        cameraTarget: [0, 0.22, 0.52],
        portFace: 'front',
        viewLabel: 'Front Panel',
    },
    'unmanaged-switch': {
        cameraPosition: [0, 0.35, 2.8],
        cameraTarget: [0, 0.22, 0.52],
        portFace: 'front',
        viewLabel: 'Front Panel',
    },

    // ── PoE Injector ─────────────────────────────────────────
    'poe-injector': {
        // PoE + LAN on front (Z=+0.41), Power on back
        cameraPosition: [0, 0.2, 1.6],
        cameraTarget: [0, 0.15, 0.41],
        portFace: 'front',
        viewLabel: 'Front Panel',
    },

    // ── Access Points ────────────────────────────────────────
    'access-point': {
        // Single port on back/underside (Z=-0.42)
        cameraPosition: [0, 0.15, -1.4],
        cameraTarget: [0, 0.1, -0.42],
        portFace: 'back',
        viewLabel: 'Underside',
    },
    'datto-ap440': {
        cameraPosition: [0, 0.15, -1.4],
        cameraTarget: [0, 0.1, -0.42],
        portFace: 'back',
        viewLabel: 'Underside',
    },
    'datto-ap62': {
        cameraPosition: [0, 0.15, -1.4],
        cameraTarget: [0, 0.1, -0.42],
        portFace: 'back',
        viewLabel: 'Underside',
    },

    // ── POS Terminals (EloKDS model) ─────────────────────────
    'pos': {
        cameraPosition: [0, 0.1, -1.0],
        cameraTarget: [0, 0.05, -0.18],
        portFace: 'back',
        viewLabel: 'Base / Rear',
    },
    'datavan-pos': {
        cameraPosition: [0, 0.1, -1.0],
        cameraTarget: [0, 0.05, -0.18],
        portFace: 'back',
        viewLabel: 'Base / Rear',
    },
    'poindus-pos': {
        cameraPosition: [0, 0.1, -1.0],
        cameraTarget: [0, 0.05, -0.18],
        portFace: 'back',
        viewLabel: 'Base / Rear',
    },
    'v3-pos': {
        cameraPosition: [0, 0.1, -1.0],
        cameraTarget: [0, 0.05, -0.18],
        portFace: 'back',
        viewLabel: 'Base / Rear',
    },
    'v4-pos': {
        cameraPosition: [0, 0.1, -1.0],
        cameraTarget: [0, 0.05, -0.18],
        portFace: 'back',
        viewLabel: 'Base / Rear',
    },
    'elo-kds': {
        cameraPosition: [0, 0.1, -1.0],
        cameraTarget: [0, 0.05, -0.18],
        portFace: 'back',
        viewLabel: 'Base / Rear',
    },

    // ── KDS (POSModel) ──────────────────────────────────────
    'kds': {
        cameraPosition: [0, 0.15, -1.3],
        cameraTarget: [0, 0.1, -0.28],
        portFace: 'back',
        viewLabel: 'Base / Rear',
    },

    // ── Printers ─────────────────────────────────────────────
    'printer': {
        cameraPosition: [0, 0.15, -1.4],
        cameraTarget: [0, 0.1, -0.32],
        portFace: 'back',
        viewLabel: 'Rear Panel',
    },
    'epson-thermal': {
        cameraPosition: [0, 0.15, -1.4],
        cameraTarget: [0, 0.1, -0.32],
        portFace: 'back',
        viewLabel: 'Rear Panel',
    },
    'epson-impact': {
        cameraPosition: [0, 0.15, -1.4],
        cameraTarget: [0, 0.1, -0.32],
        portFace: 'back',
        viewLabel: 'Rear Panel',
    },
};

/**
 * Check if a device type supports the Rack View feature.
 * Excludes mobile/wireless-only devices, power outlets, and unknown.
 */
export const isRackViewSupported = (type: DeviceType): boolean => {
    if (type === 'unknown') return false;
    const def = getDeviceDefinition(type);
    if (def.ports.length === 0) return false;
    if (def.capabilities.isMobile) return false;
    if (def.capabilities.isOutlet) return false;
    return type in RACK_VIEW_CONFIGS;
};
