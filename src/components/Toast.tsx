import { useEffect } from 'react';
import { useAppStore } from '../store';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export const Toast = () => {
    const notification = useAppStore((state) => state.notification);
    const setNotification = useAppStore((state) => state.setNotification);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification, setNotification]);

    if (!notification) return null;

    const bgColors = {
        error: 'bg-red-500',
        success: 'bg-green-500',
        info: 'bg-blue-500'
    };

    const icons = {
        error: AlertCircle,
        success: CheckCircle,
        info: Info
    };

    const Icon = icons[notification.type];

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 fade-in duration-300">
            <div className={`${bgColors[notification.type]} text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 min-w-[300px] justify-between`}>
                <div className="flex items-center gap-2">
                    <Icon size={20} />
                    <span className="font-medium">{notification.message}</span>
                </div>
                <button
                    onClick={() => setNotification(null)}
                    className="hover:bg-white/20 p-1 rounded-full transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};
