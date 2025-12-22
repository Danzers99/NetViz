import type { Device, ConnectionState } from '../types';
import { getDeviceDefinition } from '../data/deviceDefinitions';
import { isWifiCapable } from './wifi';



// Check if a wired path exists from StartDevice to ISP Modem
// Returns 'online' if full path, 'associated_no_internet' if path breaks at modem, etc.
// But this is generic.
// Check if a path exists from StartDevice to ISP Modem
// Supports Wired (preferred) and Wireless (fallback)
export const checkUpstreamConnection = (device: Device, allDevices: Device[]): ConnectionState => {
    // 1. Check Wired Connection (Priority)
    // Does this device have any physical ports connected?
    const hasWiredConnection = device.ports.some(p =>
        p.connectedTo &&
        p.linkStatus === 'up' &&
        p.role !== 'power_input' &&
        p.role !== 'power_source'
    );

    if (hasWiredConnection) {
        // Wired Path Logic

        // Base Case: ISP Modem
        if (device.type === 'isp-modem') {
            return device.status === 'online' ? 'online' : 'disconnected';
        }

        if (hasPathToISP(device, allDevices, new Set())) {
            return 'online';
        } else if (hasPathToRouter(device, allDevices, new Set())) {
            // Connected to Router (IP) but no Internet
            return 'associated_no_internet';
        } else {
            // Connected physically but no path to Router (No IP)
            return 'associated_no_ip';
        }
    }

    // 2. Check Wireless Connection (Fallback)
    if (device.wireless?.ssid && isWifiCapable(device.type)) {
        const ap = findBestAP(device, allDevices);
        if (!ap) return 'disconnected';

        const apState = checkUpstreamConnection(ap, allDevices);

        if (apState === 'online') return 'online';
        if (apState === 'associated_no_internet') return 'associated_no_internet';
        if (apState === 'associated_no_ip') return 'associated_no_ip';

        if (ap.status !== 'online') return 'disconnected';

        return 'associated_no_internet';
    }

    // 3. No connections
    return 'disconnected';
};

const findBestAP = (client: Device, devices: Device[]): Device | undefined => {
    const ssid = client.wireless?.ssid;
    const password = client.wireless?.password;
    if (!ssid) return undefined;

    // Find online APs with matching config
    const candidates = devices.filter(d =>
        d.status === 'online' &&
        d.wifiHosting?.configs.some(c => c.ssid === ssid && c.password === password)
    );

    // Return closest? For now just first.
    return candidates[0];
};

const hasPathToISP = (device: Device, devices: Device[], visited: Set<string>): boolean => {
    if (visited.has(device.id)) return false;
    visited.add(device.id);

    if (device.type === 'isp-modem' && device.status === 'online') return true;

    // Check all connected ports
    for (const port of device.ports) {
        if (!port.connectedTo) continue;
        if (port.linkStatus === 'down') continue; // Physical link must be up

        // Exclude Power Ports from Data Traversal
        if (port.role === 'power_input' || port.role === 'power_source') continue;

        const neighbor = devices.find(d => d.ports.some(p => p.id === port.connectedTo));
        if (neighbor && neighbor.status === 'online') {
            if (hasPathToISP(neighbor, devices, visited)) return true;
        }
    }
    return false;
};

const hasPathToRouter = (device: Device, devices: Device[], visited: Set<string>): boolean => {
    if (visited.has(device.id)) return false;
    visited.add(device.id);

    const def = getDeviceDefinition(device.type);
    if (def.capabilities.isRouter && device.status === 'online') return true;

    for (const port of device.ports) {
        if (!port.connectedTo) continue;
        // Exclude Power Ports
        if (port.role === 'power_input' || port.role === 'power_source') continue;

        // logical link check
        const neighbor = devices.find(d => d.ports.some(p => p.id === port.connectedTo));
        if (neighbor && neighbor.status === 'online') {
            if (hasPathToRouter(neighbor, devices, visited)) return true;
        }
    }
    return false;
};
