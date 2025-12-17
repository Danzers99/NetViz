import type { Device, Port } from '../types';

export const getPortPosition = (device: Device, port: Port, index: number): [number, number, number] => {
    // Standard vertical offset for ports relative to device center
    // Most devices are centered at Y=0.5 (box height 1 or similar)
    // Ports are usually on the face.
    // DeviceNode renders box at [0, 0.5, 0].
    // Existing logic put ports at [x, 0, 0.51] relative to a group at [0, 0.5, 0].
    // Let's stick to returning position relative to the DEVICE CENTER grouping (which is at device.position).
    // The group in DeviceNode is `<group position={device.position}>`.
    // Inside that, we had `<group position={[0, 0.5, 0.51]}>` for ports.

    // We will now return the position relative to `device.position` (the root group).
    // So roughly local coordinates.

    // We will now return the position relative to `device.position` (the root group).
    // So roughly local coordinates.

    switch (device.type) {
        case 'isp-modem':
            // Vertical tower: [0.3, 1.2, 0.8]. Center: [0, 0.6, 0].
            // Back face Z = -0.4.
            // Stack ports vertically on the back.
            if (port.role === 'wan') return [0, 0.8, -0.41]; // Coax/Wan near top
            return [0, 0.6, -0.41]; // LAN below it
        case 'zyxel-router':
            // Vertical Tower: [0.3, 1.2, 0.9]
            // Center Y is 0.6.
            // Ports on the back (Z negative). Back face Z = -0.45.
            if (port.role === 'wan') {
                // WAN at Top
                return [0, 0.9, -0.46];
            } else if (port.role === 'power_input') {
                // Power at very bottom
                return [0, 0.1, -0.46];
            } else {
                // LAN ports - vertical column below WAN
                const lanPorts = device.ports.filter(p => p.role === 'lan');
                const lanIndex = lanPorts.findIndex(p => p.id === port.id);
                // Stack vertically descending from below WAN
                return [0, 0.7 - (lanIndex * 0.15), -0.46];
            }

        case 'managed-switch':
        case 'unmanaged-switch':
            // SwitchModel: Box [1.8, 0.44, 1.0]. Center [0, 0.22, 0].
            // Front face Z = 0.5.
            {
                const spacing = 0.2;
                // Exclude power port from front face calculation to avoid clutter or gaps
                const dataPorts = device.ports.filter(p => p.role !== 'power_input');
                const pIndex = dataPorts.findIndex(p => p.id === port.id);

                if (port.role === 'power_input') {
                    // Power on back face
                    return [0, 0.22, -0.52];
                }

                if (pIndex === -1) return [0, 0, 0]; // Fallback

                const totalW = (dataPorts.length - 1) * spacing;
                const startX = -totalW / 2;
                return [startX + pIndex * spacing, 0.22, 0.52];
            }

        case 'poe-injector':
            // InjectorModel: [0.5, 0.3, 0.8]. Center [0, 0.15, 0].
            // Front face Z = 0.4. Back Z = -0.4.
            // "poe and lan port should both be on the same side (Front)"
            if (port.role === 'poe_source') return [0.1, 0.15, 0.41]; // Right Front
            if (port.role === 'uplink') return [-0.1, 0.15, 0.41]; // Left Front
            // "opposite side should be the cable that leads to the power"
            if (port.role === 'power_input') return [0, 0.15, -0.41]; // Back
            return [0, 0.2, 0];

        case 'power-outlet':
            // Strip: [1.6, 0.2, 0.4]. Center [0, 0.1, 0].
            // Outlets at x = -0.6, -0.2, 0.2, 0.6. Y top = 0.2.
            const outlets = [-0.7, -0.3, 0.1, 0.5];
            // Map port index to outlet position (if we have fewer ports than outlets, fine)
            // device.ports includes outlets.
            const outletX = outlets[index % 4];
            return [outletX, 0.21, 0]; // On top face

        case 'cakepop':
            // [0.35, 0.08, 0.7]. Flat-ish.
            return [0, 0.1, -0.35]; // Top/back edge
        case 'orderpad':
            // [0.8, 0.05, 0.6]. Flat.
            return [0, 0.1, -0.3]; // Top edge

        case 'datto-ap440':
        case 'datto-ap62':
        case 'access-point':
            // APModel: [0.8, 0.2, 0.8]. Center [0, 0.1, 0].
            // APs usually have ports on the side/back.
            if (port.role === 'poe_client' || port.role === 'uplink') return [0, 0.1, -0.42]; // Back
            return [0, 0.1, 0.42];

        case 'pos':
        case 'datavan-pos':
        case 'poindus-pos':
        case 'v3-pos':
        case 'v4-pos':
        case 'elo-kds':
        case 'kds':
            // POS Model: Base [0.6, 0.2, 0.6]. Center [0, 0.1, 0].
            // Back face Z = -0.3.
            if (port.role === 'power_input') return [0.1, 0.1, -0.32]; // Offset power slightly
            return [-0.1, 0.1, -0.32];

        case 'printer':
        case 'epson-thermal':
        case 'epson-impact':
            // Printer Model: Cube [0.6, 0.6, 0.6]. Center [0, 0.3, 0].
            // Back face Z = -0.3.
            if (port.role === 'power_input') return [0.1, 0.1, -0.32];
            return [-0.1, 0.1, -0.32];

        default:
            // Fallback Generic Layout
            // Assuming Box [1, 1, 1] at [0, 0.5, 0].
            const spacing = 0.25;
            const totalWidth = (device.ports.length - 1) * spacing;
            const startX = -totalWidth / 2;
            return [startX + index * spacing, 0.5, 0.51];
    }
};

// Add fallback for POS and Printer types to be caught in specific cases if they weren't before
// Wait, the switch needed explicit cases for POS and Printer if we want to change them.
// Currently they fall through to default!
// Let's add them.
