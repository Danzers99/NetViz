import type { Device } from '../types';
import { getDeviceDefinition } from '../data/deviceDefinitions';

export const isPoEDevice = (type: string): boolean => {
    const def = getDeviceDefinition(type as any); // cast for string safety
    return def.powerModel.powerSource === 'poe';
};

export const checkPowerSource = (device: Device, allDevices: Device[]): boolean => {
    const def = getDeviceDefinition(device.type);

    // 1. If device doesn't require external power (internally powered / battery / magic)
    if (!def.powerModel.requiresPower) {
        return true;
    }

    // 2. Wired AC / Outlet Powered
    if (def.powerModel.powerSource === 'outlet') {
        const powerPort = device.ports.find(p => p.role === 'power_input');
        if (!powerPort) {
            // Should not happen for devices requiring power
            return false;
        }

        if (powerPort.connectedTo) {
            const sourceDevice = allDevices.find(d => d.ports.some(p => p.id === powerPort.connectedTo));
            if (sourceDevice) {
                // Must count on source being Online
                if (sourceDevice.status === 'online') return true;
            }
        }
        return false;
    }

    // 3. PoE Powered (AP)
    if (def.powerModel.powerSource === 'poe') {
        const ethPort = device.ports.find(p => p.role === 'poe_client');
        if (!ethPort || !ethPort.connectedTo) return false;

        const upstreamDevice = allDevices.find(d => d.ports.some(p => p.id === ethPort.connectedTo));
        if (!upstreamDevice) return false;

        const upstreamPort = upstreamDevice.ports.find(p => p.id === ethPort.connectedTo);
        if (!upstreamPort) return false;

        // Upstream must be ON
        if (upstreamDevice.status === 'offline' || upstreamDevice.status === 'booting') {
            return false;
        }

        // Upstream must provide PoE
        const upstreamDef = getDeviceDefinition(upstreamDevice.type);

        // Check if device is a specialized PoE Source (Injector) OR Switch with capabilities
        const isPoESource =
            upstreamPort.role === 'poe_source' ||
            (upstreamDef.capabilities.poeSource === true && upstreamPort.role === 'generic');

        return isPoESource;
    }

    return false;
};
