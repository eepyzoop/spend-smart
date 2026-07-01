// @ts-nocheck — this runs on Deno (Supabase Edge Functions), not Node.js
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { messages, expenseContext } = await req.json()

  const categoryList = expenseContext.byCategory
    .map((c: { category: string; amount: string }) => `${c.category}: Rs ${c.amount}`)
    .join(', ')

  const systemPrompt = `You are a personal finance assistant inside SpendSmart, a budget tracking app.
The user is asking about their spending habits and budget.

Their data for ${expenseContext.month}:
- Total spent: Rs ${expenseContext.total}
- Number of transactions: ${expenseContext.transactions}
- Breakdown by category: ${categoryList || 'no data yet'}

Rules:
- Be concise and friendly — max 3 short sentences per reply
- Reference their actual numbers when relevant
- Currency is Pakistani Rupees (Rs)
- Give actionable, practical advice
- If they have no data, encourage them to add expenses first
- Reply in plain conversational text — no markdown, no asterisks for bold, no bullet points, no headers`

  const geminiMessages = messages.map((m: { role: string; content: string }) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: geminiMessages,
        generationConfig: {
          maxOutputTokens: 400,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  )

  const data = await response.json()
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I couldn't get a response. Try again."

  return new Response(
    JSON.stringify({ reply }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
