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
 * Half-extent of a device in world space (X/Z plane).
 * Applied as an inset on each edge so the device body stays fully within the grid,
 * rather than letting the origin sit at the boundary with half the mesh hanging outside.
 */
export const DEVICE_HALF_EXTENT = 0.5;
