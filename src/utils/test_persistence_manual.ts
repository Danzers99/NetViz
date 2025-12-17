import { migrateConfig, validateAndSanitizeConfig } from './persistence';

const runTests = () => {
    console.log('Running Persistence Tests...');
    let passed = 0;
    let failed = 0;

    const assert = (condition: boolean, msg: string) => {
        if (condition) {
            console.log(`[PASS] ${msg}`);
            passed++;
        } else {
            console.error(`[FAIL] ${msg}`);
            failed++;
        }
    };

    // Test 1: V1 Migration (Add Power Ports, Remove Daisy Chain)
    const v1Data: any = {
        version: 1, // Legacy version
        timestamp: 12345,
        settings: {
            showWarnings: true,
            compactWarnings: false,
            daisyChainDetection: true // Should be removed
        },
        deviceCounts: {},
        devices: [
            {
                id: 'router-1',
                type: 'zyxel-router', // Needs power input
                name: 'Router',
                position: [0, 0, 0],
                ports: [
                    { id: 'router-1-wan', role: 'wan', connectedTo: null },
                    { id: 'router-1-lan1', role: 'lan', connectedTo: null }
                ],
                status: 'online'
            },
            {
                id: 'outlet-1',
                type: 'power-outlet', // Needs port role update
                name: 'Outlet',
                position: [0, 0, 0],
                ports: [
                    { id: 'outlet-1-p1', role: 'generic', connectedTo: null } // Should become power_source
                ],
                status: 'online'
            }
        ]
    };

    try {
        const migrated = migrateConfig(v1Data);
        assert(migrated.schemaVersion === 2, 'Schema version updated to 2');
        assert(migrated.settings && !('daisyChainDetection' in migrated.settings), 'Daisy Chain setting removed');

        const router = migrated.devices.find((d: any) => d.id === 'router-1');
        const pwrPort = router.ports.find((p: any) => p.role === 'power_input');
        assert(!!pwrPort, 'Router received power_input port');

        const outlet = migrated.devices.find((d: any) => d.id === 'outlet-1');
        const outletPort = outlet.ports.find((p: any) => p.id === 'outlet-1-p1');
        assert(outletPort.role === 'power_source', 'Outlet port updated to power_source');

        // Validation of migrated data
        const result = validateAndSanitizeConfig(migrated);
        assert(result.valid, 'Migrated V1 data is valid');

        // Check simulation result (Router should be offline because no power connection)
        const routerFinal = result.cleanedData?.devices.find(d => d.id === 'router-1');
        assert(routerFinal?.status === 'offline', 'Unpowered router set to offline');

    } catch (e) {
        console.error('Test 1 Exception:', e);
        failed++;
    }

    // Test 2: Validation of Broken Link
    const brokenData: any = {
        schemaVersion: 2,
        version: 2,
        timestamp: 12345,
        settings: { showWarnings: true, compactWarnings: false },
        deviceCounts: {},
        devices: [
            {
                id: 'd1',
                type: 'unknown',
                name: 'D1',
                position: [0, 0, 0],
                ports: [{ id: 'p1', role: 'generic', connectedTo: 'p999' }], // p999 doesn't exist
                status: 'offline'
            }
        ]
    };

    try {
        const result = validateAndSanitizeConfig(brokenData);
        assert(result.valid, 'Broken link config is considered valid (sanitized)');
        const p1 = result.cleanedData?.devices[0].ports[0];
        assert(p1.connectedTo === null, 'Broken link was cleared');
        assert(p1.linkStatus === 'down', 'Link status set to down');
    } catch (e) {
        console.error('Test 2 Exception:', e);
        failed++;
    }

    console.log(`Tests Completed: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
};

runTests();
