import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '../store';
import type { Device } from '../types';

interface WifiCoverageOverlayProps {
    device: Device;
}

export const WifiCoverageOverlay = ({ device }: WifiCoverageOverlayProps) => {
    // Refs for direct access in useFrame (bypass React render cycle for calc)
    const meshRef = useRef<THREE.Mesh>(null);
    const outlineRef = useRef<THREE.Line>(null);
    const geometryRef = useRef<THREE.BufferGeometry>(null);
    const outlineGeoRef = useRef<THREE.BufferGeometry>(null);

    // Store access
    const settings = useAppStore((state) => state.settings);
    const selectedDeviceId = useAppStore((state) => state.selectedDeviceId);
    const rooms = useAppStore((state) => state.rooms); // We need rooms for walls

    // Valid types
    const validTypes = ['access-point', 'datto-ap440', 'datto-ap62'];
    const isAP = validTypes.includes(device.type);

    if (!isAP || !device.position) return null;

    // Computed Settings
    const coverageSettings = device.wifiCoverage || { environment: 'indoor', strength: 'medium' };

    // Theme
    const isDark = settings.darkMode;
    const theme = useMemo(() => {
        const base = new THREE.Color(isDark ? "#22d3ee" : "#06b6d4");
        const outline = new THREE.Color(isDark ? "#67e8f9" : "#0891b2");
        return {
            center: [base.r, base.g, base.b, isDark ? 0.25 : 0.35],
            edge: [base.r, base.g, base.b, 0.0],
            outline: [outline.r, outline.g, outline.b]
        };
    }, [isDark]);

    // Wall Deduplication & Extraction (Memoized)
    const uniqueWalls = useMemo(() => {
        const walls: { p1: { x: number, z: number }, p2: { x: number, z: number } }[] = [];
        const wallKeys = new Set<string>();

        // Helper to create canonical key for a wall segment (sort points)
        const getKey = (p1: { x: number, z: number }, p2: { x: number, z: number }) => {
            // FIX: Use higher precision to prevent rounding errors creating "Ghost Walls" 
            // separated by 0.1 units when rooms touch.
            const pa = `${p1.x.toFixed(3)},${p1.z.toFixed(3)}`;
            const pb = `${p2.x.toFixed(3)},${p2.z.toFixed(3)}`;
            return pa < pb ? `${pa}|${pb}` : `${pb}|${pa}`;
        };

        rooms.forEach(room => {
            const hw = room.width / 2;
            const hh = room.height / 2;
            const l = room.x - hw;
            const r = room.x + hw;
            const t = room.y - hh;
            const b = room.y + hh;

            // 4 segments
            const segments = [
                { p1: { x: l, z: t }, p2: { x: r, z: t } },
                { p1: { x: r, z: t }, p2: { x: r, z: b } },
                { p1: { x: r, z: b }, p2: { x: l, z: b } },
                { p1: { x: l, z: b }, p2: { x: l, z: t } }
            ];

            segments.forEach(seg => {
                const key = getKey(seg.p1, seg.p2);
                if (!wallKeys.has(key)) {
                    wallKeys.add(key);
                    walls.push(seg);
                }
            });
        });
        return walls;
    }, [rooms]);

    // Constant geometry params
    const SEGMENTS = 90;

    // Initialize Buffers Once
    useEffect(() => {
        if (geometryRef.current) {
            // Positions: Center + SEGMENTS + 1 (last = first)
            // But we do Fan: Center, V1, V2...
            // Vertices: 1 (Center) + (SEGMENTS + 1) rim points = SEGMENTS + 2
            const vertexCount = SEGMENTS + 2;
            const posArray = new Float32Array(vertexCount * 3);
            const colArray = new Float32Array(vertexCount * 4);
            const indices: number[] = [];

            // Center is index 0
            // Rim starts at 1
            for (let i = 1; i <= SEGMENTS; i++) {
                indices.push(0, i, i + 1);
            }

            geometryRef.current.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            geometryRef.current.setAttribute('color', new THREE.BufferAttribute(colArray, 4));
            geometryRef.current.setIndex(indices);
        }

        if (outlineGeoRef.current) {
            const vertexCount = SEGMENTS + 1; // Just the rim
            const posArray = new Float32Array(vertexCount * 3);
            outlineGeoRef.current.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        }
    }, []);

    // Animation Loop
    useFrame(() => {
        if (!meshRef.current || !geometryRef.current) return;

        // 0. Get Fresh Settings (Direct Store Access)
        const currentSettings = useAppStore.getState().settings;
        const currentIsVisible = currentSettings.showWifiCoverage || selectedDeviceId === device.id;
        // Use frame-accurate dark mode to avoid render-lag sync issues
        const isDarkFrame = currentSettings.darkMode;

        // 1. Check Visibility
        meshRef.current.visible = currentIsVisible;

        // Handle Outline independently (don't block mesh if outline is missing)
        if (outlineRef.current) {
            outlineRef.current.visible = currentIsVisible && isDarkFrame;
        }

        if (!currentIsVisible) return;

        // 2. Refresh Scale & Params (Live Update)
        const scale = currentSettings.canvasScale || 5;
        let rFeet = 150;
        if (coverageSettings.environment === 'indoor') {
            if (coverageSettings.strength === 'low') rFeet = 100;
            else if (coverageSettings.strength === 'medium') rFeet = 150;
            else rFeet = 200;
        } else { // Outdoor
            if (coverageSettings.strength === 'low') rFeet = 300;
            else if (coverageSettings.strength === 'medium') rFeet = 350;
            else rFeet = 400;
        }
        const radiusUnits = rFeet / scale;

        // Helper to find closest point on segment
        const getClosestPoint = (p: { x: number, z: number }, w: { p1: { x: number, z: number }, p2: { x: number, z: number } }) => {
            const l2 = (w.p1.x - w.p2.x) ** 2 + (w.p1.z - w.p2.z) ** 2;
            if (l2 === 0) return w.p1;
            let t = ((p.x - w.p1.x) * (w.p2.x - w.p1.x) + (p.z - w.p1.z) * (w.p2.z - w.p1.z)) / l2;
            t = Math.max(0, Math.min(1, t));
            return {
                x: w.p1.x + t * (w.p2.x - w.p1.x),
                z: w.p1.z + t * (w.p2.z - w.p1.z)
            };
        };

        // Magnetic Origin using proper Device Position properties
        const origin = { x: device.position[0], z: device.position[2] };
        let calcOrigin = { ...origin };
        const SNAP_DIST_SQ = 0.2 * 0.2; // 0.2 units threshold

        let minDist = Infinity;
        let snapPoint = null;

        for (const wall of uniqueWalls) {
            const cp = getClosestPoint(origin, wall);
            const d2 = (cp.x - origin.x) ** 2 + (cp.z - origin.z) ** 2;
            if (d2 < minDist) {
                minDist = d2;
                snapPoint = cp;
            }
        }

        if (snapPoint && minDist < SNAP_DIST_SQ) {
            calcOrigin = snapPoint;
        }



        const posAttr = geometryRef.current.getAttribute('position') as THREE.BufferAttribute;
        const colAttr = geometryRef.current.getAttribute('color') as THREE.BufferAttribute;

        // Center
        posAttr.setXYZ(0, 0, 0, 0);
        // Explicit args to satisfy TS tuple requirements
        colAttr.setXYZW(0, theme.center[0], theme.center[1], theme.center[2], theme.center[3]);

        // Simplified Signal Logic
        const rawRadii: number[] = [];
        const angleStep = (Math.PI * 2) / SEGMENTS;

        for (let i = 0; i <= SEGMENTS; i++) {
            const angle = i * angleStep;
            const dirX = Math.cos(angle);
            const dirZ = Math.sin(angle);

            // Target point at Max Range
            const x3 = calcOrigin.x;
            const z3 = calcOrigin.z;
            const x4 = x3 + dirX * radiusUnits;
            const z4 = z3 + dirZ * radiusUnits;

            // Collect all hits for this ray
            const hits: number[] = [];
            const distT = 0.1 / radiusUnits; // Ignore hits within 0.1 units of center

            for (const wall of uniqueWalls) {
                const x1 = wall.p1.x, z1 = wall.p1.z;
                const x2 = wall.p2.x, z2 = wall.p2.z;

                const den = (x1 - x2) * (z3 - z4) - (z1 - z2) * (x3 - x4);
                if (Math.abs(den) < 0.0001) continue;

                const t = ((x1 - x3) * (z3 - z4) - (z1 - z3) * (x3 - x4)) / den;
                // Wait, previous code had:  const u = -((x1 - x2) * (z1 - z2) - (z1 - z3) * (x2 - x1)) / den;
                // Let's stick to the previous working algebraic form unless I see it's wrong.
                // Re-deriving quickly:
                // P = P1 + t(P2-P1)
                // P = P3 + u(P4-P3)
                // actually existing code calls ray P3->P4 and wall P1->P2.
                // standard: t is along ray, u is along segment.
                // existing code: t is along ray. u is along wall.

                // Let's use the code I had, just adding epsilon to u
                const u_existing = -((x1 - x2) * (z1 - z3) - (z1 - z2) * (x1 - x3)) / den;

                // Tolerant check for corners (epsilon 0.001)
                if (t > distT && t <= 1 && u_existing >= -0.001 && u_existing <= 1.001) {
                    hits.push(t);
                }
            }

            // Deduplicate Hits (Handle Corners)
            // If we hit two walls at nearly the same distance, it's just one obstruction (the corner).
            hits.sort((a, b) => a - b);

            let uniqueHitCount = 0;
            let lastHitT = -1;
            const DEDUP_THRESHOLD = 0.05 / radiusUnits; // 0.05 units tolerance

            for (const t of hits) {
                if (uniqueHitCount === 0 || (t - lastHitT) > DEDUP_THRESHOLD) {
                    uniqueHitCount++;
                    lastHitT = t;
                }
            }

            // Attenuation Model: 0.75 per wall (Gentler falloff)
            const attenuation = Math.pow(0.75, uniqueHitCount);

            // Effective Radius for this angle
            // If hits > 0, we shorten the mesh radius to visually indicate signal loss
            // "Squashed Circle" effect
            const effectiveR = radiusUnits * attenuation;

            rawRadii.push(effectiveR);
        }

        // Smoothing Check: Box Blur to remove jagged edges from "Hit/Miss" rays
        const smoothed: number[] = [];
        const win = 4; // Smoothing window (increase for softer look)
        for (let i = 0; i < rawRadii.length; i++) {
            let sum = 0;
            let c = 0;
            for (let k = -win; k <= win; k++) {
                let idx = i + k;
                if (idx < 0) idx += SEGMENTS;
                if (idx >= SEGMENTS) idx -= SEGMENTS;

                // Safe access wrapping
                if (rawRadii[idx] !== undefined) {
                    sum += rawRadii[idx];
                    c++;
                }
            }
            smoothed.push(sum / c);
        }

        // Apply to Geometry
        for (let i = 0; i <= SEGMENTS; i++) {
            // Use smoothed radius (wrap index for the last point which equals first)
            const r = smoothed[i % SEGMENTS];
            const angle = i * angleStep;
            const x = Math.cos(angle) * r;
            const z = -Math.sin(angle) * r; // Invert Z to match World Space geometry

            posAttr.setXYZ(i + 1, x, z, 0);

            // Color: Center is solid, Edge is transparent
            // We can keep the same alpha gradient (High -> 0)
            colAttr.setXYZW(i + 1, theme.edge[0], theme.edge[1], theme.edge[2], theme.edge[3]);
        }

        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;

        // Outline Update
        if (outlineGeoRef.current && isDarkFrame) {
            const outPos = outlineGeoRef.current.getAttribute('position') as THREE.BufferAttribute;
            for (let i = 0; i <= SEGMENTS; i++) {
                outPos.setXYZ(i, posAttr.getX(i + 1), posAttr.getY(i + 1), 0);
            }
            outPos.needsUpdate = true;
        }
    });

    return (
        <group position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh position={[0, 0, 0.05]} ref={meshRef}>
                <bufferGeometry ref={geometryRef} />
                <meshBasicMaterial
                    transparent
                    vertexColors={true}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {isDark && (
                <line position={[0, 0, 0.06]} ref={outlineRef as any}>
                    <bufferGeometry ref={outlineGeoRef} />
                    <lineBasicMaterial color={new THREE.Color(theme.outline[0], theme.outline[1], theme.outline[2])} transparent opacity={0.4} />
                </line>
            )}
        </group>
    );
};
