# NetViz v1.5.0 Usability Audit

## 1. What NetViz Is
NetViz is a specialized network simulator for POS support agents to visualize, plan, and troubleshoot restaurant network topologies. It enforces strict validated "electricity + data" logic while allowing users to build layouts via a drag-and-drop 3D sandbox.

## 2. First-Run Experience Audit
**Top 5 Confusions / Missing Cues:**
1.  **Jargon Overload**: The landing page subtitle "Design, visualize, and simulate your detailed network topology" is too dry. It doesn't tell me *why* I'm here (e.g., "Recreate a merchant's network to troubleshoot connection issues").
2.  **"Project Metadata"**: In the first wizard step, the title "Project Metadata" is developer-speak. Users think in terms of "Site Name" or "Ticket #".
3.  **No "Quick Start"**: There is no way to just "open a blank sandbox" without going through the wizard or loading a file. A "Skip Wizard" option is missing for power users.
4.  **Invisible Controls**: The "Load Configuration" button implies I should have a `.json` file, but there are no cues on *where* to get those files (e.g., "Exported from NetViz").
5.  **Visual Boredom**: The grey/white card design is clean but uninviting. It lacks a visual "hero" or preview of what the tool actually *does* (the 3D sandbox) until you finish the wizard.

## 3. Wizard Audit
**Friction Points:**
1.  **Internal Device Names**: `StepPOS` uses labels like "V3 POS" and "V4 POS". If agents know these by physical appearance (e.g., "15-inch Touch" or "Glossy White"), these labels force them to guess.
2.  **Raw Data Leaks**: In `StepReview`, the breakdown list shows raw variable manipulation like `k.replace('-pos', '')`. Seeing "poindus" (lowercase) instead of "Poindus POS" feels unpolished.
3.  **Quantity Fatigue**: If a site has 0 of a certain device (common), the user still visually scans 4 different POS types. Grouping or "Add Device" flows might be better than static counters for everything.

**Clarity Improvements:**
1.  **"Auto-Added" Explanation**: The `StepReview` explanation for switches/outlets is excellent. **Improvement**: Add a sentence explicitly stating "We've added these based on your port count requirements."
2.  **ISP assumption**: The note "The ISP modem... is assumed to always be powered on" is great. **Improvement**: Move this to `Step 0` or the very first Sandbox tooltip, as users might forget it by the time they finish the wizard.
3.  **Review Validation**: The red error "Please select at least one device" (`StepReview.tsx`) is good, but the "Create Sandbox" button should perhaps be disabled *and* grayed out with a tooltip explaining why, rather than just doing nothing or showing a banner only after a failed click.

**Prevent Surprise:**
1.  **"Router & Modem: 1 Each"**: The wizard forces a Router/Modem. **Improvement**: Add a small checkbox in `StepLocation` for "Existing Network?" (which might skip auto-adding router/modem), though v1.5 constraint says "No code changes", so a simple text warning "Standard ISP + Router kit will be included" is sufficient.
2.  **Cabling Assumptions**: Users might assume cables connect automatically. Add text in `StepReview`: "Devices will appear unconnected in the Sandbox. You must wire them manually."

## 4. Sandbox Audit
**Confident Mistakes:**
1.  **Black-on-Black Ports**: The `Power Inlet` port is colored `#000000` (`PortNode.tsx`). If a device body is dark grey/black, this port is invisible, leading users to think the device is passive (no power needed).
2.  **Drag vs. Pan**: The controls say "Left Click + Drag to Rotate" and "Drag devices to move". These conflicts often lead to users accidently flinging devices when they meant to rotate the camera.
3.  **Invisible/Implicit Connections**: Connecting a cable is done by clicking two ports. If I click Port A, there is no visual "cable following mouse" (based on code analysis). I might confidently click Port A, get distracted, click Port B 10 seconds later, and accidentally create a link.

**High Impact, Small Changes:**
1.  **Cursor States**: Force `cursor: crosshair` when a port is selected to indicate "Targeting Mode" for the second click.
2.  **Port Tooltips**: `PortNode.tsx` currently only shows `role.toUpperCase()` (e.g., "POE_SOURCE"). **Fix**: Map these to human text ("PoE Out", "Power In", "Internet/WAN").
3.  **"Ghost" Device Names**: In `DeviceNode.tsx`, the name is always visible above the device. **Improvement**: Scale this based on distance or hide when not hovered to reduce clutter in dense updates.

**Validation Clarity:**
1.  **Actionability**: The error "Network loop detected" is scary but vague on *where*. The `deviceIds` are highlighted, but a "Show Me" button (focus camera) would be huge. (Out of scope for "no code", but valid finding).
2.  **Instructional Error**: The error `router-wan-wrong-modem-port` is simpler ("Connect to LAN, not WAN"). This is slightly confusing phrasing. Better: "Connect Router WAN -> Modem LAN".

## 5. Save/Load Audit
**Improvements:**
1.  **Filename Context**: Currently, the system likely saves as `config.json` or similar. **Fix**: Pre-fill the filename with `[LocationName]_[Date].json` using the `projectInfo` generated in the wizard.
2.  **Dirty State**: There is no "Unsaved Changes" indicator. If I move a cable and close the tab, I lose work. A simple `window.onbeforeunload` confirmation is a "Tiny" effort fix.
3.  **Load Error handling**: If a JSON is malformed, does it silent fail? (Code suggests basic `JSON.parse`). **Fix**: A specific alert "This file is not a valid NetViz configuration" is needed.

## 6. Clarity Fixes Ranked

| Rank | Change | Why it matters | Effort | Impact |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Rename "Project Metadata" to "Site Details"** | "Metadata" is confusing jargon for support agents. | Tiny | Medium |
| 2 | **Change Port Colors (Power = Yellow/Red, not Black)** | Black power ports are invisible on dark devices; users can't find where to plug in power. | Tiny | **High** |
| 3 | **Humanize Port Roles** (`POE_SOURCE` -> `PoE Out`) | `POE_SOURCE` looks like a debug database key, not a UI label. | Tiny | Medium |
| 4 | **Add "You must wire devices manually" to Wizard** | sets expectations that the "Simulation" requires manual labor. | Tiny | Medium |
| 5 | **Pre-fill Filename with Location Name** | Users currently lose track of which JSON file belongs to which ticket. | Small | **High** |
| 6 | **Add `cursor: crosshair` when port selected** | Users connect wrong ports because they forget they are in "Connection Mode". | Tiny | Medium |
| 7 | **Fix "Poindus" capitalization in Review** | `k.replace` logic looks broken/amateurish in the final review step. | Tiny | Low |
| 8 | **Clarify "V3/V4" with Model Numbers** | "V3" is ambiguous. "V3 (TP-650)" is specific. | Tiny | Medium |
| 9 | **Add "Unsaved Changes" browser prompt** | Prevents accidental data loss when closing tab. | Small | **High** |
| 10 | **Color Code "Controls" Text** | Make "Left Click" and "Right Click" bold/colored in the help box to make them skimmable. | Tiny | Low |

## 7. Final Verdict

*   **Clarity Score**: **6/10** (Strong logical core, but jargon-heavy and assumes technical mastery).
*   **Training Readiness**: **7/10** (Excellent for teaching "Power + Data" rules, but friction in setup dampens the learning curve).
*   **Highest Impact Change**: **Change the color of Power Input ports from Black to Yellow/White.** (Currently, users literally cannot see where to plug in the most critical cable).
