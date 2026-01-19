export type DeviceType =
    | 'isp-modem'
    | 'zyxel-router'
    | 'cradlepoint-router'
    | 'managed-switch'
    | 'unmanaged-switch'
    | 'access-point'
    | 'datto-ap440'
    | 'datto-ap62'
    | 'poe-injector'
    | 'power-outlet'
    | 'pos'
    | 'datavan-pos'
    | 'poindus-pos'
    | 'v3-pos'
    | 'v4-pos'
    | 'printer'
    | 'epson-thermal'
    | 'epson-impact'
    | 'kds'
    | 'elo-kds'
    | 'orderpad'
    | 'cakepop'
    | 'unknown';

export type DeviceAction = 'reboot' | 'power_cycle' | 'power_off' | 'power_on';

export type PortRole = 'wan' | 'lan' | 'uplink' | 'access' | 'generic' | 'poe_source' | 'poe_client' | 'power_input' | 'power_source';

export type DeviceStatus = 'online' | 'offline' | 'booting' | 'error';

export type ConnectionState =
    | 'disconnected'
    | 'associating_wifi'
    | 'auth_failed'
    | 'associated_no_ip'
    | 'associated_no_internet'
    | 'online';

export interface Port {
    id: string;
    name: string;
    role: PortRole;
    connectedTo: string | null; // portId
    linkStatus?: 'up' | 'down' | 'negotiating'; // For visual link lights
}

export type RoomType = 'kitchen' | 'dining' | 'office' | 'bar' | 'storage';

export interface Room {
    id: string;
    type: RoomType;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}

export interface Device {
    id: string;
    type: DeviceType;
    name: string;
    position: [number, number, number];
    roomId?: string | null;
    ports: Port[];
    status: DeviceStatus;
    overrideStatus?: DeviceStatus | null;
    // Power state
    poeMode?: 'passive' | 'active_802_3af' | 'off';
    ip?: string;
    notes?: string;
    // Wireless Client settings
    wireless?: {
        ssid?: string;
        password?: string;
        associatedApId?: string | null;
        authState?: 'idle' | 'associating' | 'auth_failed' | 'associated';
    };
    // Hosted WiFi for Routers/APs
    wifiHosting?: {
        enabled: boolean;
        configs: Array<{
            ssid: string;
            password?: string;
            hidden: boolean;
            security: 'WPA2-PSK' | 'Open';
        }>;
    };
    // Replaces networkStatus
    connectionState?: ConnectionState;
}

export interface Settings {
    showWarnings: boolean;
    compactWarnings: boolean;
    darkMode: boolean;
    showDeviceNames?: boolean;
    showRoomNames?: boolean;
    userName?: string; // Identity for revisions
    hasSeenIntro?: boolean; // Track if user has seen onboarding
}

export interface RevisionStats {
    deviceCount: number;
    roomCount: number;
    cableCount: number; // Inferred from connected ports
}

export interface Revision {
    id: string;             // UUID v4
    timestamp: number;      // Unix epoch
    author: string;         // e.g. "David Morales"
    summary: string;        // Auto-generated e.g. "Modified Layout"
    manualNote?: string;    // Optional user comment
    stats: RevisionStats;
}

export interface ProjectInfo {
    name: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ConfigData {
    version: number; // Legacy
    schemaVersion?: number; // New schema version
    timestamp: number;
    projectInfo: ProjectInfo;
    settings: Settings;
    deviceCounts: Record<DeviceType, number>;
    devices: Device[];
    rooms: Room[];
    revisions?: Revision[]; // History log (optional until migrated)
}
