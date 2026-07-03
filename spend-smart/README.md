# SpendSmart

A personal expense tracker, easy to use, designed to make logging and understanding daily spending as frictionless as possible.

Live: [spend-smart-peach.vercel.app](https://spend-smart-peach.vercel.app)

---

## What it does

SpendSmart lets users log expenses, set monthly budgets as well as category-wise spending budgets to get a clear picture of where their money is going, broken down by week, month, and category. It includes an AI assistant that can analyse your spending and give personalised advice, and an automated email alert system that notifies you when you exceed a budget limit. There is a spending history feature so user can see previous month's spending. This history can be downloaded into a csv file offline as well.

---

## Install as an App (PWA)

SpendSmart is a Progressive Web App — it can be installed directly on your device from the browser and used like a native app with its own home screen icon, fullscreen experience, and no browser bar. An Install button is available in the navbar once the app detects your browser supports installation.

- **Android (Chrome):** Visit the live URL, tap the Install button in the navbar or look for the "Add to Home Screen" prompt that appears automatically.
- **iPhone/iPad (Safari):** Visit the live URL, tap the Share button at the bottom of the screen, then select "Add to Home Screen."
- **Desktop (Chrome/Edge):** Visit the live URL and click the install icon that appears in the address bar, or use the Install button in the navbar.

---

## Key Features

### Expense Tracking
- Add expenses with amount, category, optional note, and a recurring flag
- Edit any expense inline via a bottom sheet — no need to delete and re-add
- Delete expenses with instant UI update (optimistic rendering)
- Recurring expenses are automatically carried forward to the next month — no manual re-entry needed
- Expenses animate in on load with staggered slide-up transitions

### Dashboard
- Combined summary card showing weekly total (with count-up animation) and monthly budget status side by side
- Monthly budget displays remaining amount in green, or "Over by Rs X" in red with exact overage amount
- Two-column desktop layout: add expense form on the left, category breakdown and expense list on the right
- Category spending breakdown with animated progress bars, colour-coded per category
- Per-category budget bars that shift from green to amber at 80% and red at 100%
- "Over by Rs X" labels directly on category bars when limits are exceeded
- Contextual insights card (daily average spend and biggest single expense) appears automatically when expense list grows long enough to need the space
- Expense list scrolls inside its own container with a custom thin green scrollbar — the rest of the dashboard stays fixed

### Mobile Experience
- Full-width "+ Add Expense" button immediately below the summary card
- Add expense form opens as a bottom sheet sliding up from the bottom of the screen
- Edit expense also uses the bottom sheet, pre-filled with existing data
- Expenses and Stats tabs let users switch between their transaction list and category breakdown without scrolling
- Responsive design collapses gracefully from two-column desktop to single-column mobile

### AI Assistant
- Powered by Gemini 2.5 Flash via a Supabase Edge Function
- Context-aware: the assistant receives the user's actual spending data (total, transaction count, category breakdown) for the current period
- Available on both the dashboard and history page
- Accessible from the navbar — does not block any content
- Suggested prompts shown on first open to help users get started
- Conversation history maintained within the session

### Spending History
- Browse past months via a dropdown (last 6 months)
- Full category breakdown with animated bars for any selected month
- Search expenses by note or category name
- Filter by category
- Export any month's transactions to a CSV file

### Budget Alerts (Automated Email)
- Supabase Edge Function runs daily via a cron job
- Checks every user's monthly spending against their set budget
- Sends an HTML email via the Resend API if overall or any category limit is exceeded
- Email includes exact overage amounts and per-category breakdown
- Users who are within budget receive no email

### User Reviews
- In-app feedback modal with star rating (1-5) and comment
- Reviews stored in Supabase with an approval flag — only approved reviews appear publicly
- Wall of Love page shows all approved reviews with average rating, reviewer name, and date
- Publicly accessible without login — serves as social proof for new visitors
- "Write a Review" button available from the Wall of Love for logged-in users

### Authentication and Accounts
- Email and password signup and login via Supabase Auth
- Sessions persist across browser closes — users stay logged in automatically
- Each user's data is fully isolated via Supabase Row Level Security policies

### Settings
- Set an overall monthly budget limit
- Set individual limits per spending category (Food, Transport, Shopping, Entertainment, Health, Bills, Other)
- Budget changes reflected immediately across the dashboard

### Design
- Dark mode with system preference detection and manual toggle, persisted across sessions
- Consistent emerald green colour scheme throughout
- Skeleton loading states on the dashboard and history page
- Empty states with contextual messaging for new users
- Subtle background gradient orbs on the dashboard
- Flying dollar animation on login, signup, and Wall of Love pages

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Styling | Tailwind CSS v3 |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| Backend Logic | Supabase Edge Functions (Deno / TypeScript) |
| AI | Google Gemini 2.5 Flash API |
| Email | Resend API |
| Scheduling | Cron job triggering Edge Function |
| Deployment | Vercel |
| PWA | vite-plugin-pwa |

---

## Project Structure

```
src/
  App.jsx              — routing
  Dashboard.jsx        — main expense tracking view
  History.jsx          — monthly spending history
  Settings.jsx         — budget configuration
  Profile.jsx          — user profile
  AiAssistant.jsx      — AI chat panel
  WallOfLove.jsx       — public reviews page
  FeedbackModal.jsx    — in-app review submission
  Sidebar.jsx          — navigation sidebar
  Login.jsx / Signup.jsx
  useAuth.js           — custom auth hook
  useDarkMode.js       — dark mode hook
  supabaseClient.js    — Supabase connection

supabase/functions/
  ai-chat/             — Gemini AI Edge Function
  budget-alert/        — daily budget alert Edge Function
```

---

## Running Locally

```bash
git clone https://github.com/eepyzoop/spend-smart.git
cd spend-smart
npm install
```

Create a `.env` file in the root:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
npm run dev
```

The app will be running at `http://localhost:5173`

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

For the Edge Functions, the following are set in the Supabase dashboard:

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `RESEND_API_KEY` | Resend email API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for admin auth in budget alerts) |
| `CRON_SECRET` | Secret token to authenticate the cron job trigger |
