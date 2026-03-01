import type { ConfigData } from '../types';

const API_BASE = '/api/accounts';
const TOKEN = import.meta.env.VITE_ACCOUNTS_API_TOKEN || '';

function authHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (TOKEN) {
        headers['Authorization'] = `Bearer ${TOKEN}`;
    }
    return headers;
}

async function parseApiError(res: Response, fallback: string): Promise<string> {
    try {
        const body = await res.json();
        if (body?.message) return body.message;
        if (body?.error) return body.error;
    } catch { /* response wasn't JSON */ }
    return `${fallback} (HTTP ${res.status})`;
}

export interface AccountSearchResult {
    cakeId: string;
    name: string;
    deviceCount: number;
    lastEdited: string;
    lastEditedBy: string;
}

export async function searchAccounts(query: string): Promise<AccountSearchResult[]> {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Search failed'));
    const data = await res.json();
    return data.results;
}

export async function loadAccount(cakeId: string): Promise<{ cakeId: string; name: string; config: ConfigData }> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(cakeId)}`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Load failed'));
    return res.json();
}

export async function saveAccount(cakeId: string, config: ConfigData, name?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(cakeId)}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ config, name }),
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Save failed'));
}
