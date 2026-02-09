/**
 * Port Allocator
 * Deterministic port assignment to prevent collisions
 */

import type { DeviceType, PortRole } from '../types';
import { DEVICE_DEFINITIONS } from '../data/deviceDefinitions';

/**
 * Port allocation record
 */
export interface PortAllocation {
    deviceId: string;
    portId: string;
    portLabel: string;
    connectedToDeviceId: string;
    connectedToPortId: string;
}

/**
 * Port allocator class for managing port assignments
 */
export class PortAllocator {
    private allocations: Map<string, Set<string>> = new Map(); // deviceId -> set of used portIds

    /**
     * Get the next available port on a device for a given role
     */
    getNextAvailablePort(
        deviceId: string,
        deviceType: DeviceType,
        preferredRoles: PortRole[] = ['lan', 'generic']
    ): { portId: string; portLabel: string } | null {
        const def = DEVICE_DEFINITIONS[deviceType];
        if (!def) return null;

        const usedPorts = this.allocations.get(deviceId) || new Set();

        // Find first available port matching preferred roles
        for (const role of preferredRoles) {
            for (const port of def.ports) {
                if (port.role === role && !usedPorts.has(port.id)) {
                    return { portId: port.id, portLabel: port.label };
                }
            }
        }

        // Fallback: any non-power port
        for (const port of def.ports) {
            if (port.role !== 'power_input' &&
                port.role !== 'power_source' &&
                port.role !== 'wan' &&
                !usedPorts.has(port.id)) {
                return { portId: port.id, portLabel: port.label };
            }
        }

        return null; // No available ports
    }

    /**
     * Allocate a specific port on a device
     */
    allocatePort(deviceId: string, portId: string): boolean {
        if (!this.allocations.has(deviceId)) {
            this.allocations.set(deviceId, new Set());
        }

        const usedPorts = this.allocations.get(deviceId)!;
        if (usedPorts.has(portId)) {
            return false; // Port already allocated
        }

        usedPorts.add(portId);
        return true;
    }

    /**
     * Release a port allocation
     */
    releasePort(deviceId: string, portId: string): void {
        const usedPorts = this.allocations.get(deviceId);
        if (usedPorts) {
            usedPorts.delete(portId);
        }
    }

    /**
     * Check if a port is available
     */
    isPortAvailable(deviceId: string, portId: string): boolean {
        const usedPorts = this.allocations.get(deviceId);
        return !usedPorts || !usedPorts.has(portId);
    }

    /**
     * Get count of available ports on a device
     */
    getAvailablePortCount(deviceId: string, deviceType: DeviceType): number {
        const def = DEVICE_DEFINITIONS[deviceType];
        if (!def) return 0;

        const usedPorts = this.allocations.get(deviceId) || new Set();
        const usablePorts = def.ports.filter(p =>
            p.role !== 'power_input' &&
            p.role !== 'power_source' &&
            p.role !== 'wan'
        );

        return usablePorts.length - usedPorts.size;
    }

    /**
     * Check if a device (switch) is full
     */
    isDeviceFull(deviceId: string, deviceType: DeviceType): boolean {
        return this.getAvailablePortCount(deviceId, deviceType) <= 0;
    }

    /**
     * Clear all allocations
     */
    clear(): void {
        this.allocations.clear();
    }

    /**
     * Remove all allocations for a device
     */
    clearDevice(deviceId: string): void {
        this.allocations.delete(deviceId);
    }
}

/**
 * Singleton allocator for use during build
 */
let globalAllocator: PortAllocator | null = null;

export function getPortAllocator(): PortAllocator {
    if (!globalAllocator) {
        globalAllocator = new PortAllocator();
    }
    return globalAllocator;
}

export function resetPortAllocator(): void {
    if (globalAllocator) {
        globalAllocator.clear();
    }
    globalAllocator = new PortAllocator();
}
