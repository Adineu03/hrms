# Sprint 3 — Manual Testing Guide (step-by-step, no assumptions)

> This is the **hands-on testing script** for the AI assistant + the standalone AI features. It is written to be followed literally — exact logins, exact pages, exact words to type into the chatbot, and exactly what you should see. No coding. Just follow the numbers.
>
> **How to use:** Do the **Setup** section once. Then work through Part A (Admin), Part B (Manager), Part C (Employee), Part D (standalone features) in order. Each test tells you: who to log in as → what page to be on → what to type → what should happen → tick the box. If something doesn't match, copy the test number into the **Bug Log** at the bottom.

---

## 0. SETUP — do this once before any test

### 0.1 Start the database and seed data
1. Make sure **PostgreSQL** is running locally (it powers the app). DB name is `hrms`.
2. Open a terminal in the project root: `c:\Users\Aditya\work\HRMS`
3. Load fresh demo data (safe to re-run any time data looks wrong):
   ```
   pnpm seed
   ```
   You should see lines ending with `✓ Users: admin@acme.com, manager@acme.com, emp01–emp20@acme.com`. If you see that, data is good.

### 0.2 (Optional) Start Redis
- Redis is **optional**. The chat works without it (history just won't survive an app restart). If Docker Desktop is running with Redis, great; if not, skip it — tests still pass.

### 0.3 Start the app
1. In the project root terminal, run:
   ```
   pnpm dev
   ```
2. Wait until you see both the API and web servers ready (about 20–40 seconds). Leave this terminal running the whole time.
3. The two servers are:
   - **Website (what you click):** http://localhost:3000
   - **API (backend, you don't open this):** http://localhost:3001

### 0.4 Open the app and confirm the chatbot is alive
1. Open **Google Chrome** and go to: **http://localhost:3000/login**
2. You should see the login page.
3. *(Recommended)* Open Chrome DevTools with **F12** and click the **Console** tab — if anything breaks, screenshots of red errors here are gold for the bug log. You can ignore the harmless `favicon.ico 404`.

### 0.5 The logins you will use (memorize the pattern)
| Role | Email | Password | Who they are |
|---|---|---|---|
| **Admin** (super_admin) | `admin@acme.com` | `Admin@123` | Alex — sees everything |
| **Manager** | `manager@acme.com` | `Manager@123` | Sarah — sees the team |
| **Employee** | `emp01@acme.com` | `Employee@123` | sees only themselves (emp01 … emp20 all work) |

### 0.6 How to log in / log out / find the chatbot
- **Log in:** at http://localhost:3000/login, type the email + password, click the login button. You land on the Dashboard.
- **The chatbot:** a **blue circle** floats at the **bottom-right** of every dashboard page. **Click it** to open the chat window. Type in the box at the bottom, press **Enter** to send.
- **Log out (to switch roles):** top-right of the screen, click **Logout**. Then log in as the next person.
- **Tip:** after logging in as a new role, **click the chatbot's trash/clear or just refresh** so old messages don't confuse you. (If there's no clear button, a full page refresh is fine.)

### 0.7 What "a good answer" looks like
- You type a message → within ~2–6 seconds a reply appears on the **left** (your message is on the **right**).
- A **good** reply uses the **real data** in the app (real numbers, real names). A **bad** reply is generic/made-up, an error message, or "Sorry, I couldn't process your request."

---

# PART A — Log in as ADMIN (`admin@acme.com` / `Admin@123`)

> Log in as Admin now. Open the chatbot (blue circle, bottom-right).

### A1 — Page awareness (which page am I on)
1. In the left sidebar, click **Core HR & People Data**. (URL becomes `/dashboard/modules/core-hr`.)
2. Open the chatbot. Type exactly:
   ```
   What page am I on?
   ```
3. **Expect:** it names **Core HR & People Data** and the **active tab** (e.g. "Employee Master").
- [ ] Pass  — names the correct module **and** tab

### A2 — Page awareness on a different tab (tab detection)
1. Still in Core HR, click the **Compliance** tab at the top.
2. In the chatbot type:
   ```
   What does this dashboard show?
   ```
3. **Expect:** it describes the **Compliance** view using what's actually on screen (e.g. the stat cards reading 0, the empty table) — NOT a generic essay about HR.
- [ ] Pass — describes the real on-screen content of the Compliance tab

### A3 — Count employees (real data)
1. Type:
   ```
   How many employees do we have?
   ```
2. **Expect:** a real number (around **20–22**), not a guess.
- [ ] Pass — gives a real count

### A4 — List employees (real names)
1. Type:
   ```
   List 5 employees
   ```
2. **Expect:** real names/emails from the org (e.g. people seeded by the demo).
- [ ] Pass — shows real employees

### A5 — Find a specific person
1. Type:
   ```
   Find the employee named Sarah
   ```
2. **Expect:** it returns Sarah (the manager) with details.
- [ ] Pass — finds Sarah

### A6 — Navigate by chat
1. Type:
   ```
   Take me to the Leave Management module
   ```
2. **Expect:** the page navigates to **Leave Management** (`/dashboard/modules/leave-management`).
- [ ] Pass — page actually changes to Leave Management

### A7 — See pending leave requests
1. Type:
   ```
   Show me all pending leave requests
   ```
2. **Expect:** a list of real pending requests with employee names + dates. (The seed creates ~15 leave requests; some are pending.)
- [ ] Pass — lists real pending requests

### A8 — Approve a leave request **with confirmation** (the important one)
1. Pick a name from the list A7 returned. Type (replace `<NAME>` with that person):
   ```
   Approve the pending leave request for <NAME>
   ```
2. **Expect:** a **confirmation dialog / pending action** appears ("Allow" and "Cancel").
3. Click **Allow**.
4. **Expect:** a success message ("Leave request approved").
5. **Verify it really happened:** type:
   ```
   Show me approved leave requests
   ```
   → that person should now appear as **approved**.
- [ ] Pass — confirm dialog appeared, Allow worked, status really changed

### A9 — Cancel a mutation (confirmation safety)
1. Type:
   ```
   Reject the next pending leave request
   ```
2. When the confirmation appears, click **Cancel**.
3. **Expect:** a "cancelled" message and **nothing changes**.
- [ ] Pass — Cancel stops the action, no data changed

### A10 — Multi-step (find then act in one go)
1. Type (replace `<NAME>` with someone who still has a pending request):
   ```
   Find <NAME>'s pending leave and approve it
   ```
2. **Expect:** the assistant does it as one flow — looks it up, then asks to confirm the approval → click **Allow** → success.
- [ ] Pass — handled as a single multi-step request

### A11 — Attendance summary
1. Type:
   ```
   What's today's attendance summary?
   ```
2. **Expect:** present / absent / late counts (real numbers for today).
- [ ] Pass — returns an attendance summary

### A12 — Create an employee (admin-only mutation)
1. Type:
   ```
   Add a new employee named Test Userone with email testuser1@acme.com
   ```
2. **Expect:** a confirmation → click **Allow** → success, and it mentions a temporary password (`Welcome@123`).
3. **Verify:** type `Find the employee named Test Userone` → it should now exist.
- [ ] Pass — employee created and findable

### A13 — Org analytics (natural-language report)
1. Type:
   ```
   Give me a quick report on how the organization is doing
   ```
2. **Expect:** a short narrative using **real** aggregates (headcount, headcount by department, leave by status, etc.).
- [ ] Pass — report uses real org numbers

### A14 — SCREEN ACTION: fill a form + click the right Save (vision)
1. In the sidebar click **Cold Start & Setup** (URL `/dashboard/modules/cold-start-setup`). You should see the **Company Profile** form (Company Name, Address, etc.) on the **Organization** tab.
2. In the chatbot type:
   ```
   Change the company name to TechVista Solutions and save it
   ```
3. **Expect:**
   - The **Company Name** field visibly changes to "TechVista Solutions".
   - It clicks the **form's Save button** — NOT the sidebar "Cold Start" link.
   - A small "AI filled fields" banner may appear at the top of the form.
- [ ] Pass — correct field filled, correct Save clicked

### A15 — SCREEN ACTION: open a hidden form and fill it
1. In the sidebar click **Core HR & People Data** → make sure you're on the **Employee Master** tab. There is a "New Employee" form (First name, Last name, etc.).
2. In the chatbot type:
   ```
   Add an employee named Riya Sharma with email riya.sharma@acme.com using the form on this page
   ```
3. **Expect:** it fills **First name = Riya**, **Last name = Sharma**, etc., into the **actual rendered form fields**, then submits. (This is the bug we fixed — fields that appear after a click should still get filled.)
- [ ] Pass — the visible form fields got filled correctly

### A16 — Banner clears on navigation
1. Right after A14/A15 (while the "AI filled fields" banner is showing), click a **different module** in the sidebar.
2. **Expect:** the banner is **gone** on the new page (it should not stick around).
- [ ] Pass — banner disappears after navigating

> **Done with Admin. Click Logout (top-right).**

---

# PART B — Log in as MANAGER (`manager@acme.com` / `Manager@123`)

> Log in as Manager. Open the chatbot. (Refresh once so old admin messages are gone.)

### B1 — Page awareness
1. Click any module in the sidebar.
2. Type:
   ```
   What page am I on and what's my role?
   ```
3. **Expect:** correct page, and it knows you're a **manager**.
- [ ] Pass

### B2 — Manager can see team data
1. Type:
   ```
   Show me pending leave requests
   ```
2. **Expect:** a real list (managers are allowed this).
- [ ] Pass — list appears

### B3 — Manager can approve (allowed)
1. Type (use a name from B2):
   ```
   Approve the pending leave for <NAME>
   ```
2. **Expect:** confirmation → **Allow** → success.
- [ ] Pass — manager can approve with confirmation

### B4 — Manager is BLOCKED from admin-only action
1. Type:
   ```
   Create a new employee named Block Test with email blocktest@acme.com
   ```
2. **Expect:** it **declines / says it can't** (creating employees is admin-only). It must **not** create anyone.
- [ ] Pass — manager is correctly refused

### B5 — Team performance snapshot
1. Type:
   ```
   Give me a team performance overview
   ```
2. **Expect:** goal counts by status + average progress (real numbers).
- [ ] Pass

> **Done with Manager. Click Logout.**

---

# PART C — Log in as EMPLOYEE (`emp01@acme.com` / `Employee@123`)

> Log in as the employee. Open the chatbot. (Refresh once.)

### C1 — Page awareness
1. Type:
   ```
   What page am I on?
   ```
2. **Expect:** correct page; it treats you as an **employee**.
- [ ] Pass

### C2 — My own leave balance (allowed)
1. Type:
   ```
   What's my leave balance?
   ```
2. **Expect:** your leave types with available days (real). *(If this employee has no balances seeded, it should say "no leave balances found" — that's still a pass, not an error.)*
- [ ] Pass — answers about your own balance

### C3 — Apply for leave (employee mutation, with confirmation)
1. Type:
   ```
   Apply for casual leave on 2026-07-10
   ```
2. **Expect:** confirmation → **Allow** → "Leave request submitted".
- [ ] Pass — request submitted after confirm

### C4 — My attendance
1. Type:
   ```
   Show my recent attendance
   ```
2. **Expect:** your recent days (real records) — or a clear "no records" if none.
- [ ] Pass

### C5 — My expenses (scoped to me only)
1. Type:
   ```
   List my expense reports
   ```
2. **Expect:** only **your own** reports (employees can't see others').
- [ ] Pass — only own data

### C6 — Employee is BLOCKED from manager/admin actions
1. Type:
   ```
   Approve all pending leave requests
   ```
2. **Expect:** it **declines** — employees can't approve. No data changes.
- [ ] Pass — correctly refused

### C7 — Count works, listing-everyone doesn't
1. Type:
   ```
   How many employees does the company have?
   ```
   **Expect:** a number (org count is allowed for everyone).
2. Then type:
   ```
   List all employees with their emails
   ```
   **Expect:** it **declines / can't** (listing the full employee directory is manager/admin only).
- [ ] Pass — count allowed, full directory refused

> **Done with Employee role tests.** Stay logged in as the employee for D1 (Receipt Scanner), then switch to Admin for D2.

---

# PART D — Standalone AI features (not the chatbot)

### D1 — Smart Receipt Scanner (log in as EMPLOYEE)
1. Logged in as `emp01@acme.com`, in the sidebar click **Expense Management** (`/dashboard/modules/expense-management`). You'll see the **employee** expense view ("My Expenses").
2. Find the button to **add an expense item** (an "Add Item" / "+" in the My Expenses area) and open that modal.
3. In the modal, find **"Scan Receipt"** and upload an image of a receipt. *(Use any real receipt photo — a phone snap of a shop bill works. A clear JPG/PNG.)*
4. Wait a few seconds.
5. **Expect:** the form auto-fills — **Vendor**, **Date**, **Amount**, **Category**, **Description** — from the receipt. Review the values; they should match the receipt (amount = the grand **total**, date in correct format, a sensible category).
6. **Negative check:** upload a **non-receipt** image (e.g. a selfie). **Expect:** it says it's not a receipt / doesn't invent data.
- [ ] Pass — real receipt extracted correctly; non-receipt rejected cleanly

### D2 — AI Column Mapper (log in as ADMIN)
1. Log out, log in as `admin@acme.com`.
2. In the sidebar click **Cold Start & Setup** (`/dashboard/modules/cold-start-setup`). Go to the **Import** tab/section (bulk employee import).
3. Upload a small **CSV** with **messy headers** — deliberately weird column names. Make a file `messy.csv` like:
   ```
   Given Name,Mail ID,Cell,Dept,Joining Dt,Reports To,Sex
   Riya,riya@x.com,9990001111,Engineering,2025-01-10,Sarah,F
   Arjun,arjun@x.com,9990002222,Sales,2024-11-03,Sarah,M
   ```
4. On the **mapping step**, click **"Suggest with AI"**.
5. **Expect:** it maps the messy headers to the right fields automatically — Given Name→First Name, Mail ID→Email, Cell→Phone, Dept→Department, Joining Dt→Date of Joining, Reports To→Manager, Sex→Gender (or similar). It should map **most/all** columns that plain matching would miss.
- [ ] Pass — AI mapped the messy headers correctly

---

# Resilience checks (any role)

### R1 — Bad input doesn't crash
1. In the chatbot type gibberish:
   ```
   asdkjhasd kjh ??? 12345
   ```
2. **Expect:** a polite "I didn't understand / can you rephrase" — **not** a crash or a red error.
- [ ] Pass

### R2 — (Only if you started Redis) Stop Redis mid-session
1. Stop Redis (e.g. stop the Docker container).
2. Send any chat message.
3. **Expect:** the chat **still replies** (it falls back to in-memory). No 500 error.
- [ ] Pass (or N/A if you never started Redis)

---

# Final tally

- Part A (Admin): A1–A16 → ___ / 16
- Part B (Manager): B1–B5 → ___ / 5
- Part C (Employee): C1–C7 → ___ / 7
- Part D (Features): D1–D2 → ___ / 2
- Resilience: R1–R2 → ___ / 2

**Success = every applicable box ticked.** Anything unticked goes in the Bug Log below.

---

# Bug Log (fill this in as you go — this is what the next coding session fixes)

For each failure, copy this block:

```
Test #:            (e.g. A8)
What I typed:      (the exact prompt)
Page I was on:     (e.g. /dashboard/modules/leave-management, Approvals tab)
Logged in as:      (admin / manager / employee)
What I expected:   
What actually happened:   
Console errors (F12 → Console), if any:   
Screenshot:        (attach)
```

> Tip for the next session: paste this whole Bug Log into the new chat and say "fix these Sprint-3 UAT failures." It has everything needed to reproduce.
