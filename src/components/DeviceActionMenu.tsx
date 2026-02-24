import { Html } from '@react-three/drei';
import type { Device } from '../types';
import { DeviceContextMenu } from './DeviceContextMenu';

interface DeviceActionMenuProps {
    device: Device;
    onClose: () => void;
}

export const DeviceActionMenu = ({ device, onClose }: DeviceActionMenuProps) => {
    return (
        <Html position={[0, 0.5, 0]} center zIndexRange={[100, 0]}>
            <DeviceContextMenu device={device} onClose={onClose} context="3d" />
        </Html>
    );
};
