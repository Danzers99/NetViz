import type { ConfigData, Settings } from '../types';
import { propagatePowerState, updateLinkStatuses, updateConnectionStates } from './simulation';
import { isWifiCapable } from './wifi';
// import { validateNetwork } from '../validation';

const SETTINGS_STORAGE_KEY = 'netviz-settings';

export const loadSettingsFromStorage = (): Settings => {
    try {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure new setting keys exist
                return {
                    showWarnings: true,
                    compactWarnings: false,
                    darkMode: false,
                    ...parsed
                };
            }
        }
    } catch (e) {
        console.warn('Failed to load settings from storage', e);
    }
    return {
        showWarnings: true,
        compactWarnings: false,
        darkMode: false,
    };
};

export const saveSettingsToStorage = (settings: Settings) => {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        }
    } catch (e) {
        console.warn('Failed to save settings to storage', e);
    }
};

export const CURRENT_SCHEMA_VERSION = 3; // Incremented for Project Info

// Internal interface for legacy settings if needed, or just allow 'any'


interface LegacyConfigData {
    version?: number; // Old saves might have 'version' (application logic version), which we map to schemaVersion
    schemaVersion?: number; // New saves
    // ... other fields
    [key: string]: any;
}

export const migrateConfig = (data: LegacyConfigData): ConfigData => {
    let migrated = JSON.parse(JSON.stringify(data)); // Deep copy

    // Normalize version field
    // Old saves exported 'version: 1'.
    // We treat that as schemaVersion 1.
    if (!migrated.schemaVersion) {
        migrated.schemaVersion = migrated.version || 1;
    }

    // Migration Pipeline
    if (migrated.schemaVersion < 2) {
        migrated = migrateV1toV2(migrated);
    }
    if (migrated.schemaVersion < 3) {
        migrated = migrateV2toV3(migrated);
    }

    // Ensure final structure matches current types
    return migrated as ConfigData;
};

const migrateV2toV3 = (data: any): any => {
    console.log('Migrating save from v2 to v3 (Adding Project Info)...');

    // Add projectInfo if missing
    if (!data.projectInfo) {
        data.projectInfo = {
            name: "Untitled Location",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    data.schemaVersion = 3;
    return data;
};

const migrateV1toV2 = (data: any): any => {
    console.log('Migrating save from v1 to v2...');

    // 1. Remove Daisy Chain Setting
    if (data.settings && typeof data.settings.daisyChainDetection !== 'undefined') {
        delete data.settings.daisyChainDetection;
    }

    // 2. Remove Missions/Scenarios (activeScenario, scenarioObjectives) - strictly unrelated to ConfigData but good to clean if they crept in
    // ConfigData doesn't explicitly store them, but if they were in the JSON root:
    delete data.activeScenario;
    delete data.scenarioObjectives;

    // 3. Add Power Ports to AC Devices
    if (data.devices && Array.isArray(data.devices)) {
        data.devices = data.devices.map((device: any) => {
            // Helper to check if power port exists
            const hasPowerPort = device.ports.some((p: any) => p.role === 'power_input' || p.role === 'power_source');

            if (hasPowerPort) return device; // Already modernized?

            // Add 'power_input' to specific types
            const needsPowerInput = [
                'zyxel-router', 'cradlepoint-router',
                'managed-switch', 'unmanaged-switch',
                'pos', 'datavan-pos', 'poindus-pos', 'v3-pos', 'v4-pos',
                'printer', 'epson-thermal', 'epson-impact',
                'kds', 'elo-kds',
                'poe-injector'
            ].includes(device.type);

            if (needsPowerInput) {
                // Determine ID format
                const pwrId = `${device.id}-pwr`;
                device.ports.push({
                    id: pwrId,
                    name: 'Power',
                    role: 'power_input',
                    connectedTo: null,
                    linkStatus: 'down'
                });
            }

            // Update 'power-outlet' generic ports to 'power_source'
            if (device.type === 'power-outlet') {
                device.ports = device.ports.map((p: any) => {
                    if (p.role === 'generic') {
                        return { ...p, role: 'power_source' };
                    }
                    return p;
                });
            }

            return device;
        });
    }

    data.schemaVersion = 2;
    return data;
};

export const validateAndSanitizeConfig = (data: ConfigData): { valid: boolean; error?: string; cleanedData?: ConfigData } => {
    // 1. Basic Structure
    if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid JSON structure' };
    if (!data.devices || !Array.isArray(data.devices)) return { valid: false, error: 'Missing devices array' };

    // 2. Schema check (already migrated)
    if (data.schemaVersion !== CURRENT_SCHEMA_VERSION) {
        return { valid: false, error: `Migration failed: Version mismatch (Expected ${CURRENT_SCHEMA_VERSION}, got ${data.schemaVersion})` };
    }

    const deviceIds = new Set<string>();
    const portIds = new Set<string>();

    // 3. Collect IDs
    for (const d of data.devices) {
        if (deviceIds.has(d.id)) return { valid: false, error: `Duplicate Device ID: ${d.id}` };
        deviceIds.add(d.id);

        for (const p of d.ports) {
            if (portIds.has(p.id)) return { valid: false, error: `Duplicate Port ID: ${p.id}` };
            portIds.add(p.id);
        }
    }

    // 4. Validate Connections
    // Ensure every `connectedTo` points to a valid port ID
    // And ensure reciprocity (If A connects to B, B must connect to A)
    for (const d of data.devices) {
        for (const p of d.ports) {
            if (p.connectedTo) {
                if (!portIds.has(p.connectedTo)) {
                    // Start of Sanitization: Break invalid links instead of crashing
                    console.warn(`Broken link detected: Port ${p.id} points to non-existent ${p.connectedTo}. Clearing connection.`);
                    p.connectedTo = null;
                    p.linkStatus = 'down';
                    continue;
                }

                // Sanitization 2: Strict Power/Data Separation
                // We need to look up the connected port to check its role.
                let targetPort = null;
                for (const potentialDev of data.devices) {
                    const found = potentialDev.ports.find(tp => tp.id === p.connectedTo);
                    if (found) {
                        targetPort = found;
                        break;
                    }
                }

                if (targetPort) {
                    const isPower = (role: string) => role === 'power_input' || role === 'power_source';
                    const isData = (role: string) => !isPower(role);

                    if ((isPower(p.role) && isData(targetPort.role)) || (isData(p.role) && isPower(targetPort.role))) {
                        console.warn(`Removing invalid connection between Power (${p.role}) and Data (${targetPort.role}) ports.`);
                        p.connectedTo = null;
                        p.linkStatus = 'down';
                        // Reciprocity will be handled when we process the other port, or connection state update.
                        // But best to clear here.
                        continue;
                    }
                }
            }
        }
    }

    // 4.5. Validate Wireless Capability
    for (const d of data.devices) {
        if (d.wireless && !isWifiCapable(d.type)) {
            console.warn(`Removing invalid wireless config from non-capable device ${d.type} (${d.id})`);
            delete d.wireless;
            // Reset connection state if it was wifi-related
            if (['associating_wifi', 'auth_failed', 'associated_no_ip', 'associated_no_internet'].includes(d.connectionState || '')) {
                d.connectionState = 'disconnected';
            }
        }
    }

    // 5. Recompute Simulation State
    // We do NOT trust the saved 'status', 'linkStatus', or 'connectionState' entirely.
    // We trust the IDs, Positions, and Connections.

    let devices = [...data.devices];

    // Normalize: Reset transient states if needed? 
    // Actually, persistence usually wants to save "OFF" state.
    // But if we just migrated power ports, everything is OFF by default.
    // If we loaded a V1 save where things were "Online" but had no power cords, 
    // simulating now would turn them OFF. This is EXPECTED behavior for strict realism.
    // The user might be confused why their network is off, but it's "correct" behavior.

    devices = propagatePowerState(devices);
    devices = updateLinkStatuses(devices);
    devices = updateConnectionStates(devices);

    // We don't fail load on network validation errors (loops etc), we just display them.
    // const validationErrors = validateNetwork(devices);

    // Return cleaned data
    const cleanedData: ConfigData = {
        ...data,
        devices,
        // Ensure other fields exist
        settings: data.settings || { showWarnings: true, compactWarnings: false, darkMode: false },
        deviceCounts: data.deviceCounts || {}
    };

    return { valid: true, cleanedData };
};
