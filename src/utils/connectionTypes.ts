import type { DeviceType, RoomType } from '../types';

/**
 * Represents a single port-to-port connection definition
 */
export interface PortConnection {
    sourcePort: string;           // Port name on this device (e.g., "WAN", "LAN1", "ETH")
    targetDevice: string | null;  // Target device name, "ISP" for internet, or null for unconnected
    targetPort?: string;          // Optional target port name (auto-selected if omitted)
}

/**
 * Specification for a device to be created
 */
export interface DeviceSpec {
    name: string;                 // User-friendly name (e.g., "ZyXEL", "Switch A")
    type: DeviceType;             // Device type from deviceDefinitions
    room?: RoomType;              // Optional room assignment
    connections: PortConnection[];
}

/**
 * Optional explicit room definition
 */
export interface RoomSpec {
    type: RoomType;
    name?: string;                // Custom name (defaults to type capitalized)
}

/**
 * Complete configuration for building a topology
 */
export interface ConnectionBuildConfig {
    rooms?: RoomSpec[];           // Explicit room definitions (auto-inferred if omitted)
    devices: DeviceSpec[];
}

/**
 * Result of building a topology
 */
export interface BuildResult {
    devices: import('../types').Device[];
    rooms: import('../types').Room[];
    connections: [string, string][]; // Pairs of port IDs to connect
}

/**
 * Error from parsing or building
 */
export interface BuildError {
    message: string;
    deviceName?: string;
    portName?: string;
    line?: number;
}

/**
 * Validation issue for live feedback (not a blocking error)
 */
export interface ValidationIssue {
    type: 'error' | 'warning' | 'info';
    message: string;
    deviceName?: string;
}

/**
 * Simplified device entry for role-based UI
 * Users add devices by role, not by port-level wiring
 */
export interface SimpleDevice {
    id: string;                    // Unique ID for this entry
    role: 'router' | 'switch' | 'pos' | 'printer' | 'ap' | 'kds';
    type: DeviceType;              // Specific device model
    name: string;                  // Display name (auto-generated if blank)
    room: RoomType;               // Room assignment
    connectTo?: string;           // ID of switch/router to connect to (auto if omitted)
}

/**
 * Simplified build configuration
 * ISP modem and WAN connections are implicit
 */
export interface SimpleBuildConfig {
    routerType: DeviceType;       // Which Cake router (zyxel or cradlepoint)
    devices: SimpleDevice[];      // User-added devices (switches + endpoints)
}
