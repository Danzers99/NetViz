import type { Device, Port } from './types';
import { getDeviceDefinition } from './data/deviceDefinitions';

export interface ValidationError {
    id: string;
    message: string;
    severity: 'error' | 'warning';
    deviceIds: string[];
}

export const validateNetwork = (devices: Device[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const adj: Record<string, string[]> = {}; // deviceId -> connected deviceIds

    // Build graph
    devices.forEach(d => {
        adj[d.id] = [];
    });

    devices.forEach(d => {
        d.ports.forEach(p => {
            if (p.connectedTo) {
                const targetDevice = devices.find(td => td.ports.some(tp => tp.id === p.connectedTo));
                if (targetDevice) {
                    if (!adj[d.id].includes(targetDevice.id)) {
                        adj[d.id].push(targetDevice.id);
                    }
                }
            }
        });
    });

    // Helper: Get connected device and port for a given port
    const getConnected = (port: Port): { device: Device, port: Port } | null => {
        if (!port.connectedTo) return null;
        for (const d of devices) {
            const p = d.ports.find(p => p.id === port.connectedTo);
            if (p) return { device: d, port: p };
        }
        return null;
    };

    // Helper: Check if device is a router
    const isRouter = (type: string) => !!getDeviceDefinition(type as any).capabilities.isRouter;

    // Helper: Check if device is a switch
    const isSwitch = (type: string) => !!getDeviceDefinition(type as any).capabilities.isSwitch;

    // Helper: Check if device is an AP
    const isAP = (type: string) => !!getDeviceDefinition(type as any).capabilities.isAP;

    // Helper: Check if device is an end device (POS, Printer, KDS, Mobile)
    const isEndDevice = (type: string) => !!getDeviceDefinition(type as any).capabilities.isEndpoint;

    // Rule 1: Network Loops (LAN side)
    // Only traverse switches, APs, and Router LAN ports.
    const visited = new Set<string>();
    const hasCycle = (node: string, parent: string | null, path: string[]): boolean => {
        visited.add(node);
        path.push(node);

        for (const neighbor of adj[node]) {
            if (neighbor === parent) continue;

            const deviceNode = devices.find(d => d.id === node)!;

            // Find the connection(s)
            let isLanConnection = false;
            deviceNode.ports.forEach(p => {
                if (p.connectedTo) {
                    const target = getConnected(p);
                    if (target && target.device.id === neighbor) {
                        // Exclude WAN-WAN (already handled)
                        // Exclude Power connections (Power does not cause Broadcast Storms)
                        const isPower = p.role === 'power_input' || p.role === 'power_source' ||
                            target.port.role === 'power_input' || target.port.role === 'power_source';

                        if (!isPower && p.role !== 'wan' && target.port.role !== 'wan') {
                            isLanConnection = true;
                        }
                    }
                }
            });

            if (!isLanConnection) continue;

            if (path.includes(neighbor)) {
                return true;
            }

            if (!visited.has(neighbor)) {
                if (hasCycle(neighbor, node, [...path])) return true;
            }
        }
        return false;
    };

    // Run cycle detection on Switches, APs, and Routers
    visited.clear();
    for (const device of devices) {
        if (isSwitch(device.type) || isAP(device.type) || isRouter(device.type)) {
            if (!visited.has(device.id)) {
                if (hasCycle(device.id, null, [])) {
                    if (!errors.some(e => e.id === 'network-loop')) {
                        errors.push({
                            id: 'network-loop',
                            message: 'Network loop detected! Loops cause broadcast storms and crash the network.',
                            severity: 'error',
                            deviceIds: [],
                        });
                    }
                }
            }
        }
    }

    // Rule 2: Router WAN Misuse
    devices.filter(d => isRouter(d.type)).forEach(router => {
        const wanPort = router.ports.find(p => p.role === 'wan');
        if (wanPort && wanPort.connectedTo) {
            const target = getConnected(wanPort);
            if (target) {
                // Router WAN must connect to ISP modem's LAN port, not WAN port
                if (getDeviceDefinition(target.device.type).capabilities.isModem) {
                    if (target.port.role !== 'lan') {
                        errors.push({
                            id: `router-wan-wrong-modem-port-${router.id}`,
                            message: `${router.name} WAN is connected to the modem's ${target.port.name} port. It must connect to the modem's LAN port, not the ISP/Coax port.`,
                            severity: 'error',
                            deviceIds: [router.id, target.device.id],
                        });
                    }
                } else if (target.device.type !== 'unknown') {
                    // Router WAN connected to something other than modem
                    errors.push({
                        id: `wan-misuse-${router.id}`,
                        message: `${router.name} WAN is plugged into a ${target.device.name} (${target.device.type}). WAN must connect directly to the ISP modem's LAN port.`,
                        severity: 'error',
                        deviceIds: [router.id, target.device.id],
                    });
                }
            } else {
                // Router WAN not connected at all
                errors.push({
                    id: `router-wan-not-connected-${router.id}`,
                    message: `${router.name} WAN port is not connected. Connect it to the ISP modem's LAN port for internet access.`,
                    severity: 'error',
                    deviceIds: [router.id],
                });
            }
        }
    });

    // Rule 3: ISP Modem Misuse (Two routers / Modem LAN to Switch)
    devices.filter(d => getDeviceDefinition(d.type).capabilities.isModem).forEach(modem => {
        const lanPort = modem.ports.find(p => p.role === 'lan');
        if (lanPort && lanPort.connectedTo) {
            const target = getConnected(lanPort);
            if (target) {
                // If connected to a switch, check if that switch also has a Router connected
                if (isSwitch(target.device.type)) {
                    // BFS from switch to find Router LAN
                    const switchId = target.device.id;
                    const switchNeighbors = adj[switchId] || [];
                    const hasRouter = switchNeighbors.some(nid => {
                        const n = devices.find(d => d.id === nid);
                        return n && isRouter(n.type);
                    });

                    if (hasRouter) {
                        errors.push({
                            id: `modem-switch-conflict-${modem.id}`,
                            message: 'ISP modem and Router are both providing LAN on the same switch. This can cause duplicate DHCP and random drops.',
                            severity: 'error',
                            deviceIds: [modem.id, target.device.id],
                        });
                    }
                }
            }
        }
    });

    // Rule 4: Devices bypassing the Router
    // Check if End Devices or APs are reachable from Modem WITHOUT going through Router WAN
    const modemLanSegment = new Set<string>();
    devices.filter(d => getDeviceDefinition(d.type).capabilities.isModem).forEach(modem => {
        const queue = [modem.id];
        const visitedModem = new Set<string>();
        visitedModem.add(modem.id);

        while (queue.length > 0) {
            const currId = queue.shift()!;
            const curr = devices.find(d => d.id === currId)!;

            curr.ports.forEach(p => {
                if (p.connectedTo) {
                    const target = getConnected(p);
                    if (target) {
                        // Don't cross WAN ports of Routers (they separate segments)
                        if (isRouter(target.device.type) && target.port.role === 'wan') return;

                        if (!visitedModem.has(target.device.id)) {
                            visitedModem.add(target.device.id);
                            modemLanSegment.add(target.device.id);
                            queue.push(target.device.id);
                        }
                    }
                }
            });
        }
    });

    devices.forEach(d => {
        if (isEndDevice(d.type) || isAP(d.type)) {
            if (modemLanSegment.has(d.id)) {
                errors.push({
                    id: `bypass-router-${d.id}`,
                    message: `Device ${d.name} is connected to the ISP modem segment, it should be behind the Router.`,
                    severity: 'error',
                    deviceIds: [d.id],
                });
            }
        }
    });

    // Rule 5: Isolated or offline devices
    // We can rely on the calculated connectionState from the simulation.
    // If connectionState is 'online' or 'associated_no_internet', it has a path to the router.
    devices.forEach(d => {
        if (isEndDevice(d.type)) {
            // Check based on connectionState
            const isConnectedToRouter = d.connectionState === 'online' || d.connectionState === 'associated_no_internet';

            // Special case for wired devices that might not have connectionState fully implemented/trusted yet?
            // Actually, updateConnectionStates runs for ALL devices.
            // But wait, do wired devices like POS use connectionState?
            // in simulation.ts updateConnectionStates: "Only relevant for devices that care about 'connectionState' (Endpoints)"
            // Let's verify which devices get connectionState.

            // If the device HAS a connectionState property, use it.
            if (d.connectionState) {
                if (!isConnectedToRouter) {
                    errors.push({
                        id: `isolated-${d.id}`,
                        message: `${d.name} is not connected to the router, it will not be able to reach the POS servers or the internet.`,
                        severity: 'warning',
                        deviceIds: [d.id],
                    });
                }
            } else {
                // Fallback for devices that might not have connectionState set (infrastructure devices?)
                // Although Rule 5 usually targets End Devices.
                // Re-implement simplified BFS if needed, OR just trust that End Devices have connectionState.

                // For now, let's keep the BFS if connectionState is missing, OR just assume if it's missing it's not an end device we care about here.
                // The 'isEndDevice' check covers checking targets.

                // Let's assume all EndDevices (POS, Printer, etc) have connectionState updated in simulation.
            }
        }
    });

    // Rule 6: Misidentified or unknown devices
    devices.forEach(d => {
        if (isRouter(d.type)) {
            const wanConnected = d.ports.some(p => p.role === 'wan' && p.connectedTo);
            if (!wanConnected) {
                // Check if it has LAN connections
                const lanConnected = d.ports.some(p => p.role === 'lan' && p.connectedTo);
                if (lanConnected) {
                    errors.push({
                        id: `misidentified-router-${d.id}`,
                        message: `${d.name} is labeled as a router but has no WAN connection. Confirm if it is actually a router or just a switch/AP.`,
                        severity: 'warning',
                        deviceIds: [d.id],
                    });
                }
            }
        }

        if (d.type === 'unknown') {
            if (d.ports.some(p => p.connectedTo)) {
                errors.push({
                    id: `unknown-device-${d.id}`,
                    message: `${d.name} is unidentified. Please verify its type.`,
                    severity: 'warning',
                    deviceIds: [d.id],
                });
            }
        }
    });

    // Rule 7: Multiple Routers
    const routers = devices.filter(d => isRouter(d.type));
    if (routers.length > 1) {
        for (let i = 0; i < routers.length; i++) {
            for (let j = i + 1; j < routers.length; j++) {
                const r1 = routers[i];
                const r2 = routers[j];
                if (adj[r1.id].includes(r2.id)) { // Direct
                    errors.push({
                        id: `multi-router-${r1.id}-${r2.id}`,
                        message: 'Multiple routers are connected directly. This often causes IP conflicts.',
                        severity: 'warning',
                        deviceIds: [r1.id, r2.id],
                    });
                }
            }
        }
    }

    // ===== PoE INJECTOR & AP440 VALIDATION RULES =====

    // Rule 8: AP440 not connected through PoE injector
    devices.filter(d => isAP(d.type)).forEach(ap => {
        const apPort = ap.ports.find(p => p.role === 'poe_client');
        if (apPort && apPort.connectedTo) {
            const target = getConnected(apPort);
            if (target) {
                // Check if connected directly to router or switch (bypassing PoE injector)
                if (isRouter(target.device.type) || isSwitch(target.device.type)) {
                    errors.push({
                        id: `ap-no-poe-${ap.id}`,
                        message: `${ap.name} is plugged directly into the ${target.device.name}. It must connect to the PoE injector's PoE port so it can receive power and data.`,
                        severity: 'error',
                        deviceIds: [ap.id, target.device.id],
                    });
                }
                // Check if connected to wrong injector port
                else if (getDeviceDefinition(target.device.type).capabilities.isPoEInjector && target.port.role !== 'poe_source') {
                    errors.push({
                        id: `ap-wrong-injector-port-${ap.id}`,
                        message: `${ap.name} is connected to the injector's LAN port instead of the PoE port. Move the cable to the PoE port on the injector.`,
                        severity: 'error',
                        deviceIds: [ap.id, target.device.id],
                    });
                }
            }
        }
    });

    // Rule 9: PoE Injector LAN not connected to router LAN
    devices.filter(d => getDeviceDefinition(d.type).capabilities.isPoEInjector).forEach(injector => {
        const lanPort = injector.ports.find(p => p.role === 'uplink' && p.name.includes('LAN'));
        if (lanPort && lanPort.connectedTo) {
            const target = getConnected(lanPort);
            if (target) {
                // Check if it's connected to router WAN or ISP modem (bad)
                if (getDeviceDefinition(target.device.type).capabilities.isModem || target.port.role === 'wan') {
                    errors.push({
                        id: `injector-wrong-connection-${injector.id}`,
                        message: `PoE injector LAN is not connected to the Cake router's LAN. Connect it to a LAN port on the router or a switch that is already uplinked to the router.`,
                        severity: 'error',
                        deviceIds: [injector.id, target.device.id],
                    });
                }
                // Check if it's connected to a switch that has no path to router
                else if (isSwitch(target.device.type)) {
                    // Verify the switch is connected to router LAN (is it in onlineDevices set)
                    // REPLACED onlineDevices check with connectionState check
                    // If switch connectionState is online or associated_no_internet, it has path to router.
                    const isSwitchConnected = target.device.connectionState === 'online' || target.device.connectionState === 'associated_no_internet';

                    if (!isSwitchConnected) {
                        errors.push({
                            id: `injector-isolated-switch-${injector.id}`,
                            message: `PoE injector is connected to an isolated switch. Connect the switch to the router's LAN.`,
                            severity: 'error',
                            deviceIds: [injector.id, target.device.id],
                        });
                    }
                }
            }
        }
    });

    // Rule 10: Injector missing power
    devices.filter(d => getDeviceDefinition(d.type).capabilities.isPoEInjector).forEach(injector => {
        const powerPort = injector.ports.find(p => p.role === 'power_input');
        if (powerPort && !powerPort.connectedTo) {
            // Find which AP is connected to this injector
            const poePort = injector.ports.find(p => p.role === 'poe_source');
            let apName = 'AP';
            if (poePort && poePort.connectedTo) {
                const connectedAP = devices.find(d => d.ports.some(p => p.id === poePort.connectedTo));
                if (connectedAP) apName = connectedAP.name;
            }
            errors.push({
                id: `injector-no-power-${injector.id}`,
                message: `PoE injector for ${apName} has no power source. Plug the injector into a wall outlet or power strip.`,
                severity: 'error',
                deviceIds: [injector.id],
            });
        }
    });

    // Rule 11: AP path to router verification
    devices.filter(d => isAP(d.type)).forEach(ap => {
        // Check if AP has proper path to router through injector
        const apPort = ap.ports.find(p => p.role === 'poe_client');
        if (apPort && apPort.connectedTo) {
            const injectorConn = getConnected(apPort);
            if (injectorConn && getDeviceDefinition(injectorConn.device.type).capabilities.isPoEInjector) {
                // Check if injector has path to router
                // REPLACED onlineDevices check with connectionState check
                const isInjectorConnected = injectorConn.device.connectionState === 'online' || injectorConn.device.connectionState === 'associated_no_internet';

                if (!isInjectorConnected) {
                    errors.push({
                        id: `ap-no-router-path-${ap.id}`,
                        message: `${ap.name} is not connected to the router, so orderpads and CakePops will not be able to reach the POS servers or the internet.`,
                        severity: 'warning',
                        deviceIds: [ap.id],
                    });
                }
            }
        } else if (!apPort || !apPort.connectedTo) {
            // AP not connected at all
            errors.push({
                id: `ap-not-connected-${ap.id}`,
                message: `${ap.name} is not connected to the network. Connect it to a PoE injector.`,
                severity: 'warning',
                deviceIds: [ap.id],
            });
        }
    });

    // Rule 12: Status-aware hints for AP440
    devices.filter(d => isAP(d.type)).forEach(ap => {
        if (ap.status === 'offline') {
            const apPort = ap.ports.find(p => p.role === 'poe_client');
            let wiringCorrect = false;

            // Check if wiring looks correct
            if (apPort && apPort.connectedTo) {
                const injectorConn = getConnected(apPort);
                if (injectorConn && getDeviceDefinition(injectorConn.device.type).capabilities.isPoEInjector && injectorConn.port.role === 'poe_source') {
                    const injector = injectorConn.device;
                    const powerPort = injector.ports.find(p => p.role === 'power_input');
                    const lanPort = injector.ports.find(p => p.role === 'uplink');
                    if (powerPort?.connectedTo && lanPort?.connectedTo) {
                        wiringCorrect = true;
                    }
                }
            }

            if (wiringCorrect) {
                // Suppress duplicate errors and add specific AP health hint
                const existingErrorIndex = errors.findIndex(e => e.id === `ap-no-router-path-${ap.id}` || e.id === `ap-not-connected-${ap.id}`);
                if (existingErrorIndex !== -1) {
                    errors.splice(existingErrorIndex, 1);
                }
                errors.push({
                    id: `ap-offline-health-${ap.id}`,
                    message: `${ap.name} is marked offline even though cabling looks correct. Ask the merchant to check AP lights, reboot it, or verify configuration.`,
                    severity: 'warning',
                    deviceIds: [ap.id],
                });
            }
            // If wiring is not correct and device is offline, the wiring errors take priority
        }
    });

    return errors;
};
