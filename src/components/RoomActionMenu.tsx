import { useState } from 'react';
import { Html } from '@react-three/drei';
import { useAppStore } from '../store';
import type { Room } from '../types';
import { Save, Trash2, X } from 'lucide-react';

interface RoomActionMenuProps {
    room: Room;
    onClose: () => void;
}

export const RoomActionMenu = ({ room, onClose }: RoomActionMenuProps) => {
    const updateRoom = useAppStore((state) => state.updateRoom);
    const removeRoom = useAppStore((state) => state.removeRoom);

    const [width, setWidth] = useState(room.width);
    const [height, setHeight] = useState(room.height);

    const handleSave = () => {
        updateRoom(room.id, {
            width: Number(width),
            height: Number(height)
        });
        onClose();
    };

    const handleDelete = () => {
        removeRoom(room.id);
        onClose();
    };

    return (
        <Html position={[0, 0.5, 0]} center zIndexRange={[100, 0]}>
            <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded shadow-xl flex flex-col min-w-[200px] overflow-hidden text-sm"
                onPointerDown={(e) => e.stopPropagation()} // Prevent click-through to scene
            >
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                    <span className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {room.name}
                    </span>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={14} />
                    </button>
                </div>

                <div className="p-3 space-y-3">
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Width (X)</label>
                        <input
                            type="number"
                            min="1"
                            step="0.5"
                            value={width}
                            onChange={(e) => setWidth(Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Length (Z)</label>
                        <input
                            type="number"
                            min="1"
                            step="0.5"
                            value={height}
                            onChange={(e) => setHeight(Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-2 flex gap-2">
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded py-1 text-xs flex items-center justify-center gap-1 transition-colors"
                    >
                        <Save size={14} /> Save
                    </button>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700">
                    <button
                        onClick={handleDelete}
                        className="w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 text-red-500 dark:text-red-400 font-medium text-xs"
                    >
                        <Trash2 size={14} />
                        Remove Room
                    </button>
                </div>
            </div>
        </Html>
    );
};
