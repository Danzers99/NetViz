
import { propagatePowerState, updateLinkStatuses, updateConnectionStates } from './simulation';
import { generatePorts } from '../store';
import type { Device } from '../types';

// Mock Device Creation
const createDevice = (id: string, type: any): Device => ({
    id,
    type,
    name: id,
    position: [0, 0, 0],
    ports: generatePorts(type, id),
    status: type === 'isp-modem' ? 'online' : 'offline',
    deviceCounts: {}, // Add missing property to satisfy type if needed, or ignore
} as any);

const runTest = () => {
    console.log("Starting Reproduction Test...");

    // Setup: Modem -> Router -> Printer
    let devices: Device[] = [
        createDevice('modem', 'isp-modem'),
        createDevice('router', 'zyxel-router'),
        createDevice('printer', 'printer')
    ];

    // Connect Modem -> Router
    const connect = (d1: Device, d2: Device) => {
        const p1 = d1.ports.find(p => p.role !== 'power_input')!; // uplink/lan
        const p2 = d2.ports.find(p => p.role !== 'power_input')!;

        p1.connectedTo = p2.id;
        p2.connectedTo = p1.id;
    }

    // Modem Port 1 <-> Router WAN
    const modemPort = devices[0].ports[0];
    const routerWan = devices[1].ports.find(p => p.id.includes('wan')) || devices[1].ports[0];
    modemPort.connectedTo = routerWan.id;
    routerWan.connectedTo = modemPort.id;

    // Router LAN <-> Printer (Printer has generic port)
    const routerLan = devices[1].ports.find(p => p.id.includes('lan') || p.role === 'generic') || devices[1].ports[1];
    const printerPort = devices[2].ports[0];
    routerLan.connectedTo = printerPort.id;
    printerPort.connectedTo = routerLan.id;

    // Initial Sim
    console.log("Initial Simulation...");
    devices = propagatePowerState(devices);
    devices = updateLinkStatuses(devices);
    devices = updateConnectionStates(devices);

    const printer = devices.find(d => d.id === 'printer')!;
    console.log(`Printer Status: ${printer.status} (Expected: online)`);
    console.log(`Printer Link: ${printer.ports[0].linkStatus} (Expected: up)`);

    // DISCONNECT
    console.log("\nDisconnecting Printer...");

    // Simulate what disconnectPort does
    // Deep copy
    devices = devices.map(d => ({ ...d, ports: d.ports.map(p => ({ ...p })) }));

    // Find printer port and disconnect
    const p1 = devices[2].ports[0]; // Printer Port
    const targetId = p1.connectedTo;

    p1.connectedTo = null;
    p1.linkStatus = 'down';

    if (targetId) {
        const d2 = devices.find(d => d.ports.some(p => p.id === targetId))!;
        const p2 = d2.ports.find(p => p.id === targetId)!;
        p2.connectedTo = null;
        p2.linkStatus = 'down';
    }

    // Run updates
    console.log("Running Updates...");
    devices = propagatePowerState(devices);
    devices = updateLinkStatuses(devices); // This should confirm link down
    devices = updateConnectionStates(devices);

    const printerAfter = devices.find(d => d.id === 'printer')!;
    console.log(`Printer Status After: ${printerAfter.status} (Expected: online, assuming power is independent? Printer usually AC powered)`);
    console.log(`Printer Link After: ${printerAfter.ports[0].linkStatus} (Expected: down)`);
    console.log(`Printer ConnectionState After: ${printerAfter.connectionState} (Expected: disconnected)`);

    if (printerAfter.ports[0].linkStatus === 'up' || printerAfter.connectionState !== 'disconnected') {
        console.error("FAIL: Printer is still connected!");
    } else {
        console.log("SUCCESS: Printer disconnected immediately.");
    }
};

runTest();
