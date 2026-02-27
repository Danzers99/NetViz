import type { DeviceType, ConnectionState } from '../../types';

// Helper for status colors
const getStatusColor = (baseColor: string, status: string) => {
    if (status === 'offline') return '#1f2937';
    return baseColor;
};

export const RouterModel = ({ type, status, connectionState }: { type: DeviceType, status: string, connectionState?: ConnectionState }) => {
    // WAN LED Color
    const getWanColor = () => {
        if (status === 'offline' || status === 'booting') return '#000000';
        if (connectionState === 'online') return '#10b981'; // Green
        if (connectionState === 'associated_no_internet') return '#f59e0b'; // Amber (Modem connected but no ISP?) - unlikely for Router
        // "No WAN" -> Disconnected?
        if (!connectionState || connectionState === 'disconnected') return '#ef4444'; // Red
        return '#f59e0b';
    };

    // Zyxel is a flat wide box, distinct from generic cube
    if (type === 'zyxel-router') {
        return (
            <group position={[0, 0.6, 0]}>
                {/* Vertical Stand Main Body */}
                <mesh>
                    <boxGeometry args={[0.3, 1.2, 0.9]} />
                    <meshStandardMaterial color={getStatusColor("#1f2937", status)} />
                </mesh>
                {/* Base/Stand */}
                <mesh position={[0, -0.6, 0]}>
                    <boxGeometry args={[0.6, 0.05, 0.6]} />
                    <meshStandardMaterial color="#0f172a" />
                </mesh>
                {/* Lights/Indicators strip */}
                {/* Power LED */}
                <mesh position={[0, 0.4, 0.46]}>
                    <planeGeometry args={[0.1, 0.1]} />
                    <meshStandardMaterial
                        color={status === 'online' ? '#10b981' : (status === 'booting' ? '#f59e0b' : '#000000')}
                        emissive={status === 'online' ? '#10b981' : (status === 'booting' ? '#f59e0b' : '#000000')}
                        emissiveIntensity={status === 'offline' ? 0 : 0.5}
                    />
                </mesh>
                {/* WAN LED */}
                <mesh position={[0, 0.2, 0.46]}>
                    <planeGeometry args={[0.1, 0.1]} />
                    <meshStandardMaterial
                        color={getWanColor()}
                        emissive={getWanColor()}
                        emissiveIntensity={status === 'offline' ? 0 : 0.5}
                    />
                </mesh>
            </group>
        );
    }
    // Cradlepoint — low-profile matte black enterprise router
    if (type === 'cradlepoint-router') {
        const chassisColor = getStatusColor('#1a1a1a', status);
        const accentColor = '#111111';
        return (
            <group position={[0, 0.125, 0]}>
                {/* Main chassis body */}
                <mesh>
                    <boxGeometry args={[1.6, 0.25, 1.0]} />
                    <meshStandardMaterial color={chassisColor} roughness={0.85} metalness={0.1} />
                </mesh>

                {/* Slightly curved top surface accent (subtle raised panel) */}
                <mesh position={[0, 0.13, -0.05]}>
                    <boxGeometry args={[1.5, 0.02, 0.85]} />
                    <meshStandardMaterial color={accentColor} roughness={0.9} metalness={0.05} />
                </mesh>

                {/* Rounded front edge chamfer — left */}
                <mesh position={[-0.75, 0, 0.48]} rotation={[0, 0, Math.PI / 4]}>
                    <boxGeometry args={[0.08, 0.08, 0.04]} />
                    <meshStandardMaterial color={chassisColor} roughness={0.85} metalness={0.1} />
                </mesh>
                {/* Rounded front edge chamfer — right */}
                <mesh position={[0.75, 0, 0.48]} rotation={[0, 0, Math.PI / 4]}>
                    <boxGeometry args={[0.08, 0.08, 0.04]} />
                    <meshStandardMaterial color={chassisColor} roughness={0.85} metalness={0.1} />
                </mesh>

                {/* Flat rear panel (darker accent strip) */}
                <mesh position={[0, 0, -0.505]}>
                    <boxGeometry args={[1.6, 0.22, 0.02]} />
                    <meshStandardMaterial color="#0d0d0d" roughness={0.9} metalness={0.15} />
                </mesh>

                {/* Front panel ventilation/status strip (right side like real device) */}
                <mesh position={[0.35, 0.02, 0.505]}>
                    <boxGeometry args={[0.6, 0.08, 0.01]} />
                    <meshStandardMaterial color="#0f0f0f" roughness={0.95} metalness={0.0} />
                </mesh>

                {/* LED indicator dots on front strip */}
                {[0, 1, 2, 3, 4].map((i) => (
                    <mesh key={`led-${i}`} position={[0.15 + i * 0.1, 0.02, 0.515]} rotation={[0, 0, 0]}>
                        <circleGeometry args={[0.015, 8]} />
                        <meshStandardMaterial
                            color={status === 'online' ? '#10b981' : '#0a0a0a'}
                            emissive={status === 'online' ? '#10b981' : '#000000'}
                            emissiveIntensity={status === 'online' ? 0.6 : 0}
                        />
                    </mesh>
                ))}

                {/* Power LED — front left area */}
                <mesh position={[-0.6, 0.02, 0.515]}>
                    <circleGeometry args={[0.02, 8]} />
                    <meshStandardMaterial
                        color={status === 'offline' ? '#0a0a0a' : (status === 'booting' ? '#f59e0b' : '#10b981')}
                        emissive={status === 'offline' ? '#000000' : (status === 'booting' ? '#f59e0b' : '#10b981')}
                        emissiveIntensity={status === 'offline' ? 0 : 0.7}
                    />
                </mesh>

                {/* WAN status LED — front, next to power */}
                <mesh position={[-0.5, 0.02, 0.515]}>
                    <circleGeometry args={[0.02, 8]} />
                    <meshStandardMaterial
                        color={getWanColor()}
                        emissive={getWanColor()}
                        emissiveIntensity={status === 'offline' ? 0 : 0.7}
                    />
                </mesh>
            </group>
        );
    }
    return null;
};

export const ModemModel = ({ status }: { status: string }) => {
    // Vertical tower (ISP Modem)
    // Vertical tower (ISP Modem)
    return (
        <group position={[0, 0.6, 0]}>
            {/* Main Body */}
            <mesh>
                <boxGeometry args={[0.3, 1.2, 0.8]} />
                <meshStandardMaterial color={status === 'offline' ? '#1f2937' : "#0f172a"} /> {/* Deep black/blue */}
            </mesh>
            {/* Base Stand */}
            <mesh position={[0, -0.6, 0]}>
                <boxGeometry args={[0.5, 0.05, 1.0]} />
                <meshStandardMaterial color="#0f172a" />
            </mesh>
            {/* Front Status Lights */}
            <mesh position={[0, 0, 0.41]}>
                <planeGeometry args={[0.15, 0.8]} />
                <meshStandardMaterial
                    color={status === 'offline' ? '#000000' : '#10b981'}
                    emissive={status === 'offline' ? '#000000' : '#10b981'}
                    emissiveIntensity={status === 'offline' ? 0 : 0.5}
                />
            </mesh>
        </group>
    );
};
