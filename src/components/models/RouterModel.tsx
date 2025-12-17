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
    // Cradlepoint (placeholder distinct shape)
    if (type === 'cradlepoint-router') {
        return (
            <group position={[0, 0.2, 0]}>
                <mesh>
                    <boxGeometry args={[1, 0.3, 0.6]} />
                    <meshStandardMaterial color={getStatusColor("#e5e7eb", status)} metalness={0.5} roughness={0.5} /> {/* White/Metal */}
                </mesh>
                {/* Antennas */}
                <mesh position={[-0.4, 0.3, -0.2]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.4]} />
                    <meshStandardMaterial color="#000000" />
                </mesh>
                <mesh position={[0.4, 0.3, -0.2]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.4]} />
                    <meshStandardMaterial color="#000000" />
                </mesh>
                {/* WAN LED on top */}
                <mesh position={[0, 0.16, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.05]} />
                    <meshStandardMaterial
                        color={getWanColor()}
                        emissive={getWanColor()}
                        emissiveIntensity={status === 'offline' ? 0 : 0.5}
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
