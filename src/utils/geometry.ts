import type { Room } from '../types';

/**
 * Checks if a point (x, z) is inside a room.
 * Assumes room x,y are Center coordinates.
 */
export const isPointInRoom = (x: number, z: number, room: Room): boolean => {
    const halfW = room.width / 2;
    const halfH = room.height / 2;

    // Room.y is mapped to 3D Z
    return (
        x >= room.x - halfW &&
        x <= room.x + halfW &&
        z >= room.y - halfH &&
        z <= room.y + halfH
    );
};

/**
 * Finds the first room containing the point (x, z).
 */
export const getRoomAt = (x: number, z: number, rooms: Room[]): Room | null => {
    for (const room of rooms) {
        if (isPointInRoom(x, z, room)) {
            return room;
        }
    }
    return null;
};
