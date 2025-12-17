import { generatePorts } from '../store';
import { getPortPosition } from './layout';
import type { DeviceType, Device } from '../types';

// List of all device types to check
const DEVICE_TYPES: DeviceType[] = [
    'isp-modem', 'zyxel-router', 'cradlepoint-router',
    'managed-switch', 'unmanaged-switch',
    'access-point', 'datto-ap440', 'datto-ap62',
    'poe-injector', 'power-outlet',
    'pos', 'datavan-pos', 'poindus-pos', 'v3-pos', 'v4-pos',
    'printer', 'epson-thermal', 'epson-impact',
    'kds', 'elo-kds',
    'orderpad', 'cakepop'
];

export const validatePorts = () => {
    console.group('🔌 Port Regression Check');
    let errors = 0;
    let warnings = 0;

    DEVICE_TYPES.forEach(type => {
        const id = `test-${type}`;
        const ports = generatePorts(type, id);

        // 1. Unique IDs
        const ids = new Set();
        ports.forEach(p => {
            if (ids.has(p.id)) {
                console.error(`[${type}] ❌ Duplicate Port ID: ${p.id}`);
                errors++;
            }
            ids.add(p.id);
        });

        // 2. Power Port Check
        // Define which devices SHOULD have power inputs
        const batteryDevices = ['orderpad', 'cakepop'];

        const hasPowerInput = ports.some(p => p.role === 'power_input');
        const hasPowerSource = ports.some(p => p.role === 'power_source');

        if (!hasPowerInput && !hasPowerSource && !batteryDevices.includes(type)) {
            // ISP Modem currently defined without power port in store.ts (it's "online" by magic)
            if (type !== 'isp-modem') {
                console.warn(`[${type}] ⚠️ No Power Input/Source Port found!`);
                warnings++;
            }
        }

        // 3. Layout Check
        const dummyDevice: Device = {
            id, type, ports,
            position: [0, 0, 0],
            name: 'test',
            status: 'online',
            connectionState: 'online'
        } as Device;

        ports.forEach((p, i) => {
            const pos = getPortPosition(dummyDevice, p, i);
            if (pos.some(v => isNaN(v))) {
                console.error(`[${type}] ❌ Port ${p.id} has NaN position:`, pos);
                errors++;
            }
            // Optional: Check if position is "inside" the typical mesh (Z near 0)
            // But valid positions vary.
        });
    });

    if (errors === 0) {
        console.log(`%c✅ All Checks Passed (${DEVICE_TYPES.length} devices scanned)`, 'color: green; font-weight: bold;');
    } else {
        console.error(`❌ Found ${errors} errors and ${warnings} warnings.`);
    }
    console.groupEnd();
};
