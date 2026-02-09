import type { ConnectionBuildConfig } from '../utils/connectionTypes';

/**
 * Basic store topology: ZyXEL router + Switch + POS + Printer
 * Devices assigned to appropriate rooms
 */
export const BASIC_STORE_PRESET: ConnectionBuildConfig = {
    devices: [
        {
            name: "ZyXEL Router",
            type: "zyxel-router",
            room: "office",
            connections: [
                { sourcePort: "WAN", targetDevice: "ISP" },
                { sourcePort: "LAN 1", targetDevice: "Main Switch" },
            ]
        },
        {
            name: "Main Switch",
            type: "unmanaged-switch",
            room: "office",
            connections: [
                { sourcePort: "Port 1", targetDevice: "ZyXEL Router" },
                { sourcePort: "Port 2", targetDevice: "POS 1" },
                { sourcePort: "Port 3", targetDevice: "Receipt Printer" },
                { sourcePort: "Port 4", targetDevice: "Kitchen Printer" },
            ]
        },
        {
            name: "POS 1",
            type: "v4-pos",
            room: "dining",
            connections: [
                { sourcePort: "ETH", targetDevice: "Main Switch" },
            ]
        },
        {
            name: "Receipt Printer",
            type: "epson-thermal",
            room: "dining",
            connections: [
                { sourcePort: "ETH", targetDevice: "Main Switch" },
            ]
        },
        {
            name: "Kitchen Printer",
            type: "epson-impact",
            room: "kitchen",
            connections: [
                { sourcePort: "ETH", targetDevice: "Main Switch" },
            ]
        },
    ]
};

/**
 * Extended store with AP and multiple POS stations
 */
export const EXTENDED_STORE_PRESET: ConnectionBuildConfig = {
    devices: [
        {
            name: "ZyXEL Router",
            type: "zyxel-router",
            room: "office",
            connections: [
                { sourcePort: "WAN", targetDevice: "ISP" },
                { sourcePort: "LAN 1", targetDevice: "Main Switch" },
            ]
        },
        {
            name: "Main Switch",
            type: "unmanaged-switch",
            room: "office",
            connections: [
                { sourcePort: "Port 1", targetDevice: "ZyXEL Router" },
                { sourcePort: "Port 2", targetDevice: "POS 1" },
                { sourcePort: "Port 3", targetDevice: "POS 2" },
                { sourcePort: "Port 4", targetDevice: "Receipt Printer" },
                { sourcePort: "Port 5", targetDevice: "Kitchen Printer" },
                { sourcePort: "Port 6", targetDevice: "PoE Injector" },
            ]
        },
        {
            name: "PoE Injector",
            type: "poe-injector",
            room: "office",
            connections: [
                { sourcePort: "LAN IN", targetDevice: "Main Switch" },
                { sourcePort: "PoE OUT", targetDevice: "WiFi AP" },
            ]
        },
        {
            name: "WiFi AP",
            type: "datto-ap440",
            room: "dining",
            connections: [
                { sourcePort: "ETH/PoE", targetDevice: "PoE Injector" },
            ]
        },
        {
            name: "POS 1",
            type: "v4-pos",
            room: "dining",
            connections: [
                { sourcePort: "ETH", targetDevice: "Main Switch" },
            ]
        },
        {
            name: "POS 2",
            type: "v4-pos",
            room: "bar",
            connections: [
                { sourcePort: "ETH", targetDevice: "Main Switch" },
            ]
        },
        {
            name: "Receipt Printer",
            type: "epson-thermal",
            room: "dining",
            connections: [
                { sourcePort: "ETH", targetDevice: "Main Switch" },
            ]
        },
        {
            name: "Kitchen Printer",
            type: "epson-impact",
            room: "kitchen",
            connections: [
                { sourcePort: "ETH", targetDevice: "Main Switch" },
            ]
        },
    ]
};

/**
 * Sample text format for paste mode
 */
export const SAMPLE_TEXT_FORMAT = `ZyXEL Router (zyxel-router) [office]
WAN → ISP
LAN1 → Main Switch

Main Switch (unmanaged-switch) [office]
Port 1 → ZyXEL Router
Port 2 → POS 1
Port 3 → Receipt Printer

POS 1 (v4-pos) [dining]
ETH → Main Switch

Receipt Printer (epson-thermal) [dining]
ETH → Main Switch`;

export const CONNECTION_PRESETS = [
    { id: 'basic', name: 'Basic Store', description: 'Router + Switch + POS + Printer', config: BASIC_STORE_PRESET },
    { id: 'extended', name: 'Extended Store', description: 'With WiFi AP, multiple POS & Bar', config: EXTENDED_STORE_PRESET },
];
