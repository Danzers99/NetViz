# Device Registry

This directory contains the `DeviceDefinitions` registry, which is the single source of truth for all device capabilities, ports, and power requirements.

## How to Add a New Device Type

1.  **Update `DeviceType`**: Add the new type string to `src/types.ts`.
2.  **Add Definition**: In `src/data/deviceDefinitions.ts`, add a new entry to the `DEVICE_DEFINITIONS` object.
3.  **Define Ports**: List all physical ports in the `ports` array. Use `id` (e.g., 'wan', 'p1') which identifies the port uniquely on the device.
4.  **Define Power**: Configure `powerModel` (does it need power? is it PoE powered?).
5.  **Define Capabilities**: Set flags like `isRouter`, `isSwitch`, `wifiHosting`, etc., to enable simulation behaviors.

### Example

```typescript
'new-router-model': {
    type: 'new-router-model',
    displayName: 'Super Router 3000',
    category: 'infra',
    ports: [
        { id: 'wan', label: 'WAN', role: 'wan' },
        { id: 'lan1', label: 'LAN 1', role: 'lan' },
        { id: 'pwr', label: 'Power', role: 'power_input' }
    ],
    powerModel: { requiresPower: true, powerSource: 'outlet' },
    capabilities: { isRouter: true, wifiHosting: true }
}
```
