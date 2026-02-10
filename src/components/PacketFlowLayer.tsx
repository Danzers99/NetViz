import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store';
import type { Device } from '../types';
import { getPortPosition } from '../utils/layout';
import { sampleBezierPoint } from '../utils/packetFlow';

const PARTICLES_PER_LINK = 3;
const MAX_LINKS = 8;
const MAX_PARTICLES = MAX_LINKS * PARTICLES_PER_LINK; // 24
const PARTICLE_SPEED = 0.4; // full traversal in ~2.5s
const PARTICLE_RADIUS = 0.06;
const FADE_DISTANCE = 40;
const BASE_OPACITY = 0.6;
const NORMAL_COLOR = new THREE.Color('#60a5fa'); // blue-400
const NEGOTIATING_COLOR = new THREE.Color('#f59e0b'); // amber-500

interface LinkGeometry {
    start: [number, number, number];
    mid: [number, number, number];
    end: [number, number, number];
    isNegotiating: boolean;
}

/**
 * PacketFlowLayer renders animated particle pulses along active cable paths.
 * Uses a single InstancedMesh for all particles (max 24) for minimal draw calls.
 */
export const PacketFlowLayer = () => {
    const devices = useAppStore((state) => state.devices);
    const packetFlowLinks = useAppStore((state) => state.packetFlowLinks);
    const packetFlowMode = useAppStore((state) => state.packetFlowMode);
    const clearPacketFlow = useAppStore((state) => state.clearPacketFlow);

    // Detect prefers-reduced-motion
    const [reduceMotion, setReduceMotion] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduceMotion(mq.matches);
        const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Escape key clears trace
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && packetFlowMode !== 'off') {
                clearPacketFlow();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [packetFlowMode, clearPacketFlow]);

    // Build port lookup once
    const portLookup = useMemo(() => {
        const map = new Map<string, { device: Device; index: number }>();
        devices.forEach(d => {
            d.ports.forEach((p, i) => {
                map.set(p.id, { device: d, index: i });
            });
        });
        return map;
    }, [devices]);

    // Resolve cable IDs to bezier geometries
    const activeLinks: LinkGeometry[] = useMemo(() => {
        if (packetFlowMode === 'off') return [];

        const links: LinkGeometry[] = [];
        const linksToProcess = packetFlowLinks.slice(0, MAX_LINKS);

        for (const cableId of linksToProcess) {
            // Cable ID format: "portA-id-portB-id" — but port IDs themselves contain dashes
            // The store generates IDs as `${port.id}-${port.connectedTo}`
            // We need to find both ports. Let's search by trying all ports.
            // Actually, findPathToModem returns `${port.id}-${port.connectedTo}`,
            // so we can split by finding a port that matches a prefix.

            let sourcePort: { device: Device; index: number } | undefined;
            let targetPort: { device: Device; index: number } | undefined;

            // Try to find the cable by checking all connected port pairs
            for (const [portId, info] of portLookup) {
                const port = info.device.ports[info.index];
                if (port.connectedTo) {
                    const possibleCableId = `${portId}-${port.connectedTo}`;
                    const reverseCableId = `${port.connectedTo}-${portId}`;
                    if (possibleCableId === cableId || reverseCableId === cableId) {
                        sourcePort = info;
                        targetPort = portLookup.get(port.connectedTo);
                        break;
                    }
                }
            }

            if (!sourcePort || !targetPort) continue;

            const startLocalPos = getPortPosition(sourcePort.device, sourcePort.device.ports[sourcePort.index], sourcePort.index);
            const start: [number, number, number] = [
                sourcePort.device.position[0] + startLocalPos[0],
                sourcePort.device.position[1] + startLocalPos[1],
                sourcePort.device.position[2] + startLocalPos[2],
            ];

            const endLocalPos = getPortPosition(targetPort.device, targetPort.device.ports[targetPort.index], targetPort.index);
            const end: [number, number, number] = [
                targetPort.device.position[0] + endLocalPos[0],
                targetPort.device.position[1] + endLocalPos[1],
                targetPort.device.position[2] + endLocalPos[2],
            ];

            const mid: [number, number, number] = [
                (start[0] + end[0]) / 2,
                Math.max(start[1], end[1]) + 2, // Same arc as Cables.tsx
                (start[2] + end[2]) / 2,
            ];

            // Check if either port is negotiating
            const srcPort = sourcePort.device.ports[sourcePort.index];
            const tgtPort = targetPort.device.ports[targetPort.index];
            const isNegotiating = srcPort.linkStatus === 'negotiating' || tgtPort.linkStatus === 'negotiating';

            links.push({ start, mid, end, isNegotiating });
        }

        return links;
    }, [packetFlowMode, packetFlowLinks, portLookup, devices]);

    // InstancedMesh ref
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const tRef = useRef(0); // global time accumulator

    // Geometry and material (shared, created once)
    const geometry = useMemo(() => new THREE.SphereGeometry(PARTICLE_RADIUS, 8, 8), []);
    const material = useMemo(() => new THREE.MeshBasicMaterial({
        color: NORMAL_COLOR,
        transparent: true,
        opacity: BASE_OPACITY,
        depthWrite: false,
    }), []);

    const { camera } = useThree();

    // Color array for per-instance colors
    const colorArray = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);

    useFrame((_, delta) => {
        if (!meshRef.current || activeLinks.length === 0) return;

        // If reduced motion, don't animate — just show static midpoint positions
        if (!reduceMotion) {
            tRef.current += delta * PARTICLE_SPEED;
        }

        const totalParticles = activeLinks.length * PARTICLES_PER_LINK;

        // Camera distance for opacity fading
        const camPos = camera.position;

        let particleIndex = 0;
        for (let linkIdx = 0; linkIdx < activeLinks.length; linkIdx++) {
            const link = activeLinks[linkIdx];
            const color = link.isNegotiating ? NEGOTIATING_COLOR : NORMAL_COLOR;

            for (let p = 0; p < PARTICLES_PER_LINK; p++) {
                // Distribute particles evenly along the curve with time offset
                const baseT = p / PARTICLES_PER_LINK;
                let t: number;

                if (reduceMotion) {
                    // Static positions: evenly spaced
                    t = (baseT + 0.5 / PARTICLES_PER_LINK) % 1;
                } else {
                    t = (tRef.current + baseT) % 1;
                }

                const pos = sampleBezierPoint(link.start, link.mid, link.end, t);
                dummy.position.set(pos[0], pos[1], pos[2]);

                // Distance-based fading
                const dist = camPos.distanceTo(dummy.position);
                const opacity = Math.max(0.1, Math.min(BASE_OPACITY, 1.0 - (dist / FADE_DISTANCE)));
                // We can't set per-instance opacity with basic instancing, so we set it globally
                // Use the average distance for material opacity
                if (particleIndex === 0) {
                    material.opacity = opacity;
                }

                dummy.updateMatrix();
                meshRef.current.setMatrixAt(particleIndex, dummy.matrix);

                // Set per-instance color
                colorArray[particleIndex * 3] = color.r;
                colorArray[particleIndex * 3 + 1] = color.g;
                colorArray[particleIndex * 3 + 2] = color.b;

                particleIndex++;
            }
        }

        // Hide unused instances by scaling to 0
        for (let i = particleIndex; i < MAX_PARTICLES; i++) {
            dummy.position.set(0, -100, 0); // Move off-screen
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }

        // Update instance colors
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        } else {
            meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
        meshRef.current.count = totalParticles;
    });

    // Don't render anything if no active links
    if (packetFlowMode === 'off' || activeLinks.length === 0) return null;

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometry, material, MAX_PARTICLES]}
            frustumCulled={false}
        />
    );
};
