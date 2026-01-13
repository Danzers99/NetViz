import { useEffect } from 'react';
import { useAppStore } from '../store';

export const CursorManager = () => {
    const isDraggingDevice = useAppStore((state) => state.isDraggingDevice);
    const isDraggingRoom = useAppStore((state) => state.isDraggingRoom);
    const hoveredElement = useAppStore((state) => state.hoveredElement);

    useEffect(() => {
        // Priority: Dragging > Hovering > Default
        if (isDraggingDevice || isDraggingRoom) {
            document.body.style.cursor = 'grabbing';
        } else if (hoveredElement) {
            if (hoveredElement.type === 'room') {
                document.body.style.cursor = 'move';
            } else {
                document.body.style.cursor = 'pointer';
            }
        } else {
            document.body.style.cursor = 'auto';
        }

        return () => {
            document.body.style.cursor = 'auto';
        };
    }, [isDraggingDevice, isDraggingRoom, hoveredElement]);

    return null;
};
