import { useAppStore } from '../store';
import { useEffect, useState } from 'react';

export const RuntimeNotifications = () => {
    const devices = useAppStore((state) => state.devices);
    const [alerts, setAlerts] = useState<string[]>([]);

    useEffect(() => {
        const newAlerts: string[] = [];

        // Critical Infrastructure Check
        devices.forEach(device => {
            if (device.type === 'managed-switch' || device.type === 'unmanaged-switch' || device.type === 'zyxel-router' || device.type === 'isp-modem') {
                if (device.status === 'offline') {
                    newAlerts.push(`CRITICAL: ${device.name} is Offline!`);
                }
            }
        });

        // General Stats
        const offlineCount = devices.filter(d => d.status === 'offline').length;
        if (offlineCount > 0 && newAlerts.length === 0) {
            newAlerts.push(`${offlineCount} devices are offline.`);
        }

        setAlerts(newAlerts);
    }, [devices]);

    if (alerts.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 pointer-events-none">
            {alerts.map((alert, index) => (
                <div key={index} className="bg-red-500/90 text-white px-4 py-3 rounded shadow-lg border border-red-400 backdrop-blur-sm animate-fade-in flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <span className="font-semibold text-sm">{alert}</span>
                </div>
            ))}
        </div>
    );
};
