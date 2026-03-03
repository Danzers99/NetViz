import type { DeviceType } from '../types';

export const isWifiCapable = (type: DeviceType): boolean => {
    return ['kds', 'kiosk', 'elo-kds', 'cakepop', 'orderpad'].includes(type);
};
