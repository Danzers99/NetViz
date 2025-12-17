import type { ConnectionState } from '../../types';

// Helper for screen color (copied from EndpointModel, could extract to shared util)
const getScreenColor = (status: string, connectionState?: ConnectionState) => {
    if (status === 'offline') return '#000000';
    if (status === 'booting') return '#f59e0b';

    switch (connectionState) {
        case 'online': return '#22c55e'; // Green for Online
        case 'associated_no_internet': return '#f59e0b'; // Amber
        case 'associated_no_ip': return '#f59e0b';
        case 'auth_failed': return '#ef4444';
        case 'associating_wifi': return '#eab308';
        case 'disconnected':
        default: return '#ef4444'; // Red
    }
};

export const EloKDSModel = ({ status, connectionState }: { status?: string, connectionState?: ConnectionState }) => {
    // Large Touchscreen Monitor (22-inch ish) on a stand
    // Dimensions relative to other devices
    const screenColor = getScreenColor(status || 'online', connectionState);

    return (
        <group position={[0, 0, 0]}>
            {/* Stand Base */}
            <mesh position={[0, 0.05, 0]}>
                <boxGeometry args={[0.5, 0.1, 0.4]} />
                <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Stand Neck */}
            <mesh position={[0, 0.3, -0.1]}>
                <cylinderGeometry args={[0.05, 0.05, 0.5]} />
                <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Monitor Back */}
            <mesh position={[0, 0.7, 0]} rotation={[-0.1, 0, 0]}>
                <boxGeometry args={[1.4, 0.8, 0.1]} />
                <meshStandardMaterial color="#000000" metalness={0.5} roughness={0.2} />
            </mesh>
            {/* Screen Content */}
            <mesh position={[0, 0.7, 0.06]} rotation={[-0.1, 0, 0]}>
                <planeGeometry args={[1.3, 0.7]} />
                <meshStandardMaterial
                    color={screenColor}
                    emissive={screenColor}
                    emissiveIntensity={status === 'offline' ? 0 : 0.2}
                />
            </mesh>
            {/* Elo Logo Placeholer */}
            <mesh position={[0, 0.35, 0.055]} rotation={[-0.1, 0, 0]}>
                {/* Just a tiny detail */}
            </mesh>
        </group>
    );
};
