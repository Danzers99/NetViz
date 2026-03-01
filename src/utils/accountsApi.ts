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
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const data = await res.json();
    return data.results;
}

export async function loadAccount(cakeId: string): Promise<{ cakeId: string; name: string; config: ConfigData }> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(cakeId)}`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Load failed: ${res.status}`);
    return res.json();
}

export async function saveAccount(cakeId: string, config: ConfigData): Promise<void> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(cakeId)}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ config }),
    });
    if (!res.ok) throw new Error(`Save failed: ${res.status}`);
}
