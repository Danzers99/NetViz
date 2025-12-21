
import { propagatePowerState, updateLinkStatuses, updateConnectionStates } from './simulation';
import { generatePorts } from '../store';
import type { Device } from '../types';

// Mock getDeviceDefinition to avoid loading full data file if it has dependencies
// But actually simulation.ts imports it. 
// The error "Failed to load setting" usually comes from persistence.ts or store.ts trying to access localStorage
// But we are running in node. 

// We need to ensure persistence.ts doesn't crash in Node.
// Ideally usage of `localStorage` should be guarded.


// Mock Device Creation Helper
const createDevice = (id: string, type: any): Device => ({
    id,
    type,
    name: id,
    position: [0, 0, 0],
    ports: generatePorts(type, id),
    status: (type === 'isp-modem' || type === 'power-outlet') ? 'online' : 'offline',
    deviceCounts: {},
} as any);

let testFailed = false;
const assert = (condition: boolean, message: string) => {
    if (!condition) {
        console.error(`FAIL: ${message}`);
        testFailed = true;
    } else {
        console.log(`PASS: ${message}`);
    }
};

export const runRegressionTests = () => {
    console.log("=== Running Network Logic Regression Tests ===");

    testPrinterDisconnectImmediateUpdate();

    if (testFailed) {
        console.log("=== Some Tests Failed ===");
        process.exit(1);
    } else {
        console.log("=== All Tests Passed ===");
    }
};

const testPrinterDisconnectImmediateUpdate = () => {
    console.log("\nTest: Printer Disconnect Immediate Update");

    // Setup: Modem -> Router -> Printer (Linear Chain)
    // Modem (Online) -> Router (Online) -> Printer (Online)

    let devices: Device[] = [
        createDevice('modem', 'isp-modem'),
        createDevice('router', 'zyxel-router'),
        createDevice('printer', 'printer'),
        createDevice('outlet', 'power-outlet')
    ];

    // Connect Modem WAN <-> Router WAN (Wrong but simulating link)
    // Actually Logic: Router WAN -> Modem LAN
    const modemLan = devices[0].ports.find(p => p.role === 'lan')!;
    const routerWan = devices[1].ports.find(p => p.role === 'wan')!;
    modemLan.connectedTo = routerWan.id;
    routerWan.connectedTo = modemLan.id;
    modemLan.linkStatus = 'up';
    routerWan.linkStatus = 'up';

    // Router LAN -> Printer ETH
    const routerLan = devices[1].ports.find(p => p.role === 'lan')!;
    const printerEth = devices[2].ports.find(p => p.role === 'access')!;
    routerLan.connectedTo = printerEth.id;
    printerEth.connectedTo = routerLan.id;
    routerLan.linkStatus = 'up';
    printerEth.linkStatus = 'up';

    // Power: Outlet -> Printer
    const outletPort = devices[3].ports[0]; // Assuming generic power source
    const printerPwr = devices[2].ports.find(p => p.role === 'power_input')!;
    outletPort.connectedTo = printerPwr.id;
    printerPwr.connectedTo = outletPort.id;
    outletPort.linkStatus = 'up';
    printerPwr.linkStatus = 'up';

    // Mock Router Power (assume internal or connected)
    // For simplicity, just force status, but propgatePowerState might revert unless we mock it or connect it.
    // Let's connect Router to Outlet too if possible, or just hack the Router definition in memory to not need power?
    // Or just add another outlet port?
    // The `power-outlet` usually has multiple ports? `generatePorts` for outlet might return 1?
    // Let's check. If generic, maybe 1.
    // Let's just create another outlet for Router.
    devices.push(createDevice('outlet2', 'power-outlet'));
    const outlet2Port = devices[4].ports[0];
    const routerPwr = devices[1].ports.find(p => p.role === 'power_input');
    if (routerPwr) {
        outlet2Port.connectedTo = routerPwr.id;
        routerPwr.connectedTo = outlet2Port.id;
        outlet2Port.linkStatus = 'up';
        routerPwr.linkStatus = 'up';
    }

    // Force Status initially
    devices[0].status = 'online'; // Modem
    devices[1].status = 'online'; // Router
    devices[2].status = 'online'; // Printer
    devices[3].status = 'online'; // Outlet
    devices[4].status = 'online'; // Outlet2

    // Initial Sim
    devices = propagatePowerState(devices);
    devices = updateLinkStatuses(devices);
    devices = updateConnectionStates(devices);

    const printer = devices.find(d => d.id === 'printer')!;
    assert(printer.connectionState === 'online', "Printer should be online initially");

    // ACT: Disconnect Printer
    console.log("Action: Disconnecting Printer...");

    // Simulate Store Logic: Immutable Update
    const disconnectPortId = printerEth.id;

    let targetId: string | null = null;
    let sourceDeviceId: string | null = null;

    // Find topology
    for (const d of devices) {
        const p = d.ports.find(x => x.id === disconnectPortId);
        if (p) {
            sourceDeviceId = d.id;
            targetId = p.connectedTo;
            break;
        }
    }

    if (targetId) {
        devices = devices.map(d => {
            if (d.id === sourceDeviceId || d.ports.some(p => p.id === targetId)) {
                return {
                    ...d,
                    ports: d.ports.map(p => {
                        if (p.id === disconnectPortId || p.id === targetId) {
                            return { ...p, connectedTo: null, linkStatus: 'down' as const };
                        }
                        return p;
                    })
                };
            }
            return d;
        });
    }

    // Run Sim immediately
    devices = propagatePowerState(devices);
    devices = updateLinkStatuses(devices);
    devices = updateConnectionStates(devices);

    // ASSERT
    const printerAfter = devices.find(d => d.id === 'printer')!;

    console.log("FINAL_STATE_JSON:" + JSON.stringify({
        connectionState: printerAfter.connectionState,
        linkStatus: printerAfter.ports[0].linkStatus,
        status: printerAfter.status
    }));

    if (printerAfter.connectionState !== 'disconnected') {
        console.error("FAIL: connectionState is not disconnected");
        testFailed = true;
    }
    if (printerAfter.ports[0].linkStatus !== 'down') {
        console.error("FAIL: linkStatus is not down");
        testFailed = true;
    }
};

runRegressionTests();
