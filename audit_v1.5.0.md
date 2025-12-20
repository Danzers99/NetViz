# NetViz v1.5.0 Full System Audit (Pre-v2.0)

**Date:** 2025-12-20
**Version:** v1.5.0
**Auditor:** Constant (Agentic AI)

--------------------------------
A. System Overview (Current State)
--------------------------------
NetViz v1.5.0 is a stable, functional logical network simulator with a 3D visualization layer. The system correctly models the "invisible" logic of networking (power, data links, upstream connectivity) while providing a simplified drag-and-drop sandbox for users.

**Capabilities:**
*   **Setup Wizard:** A clean, guided flow for defining device counts (POS, Printers, KDS) that automatically calculates necessary infrastructure (Modems, Switches, Power).
*   **Sandbox:** A 3D environment where devices can be moved, and ports can be physically connected via virtual cables.
*   **Simulation Logic:** An impressive "always-on" simulation loop that correctly propagates Power (Outlet -> Cable -> Device) and Data (Link Status + Upstream Internet checks).
*   **Device Fidelity:** Differentiates between specific hardware types (e.g., Datto AP440 vs AP62, different POS terminals) with distinct port configurations.

--------------------------------
B. Correctness & Realism Audit
--------------------------------
The simulation rules are high-quality but contain specific constraints.

**Findings:**
*   **Power Propagation (Critical Strength):** The logic correctly models power dependency. Devices plug into outlets, and active PoE logic is present (APs require PoE source). This matches real-world troubleshooting needs well.
*   **Connectivity Logic (Acceptable Simplification):** The concept of "Connection" is purely physical (Port A <-> Port B) + Topological. The system uses a Breadth-First Search (BFS/DFS) to determine "Online" status. It correctly identifies if a device has a path to the Router/ISP.
    *   *Note:* It allows "passive" connections (switches don't need configuration, just power). This is acceptable for unmanaged networks.
*   **Validation Rules (Strict):** The `validation.ts` layer adds guardrails that the simulation permits. For example, you *can* physically connect a Router WAN to a Switch (simulation says "Link Up"), but the Validation engine correctly flags "Router WAN misuse". This separation of active physics vs. rule enforcement is excellent.
*   **Impossible States:** It is currently impossible to model "Partial Power" (e.g., brownouts) or "VLAN misconfiguration" (since VLANs don't exist in the data model). These are acceptable omissions for v1.5.

--------------------------------
C. UX & Mental Model Audit
--------------------------------
**Strengths:**
*   **Auto-Infrastructure:** The wizard's ability to say "You have 5 terminals, here is a 8-port switch" teaches the user that infrastructure is a *consequence* of endpoints, which is the correct mental model for POS sales.
*   **Feedback:** The "Validation Issues" sidebar is immediate and actionable.

**Weaknesses:**
*   **Missing Project Metadata:** There is no "Project Name" field in the Wizard or persistence layer. Saved files are anonymous/timestamped, making file management difficult for users.
*   **Hidden Complexity:** The "Auto-Added" devices (Modem, Router) appear in the sandbox with pre-determined connections (or lack thereof). Users might not understand *why* a router appeared if they didn't explicitly ask, though this is generally helpful for the target audience.

--------------------------------
D. Architecture & Data Model Readiness
--------------------------------
**Data Model:**
*   `Device`: Uses a flat `Device` interface with a `type` string union.
*   `Positioning`: Currently uses `[x, y, z]` coordinates. This is sufficient for the sandbox but **insufficient** for v2.0 spatial features. There is no concept of "Parent Container" (e.g., Rack, Wall, Table) or "Zones" (Kitchen, Bar).
*   `Cables`: Represented implicitly via `port.connectedTo`. There is no "Cable" entity with length, color, or type (Cat5e vs Cat6).

**Constraints:**
*   **Hardcoded Device Logic:** The `validation.ts` and `store.ts` (`generatePorts`) rely on extensive switch-case statements and array includes (e.g., `isSwitch = type => [...]`). This is **brittle**. Adding a new device requires touching 3-4 files.
*   **Coupling:** The simulation loop is tightly coupled to the store actions.

--------------------------------
E. Performance & Complexity
--------------------------------
**Rendering:**
*   Uses React Three Fiber. Performance is currently acceptable for typical restaurant networks (<50 devices).

**Update Frequency:**
*   **Bottleneck Risk:** The simulation (`propagatePowerState` + `validateNetwork`) runs entirely on *every single state change* (move, connect, disconnect).
*   `validateNetwork` performs multiple graph traversals (cycle detection is $O(V+E)$).
*   **Scaling:** For v1.5 (Restaurant scale), this is fine. For v2.0 (if larger venues are supported), this immediate-mode re-simulation will cause UI lag.

--------------------------------
F. Stability & Regression Risk
--------------------------------
*   **High Risk:** The `DeviceType` string union is the fragile spine of the system. Renaming a device type (e.g., `managed-switch` to `switch-managed`) would silently break validation rules that rely on string matching.
*   **Low Risk:** The core state management (Zustand) is simple and robust.

--------------------------------
G. v2.0 Readiness Summary
--------------------------------
**1) Solid Foundations:**
*   The **Simulation Loop** (Power -> Link -> Connection) is a gold standard feature that should be preserved intact.
*   The **Validation Rule Engine** structure is excellent.

**2) Cleanup Required (Before v2.0):**
*   **Refactor Device Definitions:** Move away from hardcoded `switch` statements to a strict `DeviceDefinition` config object (defining ports, roles, power needs) to make adding v2.0 hardware safer.
*   **Project Metadata:** Add a `ProjectInfo` object to the `ConfigData` (Name, SiteID, Author).

**3) Breakage Risks for Spatial Features:**
*   **Collision/Mounting:** The current `position: [x,0,z]` assumes everything sits on the floor. v2.0 Layout Builder will likely require 2D walls and 3D mounting heights. The current model has no schema for "Device A is attached to Wall B".
*   **Cable Routing:** Current cables are straight lines. v2.0 routing requires "Waypoints" or "Path Geometry". The current implicit `connectedTo` model cannot store this data.

--------------------------------
H. Final Verdict
--------------------------------
**Overall System Maturity:** 7/10

**Primary Strength:** High-fidelity "invisible" logic (Power/Network simulation) ensures plans are electrically and logically valid, not just pretty pictures.

**Primary Risk:** Technical debt in the "Device Type" string matching. If not refactored to a configuration-driven model, adding v2.0's expanded catalog will create a maintenance nightmare.

**Recommendation:** Proceed with v2.0, but **Prioritize Data Model Refactoring** (Device Definitions & Project Meta) before starting Layout Builder work.
