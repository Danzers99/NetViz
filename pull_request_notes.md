# WASD Navigation for Sandbox Camera

## Changes
- Added `WasdControls` component to handle keyboard navigation (W, A, S, D, Q, E).
- Integrated `WasdControls` into `Sandbox` canvas.
- Updated controls help text in Sandbox UI.

## Implementation Details

### Movement Logic
- W/S: Moves camera forward/backward along the camera's facing direction (projected to horizontal plane).
- A/D: Moves camera left/right (strafing).
- Q/E: Moves camera down/up (World Y axis).
- Movement is applied to both the `camera.position` and `OrbitControls.target` to ensure the orbit pivot moves with the camera (panning), maintaining smooth orbit behavior after movement.

### Safety Guards (Gating)
Keyboard input is IGNORED if:
1. **User is typing**: `document.activeElement` is an `<input>` or `<textarea>`.
2. **Not in Sandbox**: `step !== 'sandbox'` (e.g. Wizard or Settings).
3. **Dragging a device**: `isDraggingDevice` is true.
4. **Connecting ports**: `selectedPortId` is not null (Port selection mode).
5. **Properties Panel is open**: `propertiesPanelDeviceId` is not null.

### Performance
- Uses `useFrame` loop for smooth movement updates.
- Uses `useRef` for key state tracking to avoid re-renders.
- Event listeners are passive and lightweight.

## Validation Confirmed
- [x] Mouse-only navigation works exactly as before.
- [x] WASD moves camera smoothly in sandbox.
- [x] WASD does nothing in input fields.
- [x] WASD does nothing when properties panel is open.
- [x] WASD does nothing when dragging devices.
- [x] WASD does nothing when connecting ports.
