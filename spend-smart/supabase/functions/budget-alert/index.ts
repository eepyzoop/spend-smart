import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const startOfMonth = new Date(year, month, 1).toISOString()
  const startOfNextMonth = new Date(year, month + 1, 1).toISOString()
  const monthName = now.toLocaleString('default', { month: 'long' })

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, monthly_budget')
    .not('monthly_budget', 'is', null)
    .gt('monthly_budget', 0)

  if (profilesError) {
    return new Response(JSON.stringify({ error: profilesError.message }), { status: 500 })
  }

  if (!profiles?.length) {
    return new Response(JSON.stringify({ message: 'No users with budgets set' }), { status: 200 })
  }

  const emailsSent: string[] = []

  for (const profile of profiles) {
    const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
    if (!user?.email) continue

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category')
      .eq('user_id', profile.id)
      .gte('created_at', startOfMonth)
      .lt('created_at', startOfNextMonth)

    if (!expenses?.length) continue

    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

    const { data: catBudgets } = await supabase
      .from('category_budgets')
      .select('category, amount')
      .eq('user_id', profile.id)
      .gt('amount', 0)

    const categoryTotals: Record<string, number> = {}
    for (const e of expenses) {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount)
    }

    const overallExceeded = totalSpent > profile.monthly_budget

    const categoryAlerts = (catBudgets || []).filter(
      (cb) => (categoryTotals[cb.category] || 0) > Number(cb.amount)
    )

    if (!overallExceeded && categoryAlerts.length === 0) continue

    const html = buildEmail({
      name: profile.display_name || 'there',
      monthName,
      year,
      totalSpent,
      monthlyBudget: profile.monthly_budget,
      overallExceeded,
      categoryTotals,
      catBudgets: catBudgets || [],
    })

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SpendSmart <onboarding@resend.dev>',
        to: [user.email],
        subject: `SpendSmart Budget Alert — ${monthName} ${year}`,
        html,
      }),
    })

    emailsSent.push(user.email)
  }

  return new Response(JSON.stringify({ sent: emailsSent }), { status: 200 })
})

function buildEmail({ name, monthName, year, totalSpent, monthlyBudget, overallExceeded, categoryTotals, catBudgets }: {
  name: string
  monthName: string
  year: number
  totalSpent: number
  monthlyBudget: number
  overallExceeded: boolean
  categoryTotals: Record<string, number>
  catBudgets: { category: string; amount: number }[]
}) {
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString()}`
  const overBy = totalSpent - monthlyBudget
  const pct = Math.round((totalSpent / monthlyBudget) * 100)

  const overallRow = overallExceeded
    ? `<tr><td style="padding:8px 0;color:#dc2626;font-weight:600;">⚠️ Overall: ${fmt(totalSpent)} / ${fmt(monthlyBudget)} — over by ${fmt(overBy)} (${pct}%)</td></tr>`
    : `<tr><td style="padding:8px 0;color:#16a34a;">✓ Overall: ${fmt(totalSpent)} / ${fmt(monthlyBudget)} (${pct}%)</td></tr>`

  const catRows = catBudgets.map((cb) => {
    const spent = categoryTotals[cb.category] || 0
    const limit = Number(cb.amount)
    const over = spent > limit
    const catPct = Math.round((spent / limit) * 100)
    return `<tr><td style="padding:4px 0;color:${over ? '#dc2626' : '#374151'};">
      ${over ? '⚠️' : '✓'} ${cb.category}: ${fmt(spent)} / ${fmt(limit)}${over ? ` — over by ${fmt(spent - limit)}` : ` (${catPct}%)`}
    </td></tr>`
  }).join('')

  return `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
  <h2 style="color:#059669;margin-bottom:4px;">SpendSmart</h2>
  <p style="color:#6b7280;margin-top:0;">Budget Alert — ${monthName} ${year}</p>
  <p>Hi ${name},</p>
  <p>One or more of your spending limits were exceeded this month:</p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
    ${overallRow}
    ${catBudgets.length ? `<tr><td style="padding-top:12px;padding-bottom:4px;font-weight:600;color:#111827;">By category:</td></tr>${catRows}` : ''}
  </table>
  <p style="color:#6b7280;font-size:13px;">Log in to SpendSmart to review your spending.</p>
</div>`
}
