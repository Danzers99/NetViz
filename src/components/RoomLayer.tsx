import { useAppStore } from '../store';
import { RoomNode } from './RoomNode';

export const RoomLayer = () => {
    const rooms = useAppStore((state) => state.rooms);

    return (
        <group>
            {rooms.map((room) => (
                <RoomNode key={room.id} room={room} />
            ))}
        </group>
    );
};
