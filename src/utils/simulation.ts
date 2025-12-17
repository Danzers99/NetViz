import type { Device } from '../types';
import { checkPowerSource } from './power';
import { checkUpstreamConnection } from './network';

/**
 * Propagates power state through the network.
 * Uses strict PoE logic: APs only power on if connected to valid PoE Source.
 */
export const propagatePowerState = (devices: Device[]): Device[] => {
    // We can't just do one pass because power might propagate (e.g. Switch powers on, then AP powers on).
    // But currently, Switches/Injectors don't "boot" from other network devices (they use outlets).
    // And Outlets are always ON.
    // So 1 pass is enough for APs.
    // Let's do a multi-pass just in case.

    let currentDevices = [...devices];
    let changed = true;
    let iterations = 0;

    while (changed && iterations < 5) {
        changed = false;
        iterations++;

        currentDevices = currentDevices.map(device => {
            const hasPower = checkPowerSource(device, currentDevices);

            // State Transition Rule:
            // If No Power -> Offline
            // If Power OK AND was Offline -> Booting (or Online if we skip boot for simplicity in sim, but we have 'booting' state).
            // For simulation "tick", we usually just say "If power is cut, go offline immediately".
            // "If power is restored, go Online (or booting)".

            // We preserve 'booting' state if it was already booting?
            // If device is 'error', we might leave it.

            if (!hasPower) {
                if (device.status !== 'offline') {
                    // Power Cut
                    return { ...device, status: 'offline' };
                }
            } else {
                // Power OK
                if (device.status === 'offline') {
                    // Just plugged in / Power restored
                    // Auto-boot to online for now, BUT exclude Mobile devices (they have power buttons/batteries)
                    // Mobile devices starting OFFLINE should stay OFFLINE until manually turned on.
                    const isMobile = device.type === 'orderpad' || device.type === 'cakepop';

                    if (!isMobile) {
                        return { ...device, status: 'online' };
                    }
                }
            }
            return device;
        });

        // Detection of change is hard with map return, simplified:
        // We rely on stable checking. If the loop stabilizes power, we are good.
        // checkPowerSource relies on 'allDevices' state.
        // We need to feed the *updated* devices into the next check?
        // Yes.
    }

    return currentDevices;
};

/**
 * Updates physical link status (lights).
 * If device is OFF, link is DOWN.
 */
export const updateLinkStatuses = (devices: Device[]): Device[] => {
    const activeLinkCache = new Map<string, boolean>();

    const checkLink = (portId: string | null, visited = new Set<string>()): boolean => {
        if (!portId) return false;
        if (visited.has(portId)) return false;
        if (activeLinkCache.has(portId)) return activeLinkCache.get(portId)!;

        visited.add(portId);

        const device = devices.find(d => d.ports.some(p => p.id === portId));
        if (!device) return false;

        // Device OFF = Link Down
        if (device.status === 'offline' || device.status === 'booting') return false;
        // Note: 'booting' usually has link up, but data logic might fail. 
        // Prompt says "A device must never appear Online... unless full path".
        // Physical link LED usually on during boot? Let's say YES for realism?
        // But for simplicity, let's say Link comes up when Online.
        // PROMPT: "Port-level LED indicators for: Power, Link, Activity".
        // Real behavior: Link light is hardware, stays up. Data (Activity) depends on OS.
        // Let's keep strict: device OFF = no link. Device ON = link.

        if (device.status !== 'online') return false;

        // Passthrough Logic (Injector)
        if (device.type === 'poe-injector') {
            const port = device.ports.find(p => p.id === portId)!;
            if (port.role === 'poe_source') { // PoE Out
                // Requires LAN IN connection? 
                // Physically, data link passes through.
                const lanIn = device.ports.find(p => p.role === 'uplink');
                if (lanIn && lanIn.connectedTo) {
                    return checkLink(lanIn.connectedTo, visited);
                }
                return false;
            }
        }
        return true;
    };

    return devices.map(device => {
        const isDeviceOn = device.status === 'online'; // or booting?

        const newPorts = device.ports.map(port => {
            if (!isDeviceOn) {
                return { ...port, linkStatus: 'down' as const };
            }
            if (port.connectedTo) {
                if (checkLink(port.connectedTo)) {
                    return { ...port, linkStatus: 'up' as const };
                }
            }
            return { ...port, linkStatus: 'down' as const };
        });

        return { ...device, ports: newPorts };
    });
};

/**
 * Updates logical connection state (OrderPad Online vs No Internet).
 */
export const updateConnectionStates = (devices: Device[]): Device[] => {
    return devices.map(device => {
        // Only relevant for devices that care about 'connectionState' (Endpoints)
        // Router/Switch connectionState might be useful too.

        const newState = checkUpstreamConnection(device, devices);

        return {
            ...device,
            connectionState: newState
        };
    });
};

/**
 * Legacy wireless wrapper if needed, but we integrated it into updateConnectionStates?
 * existing store calls `updateWirelessLinkStatuses`. We should remove that and use updateConnectionStates.
 * But we need to make sure we populate `wireless.isConnected` if UI uses it?
 * Prompt says "Association success moves to AssociatedNoIP".
 * DeviceActionMenu uses `wireless.isConnected`.
 * We should deprecate `wireless.isConnected` and use `connectionState`.
 * But `DeviceActionMenu` sets `isConnected: true` on success.
 * We should keep `wireless` object as "Configuration" (SSID/Pass) and "Radio State" (Associated).
 * `connectionState` is the high level status.
 * We'll update the `wireless.isConnected` bit based on `connectionState` for backward compat if needed.
 */


