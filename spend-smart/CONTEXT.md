# SpendSmart — Session Context

## Last updated: 2026-07-01

---

## What's been built so far

### Phase 1 — Auth (COMPLETE)
- `src/Signup.jsx` — email/password signup via `supabase.auth.signUp()`
- `src/Login.jsx` — email/password login via `supabase.auth.signInWithPassword()`, redirects to `/dashboard` on success
- `src/Dashboard.jsx` — protected page, checks session on load, redirects to `/login` if not logged in, shows user email + logout button
- `src/main.jsx` — react-router-dom wired up with routes: `/`, `/signup`, `/login`, `/dashboard`, `/history` (root redirects to `/login`)
- `src/supabaseClient.js` — Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Phase 2 — Expense Form + Database (COMPLETE)
- `expenses` table in Supabase with columns: `id`, `user_id` (uuid), `amount` (numeric), `category` (text), `note` (text, nullable), `created_at` (timestamptz, default now())
- RLS enabled with 3 policies: SELECT, INSERT, DELETE — all scoped to `user_id = auth.uid()`
- Add Expense form on Dashboard (amount, category dropdown, optional note)
- Inserts row into `expenses` with `user_id` of logged-in user
- Expenses list fetched on load and refreshed after every insert, ordered newest first
- Currency displayed as **Rs** (Pakistani Rupees)

### Phase 3 — Weekly View (COMPLETE)
- "This Week" card at the top showing total spend since Monday
- Weekly expenses filtered client-side using `getStartOfWeek()` helper
- Category totals computed from weekly expenses using `.reduce()`

### Phase 4 — Category Breakdown Chart (COMPLETE)
- Horizontal bar chart for each category, sorted highest to lowest
- Each category has its own colour (defined in `CATEGORY_COLORS` map)
- Percentage of total shown next to each bar
- Colour dots added to the All Expenses list to match categories visually
- No chart library used — pure CSS/Tailwind with inline styles for dynamic widths
- **Bug fixed (2026-07-01):** bar width was originally calculated relative to the *highest* category instead of the *total*, so the top category always rendered at 100% width regardless of its real percentage. Fixed in both `Dashboard.jsx` and `History.jsx` — `barWidth` now equals the actual `rawPct`.
- **Bug fixed (2026-07-01):** categories with a nonzero but sub-1% share were rounding down and displaying "0%". Now shows `<1%` instead whenever `rawPct > 0 && rawPct < 1`.

### Phase 5 — Polish (COMPLETE)
- Delete button on each expense row (`handleDelete`, with per-row `deletingId` loading state)
- `SkeletonRow` component — animated loading placeholder shown while expenses fetch
- Empty state with emoji + friendly message when there are no expenses
- Logout button + nav bar

### Phase 6a — History Page (COMPLETE)
- `src/History.jsx` — new route at `/history`
- Month picker dropdown (`getMonthOptions()` generates last 6 months)
- Fetches expenses scoped to selected month via Supabase `.gte()` / `.lt()` on `created_at`
- Same category breakdown + transaction list pattern as Dashboard, plus per-row date
- Nav link "History" added to Dashboard; "← Dashboard" link added to History

### Phase 6b — AI Assistant (COMPLETE)
- **Decision:** user didn't want to pay for Claude/OpenAI API — switched to **Google Gemini** (free tier, no credit card, generous limits)
- `src/AiAssistant.jsx` — shared floating chat component, used on **both** Dashboard and History (bottom-left ✨ button, slides up a chat panel with 4 example prompts in grey)
- Backend: `supabase/functions/ai-chat/index.ts` — Supabase Edge Function (Deno) that holds `GEMINI_API_KEY` as a secret server-side so it's never exposed in frontend code
- Model: `gemini-2.5-flash` — **important gotcha:** this model "thinks" by default and thinking tokens count against `maxOutputTokens`, which was silently truncating replies mid-sentence. Fixed by setting `thinkingConfig: { thinkingBudget: 0 }` in `generationConfig`.
- The edge function receives `{ messages, expenseContext }` — `expenseContext` includes the current period's total, transaction count, and category breakdown, so the AI gives advice grounded in real numbers
- Supabase CLI installed as a dev dependency (`npm install supabase --save-dev`, run via `npx supabase ...`) rather than a global install
- Project linked to Supabase project ref: `mieymxjzwbvcfpqyrkpm`
- Deploy command: `npx supabase functions deploy ai-chat --project-ref mieymxjzwbvcfpqyrkpm`

### Setup
- React + Vite + Tailwind v3
- Supabase email confirmation currently **DISABLED** (dev only — must re-enable before launch)
- Vercel env vars set: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Theme: green (emerald shades), category bars use their own distinct colours
- `supabase/config.toml` and `supabase/functions/ai-chat/index.ts` now exist in the repo (Edge Function source)

---

### Phase 6c — Profile / Settings page (COMPLETE)
- `profiles` table: `id` (PK, FK to `auth.users`), `display_name`, `monthly_budget`, `updated_at` — one row per user
- `category_budgets` table: `id`, `user_id`, `category`, `amount`, `updated_at`, with `unique(user_id, category)` so saving uses `upsert(rows, { onConflict: 'user_id,category' })`
- Both tables have RLS policies scoped to `auth.uid()`, same pattern as `expenses`
- `src/Settings.jsx` — new route at `/settings`, three sections: Profile (display name), Monthly Budget (overall limit), Category Limits (one input per category, blank = no limit)
- Nav links added: "Settings" on Dashboard and History; "← Dashboard" back link on Settings
- Verified end-to-end with Playwright: signup → login → fill all three sections → save → reload → values persist correctly, no console errors

## What's next

### Phase 7 — AWS Budget Alerts (NOT STARTED, final phase)
- AWS Lambda + EventBridge (scheduled daily trigger) + SES (sending email)
- Lambda checks each user's spending against their budget (set in Phase 6c) and emails them if exceeded
- This is the most complex remaining piece — saved for last on purpose

---

## Phase roadmap
- Phase 1: Auth ✅
- Phase 2: Expense form + Supabase DB ✅
- Phase 3: Weekly view ✅
- Phase 4: Category breakdown chart ✅
- Phase 5: Polish ✅
- Phase 6a: History page ✅
- Phase 6b: AI Assistant (Gemini) ✅
- Phase 6c: Profile/Settings (budget limits) ✅
- Phase 7: AWS Lambda + EventBridge + SES daily budget alert emails ← YOU ARE HERE

---

## Important reminders
- Re-enable Supabase email confirmation before going live (Authentication → Providers → Email → Confirm email ON)
- Keep the green/emerald theme consistent, category colours are defined in `CATEGORY_COLORS` (duplicated in `Dashboard.jsx` and `History.jsx`)
- Currency is Rs (Pakistani Rupees) — not $
- User is learning — explain code after writing it, don't just hand it over silently
- User wants to write code themselves with review/guidance, but has also asked Claude to write code directly and explain after, depending on the moment — follow whichever the user asks for in the message
- AI assistant uses Gemini, NOT Claude/OpenAI — cost was the deciding factor
- Anthropic SDK is NOT used anywhere in this project (early draft of the edge function used it, replaced before deploy)
