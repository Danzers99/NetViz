import { Cloud, CloudOff } from 'lucide-react';
import { useAppStore } from '../store';

type SyncStatus = 'synced' | 'modified' | 'never';

function useSyncStatus(): SyncStatus {
    const projectInfo = useAppStore((state) => state.projectInfo);
    const sessionChanges = useAppStore((state) => state.sessionChanges);

    if (!projectInfo.cakeId || !projectInfo.lastCloudSyncAt) {
        return 'never';
    }

    // If there are session changes, consider it modified since last sync
    if (sessionChanges.size > 0) {
        return 'modified';
    }

    return 'synced';
}

const statusConfig: Record<SyncStatus, { dot: string; label: string; text: string }> = {
    synced: {
        dot: 'bg-green-500',
        label: 'Synced',
        text: 'text-green-600 dark:text-green-400',
    },
    modified: {
        dot: 'bg-orange-500',
        label: 'Modified',
        text: 'text-orange-600 dark:text-orange-400',
    },
    never: {
        dot: 'bg-slate-400',
        label: 'Not synced',
        text: 'text-slate-500 dark:text-slate-400',
    },
};

export const CloudSyncIndicator = () => {
    const status = useSyncStatus();
    const config = statusConfig[status];

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg">
            {status === 'never' ? (
                <CloudOff size={14} className={config.text} />
            ) : (
                <Cloud size={14} className={config.text} />
            )}
            <div className="hidden md:flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                <span className={`text-[11px] font-medium ${config.text}`}>{config.label}</span>
            </div>
        </div>
    );
};
