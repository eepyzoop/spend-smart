import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import AiAssistant from './AiAssistant'
import { useDarkMode } from './useDarkMode'

function getStartOfWeek() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

const CATEGORY_COLORS = {
  Food:          { bar: '#10b981', light: '#d1fae5' },
  Transport:     { bar: '#06b6d4', light: '#cffafe' },
  Shopping:      { bar: '#8b5cf6', light: '#ede9fe' },
  Entertainment: { bar: '#f59e0b', light: '#fef3c7' },
  Health:        { bar: '#ef4444', light: '#fee2e2' },
  Bills:         { bar: '#f97316', light: '#ffedd5' },
  Other:         { bar: '#6b7280', light: '#f3f4f6' },
}

function SkeletonRow() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-emerald-100 dark:border-gray-700 shadow-sm px-5 py-4 flex justify-between items-center animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-emerald-100 dark:bg-gray-600" />
        <div className="space-y-1.5">
          <div className="h-3 w-24 bg-emerald-100 dark:bg-gray-600 rounded" />
          <div className="h-2.5 w-16 bg-emerald-50 dark:bg-gray-700 rounded" />
        </div>
      </div>
      <div className="h-3 w-16 bg-emerald-100 dark:bg-gray-600 rounded" />
    </div>
  )
}

function BudgetBar({ label, spent, limit, color }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80)
    return () => clearTimeout(t)
  }, [])

  const rawPct = (spent / limit) * 100
  const displayPct = Math.min(rawPct, 100)
  const over = rawPct > 100
  const nearly = rawPct >= 80 && !over

  const barColor = over ? '#ef4444' : nearly ? '#f59e0b' : (color || '#10b981')
  const trackColor = over ? '#fee2e2' : nearly ? '#fef3c7' : '#d1fae5'

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <div className="flex items-center gap-2">
          {over && <span className="text-xs font-bold text-red-500">⚠️ over</span>}
          {nearly && !over && <span className="text-xs font-bold text-amber-500">nearly</span>}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Rs {Math.round(spent).toLocaleString()} / Rs {Math.round(limit).toLocaleString()}
          </span>
        </div>
      </div>
      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: trackColor }}>
        <div
          className="h-2.5 rounded-full"
          style={{
            width: animated ? `${displayPct}%` : '0%',
            backgroundColor: barColor,
            transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  )
}

function Dashboard() {
  const [dark, setDark] = useDarkMode()
  const [user, setUser] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [profile, setProfile] = useState(null)
  const [catBudgets, setCatBudgets] = useState([])
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [newIds, setNewIds] = useState(new Set())
  const [barsAnimated, setBarsAnimated] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login')
      } else {
        setUser(session.user)
        fetchAll(session.user.id)
      }
    })
  }, [])

  async function fetchAll(userId) {
    setFetching(true)
    setBarsAnimated(false)
    const [expRes, profileRes, catRes] = await Promise.all([
      supabase.from('expenses').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('monthly_budget, display_name').eq('id', userId).maybeSingle(),
      supabase.from('category_budgets').select('category, amount').eq('user_id', userId).gt('amount', 0),
    ])
    if (!expRes.error) {
      await autoAddRecurring(userId, expRes.data)
      const { data: fresh } = await supabase
        .from('expenses').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      setExpenses(fresh || expRes.data)
    }
    if (!profileRes.error) setProfile(profileRes.data)
    if (!catRes.error) setCatBudgets(catRes.data || [])
    setFetching(false)
    setTimeout(() => setBarsAnimated(true), 100)
  }

  async function autoAddRecurring(userId, allExpenses) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const lastMonthRecurring = allExpenses.filter(e => {
      const d = new Date(e.created_at)
      return e.is_recurring && d >= startOfLastMonth && d < startOfMonth
    })
    if (!lastMonthRecurring.length) return

    const thisMonthExpenses = allExpenses.filter(e => new Date(e.created_at) >= startOfMonth)

    for (const rec of lastMonthRecurring) {
      const alreadyAdded = thisMonthExpenses.some(
        e => e.is_recurring && e.category === rec.category && e.note === rec.note
      )
      if (!alreadyAdded) {
        await supabase.from('expenses').insert({
          user_id: userId,
          amount: rec.amount,
          category: rec.category,
          note: rec.note,
          is_recurring: true,
        })
      }
    }
  }

  async function handleAddExpense(e) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from('expenses')
      .insert({ user_id: user.id, amount: parseFloat(amount), category, note, is_recurring: isRecurring })
      .select()
      .single()

    if (!error && data) {
      setAmount('')
      setCategory('')
      setNote('')
      setIsRecurring(false)
      setExpenses(prev => [data, ...prev])
      setNewIds(prev => new Set(prev).add(data.id))
      setTimeout(() => {
        setNewIds(prev => { const s = new Set(prev); s.delete(data.id); return s })
      }, 400)
    }

    setLoading(false)
  }

  async function handleDelete(id) {
    setDeletingId(id)
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) setExpenses(prev => prev.filter(e => e.id !== id))
    setDeletingId(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const weekStart = getStartOfWeek()
  const weeklyExpenses = expenses.filter(e => new Date(e.created_at) >= weekStart)
  const weeklyTotal = weeklyExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)

  const categoryTotals = weeklyExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount)
    return acc
  }, {})
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyExpenses = expenses.filter(e => new Date(e.created_at) >= startOfMonth)
  const monthlyTotal = monthlyExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const monthlyCategoryTotals = monthlyExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount)
    return acc
  }, {})

  const hasBudget = profile?.monthly_budget > 0
  const hasCatBudgets = catBudgets.length > 0

  if (!user) return null

  return (
    <div className="min-h-screen bg-emerald-50 dark:bg-gray-900 transition-colors duration-300">
      <nav className="bg-emerald-700 dark:bg-emerald-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDark(d => !d)}
            className="w-8 h-8 rounded-full bg-emerald-600 dark:bg-emerald-800 hover:bg-emerald-500 flex items-center justify-center transition-all duration-200 active:scale-90 text-base"
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
          <h1 className="text-xl font-bold tracking-wide">SpendSmart</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-emerald-200 dark:text-emerald-400 text-sm hidden sm:block">{user.email}</span>
          <Link to="/history" className="bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-500 px-4 py-1.5 rounded-lg text-sm transition-colors">History</Link>
          <Link to="/settings" className="bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-500 px-4 py-1.5 rounded-lg text-sm transition-colors">Settings</Link>
          <button onClick={handleLogout} className="bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-500 px-4 py-1.5 rounded-lg text-sm transition-colors">Log Out</button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto p-6 space-y-6">

        {/* This Week */}
        <div className="bg-emerald-700 dark:bg-emerald-900 text-white rounded-2xl shadow-md p-6 transition-colors duration-300">
          <p className="text-emerald-300 text-sm font-medium mb-1">This Week</p>
          <p className="text-4xl font-bold">Rs {weeklyTotal.toFixed(2)}</p>
        </div>

        {/* Monthly Budget Progress */}
        {(hasBudget || hasCatBudgets) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 p-6 space-y-4 transition-colors duration-300">
            <h2 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest">
              Monthly Budget
            </h2>
            {hasBudget && (
              <BudgetBar label="Overall" spent={monthlyTotal} limit={profile.monthly_budget} />
            )}
            {hasCatBudgets && catBudgets.map(cb => (
              <BudgetBar
                key={cb.category}
                label={cb.category}
                spent={monthlyCategoryTotals[cb.category] || 0}
                limit={Number(cb.amount)}
                color={CATEGORY_COLORS[cb.category]?.bar}
              />
            ))}
          </div>
        )}

        {/* Category Breakdown (weekly) */}
        {sortedCategories.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 p-6 transition-colors duration-300">
            <h2 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mb-5">
              Spending by Category
            </h2>
            <div className="space-y-4">
              {sortedCategories.map(([cat, total]) => {
                const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other
                const rawPct = (total / weeklyTotal) * 100
                const pct = rawPct > 0 && rawPct < 1 ? '<1' : Math.round(rawPct)
                return (
                  <div key={cat}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors.bar }} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">{pct}%</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Rs {total.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: colors.light }}>
                      <div
                        className="h-3 rounded-full"
                        style={{
                          width: barsAnimated ? `${rawPct}%` : '0%',
                          backgroundColor: colors.bar,
                          transition: 'width 0.6s ease-out',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Add Expense Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 p-6 transition-colors duration-300">
          <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 mb-4">Add Expense</h2>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full border border-emerald-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full border border-emerald-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
              >
                <option value="">Select a category</option>
                <option>Food</option>
                <option>Transport</option>
                <option>Shopping</option>
                <option>Entertainment</option>
                <option>Health</option>
                <option>Bills</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                Note <span className="text-emerald-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="What was this for?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-emerald-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Recurring monthly</span>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </form>
        </div>

        {/* All Expenses */}
        <div>
          <h2 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mb-3">
            All Expenses
          </h2>
          {fetching ? (
            <div className="space-y-3">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : expenses.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-emerald-100 dark:border-gray-700 shadow-sm p-10 flex flex-col items-center text-center">
              <div className="text-4xl mb-3">💸</div>
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">No expenses yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Add your first expense above to get started.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {expenses.map((expense) => {
                const colors = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.Other
                return (
                  <li
                    key={expense.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl border border-emerald-100 dark:border-gray-700 shadow-sm px-5 py-4 flex justify-between items-center hover:shadow-md hover:scale-[1.005] transition-all duration-200 ${newIds.has(expense.id) ? 'animate-slideUp' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors.bar }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800 dark:text-gray-100">{expense.category}</p>
                          {expense.is_recurring && (
                            <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">↻ recurring</span>
                          )}
                        </div>
                        {expense.note && <p className="text-sm text-gray-400 dark:text-gray-500">{expense.note}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-800 dark:text-gray-100">
                        Rs {parseFloat(expense.amount).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        disabled={deletingId === expense.id}
                        className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors text-lg leading-none disabled:opacity-40"
                        title="Delete"
                      >
                        {deletingId === expense.id ? '·' : '×'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </main>

      <AiAssistant
        periodLabel="This Week"
        total={weeklyTotal}
        transactionCount={weeklyExpenses.length}
        categoryTotals={sortedCategories.map(([cat, amt]) => ({ category: cat, amount: amt.toFixed(2) }))}
      />
    </div>
  )
}

export default Dashboard
