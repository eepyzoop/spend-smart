import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import AiAssistant from './AiAssistant'

const CATEGORY_COLORS = {
  Food:          { bar: '#10b981', light: '#d1fae5' },
  Transport:     { bar: '#06b6d4', light: '#cffafe' },
  Shopping:      { bar: '#8b5cf6', light: '#ede9fe' },
  Entertainment: { bar: '#f59e0b', light: '#fef3c7' },
  Health:        { bar: '#ef4444', light: '#fee2e2' },
  Bills:         { bar: '#f97316', light: '#ffedd5' },
  Other:         { bar: '#6b7280', light: '#f3f4f6' },
}

function getMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push({
      label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }
  return options
}

function SkeletonRow() {
  return (
    <div className="bg-white rounded-xl border border-emerald-100 shadow-sm px-5 py-4 flex justify-between items-center animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-emerald-100" />
        <div className="space-y-1.5">
          <div className="h-3 w-24 bg-emerald-100 rounded" />
          <div className="h-2.5 w-16 bg-emerald-50 rounded" />
        </div>
      </div>
      <div className="h-3 w-16 bg-emerald-100 rounded" />
    </div>
  )
}

function History() {
  const [user, setUser] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [fetching, setFetching] = useState(true)
  const [monthOptions] = useState(getMonthOptions)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login')
      } else {
        setUser(session.user)
        fetchExpenses(session.user.id, getMonthOptions()[0])
      }
    })
  }, [])

  async function fetchExpenses(userId, { year, month }) {
    setFetching(true)
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 1).toISOString()

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: false })

    if (!error) setExpenses(data)
    setFetching(false)
  }

  function handleMonthChange(e) {
    const index = parseInt(e.target.value)
    setSelectedIndex(index)
    fetchExpenses(user.id, monthOptions[index])
  }

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)

  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount)
    return acc
  }, {})

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])

  if (!user) return null

  return (
    <div className="min-h-screen bg-emerald-50">
      <nav className="bg-emerald-700 text-white px-6 py-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold tracking-wide">SpendSmart</h1>
        <div className="flex items-center gap-4">
          <Link
            to="/settings"
            className="bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 rounded-lg text-sm transition-colors"
          >
            Settings
          </Link>
          <Link
            to="/dashboard"
            className="bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 rounded-lg text-sm transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto p-6 space-y-6">

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-emerald-900">Spending History</h2>
          <select
            value={selectedIndex}
            onChange={handleMonthChange}
            className="border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {monthOptions.map((opt, i) => (
              <option key={i} value={i}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="bg-emerald-700 text-white rounded-2xl shadow-md p-6">
          <p className="text-emerald-300 text-sm font-medium mb-1">
            {monthOptions[selectedIndex].label}
          </p>
          <p className="text-4xl font-bold">Rs {total.toFixed(2)}</p>
          <p className="text-emerald-300 text-sm mt-2">
            {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
          </p>
        </div>

        {sortedCategories.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
            <h2 className="text-sm font-semibold text-emerald-500 uppercase tracking-widest mb-5">
              Spending by Category
            </h2>
            <div className="space-y-4">
              {sortedCategories.map(([cat, catTotal]) => {
                const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other
                const rawPct = (catTotal / total) * 100
                const pct = rawPct > 0 && rawPct < 1 ? '<1' : Math.round(rawPct)
                const barWidth = rawPct
                return (
                  <div key={cat}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors.bar }} />
                        <span className="text-sm font-medium text-gray-700">{cat}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{pct}%</span>
                        <span className="text-sm font-semibold text-gray-800">Rs {catTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: colors.light }}>
                      <div className="h-3 rounded-full" style={{ width: `${barWidth}%`, backgroundColor: colors.bar }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-emerald-500 uppercase tracking-widest mb-3">
            Transactions
          </h2>

          {fetching ? (
            <div className="space-y-3">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : expenses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-10 flex flex-col items-center text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-semibold text-gray-700 mb-1">No expenses this month</p>
              <p className="text-sm text-gray-400">Try selecting a different month above.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {expenses.map((expense) => {
                const colors = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.Other
                const date = new Date(expense.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })
                return (
                  <li
                    key={expense.id}
                    className="bg-white rounded-xl border border-emerald-100 shadow-sm px-5 py-4 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors.bar }} />
                      <div>
                        <p className="font-medium text-gray-800">{expense.category}</p>
                        {expense.note && <p className="text-sm text-gray-400">{expense.note}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{date}</span>
                      <span className="font-semibold text-gray-800">
                        Rs {parseFloat(expense.amount).toFixed(2)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </main>

      <AiAssistant
        periodLabel={monthOptions[selectedIndex].label}
        total={total}


        transactionCount={expenses.length}
        categoryTotals={sortedCategories.map(([cat, amt]) => ({ category: cat, amount: amt.toFixed(2) }))}
      />
    </div>
  )
}

export default History
