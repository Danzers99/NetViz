const STORAGE_KEY = 'netviz_support_mode';
const EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours

export function isSupportModeActive(): boolean {
    try {
        if (typeof localStorage === 'undefined') return false;
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (data.active && data.expiresAt > Date.now()) return true;
        // Expired — clean up
        localStorage.removeItem(STORAGE_KEY);
        return false;
    } catch {
        return false;
    }
}

export function getSupportModeExpiresAt(): number | null {
    try {
        if (typeof localStorage === 'undefined') return null;
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (data.active && data.expiresAt > Date.now()) return data.expiresAt;
        return null;
    } catch {
        return null;
    }
}

export function activateSupportMode(): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            active: true,
            expiresAt: Date.now() + EXPIRY_MS,
        }));
    } catch {
        // localStorage unavailable
    }
}

export function deactivateSupportMode(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // localStorage unavailable
    }
}

export async function unlockSupportMode(code: string): Promise<boolean> {
    const res = await fetch('/support/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.ok === true;
}
