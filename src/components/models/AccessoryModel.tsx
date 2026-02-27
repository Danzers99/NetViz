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
                <meshStandardMaterial color="#eab308" /> {/* LAN Yellow */}
            </mesh>
            <mesh position={[0.1, 0, 0.41]}>
                <planeGeometry args={[0.15, 0.15]} />
                <meshStandardMaterial color="#ef4444" /> {/* PoE Red-ish */}
            </mesh>
            {/* Power Input Back */}
            <mesh position={[0, 0, -0.41]}>
                <planeGeometry args={[0.2, 0.2]} />
                <meshStandardMaterial color="#4b5563" metalness={0.3} roughness={0.6} /> {/* Power Grey */}
            </mesh>
        </group>
    );
};

export const PowerOutletModel = ({ status }: { status: string }) => {
    const bodyColor = '#f0ece8'; // Slight off-white plastic
    const cavityColor = '#d4cfc9'; // Slightly darker socket interior
    const slotColor = '#1a1a1a'; // Dark prong slots

    return (
        <group position={[0, 0.1, 0]}>
            {/* Main strip body — long narrow rectangle */}
            <mesh>
                <boxGeometry args={[1.6, 0.2, 0.4]} />
                <meshStandardMaterial color={bodyColor} roughness={0.75} metalness={0.02} />
            </mesh>

            {/* Perimeter bevel trim — top edge accent */}
            <mesh position={[0, 0.105, 0]}>
                <boxGeometry args={[1.56, 0.01, 0.36]} />
                <meshStandardMaterial color="#e8e4df" roughness={0.7} metalness={0.03} />
            </mesh>

            {/* 4 US-style outlets */}
            {[-0.7, -0.3, 0.1, 0.5].map((x, i) => (
                <group key={`outlet-${i}`} position={[x, 0.105, 0]}>
                    {/* Recessed cavity */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <boxGeometry args={[0.14, 0.2, 0.02]} />
                        <meshStandardMaterial color={cavityColor} roughness={0.8} metalness={0.0} />
                    </mesh>

                    {/* Left vertical prong slot */}
                    <mesh position={[-0.025, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <boxGeometry args={[0.015, 0.06, 0.01]} />
                        <meshStandardMaterial color={slotColor} roughness={0.9} />
                    </mesh>
                    {/* Right vertical prong slot */}
                    <mesh position={[0.025, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <boxGeometry args={[0.015, 0.06, 0.01]} />
                        <meshStandardMaterial color={slotColor} roughness={0.9} />
                    </mesh>
                    {/* Ground slot (rounded — use small cylinder) */}
                    <mesh position={[0, 0.005, 0.045]} rotation={[-Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.012, 0.012, 0.01, 8]} />
                        <meshStandardMaterial color={slotColor} roughness={0.9} />
                    </mesh>
                </group>
            ))}

            {/* Red rocker switch — near the right end */}
            <mesh position={[0.72, 0.12, 0]}>
                <boxGeometry args={[0.1, 0.06, 0.18]} />
                <meshStandardMaterial
                    color="#dc2626"
                    roughness={0.25}
                    metalness={0.05}
                    emissive={status === 'offline' ? '#000000' : '#dc2626'}
                    emissiveIntensity={status === 'offline' ? 0 : 0.3}
                />
            </mesh>
            {/* Switch bezel / recess */}
            <mesh position={[0.72, 0.1, 0]}>
                <boxGeometry args={[0.13, 0.02, 0.21]} />
                <meshStandardMaterial color="#e0dbd5" roughness={0.8} metalness={0.0} />
            </mesh>

            {/* Power cable — cylindrical exit on left end */}
            <mesh position={[-0.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.04, 0.04, 0.25, 8]} />
                <meshStandardMaterial color="#111111" roughness={0.85} metalness={0.05} />
            </mesh>
            {/* Strain relief bump */}
            <mesh position={[-0.82, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.055, 0.05, 0.06, 8]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.05} />
            </mesh>
        </group>
    );
};
