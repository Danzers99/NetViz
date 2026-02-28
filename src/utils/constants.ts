/**
 * Simulation grid bounds (world space).
 *
 * The grid extends from -GRID_HALF_SIZE to +GRID_HALF_SIZE on both X and Z axes.
 * Keep this as the single source of truth — ViewportClamp and DeviceNode both reference it.
 */
export const GRID_HALF_SIZE = 20;

export const SIM_MIN_X = -GRID_HALF_SIZE;
export const SIM_MAX_X = GRID_HALF_SIZE;
export const SIM_MIN_Z = -GRID_HALF_SIZE;
export const SIM_MAX_Z = GRID_HALF_SIZE;

/**
 * Device drag boundary half-size.
 *
 * The visible viewport extends VIEWPORT_MARGIN (5) units beyond the base
 * GRID_HALF_SIZE (see ViewportClamp). We allow device origins up to 1 grid
 * unit inside that visible edge, giving an effective drag range of ±24.
 */
export const VIEWPORT_MARGIN = 5;
export const DRAG_BOUND_HALF_SIZE = GRID_HALF_SIZE + VIEWPORT_MARGIN - 1; // 24
