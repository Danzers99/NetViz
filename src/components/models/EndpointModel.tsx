import type { DeviceType, ConnectionState } from '../../types';

export const SwitchModel = ({ type, status }: { type: DeviceType, status: string }) => {
    // Rack mount style wide metal box
    let color = type === 'managed-switch' ? '#334155' : '#475569';
    if (status === 'offline') color = '#1e293b';

    return (
        <mesh position={[0, 0.22, 0]}>
            <boxGeometry args={[1.8, 0.44, 1.0]} /> {/* Standard 1U-ish ratio */}
            <meshStandardMaterial color={color} metalness={0.3} />
        </mesh>
    );
};

// Helper for screen color
const getScreenColor = (status: string, connectionState?: ConnectionState) => {
    if (status === 'offline') return '#000000'; // Power Off
    if (status === 'booting') return '#f59e0b'; // Booting (Orange)

    // Powered On
    switch (connectionState) {
        case 'online': return '#3b82f6'; // Blue (Internet OK)
        case 'associated_no_internet': return '#f59e0b'; // Amber (No Internet)
        case 'associated_no_ip': return '#f59e0b'; // Amber (No IP)
        case 'auth_failed': return '#ef4444'; // Red (Auth Failed)
        case 'associating_wifi': return '#eab308'; // Yellow (Associating)
        case 'disconnected':
        default: return '#ef4444'; // Red (Disconnected)
    }
};

export const POSModel = ({ status, connectionState }: { status?: string, connectionState?: ConnectionState }) => {
    // Screen + Stand
    const screenColor = getScreenColor(status || 'online', connectionState);

    return (
        <group position={[0, 0, 0]}>
            {/* Base */}
            <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[0.6, 0.2, 0.6]} />
                <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Stand */}
            <mesh position={[0, 0.4, -0.1]} rotation={[0.2, 0, 0]}>
                <boxGeometry args={[0.2, 0.6, 0.1]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
            {/* Screen */}
            <mesh position={[0, 0.8, 0]} rotation={[-0.3, 0, 0]}>
                <boxGeometry args={[1.2, 0.8, 0.1]} />
                <meshStandardMaterial color="#000000" />
            </mesh>
            {/* Screen Content Area */}
            <mesh position={[0, 0.8, 0.06]} rotation={[-0.3, 0, 0]}>
                <planeGeometry args={[1.1, 0.7]} />
                <meshStandardMaterial
                    color={screenColor}
                    emissive={screenColor}
                    emissiveIntensity={status === 'offline' ? 0 : 0.2}
                />
            </mesh>
        </group>
    );
};

export const PrinterModel = ({ status }: { status?: string }) => {
    // Cube printer
    const color = status === 'offline' ? '#27272a' : '#3f3f46';
    return (
        <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
};

export const CakePOPModel = ({ status, connectionState }: { status?: string, connectionState?: ConnectionState }) => {
    // Mobile POS, size of a large phone
    const screenColor = getScreenColor(status || 'online', connectionState);

    return (
        <group position={[0, 0.1, 0]} rotation={[-0.1, 0, 0]}>
            {/* Phone Body */}
            <mesh>
                <boxGeometry args={[0.35, 0.08, 0.7]} />
                <meshStandardMaterial color="#ef4444" /> {/* Red/Toast brand color often used, or black */}
            </mesh>
            {/* Screen - Rotate -90 deg X to lay flat on top of the body */}
            <mesh position={[0, 0.041, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.3, 0.6]} />
                <meshStandardMaterial
                    color={screenColor}
                    emissive={screenColor}
                    emissiveIntensity={status === 'offline' ? 0 : 0.2}
                />
            </mesh>
            {/* Card swiper logic bump on top/side? */}
            <mesh position={[0, 0.04, -0.36]}>
                <boxGeometry args={[0.2, 0.08, 0.05]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
        </group>
    );
};

export const OrderPadModel = ({ status, connectionState }: { status?: string, connectionState?: ConnectionState }) => {
    // Looks like an iPad
    const screenColor = getScreenColor(status || 'online', connectionState);

    return (
        <group position={[0, 0.1, 0]} rotation={[-0.2, 0, 0]}>
            {/* Tablet Body */}
            <mesh>
                <boxGeometry args={[0.8, 0.05, 0.6]} /> {/* Landscape Tablet */}
                <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.2} /> {/* Silver */}
            </mesh>
            {/* Screen - Rotate -90 deg X to lay flat */}
            <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.75, 0.55]} />
                <meshStandardMaterial
                    color={screenColor}
                    emissive={screenColor}
                    emissiveIntensity={status === 'offline' ? 0 : 0.3}
                />
            </mesh>
            {/* Home button circle */}
            <mesh position={[0.36, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.02, 16]} />
                <meshStandardMaterial color="#0f172a" />
            </mesh>
        </group>
    );
};
