
import type { DeviceType, PortRole } from '../types';

export interface DevicePortDef {
    id: string; // Suffix (e.g., 'wan' -> generates 'dev-1-wan')
    label: string;
    role: PortRole;
}

export interface PowerModel {
    requiresPower: boolean;
    powerSource: 'outlet' | 'poe' | 'internal';
}

export interface DeviceCapabilities {
    isRouter?: boolean;
    isSwitch?: boolean;
    isAP?: boolean;
    isPoEInjector?: boolean;
    isOutlet?: boolean;
    isModem?: boolean;
    isMobile?: boolean; // Battery powered / handheld
    isEndpoint?: boolean; // General end device (POS, Printer)
    wifiHosting?: boolean; // Hosts SSIDs
    poeSource?: boolean; // Provides PoE (injectors, managed switches)
}

export interface DeviceDefinition {
    type: DeviceType;
    displayName: string;
    category: 'pos' | 'printer' | 'wireless' | 'infra' | 'power';
    ports: DevicePortDef[];
    powerModel: PowerModel;
    capabilities: DeviceCapabilities;
}

// Helper to generate range of ports
const range = (count: number, prefix: string, labelPrefix: string, role: PortRole): DevicePortDef[] => {
    return Array.from({ length: count }, (_, i) => ({
        id: `${prefix}${i + 1}`,
        label: `${labelPrefix} ${i + 1}`,
        role
    }));
};

export const DEVICE_DEFINITIONS: Record<DeviceType, DeviceDefinition> = {
    'isp-modem': {
        type: 'isp-modem',
        displayName: 'ISP Modem',
        category: 'infra',
        ports: [
            { id: 'wan', label: 'ISP/Coax', role: 'wan' },
            { id: 'lan', label: 'LAN', role: 'lan' }
        ],
        powerModel: { requiresPower: false, powerSource: 'internal' }, // "Magic" power
        capabilities: { isModem: true, wifiHosting: true } // Modems often have built-in wifi in this domain? Store says yes.
    },
    'zyxel-router': {
        type: 'zyxel-router',
        displayName: 'Zyxel Router',
        category: 'infra',
        ports: [
            { id: 'wan', label: 'WAN', role: 'wan' },
            ...range(4, 'lan', 'LAN', 'lan'),
            { id: 'pwr', label: 'Power', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isRouter: true, wifiHosting: true }
    },
    'cradlepoint-router': {
        type: 'cradlepoint-router',
        displayName: 'Cradlepoint Router',
        category: 'infra',
        ports: [
            { id: 'wan', label: 'WAN', role: 'wan' },
            ...range(4, 'lan', 'LAN', 'lan'),
            { id: 'pwr', label: 'Power', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isRouter: true, wifiHosting: true }
    },
    'managed-switch': {
        type: 'managed-switch',
        displayName: 'Managed Switch',
        category: 'infra',
        ports: [
            ...range(8, 'p', 'Port', 'generic'),
            { id: 'pwr', label: 'Power', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isSwitch: true, poeSource: true } // Assumed generic ports can do PoE
    },
    'unmanaged-switch': {
        type: 'unmanaged-switch',
        displayName: 'Unmanaged Switch',
        category: 'infra',
        ports: [
            ...range(8, 'p', 'Port', 'generic'),
            { id: 'pwr', label: 'Power', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isSwitch: true }
    },
    'access-point': {
        type: 'access-point',
        displayName: 'Access Point',
        category: 'wireless',
        ports: [
            { id: 'eth', label: 'ETH', role: 'poe_client' }
        ],
        powerModel: { requiresPower: true, powerSource: 'poe' },
        capabilities: { isAP: true, wifiHosting: true }
    },
    'datto-ap62': {
        type: 'datto-ap62',
        displayName: 'Datto AP62',
        category: 'wireless',
        ports: [
            { id: 'eth', label: 'ETH', role: 'poe_client' }
        ],
        powerModel: { requiresPower: true, powerSource: 'poe' },
        capabilities: { isAP: true, wifiHosting: true }
    },
    'datto-ap440': {
        type: 'datto-ap440',
        displayName: 'Datto AP440',
        category: 'wireless',
        ports: [
            { id: 'eth_poe', label: 'ETH/PoE', role: 'poe_client' }
        ],
        powerModel: { requiresPower: true, powerSource: 'poe' },
        capabilities: { isAP: true, wifiHosting: true }
    },
    'poe-injector': {
        type: 'poe-injector',
        displayName: 'PoE Injector',
        category: 'power',
        ports: [
            { id: 'poe_out', label: 'PoE OUT', role: 'poe_source' },
            { id: 'lan_in', label: 'LAN IN', role: 'uplink' },
            { id: 'power', label: 'POWER', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isPoEInjector: true, poeSource: true }
    },
    'power-outlet': {
        type: 'power-outlet',
        displayName: 'Power Outlet',
        category: 'power',
        ports: range(4, 'outlet', 'Outlet', 'power_source'),
        powerModel: { requiresPower: false, powerSource: 'internal' }, // Magic power source
        capabilities: { isOutlet: true }
    },
    'pos': {
        type: 'pos',
        displayName: 'POS Terminal',
        category: 'pos',
        ports: [
            { id: 'eth', label: 'ETH', role: 'access' },
            { id: 'pwr', label: 'Power', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isEndpoint: true }
    },
    'datavan-pos': {
        type: 'datavan-pos',
        displayName: 'Datavan POS',
        category: 'pos',
        ports: [
            { id: 'eth', label: 'ETH', role: 'access' },
            { id: 'pwr', label: 'Power', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isEndpoint: true }
    },
    'poindus-pos': {
        type: 'poindus-pos',
        displayName: 'Poindus POS',
        category: 'pos',
        ports: [
            { id: 'eth', label: 'ETH', role: 'access' },
            { id: 'pwr', label: 'Power', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isEndpoint: true }
    },
    'v3-pos': {
        type: 'v3-pos',
        displayName: 'V3 POS',
        category: 'pos',
        ports: [
            { id: 'eth', label: 'ETH', role: 'access' },
            { id: 'pwr', label: 'Power', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isEndpoint: true }
    },
    'v4-pos': {
        type: 'v4-pos',
        displayName: 'V4 POS',
        category: 'pos',
        ports: [
            { id: 'eth', label: 'ETH', role: 'access' },
            { id: 'pwr', label: 'Power', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isEndpoint: true }
    },
    'printer': {
        type: 'printer',
        displayName: 'Printer',
        category: 'printer',
        ports: [
            { id: 'eth', label: 'ETH', role: 'access' },
            { id: 'pwr', label: 'Power', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isEndpoint: true }
    },
    'epson-thermal': {
        type: 'epson-thermal',
        displayName: 'Epson Thermal',
        category: 'printer',
        ports: [
            { id: 'eth', label: 'ETH', role: 'access' },
            { id: 'pwr', label: 'Power', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isEndpoint: true }
    },
    'epson-impact': {
        type: 'epson-impact',
        displayName: 'Epson Kitchen',
        category: 'printer',
        ports: [
            { id: 'eth', label: 'ETH', role: 'access' },
            { id: 'pwr', label: 'Power', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isEndpoint: true }
    },
    'kds': {
        type: 'kds',
        displayName: 'KDS',
        category: 'pos',
        ports: [
            { id: 'eth', label: 'ETH', role: 'access' },
            { id: 'pwr', label: 'Power', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isEndpoint: true }
    },
    'elo-kds': {
        type: 'elo-kds',
        displayName: 'Elo KDS',
        category: 'pos',
        ports: [
            { id: 'eth', label: 'ETH', role: 'access' },
            { id: 'pwr', label: 'Power', role: 'power_input' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' },
        capabilities: { isEndpoint: true }
    },
    'orderpad': {
        type: 'orderpad',
        displayName: 'OrderPad',
        category: 'pos',
        ports: [], // Wireless only
        powerModel: { requiresPower: false, powerSource: 'internal' }, // Battery
        capabilities: { isEndpoint: true, isMobile: true }
    },
    'cakepop': {
        type: 'cakepop',
        displayName: 'CakePop',
        category: 'pos',
        ports: [],
        powerModel: { requiresPower: false, powerSource: 'internal' }, // Battery
        capabilities: { isEndpoint: true, isMobile: true }
    },
    'unknown': {
        type: 'unknown',
        displayName: 'Unknown Device',
        category: 'infra',
        ports: [
            { id: 'p1', label: 'Port 1', role: 'generic' },
            { id: 'p2', label: 'Port 2', role: 'generic' }
        ],
        powerModel: { requiresPower: true, powerSource: 'outlet' }, // Default safe
        capabilities: {}
    }
};

// Helper for type-safe lookups that might be missing if we messed up
export const getDeviceDefinition = (type: DeviceType): DeviceDefinition => {
    return DEVICE_DEFINITIONS[type] || DEVICE_DEFINITIONS['unknown'];
};
