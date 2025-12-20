import type { DeviceType } from '../types';

export interface WizardState {
    pos: {
        'datavan-pos': number;
        'poindus-pos': number;
        'v3-pos': number;
        'v4-pos': number;
    };
    printers: {
        'epson-thermal': number;
        'epson-impact': number;
    };
    wireless: {
        'orderpad': number;
        'cakepop': number;
    };
    kds: {
        'elo-kds': number;
    };
}

export const initialWizardState: WizardState = {
    pos: {
        'datavan-pos': 0,
        'poindus-pos': 0,
        'v3-pos': 0,
        'v4-pos': 0,
    },
    printers: {
        'epson-thermal': 0,
        'epson-impact': 0,
    },
    wireless: {
        'orderpad': 0,
        'cakepop': 0,
    },
    kds: {
        'elo-kds': 0,
    }
};

interface AutoAddedInfrastructure {
    routers: number;
    ispModems: number;
    switches: number;
    outlets: number;
    accessPoints: number;
    poeInjectors: number;
}

export const calculateInfrastructure = (state: WizardState): AutoAddedInfrastructure => {
    // 1. Calculate Device Counts
    const totalPOS = Object.values(state.pos).reduce((a, b) => a + b, 0);
    const totalPrinters = Object.values(state.printers).reduce((a, b) => a + b, 0);
    const totalKDS = Object.values(state.kds).reduce((a, b) => a + b, 0);
    const totalWireless = Object.values(state.wireless).reduce((a, b) => a + b, 0);

    // 2. Determine Wireless Infrastructure
    // Logic: If any wireless devices, add AP + Injector
    const accessPoints = totalWireless > 0 ? 1 : 0;
    const poeInjectors = totalWireless > 0 ? 1 : 0; // 1 to 1 for MVP

    // 3. Determine Wired Connections needed
    // POS, Printers, KDS are wired.
    // AP requires a wired connection (through injector, but ultimately to switch/router).
    // Injector "LAN IN" goes to Switch/Router. So yes, Injector counts as 1 wired uplink.
    // If no injector, AP would take a port if it wasn't PoE... but sticking to MVP model:
    // Wired Devices = POS + Printers + KDS + Injectors
    const totalWiredDevices = totalPOS + totalPrinters + totalKDS + poeInjectors;

    // 4. Determine Switches
    // Router (Zyxel) has 4 LAN ports.
    // Unmanaged Switch has 8 ports.
    const routerLanCapacity = 4;
    const switchCapacity = 8;

    // One port on switch is uplink, so 7 usable if daisy chaining? 
    // Let's keep it simple: "Switch supports N *usable* ports".
    // Definition says: "Unmanaged switch supports N usable ports (use existing port count)". 
    // existing definition: 8 ports. 
    // Assumption: All switches connect directly to Router (star topology) or daisy chain.
    // Simplest logic: Total capacity needed = totalWiredDevices.
    // Available on Router = 4.
    // If needed <= 4, switches = 0.
    // If needed > 4, we need switches.
    // Note: Each switch takes 1 port on Router.
    // So if we have 1 switch, router has 3 ports left for devices. 
    // Switch gives 8 ports. Total capacity = 3 (router) + 8 (switch) = 11.

    // Algorithm:
    // Start with 1 Router. Capacity = 4.
    // While Capacity < Required:
    //   Add Switch.
    //   Capacity = Capacity - 1 (uplink) + 8 (switch).

    let switches = 0;
    let currentCapacity = routerLanCapacity;

    // Safety break
    let loopCount = 0;
    while (currentCapacity < totalWiredDevices && loopCount < 50) {
        switches++;
        currentCapacity = currentCapacity - 1 + switchCapacity;
        loopCount++;
    }

    // 5. Determine Power Outlets
    // Powered Devices: POS, Printers, KDS, Switches, Injectors, Router, Modem.
    // NOT Powered directly via outlet: AP (PoE), OrderPad, CakePop (Battery/Charging but simpler to ignore or assume dock? User didn't specify docks. Prompt says: "AP ... include AP in outlet count only if it truly requires separate power." -> "AP powered via PoE" -> Don't count AP.
    // "Switch: powered", "PoE Injector: powered".
    // Router is powered. Modem is powered.
    const ispModems = 1; // Always 1
    const routers = 1; // Always 1 Zyxel

    const totalPoweredDevices =
        totalPOS +
        totalPrinters +
        totalKDS +
        switches +
        poeInjectors +
        routers +
        ispModems;

    // 4 devices per outlet
    const devicesPerOutlet = 4;
    const outlets = Math.ceil(totalPoweredDevices / devicesPerOutlet);

    return {
        routers,
        ispModems,
        switches,
        outlets,
        accessPoints,
        poeInjectors
    };
};

export const buildSandboxConfigFromWizard = (wizardState: WizardState): Record<DeviceType, number> => {
    const infra = calculateInfrastructure(wizardState);

    // Map to DeviceCounts type in store
    const counts: Record<DeviceType, number> = {
        'isp-modem': infra.ispModems,
        'zyxel-router': infra.routers,
        'cradlepoint-router': 0,
        'managed-switch': 0,
        'unmanaged-switch': infra.switches,
        'access-point': 0, // Not using generic AP
        'datto-ap440': infra.accessPoints, // Default to Datto AP440 for "AP"
        'datto-ap62': 0,
        'poe-injector': infra.poeInjectors,
        'power-outlet': infra.outlets, // calculated outlets
        'pos': 0, // generic
        'datavan-pos': wizardState.pos['datavan-pos'],
        'poindus-pos': wizardState.pos['poindus-pos'],
        'v3-pos': wizardState.pos['v3-pos'],
        'v4-pos': wizardState.pos['v4-pos'],
        'printer': 0,
        'epson-thermal': wizardState.printers['epson-thermal'],
        'epson-impact': wizardState.printers['epson-impact'],
        'kds': 0,
        'elo-kds': wizardState.kds['elo-kds'],
        'orderpad': wizardState.wireless.orderpad,
        'cakepop': wizardState.wireless.cakepop,
        'unknown': 0
    };

    return counts;
};
