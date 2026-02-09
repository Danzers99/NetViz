/**
 * Connection Rules Engine
 * Enforces valid network topology connections
 */

import type { DeviceType } from '../types';
import { DEVICE_DEFINITIONS } from '../data/deviceDefinitions';

/**
 * Device roles for connection validation
 */
export type DeviceRole =
    | 'isp-modem'
    | 'router'
    | 'switch'
    | 'endpoint'  // POS, Printer, KDS, etc.
    | 'ap';       // Access Points (PoE powered)

/**
 * Get the role of a device type
 */
export function getDeviceRole(type: DeviceType): DeviceRole {
    const def = DEVICE_DEFINITIONS[type];
    if (!def) return 'endpoint';

    if (def.capabilities.isModem) return 'isp-modem';
    if (def.capabilities.isRouter) return 'router';
    if (def.capabilities.isSwitch) return 'switch';
    if (def.capabilities.isAP) return 'ap';
    return 'endpoint';
}

/**
 * Connection rules - what can connect to what
 * Format: [sourceRole, targetRole] = allowed
 */
const ALLOWED_CONNECTIONS: [DeviceRole, DeviceRole][] = [
    // ISP Modem connections
    ['isp-modem', 'router'],      // ISP → Router WAN
    ['router', 'isp-modem'],      // Router WAN → ISP (reverse)

    // Router LAN connections
    ['router', 'switch'],         // Router LAN → Switch
    ['router', 'endpoint'],       // Router LAN → Endpoint (if no switch)
    ['router', 'ap'],             // Router LAN → AP

    // Switch connections
    ['switch', 'router'],         // Switch → Router LAN (uplink)
    ['switch', 'switch'],         // Switch → Switch (cascading)
    ['switch', 'endpoint'],       // Switch → Endpoint
    ['switch', 'ap'],             // Switch → AP

    // Endpoints/APs can connect back
    ['endpoint', 'switch'],       // Endpoint → Switch
    ['endpoint', 'router'],       // Endpoint → Router LAN (if no switch)
    ['ap', 'switch'],             // AP → Switch
    ['ap', 'router'],             // AP → Router LAN
];

/**
 * Explicit blocked connections with error messages
 */
const BLOCKED_CONNECTIONS: { source: DeviceRole; target: DeviceRole; message: string }[] = [
    {
        source: 'endpoint',
        target: 'endpoint',
        message: 'Endpoints cannot connect directly to each other. Connect them to a switch.'
    },
    {
        source: 'endpoint',
        target: 'isp-modem',
        message: 'Endpoints cannot connect to the ISP modem. Connect them to a switch or router LAN.'
    },
    {
        source: 'switch',
        target: 'isp-modem',
        message: 'Switches cannot connect to the ISP modem. Connect the switch to a router LAN port.'
    },
    {
        source: 'ap',
        target: 'endpoint',
        message: 'Access points cannot connect to endpoints. Connect the AP to a switch.'
    },
    {
        source: 'ap',
        target: 'isp-modem',
        message: 'Access points cannot connect to the ISP modem. Connect the AP to a switch.'
    },
];

/**
 * Check if a connection between two device types is valid
 */
export function canConnect(sourceType: DeviceType, targetType: DeviceType): boolean {
    const sourceRole = getDeviceRole(sourceType);
    const targetRole = getDeviceRole(targetType);

    // Check if explicitly allowed
    return ALLOWED_CONNECTIONS.some(
        ([s, t]) => s === sourceRole && t === targetRole
    );
}

/**
 * Get error message for an invalid connection, or null if valid
 */
export function getConnectionError(sourceType: DeviceType, targetType: DeviceType): string | null {
    const sourceRole = getDeviceRole(sourceType);
    const targetRole = getDeviceRole(targetType);

    // Check if explicitly blocked
    const blocked = BLOCKED_CONNECTIONS.find(
        b => b.source === sourceRole && b.target === targetRole
    );
    if (blocked) {
        return blocked.message;
    }

    // Check if not in allowed list
    const isAllowed = ALLOWED_CONNECTIONS.some(
        ([s, t]) => s === sourceRole && t === targetRole
    );

    if (!isAllowed) {
        return `Cannot connect ${sourceRole} to ${targetRole}.`;
    }

    return null; // Valid connection
}

/**
 * Check if a device type can be the WAN uplink (only ISP modem)
 */
export function canBeWanUplink(type: DeviceType): boolean {
    return getDeviceRole(type) === 'isp-modem';
}

/**
 * Check if a device type requires a switch connection
 */
export function requiresSwitchConnection(type: DeviceType): boolean {
    const role = getDeviceRole(type);
    return role === 'endpoint' || role === 'ap';
}

/**
 * Get valid connection targets for a device type
 */
export function getValidTargets(sourceType: DeviceType, availableTypes: DeviceType[]): DeviceType[] {
    return availableTypes.filter(targetType => canConnect(sourceType, targetType));
}

/**
 * Device types that should not be user-addable
 */
export const SYSTEM_DEVICE_TYPES: DeviceType[] = ['isp-modem'];

/**
 * Router device types (Cake routers)
 */
export const ROUTER_TYPES: DeviceType[] = ['zyxel-router', 'cradlepoint-router'];

/**
 * Check if a device type is a system/locked device
 */
export function isSystemDevice(type: DeviceType): boolean {
    return SYSTEM_DEVICE_TYPES.includes(type);
}

/**
 * Check if a device type is a Cake router
 */
export function isCakeRouter(type: DeviceType): boolean {
    return ROUTER_TYPES.includes(type);
}
