import type { Device } from '../types';

export const isPoEDevice = (type: string): boolean => {
    return ['access-point', 'datto-ap440', 'datto-ap62'].includes(type);
};

export const checkPowerSource = (device: Device, allDevices: Device[]): boolean => {
    // Non-PoE devices (battery or separate power brick) are assumed powered for now
    // unless strictly modeled (like OrderPad battery). 
    // The prompt specifically focuses on APs strict PoE logic.
    // However, Switches/Routers also need power (usually outlets).
    // Current simulation assumes Switches/Routers are always 'online' unless we model outlets.
    // For this task, we focus on the "Strict PoE Power Logic".

    if (!isPoEDevice(device.type)) {
        // Mobile Devices have battery, always "powered" (but might be offline state)
        if (device.type === 'orderpad' || device.type === 'cakepop') return true;

        // Magic Devices (Self Powered / Grid)
        if (device.type === 'isp-modem' || device.type === 'power-outlet') return true;

        // Wired AC Devices (Router, Switch, POS, Printer, Injector)
        // Must be connected to a power_source via 'power_input' port
        const powerPort = device.ports.find(p => p.role === 'power_input');
        if (!powerPort) {
            // If device has no power port defined yet (e.g. unknown), default to ON?
            // Or if I missed adding it to store.ts.
            // For now, strict: If it's not one of the above, and lacks power port, it has NO POWER.
            // But to avoid breaking unknown devices:
            if (device.type === 'unknown') return true;
            return false;
        }

        if (powerPort.connectedTo) {
            // Check if connected to a valid power source
            const sourceDevice = allDevices.find(d => d.ports.some(p => p.id === powerPort.connectedTo));
            if (sourceDevice) {
                // The source must be 'online' to provide power (e.g. Power Outlet or UPS)
                if (sourceDevice.status === 'online') return true;
            }
        }
        return false;
    }

    // It is a PoE Device (AP). It MUST be connected to a PoE Source.
    const ethPort = device.ports.find(p => p.role === 'poe_client');
    if (!ethPort || !ethPort.connectedTo) return false;

    // Find the upstream device and port
    const upstreamDevice = allDevices.find(d => d.ports.some(p => p.id === ethPort.connectedTo));
    if (!upstreamDevice) return false;

    const upstreamPort = upstreamDevice.ports.find(p => p.id === ethPort.connectedTo);
    if (!upstreamPort) return false;

    // RULE: Must be connected to PoE Injector (PoE OUT) or PoE Switch

    // 1. Check if upstream device is ON (Injector must be powered, Switch must be powered)
    if (upstreamDevice.status === 'offline' || upstreamDevice.status === 'booting') {
        return false;
    }

    // 2. Check Port Role
    const isPoESource =
        upstreamPort.role === 'poe_source' ||
        // Managed switches connect via 'generic' ports but often provide PoE. 
        // We need to decide if 'generic' on a switch implies PoE.
        // Prompt says "PoE-enabled switch port".
        // Let's assume 'managed-switch' provides PoE on all generic ports? 
        // Or strictly 'poe_source'. 
        // If I strictly require 'poe_source', I must update switch ports to be 'poe_source'.
        // For now, let's treat 'managed-switch' generic ports as PoE sources.
        (upstreamDevice.type === 'managed-switch' && upstreamPort.role === 'generic');

    if (!isPoESource) return false;

    // 3. PoE Injector Directionality
    // If upstream is Injector, we already checked it's powered.
    // And we checked we are connected to 'poe_source' (which is PoE OUT on injector).
    // If we were connected to 'uplink' (LAN IN), isPoESource would be false (role is uplink).
    // So directionality is enforced by role check.

    return true;
};
