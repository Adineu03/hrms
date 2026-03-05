# HRMS User Journey Diagram — 19 Phase Prompts

## How to Use This File

Each phase below is a **self-contained prompt**. Copy-paste the entire prompt into a **new Claude Code chat session**. That chat will:

1. Read the specified sheet from the Excel file using a sub-agent
2. Parse every single feature (standard + AI) for every role (Employee, Manager, Admin/HR)
3. Generate an animated HTML+SVG+CSS user journey diagram
4. Save it as a standalone `.html` file you can open in any browser

**Rules:**
- One phase = one sheet = one prompt = one new chat
- Every feature in the sheet MUST appear in the diagram — nothing skipped
- You can run multiple chats in parallel (they are fully independent)
- Output files go to: `c:\Users\Aditya\work\HRMS\diagrams\`

---

## PHASE 1 — Cold Start & Setup

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Cold Start & Setup". Parse every single row. The sheet structure is:
- Column A: Role headers (Employee, Manager, Admin / HR) and section headers (STANDARD FEATURES, AI-POWERED FEATURES, — ADDITIONAL FEATURES —)
- Column B: Feature group names (e.g., "Accept Invitation & Onboard", "Setup Wizard — Company Profile")
- Column C: Individual feature bullet points (e.g., "• Receive welcome email with secure one-time login link")

Extract ALL data — every role, every feature group, every bullet point, every AI feature. Nothing can be skipped. Count them and confirm the count matches the sheet.

## Step 2: Understand the Diagram Structure

Create a User Journey Diagram with these characteristics:

### CRITICAL LAYOUT RULES

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: The entire diagram MUST be visible without any scrolling (horizontal or vertical). Use the full browser viewport (100vw × 100vh). The SVG must use a `viewBox` that auto-scales to fit all content within the viewport. Add CSS: `html, body { margin: 0; overflow: hidden; }` and the SVG/container must be `width: 100vw; height: 100vh;`. If content is dense, make nodes smaller and use smarter layout — but NEVER require scrolling. The user must see the COMPLETE diagram the moment the page loads.

2. **ARROWS MUST NEVER OVERLAP NODES**: Arrows must NEVER pass through, overlap, or touch any node box. All arrows must route AROUND nodes — use orthogonal routing (horizontal and vertical segments only) with clear padding/clearance (minimum 15px gap) from any node boundary. If an arrow needs to get from Point A to Point B but there's a node in the way, the arrow must go around it (above, below, or to the side). This is NON-NEGOTIABLE.

3. **MINIMAL ARROWS**: Only draw the PRIMARY flow arrows — the essential approval chains and data flows between roles. Do NOT draw an arrow for every possible connection. Typically 5-8 cross-lane arrows per diagram is sufficient. Within a lane, use simple small connector arrows or just left-to-right proximity to imply sequence — don't connect every node to every other node with an arrow.

### Layout: Horizontal Swim Lanes
- **3 horizontal swim lanes** stacked vertically, one per role:
  - Top lane: **Employee** (color: #E3F2FD blue background)
  - Middle lane: **Manager** (color: #FFF3E0 orange background)
  - Bottom lane: **Admin / HR** (color: #F3E5F5 purple background)
- Each lane has a bold role label on the left side
- Within each lane, features flow left-to-right in logical journey order
- Lanes should divide the viewport height roughly equally (each ~30% of viewport, with header/legend taking ~10%)

### Nodes (Feature Groups) — COMPACT BY DEFAULT
- Each **feature group** (Column B value) becomes a **rounded rectangle node**
- **Default state: COMPACT** — show ONLY the feature group title (no bullet points visible). This is how everything fits in one screen.
- Standard feature nodes: solid border, white fill
- AI-powered feature nodes: gradient fill with a subtle sparkle/AI icon (✦), dashed border
- Nodes should be compact: ~160-220px wide, ~40-60px tall in default state
- Nodes arranged in a grid or flowing layout within each lane to use space efficiently
- Feature groups with many sub-features should show a small count badge (e.g., "7 features") next to the title

### Bullet Points — ON INTERACTION ONLY
- ALL bullet points (Column C) are stored in the HTML data attributes of each node
- On **hover**: node expands slightly with a subtle grow animation and shows a tooltip/popover with ALL bullet points in a scrollable list
- On **click**: opens a modal/overlay panel showing the feature group title + ALL bullet points in a well-formatted readable list
- This way EVERY feature is present in the diagram (nothing skipped) but the diagram stays clean and fits in one viewport

### Arrows & Flow Lines
- **Within a lane**: Simple small connector arrows (thin, subtle, gray) between adjacent nodes to show left-to-right journey sequence. These should be minimal — just enough to show flow direction.
- **Cross-lane arrows** (the important ones): Thicker, colored arrows showing approval chains and data flows between roles:
  - Employee submits → Manager approves
  - Admin configures → Employee/Manager sees result
  - AI features connect to the standard features they enhance (thin dotted arrows)
- Arrow colors: match the SOURCE lane color (blue from Employee, orange from Manager, purple from Admin)
- **ROUTING**: All arrows use orthogonal paths (right angles only) and route AROUND nodes with clear clearance. Use waypoints if needed. Arrows should enter/exit nodes from the sides (left/right) or top/bottom — never through the middle of another node.
- **ARROW COUNT**: Keep cross-lane arrows to 5-8 maximum. Only show the most important flows.

### Animation (CSS)
- **Flowing dots on cross-lane arrows ONLY**: Small circles (5px) that travel along each cross-lane arrow path continuously using CSS animation
  - Dot color matches arrow color
  - Animation duration: 3s per arrow, infinite loop
  - Use SVG `<animateMotion>` along arrow `<path>` elements
- **Node entrance**: Nodes fade-in with a subtle scale-up on page load (staggered, 50ms delay per node)
- **Hover effect on nodes**: On hover, node elevates slightly (box-shadow increases) and shows the bullet point popover
- **Pulsing glow on AI nodes**: AI-powered feature nodes have a subtle pulsing border glow animation (2s cycle)
- Within-lane connector arrows: NO animation (they are subtle/static to keep visual noise low)

### Header & Legend
- **Compact header** at top: Title "Module 1: Cold Start & Setup — User Journey Map" + subtitle "AI-Native HRMS" on same line
- **Inline legend** (horizontal, not stacked): Standard node | AI node | Approval arrow | Data flow arrow — all in one row, compact
- The header + legend should take no more than 60px of vertical space

### Interactivity
- **Hover on node**: Shows tooltip/popover with ALL bullet points for that feature group
- **Click on node**: Opens a modal overlay with full details (title + all bullets in a scrollable panel). Click outside or press Escape to close.
- A toggle button (top-right corner): "Highlight AI" — dims non-AI nodes to 40% opacity and brightens AI nodes with glowing border
- Optional: a small "Zoom +" / "Zoom -" control in the corner for users who want to zoom into a section (but default view MUST show everything)

### Quality Standards
- The diagram must be PROFESSIONAL — think enterprise software documentation / investor deck quality
- Clean typography: Use system fonts (Inter, -apple-system, Segoe UI, sans-serif)
- Proper spacing: nodes MUST NOT overlap, arrows MUST NOT cross nodes
- Fits in one viewport: 100vw × 100vh, no scrollbars
- The HTML file must be 100% self-contained: all CSS and JS inline, no external dependencies
- Total: EVERY feature from the sheet must be present (in node data attributes and shown on hover/click). Verify by counting features after extraction and confirming all appear in the output.

## Step 3: Create the Output

1. Create the directory if it doesn't exist: c:\Users\Aditya\work\HRMS\diagrams\
2. Save the file as: c:\Users\Aditya\work\HRMS\diagrams\phase-01-cold-start-setup.html
3. After creating the file, open it and verify it renders correctly by reading back the first 100 lines to confirm structure.

## Important Reminders
- Do NOT skip any features. Every bullet point in the Excel sheet must be accessible via hover/click on its parent node.
- The ADDITIONAL FEATURES section (if present) should appear as a separate sub-section within the relevant role's lane, visually distinct with a different border style (e.g., dotted border or slightly different background tint).
- If the sheet has features that clearly flow between roles (e.g., Admin sets up → Employee sees), create cross-lane arrows for those relationships — but keep to 5-8 max.
- Use your judgment for the left-to-right ordering of feature groups — it should follow a logical user journey sequence (setup → configure → use → review).
- TEST that the final HTML loads in a browser with NO scrollbars and ALL content visible.
```

---

## PHASE 2 — Core HR & People Data

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Core HR & People Data". Parse every single row. The sheet structure is:
- Column A: Role headers (Employee, Manager, Admin / HR) and section headers (STANDARD FEATURES, AI-POWERED FEATURES, — ADDITIONAL FEATURES —)
- Column B: Feature group names (e.g., "My Profile", "Document Vault", "Employee Master Data")
- Column C: Individual feature bullet points

Extract ALL data — every role, every feature group, every bullet point, every AI feature. Nothing can be skipped. Count them and confirm the count matches the sheet.

## Step 2: Understand the Diagram Structure

Create a User Journey Diagram with these characteristics:

### CRITICAL LAYOUT RULES

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: The entire diagram MUST be visible without any scrolling (horizontal or vertical). Use the full browser viewport (100vw × 100vh). The SVG must use a `viewBox` that auto-scales to fit all content within the viewport. Add CSS: `html, body { margin: 0; overflow: hidden; }` and the SVG/container must be `width: 100vw; height: 100vh;`. If content is dense, make nodes smaller and use smarter layout — but NEVER require scrolling.

2. **ARROWS MUST NEVER OVERLAP NODES**: Arrows must NEVER pass through, overlap, or touch any node box. All arrows must route AROUND nodes — use orthogonal routing (horizontal and vertical segments only) with clear padding/clearance (minimum 15px gap) from any node boundary. If an arrow needs to get from Point A to Point B but there's a node in the way, the arrow must go around it. NON-NEGOTIABLE.

3. **MINIMAL ARROWS**: Only draw the PRIMARY flow arrows — 5-8 cross-lane arrows max. Within a lane, use simple small connector arrows or left-to-right proximity to imply sequence.

### Layout: Horizontal Swim Lanes
- **3 horizontal swim lanes** stacked vertically:
  - Top: **Employee** (#E3F2FD blue), Middle: **Manager** (#FFF3E0 orange), Bottom: **Admin / HR** (#F3E5F5 purple)
- Each lane ~30% viewport height, header/legend ~10%
- Features flow left-to-right within each lane

### Nodes — COMPACT BY DEFAULT
- Each feature group → rounded rectangle showing ONLY the title (no bullets visible by default)
- Standard: solid border, white fill | AI: gradient fill, ✦ icon, dashed border
- Size: ~160-220px wide, ~40-60px tall | Count badge for sub-features
- Bullet points appear ONLY on hover (tooltip) or click (modal)

### Arrows & Flow Lines
- Within-lane: thin subtle gray connectors, minimal
- Cross-lane (5-8 max): thicker colored arrows with orthogonal routing AROUND nodes
  - Employee submits request → Manager approves
  - Employee updates profile → Admin sees in master data
  - Admin configures benefits → Employee enrolls
  - Manager proposes org changes → Admin approves
- Arrow colors match SOURCE lane | AI dotted arrows (thin)
- ROUTING: orthogonal paths, 15px clearance from all nodes, enter/exit from sides or top/bottom only

### Animation
- Flowing dots (5px) on cross-lane arrows ONLY: SVG `<animateMotion>`, 3s cycle, infinite
- Node entrance: fade-in + scale-up, staggered 50ms
- Hover: elevation + popover | AI nodes: pulsing glow 2s
- Within-lane arrows: NO animation (static, subtle)

### Header & Legend
- Compact single-line: "Module 2: Core HR & People Data — User Journey Map" | "AI-Native HRMS"
- Inline legend (horizontal): Standard | AI | Approval arrow | Data flow — max 60px height

### Interactivity
- Hover → tooltip with ALL bullet points | Click → modal with full details
- "Highlight AI" toggle (top-right) | Optional zoom controls
- Escape or click-outside closes modal

### Quality Standards
- Professional enterprise quality, clean typography (Inter, system fonts)
- NO overlapping nodes, NO arrows crossing nodes, NO scrollbars
- 100vw × 100vh viewport fit, 100% self-contained HTML
- EVERY feature accessible via hover/click. Verify count.

## Step 3: Create the Output

1. Create directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-02-core-hr-people-data.html
3. Verify structure.

## Important Reminders
- Do NOT skip any features. ALL bullets accessible via hover/click on parent node.
- ADDITIONAL FEATURES section (Contractor Self-Service, Multi-Language, Blended Workforce, Org Modeling, Multi-Entity, Contractor Lifecycle, Custom Field Engine, Smart Entity Setup) — include as visually distinct sub-section nodes.
- This module has HEAVY cross-role interactions but keep arrows to 5-8 max: pick the most important flows (Employee request → Manager/Admin approval, Admin config → Employee/Manager experience).
- Journey order: Employee (profile → documents → org chart → payslip/tax → benefits → self-service requests), Manager (team directory → team org → comp overview → headcount → compliance → letter/change requests), Admin (master data → multi-entity → payroll engine → benefits admin → compliance → data governance).
```

---

## PHASE 3 — Time & Attendance

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Time & Attendance". Parse every single row. Extract ALL data — every role, every feature group, every bullet point, every AI feature. Nothing can be skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   Each swim lane MUST have exactly 2 horizontal rows of nodes:
   - **Row 1**: Standard feature nodes (left-to-right journey order)
   - **Row 2**: AI-powered + Additional feature nodes
   - All nodes use `flex: 1 1 0; min-width: 0` so they share available width equally — NEVER use fixed widths or `flex-shrink: 0` (causes overflow)
   - Lane body CSS: `display: flex; flex-direction: column; gap: 10px; justify-content: center; padding: 6px 8px`
   - Each row CSS: `display: flex; align-items: center; gap: 4px; flex-wrap: nowrap`
   - Node height: ~32px. Font size: ~8px. Count badge on each node.

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   Cross-lane arrows must travel through LEFT and RIGHT margins OUTSIDE the lane boxes. NEVER route a vertical arrow segment through the node content area.
   - **Lanes container**: Add `padding: 5px 22px` — the 22px side padding creates clear routing channels with ZERO nodes
   - **Downward arrows** (e.g., Employee→Manager): Source node bottom → drop to inter-row gap (empty 10px space between Row 1 and Row 2) → go horizontal in gap to LEFT or RIGHT margin channel (the 22px padding area) → travel vertical in margin (completely outside all lane boxes) → enter target lane at its top padding area (above Row 1, no nodes here) → go horizontal to target node column → drop to target node top
   - **Upward arrows** (e.g., Admin→Employee): Source node top → rise to source lane top padding (above Row 1) → go horizontal to margin → travel vertical UP in margin → enter target lane top padding → horizontal to target column → drop to target node top
   - Assign ~3 arrows per side (left/right), each offset by 5px so parallel arrows don't overlap each other

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrow icons between nodes (gray, no animation).

### Layout: Horizontal Swim Lanes
- 3 horizontal swim lanes stacked vertically: Top = **Employee** (#E3F2FD), Middle = **Manager** (#FFF3E0), Bottom = **Admin / HR** (#F3E5F5)
- Each lane ~30% viewport height. Header+legend: compact 38px bar.
- Lane label: vertical text on left side (24px wide)

### Nodes — COMPACT
- Each feature group = rounded rectangle, title only (no bullets visible). Count badge.
- Standard: solid border, white fill | AI: gradient yellow, ✦ prefix, dashed border | Additional: green tint, dotted border
- Bullets appear ONLY on hover (tooltip) or click (modal)

### Cross-lane arrows (5-8 max):
- Employee punches in → Manager attendance board
- Employee submits regularization/OT → Manager approval queue
- Employee shift swap request → Manager approves
- Admin configures policies → Employee/Manager experience
- Manager-approved attendance → Admin payroll integration

### Animation
- Flowing dots on cross-lane arrows ONLY: SVG `<animateMotion>`, 3s cycle, infinite
- Node entrance: fade-in + scale, staggered 30ms
- AI nodes: pulsing glow 2.5s | Within-lane arrows: NO animation (static)

### Header & Legend
- Compact 38px dark bar: "Module 3: Time & Attendance — User Journey Map" | "AI-Native HRMS" badge
- Inline legend: Standard | AI-Powered | Additional | Approval | Data Flow
- "Highlight AI" toggle (top-right)

### Interactivity
- Hover → tooltip with ALL bullet points | Click → modal with full details
- Escape or click-outside closes modal

### Quality
- Professional enterprise quality. NO overlapping nodes, NO arrows crossing nodes, NO scrollbars. 100% self-contained HTML. EVERY feature accessible via hover/click.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-03-time-attendance.html
3. Verify.

## Important Reminders
- ADDITIONAL FEATURES (Field Worker Features, Advanced Geo-Fencing, Compliance Automation) — include in Row 2 alongside AI features, with dotted green border to distinguish.
- Key cross-lane flow: punch → view → regularize → approve → policy check → payroll feed. This is the PRIMARY animated flow — keep it clean.
- Journey order for Row 1 (Standard): Employee (multi-mode punch → real-time timesheet → breaks → OT requests → regularization → shift swap), Manager (attendance board → approval queue → reports → shift planning → exception mgmt → OT monitoring), Admin (policy config → device mgmt → shift master → compliance engine → payroll integration → audit trail).
- Row 2 contains AI + Additional features in left-to-right order per role.
```

---

## PHASE 4 — Leave Management

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Leave Management". Parse every single row. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   Each swim lane MUST have exactly 2 horizontal rows of nodes:
   - **Row 1**: Standard feature nodes (left-to-right journey order)
   - **Row 2**: AI-powered + Additional feature nodes
   - All nodes use `flex: 1 1 0; min-width: 0` so they share available width equally — NEVER use fixed widths or `flex-shrink: 0` (causes overflow)
   - Lane body CSS: `display: flex; flex-direction: column; gap: 10px; justify-content: center; padding: 6px 8px`
   - Each row CSS: `display: flex; align-items: center; gap: 4px; flex-wrap: nowrap`
   - Node height: ~32px. Font size: ~8px. Count badge on each node.

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   Cross-lane arrows must travel through LEFT and RIGHT margins OUTSIDE the lane boxes. NEVER route a vertical arrow segment through the node content area.
   - **Lanes container**: Add `padding: 5px 22px` — the 22px side padding creates clear routing channels with ZERO nodes
   - **Downward arrows**: Source node bottom → inter-row gap → horizontal to margin channel → vertical in margin (outside all lanes) → target lane top padding → horizontal to target column → target node top
   - **Upward arrows**: Source node top → source lane top padding → horizontal to margin → vertical in margin → target lane top padding → horizontal to target column → target node top
   - Assign ~3 arrows per side (left/right), offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrow icons between nodes.

### Layout: 3 Swim Lanes
- Top = **Employee** (#E3F2FD), Middle = **Manager** (#FFF3E0), Bottom = **Admin / HR** (#F3E5F5)
- Each ~30% height. 38px header bar. 24px vertical lane labels.

### Nodes — COMPACT
- Title only, count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted
- Bullets on hover (tooltip) or click (modal) ONLY

### Cross-lane arrows (5-8 max):
- Employee applies leave → Manager approval dashboard
- Manager approves → Employee status update
- Admin leave policy config → defines Employee entitlements
- Admin year-end processing → Employee balance update
- Admin leave-payroll mapping → payroll module
- Manager delegation → affects approval routing

### Animation
- Flowing dots on cross-lane arrows ONLY: `<animateMotion>`, 3s, infinite
- Node entrance: fade-in + scale, staggered 30ms | AI nodes: pulsing glow 2.5s

### Header: "Module 4: Leave Management — User Journey Map" | inline legend | "Highlight AI" toggle

### Interactivity: Hover → tooltip | Click → modal | Escape closes modal

### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-04-leave-management.html
3. Verify.

## Important Reminders
- Classic approval cycle: apply → approve/reject → balance update → payroll feed. PRIMARY animated flow.
- Journey order for Row 1 (Standard): Employee (balance dashboard → quick apply → team calendar → history → holiday calendar → comp-off/WFH), Manager (approval dashboard → team calendar → delegation → analytics → escalation → bulk mgmt), Admin (policy builder → entitlement engine → holiday mgmt → leave-payroll mapping → year-end → compliance).
- Row 2 contains AI + Additional features per role. Additional features use dotted green border.
```

---

## PHASE 5 — Daily Work Logging

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Daily Work Logging". Parse every single row. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~3 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels

### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (5-8 max):
- Employee submits weekly timesheet → Manager approval workflow
- Manager approves → Admin payroll/invoicing feed
- Admin configures projects/billing rates → Employee project picker
- Manager resource allocation → affects Employee assignments
- AI auto-fill → enhances Employee timesheet

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.

### Header: "Module 5: Daily Work Logging — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-05-daily-work-logging.html
3. Verify.

## Important Reminders
- Key flow: log time → submit → approve → payroll/invoice. PRIMARY animated chain.
- Row 1 (Standard) journey order: Employee (daily timesheet → project picker → activity notes → weekly submit → billable tracking → tool integration), Manager (team dashboard → approval workflow → project hours → utilization reports → resource allocation → client reporting), Admin (timesheet policy → project master → billing rates → integration admin → compliance → payroll/invoicing feed).
- Row 2: AI + Additional features per role.
```

---

## PHASE 6 — Talent Acquisition

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Talent Acquisition". Parse every single row. Extract ALL data — including ADDITIONAL FEATURES section. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~3 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels
### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (5-8 max):
- Employee refers candidate → Manager's pipeline
- Employee completes interview scorecard → Manager evaluation
- Manager creates requisition → Admin ATS processes
- Manager approves offer → Admin generates offer docs
- Admin configures careers site → Employee sees internal job board

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.
### Header: "Module 6: Talent Acquisition — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-06-talent-acquisition.html
3. Verify.

## Important Reminders
- ADDITIONAL FEATURES (Assessment Platform, Employer Branding, Offer & Contract Automation, AI Resume Screening, Predictive Hiring Analytics) — include in Row 2 with dotted green border.
- Key pipeline: Requisition → Source → Screen → Interview → Evaluate → Offer → Hire. Primary animated flow.
- Row 1 (Standard) journey order: Employee (internal job board → referral portal → interview participation → career opportunities), Manager (requisition → pipeline → scheduling → evaluation → offer → analytics), Admin (ATS config → job boards → careers site → background checks → offer templates → recruitment analytics).
- Row 2: AI + Additional features per role.
```

---

## PHASE 7 — Onboarding & Offboarding

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Onboarding & Offboarding". Parse every single row. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~3 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels
### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (5-8 max):
- Employee completes pre-boarding → Manager dashboard
- Manager creates 30-60-90 plan → Employee follows
- Manager exit interview → Admin processes F&F
- Admin workflow triggers → Employee checklist + Manager dashboard
- Admin IT provisioning → Employee gets access

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.
### Header: "Module 7: Onboarding & Offboarding — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-07-onboarding-offboarding.html
3. Verify.

## Important Reminders
- This module has TWO journeys: ONBOARDING (left half of Row 1) and OFFBOARDING (right half of Row 1). Separate with a vertical visual divider or clear section labels.
- Onboarding: Pre-boarding → Checklist → Buddy → Learning → 30-60-90
- Offboarding: Resignation → Exit interview → Knowledge transfer → Asset return → F&F → Alumni
- Row 1 (Standard) journey order: Employee (pre-boarding → checklist → buddy → learning → offboarding checklist), Manager (new hire dashboard → 30-60-90 → feedback → exit mgmt), Admin (workflow builder → document collection → IT provisioning → compliance → alumni).
- Row 2: AI + Additional features per role.
```

---

## PHASE 8 — Performance & Growth

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Performance & Growth". Parse every single row. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~3 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels
### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (5-8 max):
- Employee sets goals → aligns with Manager team goals
- Employee self-assessment → Manager reviews alongside
- Manager writes reviews → Admin calibration process
- Manager nominates promotion → Admin processes
- Admin configures review cycle → triggers Employee/Manager actions

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.
### Header: "Module 8: Performance & Growth — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-08-performance-growth.html
3. Verify.

## Important Reminders
- Review cycle is the KEY flow: Admin configures → Employee goals + self-assessment → Manager reviews + calibrates → results finalized → Employee feedback.
- Row 1 (Standard) journey order: Employee (goal setting → feedback → self-assessment → skill profile → career path), Manager (team goals → review cycle → calibration → 1:1 → PIP → promotion/succession), Admin (review cycle setup → competency library → goal framework → analytics → integrations).
- Row 2: AI + Additional features per role.
```

---

## PHASE 9 — Learning & Development

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Learning & Development". Parse every single row. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~3 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels
### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (5-8 max):
- Manager assigns courses → Employee learning path
- Employee completes course → Manager dashboard updates
- Admin configures LMS/content → Employee catalog
- Admin budget allocation → Employee learning budget
- AI recommender → Employee personalized suggestions

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.
### Header: "Module 9: Learning & Development — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-09-learning-development.html
3. Verify.

## Important Reminders
- Key flow: Admin creates content → Employee browses/enrolls → completes → certificate → Manager tracks → Admin analytics.
- Row 1 (Standard) journey order: Employee (catalog → learning path → certifications → budget), Manager (team dashboard → assignments → development planning), Admin (LMS config → budget → training calendar → reporting).
- Row 2: AI + Additional features per role.
```

---

## PHASE 10 — Compensation & Rewards

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Compensation & Rewards". Parse every single row. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~3 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels
### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (5-8 max):
- Admin salary bands → Manager team comp overview
- Manager proposes raises → Admin revision cycle
- Admin recognition config → Employee peer recognition
- Admin payroll/benefits → Employee total rewards statement
- Manager retention request → Admin approval

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.
### Header: "Module 10: Compensation & Rewards — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-10-compensation-rewards.html
3. Verify.

## Important Reminders
- Two key flows: (1) Revision: Admin bands → Manager proposes → Admin approves → Employee sees. (2) Recognition: Admin config → Employee gives kudos → all see feed.
- Row 1 (Standard) journey order: Employee (total rewards → equity → bonus → peer recognition), Manager (team comp → salary revision → recognition → retention), Admin (bands → revision cycle → equity admin → benchmarking → statutory).
- Row 2: AI + Additional features per role.
```

---

## PHASE 11 — Engagement & Culture

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Engagement & Culture". Parse every single row — including ADDITIONAL FEATURES. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~3 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels
### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (5-8 max):
- Employee completes pulse surveys → Manager sees scores
- Manager creates action plans → Employee sees improvements
- Admin configures surveys/recognition → Employee participates
- Admin DEI analytics ← aggregated from all data
- AI sentiment analysis → Manager/Admin insights

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.
### Header: "Module 11: Engagement & Culture — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-11-engagement-culture.html
3. Verify.

## Important Reminders
- ADDITIONAL FEATURES (Town Hall, Internal Social Platform, Culture Health Index) — include in Row 2 with dotted green border.
- Key cycle: Admin surveys → Employee responds → AI analyzes → Manager sees scores → action plan → next survey.
- Row 1 (Standard) journey order: Employee (pulse surveys → recognition feed → ERGs → wellness → internal comms), Manager (team scores → action planning → recognition dashboard → pulse check), Admin (survey builder → recognition config → comms → wellness → DEI analytics).
- Row 2: AI + Additional features per role.
```

---

## PHASE 12 — Platform & Experience Layer

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Platform & Experience Layer". Parse every single row — including ADDITIONAL FEATURES. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~3 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels
### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (5-8 max):
- Admin RBAC/workflow config → defines Employee/Manager capabilities
- Admin notification engine → Employee/Manager notifications
- Employee AI assistant queries → Admin-configured data
- Manager command center approvals → Employee request status
- Manager delegation → changes approval routing

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.
### Header: "Module 12: Platform & Experience Layer — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-12-platform-experience.html
3. Verify.

## Important Reminders
- ADDITIONAL FEATURES (White-Label, Accessibility, Multi-Tenancy, Notification Engine, Uptime) — include in Row 2 with dotted green border.
- This is the PLATFORM layer — Admin lane is densest. Admin Row 2 may have 8+ nodes — `flex: 1 1 0` ensures they all fit.
- Manager "Command Center" is the most connected node.
- Row 1 (Standard) journey order: Employee (dashboard → mobile app → search → notifications), Manager (command center → delegation/proxy → reports hub), Admin (RBAC → workflow engine → API → multi-entity → data migration → audit → AI governance → agentic ops).
- Row 2: AI + Additional features per role.
```

---

## PHASE 13 — Payroll Processing

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Payroll Processing". Parse every single row. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~3 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels
### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (5-8 max):
- Employee submits tax declarations/reimbursements → Admin payroll
- Employee salary advance request → Manager approves
- Manager verifies inputs → Admin runs pay run
- Admin processes payroll → Employee sees payslip
- Admin F&F → triggered by offboarding

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.
### Header: "Module 13: Payroll Processing — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-13-payroll-processing.html
3. Verify.

## Important Reminders
- Admin lane is VERY dense — but with the 2-row layout and `flex: 1 1 0`, even 7+ nodes per row will fit by shrinking proportionally.
- Key flow: Admin config → Manager verifies inputs → Admin pay run (multi-step) → Employee payslip. Centerpiece animated flow.
- Row 1 (Standard) journey order: Employee (payslip → tax mgmt → salary advance → reimbursements → pay calendar), Manager (team overview → reimbursement approvals → advance approvals → input verification), Admin (pay run engine → salary structure → statutory → accounting → loans → reports → F&F).
- Row 2: AI + Additional features per role.
```

---

## PHASE 14 — Expense Management

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Expense Management". Parse every single row. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~3 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels
### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (5-8 max):
- Employee submits expense report → Manager approval
- Employee travel request → Manager pre-approval
- Manager approves → Admin payment processing
- Admin configures policies → Employee experience
- Admin analytics ← aggregated from all expense data

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.
### Header: "Module 14: Expense Management — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-14-expense-management.html
3. Verify.

## Important Reminders
- Key flow: capture receipt → create report → submit → approve → process payment → reimburse. Primary animated chain.
- Row 1 (Standard) journey order: Employee (quick capture → reports → corporate card → travel requests → tracking), Manager (approvals → team spend → travel pre-approval → exceptions), Admin (policy config → approval workflow → card admin → payment processing → analytics → tax compliance).
- Row 2: AI + Additional features per role.
```

---

## PHASE 15 — Compliance & Audit

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Compliance & Audit". Parse every single row. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~3 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels
### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (5-8 max):
- Admin publishes policies → Employee acknowledges
- Admin assigns training → Employee completes → Manager tracks
- Employee whistleblower → Admin investigates
- Manager compliance gaps → Admin escalation
- Admin data privacy config → Employee data rights

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.
### Header: "Module 15: Compliance & Audit — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-15-compliance-audit.html
3. Verify.

## Important Reminders
- Admin lane is densest — but `flex: 1 1 0` on nodes ensures even 7+ nodes per row fit by shrinking proportionally.
- Key flows: (1) Policy: Admin creates → Employee acknowledges. (2) Training: Admin assigns → Employee completes → Manager monitors. (3) Whistleblower: Employee reports → Admin investigates.
- Row 1 (Standard) journey order: Employee (policy ack → training → whistleblower → data privacy), Manager (team compliance → violations → audit support → labor law), Admin (policy mgmt → audit trail → data privacy/GDPR → regulatory → retention → ethics → reporting).
- Row 2: AI + Additional features per role.
```

---

## PHASE 16 — Workforce Planning

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Workforce Planning". Parse every single row. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~3 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels
### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (5-8 max):
- Employee career marketplace ← Admin talent marketplace config
- Manager headcount plan → Admin strategic plan approval
- Admin job architecture → Manager org design tools
- Manager succession planning → Admin workforce analytics
- Employee skills passport → Manager skill gap analysis

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.
### Header: "Module 16: Workforce Planning — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-16-workforce-planning.html
3. Verify.

## Important Reminders
- Strategy-heavy module. Planning cycle: Admin strategic plan → Manager headcount/org plan → execution → Employee mobility.
- Row 1 (Standard) journey order: Employee (career marketplace → skills passport), Manager (headcount → org design → skill gaps → succession → contractor), Admin (strategic plan → job architecture → workforce analytics → position mgmt → talent marketplace).
- Row 2: AI + Additional features per role.
```

---

## PHASE 17 — Integrations & API Platform

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Integrations & API Platform". Parse every single row. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~3 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels
### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (5-8 max):
- Admin configures integrations → Employee/Manager use connected apps
- Employee calendar/Slack data → flows into HRMS
- Manager project tools → feeds reporting data
- Admin developer portal → external developers

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.
### Header: "Module 17: Integrations & API Platform — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-17-integrations-api.html
3. Verify.

## Important Reminders
- Admin lane is densest (REST API, webhooks, connectors, iPaaS, SCIM, import/export, monitoring, developer portal) — `flex: 1 1 0` ensures 8+ nodes fit by sharing width.
- This module is about CONNECTIONS — data flowing in and out.
- Row 1 (Standard) journey order: Employee (connected apps → calendar sync → communication), Manager (project tools → communication channels), Admin (REST API → webhooks → connectors → iPaaS → SCIM → import/export → monitoring → developer portal).
- Row 2: AI + Additional features per role.
```

---

## PHASE 18 — People Analytics & BI

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "People Analytics & BI". Parse every single row. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~3 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 5-8 cross-lane max. Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels
### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (5-8 max):
- Admin configures analytics → Manager/Employee dashboards
- Manager cross-module reports → Admin data models
- Admin embedded BI → external tools
- All AI features ← aggregate data from HRMS
- Employee personal analytics ← subset of system data

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.
### Header: "Module 18: People Analytics & BI — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-18-people-analytics-bi.html
3. Verify.

## Important Reminders
- Aggregates data from ALL other modules. Show data flowing IN.
- Admin lane dense — `flex: 1 1 0` handles 7+ nodes per row automatically.
- Row 1 (Standard) journey order: Employee (personal analytics), Manager (team analytics → cross-module reports → benchmarking), Admin (executive dashboard → KPI builder → report builder → attrition → DEI → comp analytics → embedded BI).
- Row 2: AI + Additional features per role.
```

---

## PHASE 19 — Demo Company Feature

```
You are tasked with creating a professional, animated User Journey Diagram as a self-contained HTML file.

## Step 1: Read the Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ONLY the sheet named "Demo Company Feature". Parse every single row. Extract ALL data. Nothing skipped. Count and confirm.

## Step 2: Understand the Diagram Structure

### CRITICAL LAYOUT & ARCHITECTURE

1. **MUST FIT IN ONE SCREEN — NO SCROLLING**: 100vw × 100vh. `html, body { margin: 0; overflow: hidden; }`. NEVER scroll.

2. **TWO-ROW LAYOUT PER LANE (MANDATORY — prevents horizontal overflow)**:
   - **Row 1**: Standard feature nodes | **Row 2**: AI + Additional feature nodes
   - All nodes: `flex: 1 1 0; min-width: 0` (equal width sharing, NO fixed widths)
   - Lane body: `flex-direction: column; gap: 10px; justify-content: center`
   - Each row: `display: flex; gap: 4px; flex-wrap: nowrap` | Node height: ~32px
   - Since this is a SMALL module, nodes will have more breathing room — use slightly larger font (9-10px) and height (36-40px).

3. **ARROW ROUTING VIA MARGINS — NEVER THROUGH NODES (MANDATORY)**:
   - Lanes container: `padding: 5px 22px` (22px side margins = routing channels)
   - Downward: node bottom → inter-row gap → horizontal to margin → vertical in margin (outside lanes) → target top padding → target node
   - Upward: node top → source top padding → horizontal to margin → vertical in margin → target top padding → target node
   - ~2 arrows per side, offset 5px each

4. **MINIMAL ARROWS**: 3-5 cross-lane max (small module). Within-lane: tiny static 8×8px SVG arrows.

### Layout: 3 Swim Lanes (Employee #E3F2FD / Manager #FFF3E0 / Admin #F3E5F5), 38px header, 24px lane labels
### Nodes: Title only + count badge. Standard: solid white | AI: gradient yellow ✦ dashed | Additional: green dotted. Bullets on hover/click ONLY.

### Cross-lane arrows (3-5):
- Admin loads demo → Employee/Manager explore demo data
- Admin wipes demo → resets all roles
- Demo mode banner flows across all roles

### Animation: Flowing dots on cross-lane arrows (`<animateMotion>`, 3s, infinite). Node fade-in staggered 30ms. AI glow 2.5s.
### Header: "Module 19: Demo Company Feature — User Journey Map" | inline legend | "Highlight AI" toggle
### Interactivity: Hover → tooltip | Click → modal | Escape closes
### Quality: Professional, no overlaps, no arrows crossing nodes, no scrollbars, self-contained. EVERY feature accessible.

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\phase-19-demo-company.html
3. Verify.

## Important Reminders
- SMALLEST module (~41 rows). Still a complete polished diagram — same architecture, more spacious.
- Key story: Admin activates demo → all 3 roles explore → AI active on demo data → Admin wipes when ready.
- Row 1 (Standard) journey order: Employee (explore as sample employee), Manager (explore dashboards), Admin (explore config → wipe/keep options).
- Row 2: AI + Additional features per role.
```

---

---

## BONUS: Combined Interactive Mind-Map — All 19 Modules

```
You are tasked with creating an interactive, expandable mind-map flowchart as a self-contained HTML file that combines ALL 19 HRMS modules into a single explorable visualization.

## Step 1: Read ALL Data

Read the Excel file at: c:\Users\Aditya\work\HRMS\HRMS-Complete-Feature-Blueprint-version-3.xlsx

Install openpyxl if needed (pip install openpyxl). Read ALL 19 sheets (skip "Summary"):
- Cold Start & Setup
- Core HR & People Data
- Time & Attendance
- Leave Management
- Daily Work Logging
- Talent Acquisition
- Onboarding & Offboarding
- Performance & Growth
- Learning & Development
- Compensation & Rewards
- Engagement & Culture
- Platform & Experience Layer
- Payroll Processing
- Expense Management
- Compliance & Audit
- Workforce Planning
- Integrations & API Platform
- People Analytics & BI
- Demo Company Feature

For EACH sheet: extract every feature name, its type (Standard / AI / Additional), its role (Employee / Manager / Admin), and all bullet points. Count and confirm totals.

## Step 2: Understand the Mind-Map Architecture

### CONCEPT: 6-LEVEL EXPANDABLE RADIAL MIND-MAP

Starting from ONE center node, the user clicks to expand deeper:

```
Level 0:  AI-Native HRMS                          (1 center node)
Level 1:  5 thematic clusters                     (5 nodes radiating out)
Level 2:  19 modules distributed across clusters  (3-4 modules per cluster)
Level 3:  3 roles per module                      (Employee / Manager / Admin)
Level 4:  Features per role                       (Standard ◻ / AI ✦ / Additional ◈)
Level 5:  Bullet points per feature               (leaf nodes)
```

### THEMATIC CLUSTERS (Level 1)

| # | Cluster Name         | Color Family     | Modules Inside |
|---|----------------------|------------------|----------------|
| 1 | Foundation           | Slate #546e7a    | Core HR & People Data, Platform & Experience Layer, Cold Start & Setup, Demo Company Feature |
| 2 | Day-to-Day Ops       | Blue #1565c0     | Time & Attendance, Leave Management, Daily Work Logging, Expense Management |
| 3 | Talent Journey       | Orange #e65100   | Talent Acquisition, Onboarding & Offboarding, Performance & Growth, Learning & Development |
| 4 | Rewards & Culture    | Green #2e7d32    | Compensation & Rewards, Payroll Processing, Engagement & Culture |
| 5 | Intelligence         | Purple #6a1b9a   | People Analytics & BI, Compliance & Audit, Workforce Planning, Integrations & API Platform |

### CRITICAL TECHNICAL REQUIREMENTS

1. **RADIAL MIND-MAP LAYOUT (center-out)**:
   - Level 0 (center): Large central node, absolutely centered on canvas.
   - Level 1 (clusters): Arranged in a circle around center, evenly spaced (72° apart for 5 clusters).
   - Level 2 (modules): Fan out from their parent cluster in a sub-arc.
   - Level 3 (roles): Fan out from their parent module.
   - Level 4 (features): Fan out from their parent role.
   - Level 5 (bullets): Simple list hanging off the feature node (no further branching — render as a tooltip/popover or small card).
   - Each level increases the radius from center. Use a force-directed or radial-tree layout algorithm.
   - **Curved connector lines** (bezier curves) from parent to children — NOT straight lines. Lines inherit the parent cluster's color with decreasing opacity at deeper levels.

2. **EXPAND / COLLAPSE INTERACTION**:
   - Start state: ONLY Level 0 visible (single center node).
   - Click a node → smoothly expand its children (animate outward with ~300ms ease-out).
   - Click an expanded node → collapse its children (animate inward, remove).
   - Visual indicator on each expandable node: a small `+` when collapsed, `−` when expanded.
   - Expanding one branch does NOT collapse others — multiple branches can be open simultaneously.
   - Double-click center node → expand ALL Level 1 clusters at once.

3. **PAN & ZOOM (MANDATORY — mind-map can grow very large)**:
   - Mouse wheel / pinch to zoom (0.2x to 3x range).
   - Click-and-drag on empty canvas to pan.
   - Zoom-to-fit button (top-right) that auto-frames all visible nodes.
   - Mini-map in bottom-right corner showing the full extent with a viewport rectangle.
   - Current zoom percentage displayed near zoom controls.
   - Smooth animated transitions when zooming/panning.

4. **CANVAS**: Use an SVG canvas (not HTML divs) for the node-and-edge graph for smooth scaling. The SVG should be inside a container div that handles pan/zoom transforms.

5. **SEARCH**: Search bar in top-left. As user types, matching nodes across ALL levels light up (even if their parent is collapsed — auto-expand the path to show them). Highlight matching text in yellow. ESC or clear to reset.

### NODE STYLING PER LEVEL

| Level | Shape | Size | Font | Style |
|-------|-------|------|------|-------|
| 0 — Center | Rounded rect | 180×60px | 16px bold white | Dark gradient bg (#1a1a2e → #0f3460), subtle pulse animation, glow shadow |
| 1 — Cluster | Rounded rect | 160×44px | 12px bold white | Cluster color gradient bg, count badge (total features), icon/emoji prefix |
| 2 — Module | Rounded rect | 150×36px | 10px semibold | White bg, cluster-colored left border (4px), count badge (features in this module) |
| 3 — Role | Pill/capsule | 120×30px | 9px semibold | Role color bg: Employee #e3f2fd / Manager #fff3e0 / Admin #f3e5f5, dark text |
| 4 — Feature | Rounded rect | auto×28px | 8.5px | Standard: white bg, solid border #90a4ae · AI: yellow gradient bg, dashed border #f9a825, ✦ prefix · Additional: green dotted border #66bb6a |
| 5 — Bullets | NOT separate nodes | — | — | Show as a tooltip card on hover/click of Level 4 feature node. Dark bg, white text, same style as the 19 phase diagrams. |

### CLUSTER ICONS (Level 1 prefixes)

- Foundation: 🏗️
- Day-to-Day Ops: 📅
- Talent Journey: 🚀
- Rewards & Culture: 💎
- Intelligence: 📊

### CONNECTOR LINES

- Curved bezier (not straight).
- Color: Matches the cluster color of the branch. Level 0→1 uses each cluster's own color. Deeper levels inherit.
- Stroke width: 2.5px (L0→L1), 2px (L1→L2), 1.5px (L2→L3), 1px (L3→L4).
- Opacity: 0.8 (L0→L1) → 0.6 → 0.5 → 0.4 at deepest.
- Animate on expand: lines draw themselves (stroke-dashoffset animation, 400ms).

### HEADER BAR (fixed, 44px, same dark gradient as the 19 phase diagrams)

Left side:
- Title: "AI-Native HRMS — Complete Feature Mind-Map"
- Badge: "19 Modules · {total_features} Features · {total_bullets} Data Points"

Right side:
- Search input (magnifying glass icon, 200px wide)
- "Expand All L1" button
- "Collapse All" button
- "Zoom to Fit" button
- "Highlight AI" toggle (same style as phase diagrams — when on, ALL AI feature nodes across the entire tree glow)

### ANIMATIONS

- Node entrance: scale from 0 → 1 with ease-out (300ms), staggered 30ms per sibling.
- Line drawing: stroke-dashoffset animation (400ms) synchronized with node entrance.
- Collapse: reverse of expand (scale 1 → 0, 200ms).
- Center node: subtle continuous pulse (box-shadow breathing, 3s infinite).
- Hover on any node: slight scale-up (1.05x) with shadow.
- AI glow: same 2.5s glow keyframe from phase diagrams, applied when "Highlight AI" is on.

### INTERACTIVITY

- **Hover any node (L1-L4)**: Show tooltip with summary info:
  - L1 cluster: "{N} modules, {M} total features"
  - L2 module: "{N} features across 3 roles"
  - L3 role: "{N} standard, {M} AI, {K} additional features"
  - L4 feature: Full bullet point list (same dark tooltip style)
- **Click any node (L0-L3)**: Expand/collapse children.
- **Click L4 feature node**: Open modal with full bullet details (same modal style as phase diagrams).
- **Right-click any node**: "Expand all children recursively" context menu option.
- **Escape**: Close any open modal/tooltip.

### STATISTICS PANEL (toggleable, bottom-left)

A small collapsible panel showing live stats based on what's currently visible/expanded:
- Total features visible: {N} / {total}
- Standard: {N} | AI: {M} | Additional: {K}
- Deepest level shown: L{X}
- Nodes expanded: {N}

### RESPONSIVENESS & PERFORMANCE

- Initial load: ONLY render L0 (1 node). Everything else created on-demand when expanded.
- Lazy rendering: Level 4-5 nodes only created when their L3 parent is expanded.
- Smooth 60fps pan/zoom using CSS transforms (translate + scale on a single container group).
- All data embedded in a single JS object (no external fetches).
- Works in modern browsers (Chrome, Firefox, Edge).

## Step 3: Create the Output

1. Directory: c:\Users\Aditya\work\HRMS\diagrams\
2. Save as: c:\Users\Aditya\work\HRMS\diagrams\combined-mind-map.html
3. Self-contained — ONE HTML file, no external dependencies.
4. Verify: open in browser, test expand/collapse at all levels, test pan/zoom, test search, test AI highlight toggle.

## Important Reminders

- This file WILL be large (all 19 modules' data embedded). That's expected. Optimize the JS data structure — use compact keys.
- The visual WOW factor matters here — this is the "portfolio piece" that shows the entire HRMS at a glance.
- Start state should be beautiful on its own: just the center node with a subtle glow, inviting a click.
- When all L1 clusters are expanded, it should look like a balanced, colorful flower/star pattern.
- Performance is critical — when a user expands deeply into one branch, panning should still be smooth.
- Every single feature and bullet from all 19 Excel sheets must be accessible. Nothing skipped.
- The search feature is KEY — a user should be able to type "attrition" and immediately see every module/feature mentioning attrition, with paths auto-expanded.
- No cross-branch connections — this is a pure hierarchical tree rendered as a radial mind-map.
- Color consistency: the 5 cluster colors should carry through to their deepest children (via border color, connector color, badge accent).
```

---

## Post-Generation Checklist

After all 19 phases are complete, verify:

1. [ ] All 19 HTML files exist in `c:\Users\Aditya\work\HRMS\diagrams\`
2. [ ] Each file opens in a browser with NO scrollbars — entire diagram visible in one viewport
3. [ ] Animations work (dots moving along cross-lane arrows, node entrance, AI glow)
4. [ ] NO arrow overlaps any node box — all arrows route cleanly around nodes
5. [ ] Arrows are minimal (5-8 cross-lane per diagram, not cluttered)
6. [ ] All features from each sheet are accessible via hover tooltips and click modals
7. [ ] Interactivity works (hover popovers, click modals, Highlight AI toggle)
8. [ ] Consistent styling across all 19 diagrams

### File Naming Convention
```
phase-01-cold-start-setup.html
phase-02-core-hr-people-data.html
phase-03-time-attendance.html
phase-04-leave-management.html
phase-05-daily-work-logging.html
phase-06-talent-acquisition.html
phase-07-onboarding-offboarding.html
phase-08-performance-growth.html
phase-09-learning-development.html
phase-10-compensation-rewards.html
phase-11-engagement-culture.html
phase-12-platform-experience.html
phase-13-payroll-processing.html
phase-14-expense-management.html
phase-15-compliance-audit.html
phase-16-workforce-planning.html
phase-17-integrations-api.html
phase-18-people-analytics-bi.html
phase-19-demo-company.html
```
