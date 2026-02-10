/**
 * Centralized controls registry.
 * Single source of truth for all user-facing controls.
 *
 * RULE: If you add a new keybinding or interaction anywhere in the app,
 * you MUST add it here. The ControlsPanel renders directly from this data.
 */

export type ControlCategory = 'Navigation' | 'Selection' | 'Build' | 'Trace' | 'Display';

export interface ControlEntry {
    input: string;        // e.g. "WASD" or "Scroll"
    action: string;       // e.g. "Move camera"
    category: ControlCategory;
    scope?: 'sandbox' | 'layout' | 'global'; // default: 'sandbox'
    condition?: 'layoutMode' | '!layoutMode' | 'always'; // when visible in panel
}

/**
 * The canonical controls list. ControlsPanel.tsx reads this directly.
 * Grouped by category for rendering.
 */
export const CONTROLS_MAP: ControlEntry[] = [
    // ── Navigation ──
    { input: 'W A S D', action: 'Move camera', category: 'Navigation' },
    { input: 'Q / E', action: 'Lower / Raise camera', category: 'Navigation' },
    { input: 'Left Drag', action: 'Orbit camera', category: 'Navigation' },
    { input: 'Right Drag', action: 'Pan camera', category: 'Navigation' },
    { input: 'Scroll', action: 'Zoom in / out', category: 'Navigation' },

    // ── Selection ──
    { input: 'Click', action: 'Select device', category: 'Selection' },
    { input: 'Shift + Click', action: 'Multi-select devices', category: 'Selection' },
    { input: 'Right Click', action: 'Device action menu', category: 'Selection' },
    { input: 'ESC', action: 'Deselect / clear trace', category: 'Selection' },

    // ── Build (Sandbox only) ──
    { input: 'Click port', action: 'Select port to connect', category: 'Build', condition: '!layoutMode' },
    { input: 'Right Click port', action: 'Disconnect cable', category: 'Build', condition: '!layoutMode' },
    { input: 'Drag device', action: 'Move device', category: 'Build' },

    // ── Layout mode ──
    { input: 'Drag edge', action: 'Resize room', category: 'Build', condition: 'layoutMode' },

    // ── Display ──
    { input: 'N', action: 'Toggle device names', category: 'Display' },
    { input: 'Shift + R', action: 'Toggle room names', category: 'Display' },

    // ── Trace ──
    { input: 'Right Click → Trace', action: 'Trace path to internet', category: 'Trace' },
    { input: 'ESC', action: 'Clear active trace', category: 'Trace' },
];

/**
 * Returns controls filtered by current layout mode.
 */
export function getVisibleControls(layoutMode: boolean): ControlEntry[] {
    return CONTROLS_MAP.filter(c => {
        if (!c.condition || c.condition === 'always') return true;
        if (c.condition === 'layoutMode') return layoutMode;
        if (c.condition === '!layoutMode') return !layoutMode;
        return true;
    });
}

/**
 * Returns controls grouped by category, in display order.
 */
export function getGroupedControls(layoutMode: boolean): Map<ControlCategory, ControlEntry[]> {
    const visible = getVisibleControls(layoutMode);
    const groups = new Map<ControlCategory, ControlEntry[]>();
    const order: ControlCategory[] = ['Navigation', 'Selection', 'Build', 'Display', 'Trace'];

    for (const cat of order) {
        const items = visible.filter(c => c.category === cat);
        if (items.length > 0) {
            groups.set(cat, items);
        }
    }

    return groups;
}
