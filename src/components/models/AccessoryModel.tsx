import type { DeviceType } from '../../types';

export const APModel = ({ type, status }: { type: DeviceType, status: string }) => {
    // Datto APs are white curved squares
    let color = type === 'datto-ap62' ? '#e2e8f0' : '#ffffff'; // Slight variation
    if (status === 'offline') color = '#374151'; // Darker gray when offline

    return (
        <group position={[0, 0.1, 0]}>
            {/* Main Body */}
            <mesh>
                <boxGeometry args={[0.8, 0.2, 0.8]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Use a sphere or cylinder heavily obscured to create 'curve' top? 
                Or just a simple second layer for Detail */}
            <mesh position={[0, 0.11, 0]}>
                <cylinderGeometry args={[0.3, 0.35, 0.05, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={status === 'booting' ? '#f59e0b' : '#000000'}
                    emissiveIntensity={status === 'booting' ? 0.5 : 0}
                />
            </mesh>
        </group>
    );
};

export const InjectorModel = ({ status }: { status: string }) => {
    // Small black brick
    // Injector has a simpler status
    // Injector Model
    // PoE and LAN on same side (Front), Power on opposite (Back)
    return (
        <group position={[0, 0.15, 0]}>
            {/* Main Body */}
            <mesh>
                <boxGeometry args={[0.5, 0.3, 0.8]} />
                <meshStandardMaterial color={status === 'offline' ? '#1f2937' : "#000000"} />
            </mesh>
            {/* Port Labels/Areas Front */}
            <mesh position={[-0.1, 0, 0.41]}>
                <planeGeometry args={[0.15, 0.15]} />
                <meshStandardMaterial color="#3b82f6" /> {/* LAN Blue */}
            </mesh>
            <mesh position={[0.1, 0, 0.41]}>
                <planeGeometry args={[0.15, 0.15]} />
                <meshStandardMaterial color="#ef4444" /> {/* PoE Red-ish */}
            </mesh>
            {/* Power Input Back */}
            <mesh position={[0, 0, -0.41]}>
                <planeGeometry args={[0.2, 0.2]} />
                <meshStandardMaterial color="#fbbf24" /> {/* Power Yellow-ish */}
            </mesh>
        </group>
    );
};

export const PowerOutletModel = ({ status }: { status: string }) => {
    // Look like a power strip
    return (
        <group position={[0, 0.1, 0]}>
            {/* Strip Body */}
            <mesh>
                <boxGeometry args={[1.6, 0.2, 0.4]} />
                <meshStandardMaterial color="#f8fafc" /> {/* White plastic */}
            </mesh>
            {/* Individual Outlets */}
            {[-0.7, -0.3, 0.1, 0.5].map((x, i) => (
                <mesh key={i} position={[x, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.15, 0.2]} />
                    <meshStandardMaterial color="#334155" />
                </mesh>
            ))}
            {/* Switch on the end */}
            <mesh position={[0.72, 0.12, 0]}>
                <boxGeometry args={[0.1, 0.1, 0.2]} />
                <meshStandardMaterial
                    color={status === 'offline' ? '#ef4444' : '#ef4444'}
                    emissive={status === 'offline' ? '#000000' : '#ef4444'}
                    emissiveIntensity={status === 'offline' ? 0 : 0.5}
                />
            </mesh>
            {/* Cable exit */}
            <mesh position={[-0.8, 0, 0]} rotation={[0, 0, 1.57]}>
                <cylinderGeometry args={[0.05, 0.05, 0.2]} />
                <meshStandardMaterial color="#000000" />
            </mesh>
        </group>
    );
};
