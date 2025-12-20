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

export interface Device {
    id: string;
    type: DeviceType;
    name: string;
    position: [number, number, number];
    ports: Port[];
    status: DeviceStatus;
    // Power state
    poeMode?: 'passive' | 'active_802_3af' | 'off';
    ip?: string;
    notes?: string;
    // Wireless Client settings
    wireless?: {
        ssid?: string;
        password?: string;
        // isConnected is replaced by connectionState logic
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
}



export interface ProjectInfo {
    name: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ConfigData {
    version: number; // Legacy version field, kept for history
    schemaVersion?: number; // New schema version for migrations
    timestamp: number;
    projectInfo: ProjectInfo; // Added for V1.5.0
    settings: Settings;
    deviceCounts: Record<DeviceType, number>;
    devices: Device[];
}
