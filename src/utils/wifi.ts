import type { DeviceType } from '../types';

export const isWifiCapable = (type: DeviceType): boolean => {
    return ['kds', 'elo-kds', 'cakepop', 'orderpad'].includes(type);
};
