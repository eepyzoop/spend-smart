import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import AiAssistant from './AiAssistant'
import { useDarkMode } from './useDarkMode'
import { useAuth } from './useAuth'
import Sidebar from './Sidebar'
import Logo from './Logo'
import FeedbackModal from './FeedbackModal'
import { useInstallPrompt } from './useInstallPrompt'
import InstallBanner from './InstallBanner'

function useCountUp(target, duration = 750, ready = false) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!ready) return
    if (target === 0 || duration === 0) { setDisplay(target); return }
    const start = performance.now()
    let raf
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setDisplay(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ready, duration])
  return display
}

function getStartOfWeek() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

const SHOW_INSIGHTS_THRESHOLD = 4

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
    <div className="py-2.5 px-3 flex justify-between items-center border-b border-gray-100 dark:border-gray-700 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-100 dark:bg-gray-600 flex-shrink-0" />
        <div className="h-3 w-28 bg-emerald-100 dark:bg-gray-600 rounded" />
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
  const user = useAuth()
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const { showInstall, handleInstall, showIosBanner, dismissIosBanner } = useInstallPrompt()
  const [listLoaded, setListLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState('expenses')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editRecurring, setEditRecurring] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) fetchAll(user.id)
  }, [user?.id])

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
    setTimeout(() => setListLoaded(true), 50)
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

  function openEditSheet(expense) {
    setEditingExpense(expense)
    setEditAmount(parseFloat(expense.amount).toFixed(2))
    setEditCategory(expense.category)
    setEditNote(expense.note || '')
    setEditRecurring(expense.is_recurring || false)
    setEditSheetOpen(true)
  }

  async function handleEditExpense(e) {
    e.preventDefault()
    setEditLoading(true)
    const updates = {
      amount: parseFloat(editAmount),
      category: editCategory,
      note: editNote,
      is_recurring: editRecurring,
    }
    const { error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', editingExpense.id)
      .eq('user_id', user.id)
    if (!error) {
      setExpenses(prev => prev.map(exp =>
        exp.id === editingExpense.id ? { ...exp, ...updates } : exp
      ))
      setEditSheetOpen(false)
    }
    setEditLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const weekStart = getStartOfWeek()
  const weeklyExpenses = expenses.filter(e => new Date(e.created_at) >= weekStart)
  const weeklyTotal = weeklyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

  const categoryTotals = weeklyExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + (parseFloat(e.amount) || 0)
    return acc
  }, {})
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyExpenses = expenses.filter(e => new Date(e.created_at) >= startOfMonth)
  const monthlyTotal = monthlyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const monthlyCategoryTotals = monthlyExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + (parseFloat(e.amount) || 0)
    return acc
  }, {})

  const hasBudget = profile?.monthly_budget > 0
  const catBudgetMap = Object.fromEntries(catBudgets.map(b => [b.category, b.amount]))
  const isMobile = window.innerWidth < 1024
  const displayTotal = useCountUp(weeklyTotal, isMobile ? 0 : 750, !fetching)

  if (!user) return null

  return (
    <div className="min-h-screen bg-emerald-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{
          position: 'absolute', width: '480px', height: '480px',
          top: '-120px', left: '-120px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.13) 0%, transparent 70%)',
          animation: 'orbDrift1 22s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: '400px', height: '400px',
          bottom: '-100px', right: '-100px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(5,150,105,0.10) 0%, transparent 70%)',
          animation: 'orbDrift2 28s ease-in-out infinite',
        }} />
      </div>
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        user={user}
        profile={profile}
      />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        profile={profile}
        dark={dark}
        setDark={setDark}
        onLogout={handleLogout}
        onFeedback={() => setFeedbackOpen(true)}
      />
      <nav className="bg-emerald-700 dark:bg-emerald-900 text-white px-4 py-4 flex items-center gap-3 shadow-md">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-8 h-8 rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-800 flex flex-col items-center justify-center gap-1 transition-colors"
          aria-label="Open menu"
        >
          <span className="block w-4 h-0.5 bg-white rounded-full" />
          <span className="block w-4 h-0.5 bg-white rounded-full" />
          <span className="block w-4 h-0.5 bg-white rounded-full" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Logo size={26} />
          <h1 className="text-lg font-semibold tracking-tight">SpendSmart</h1>
        </div>
        {showInstall && (
          <button
            onClick={handleInstall}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white/90 hover:bg-emerald-600 dark:hover:bg-emerald-800 border border-white/20 transition-colors whitespace-nowrap"
            title="Install SpendSmart"
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="3" x2="12" y2="15"/><polyline points="8 11 12 15 16 11"/><line x1="4" y1="20" x2="20" y2="20"/>
            </svg>
            Install
          </button>
        )}
        <button
          onClick={() => setAiOpen(o => !o)}
          className="w-8 h-8 rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-800 flex items-center justify-center transition-colors text-base"
          title="AI Assistant"
        >
          ✨
        </button>
        <button
          onClick={() => setDark(d => !d)}
          className="w-8 h-8 rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-800 flex items-center justify-center transition-colors"
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? '☀️' : '🌙'}
        </button>
      </nav>
      {showIosBanner && <InstallBanner onDismiss={dismissIosBanner} />}

      <main className="p-4 lg:p-6 space-y-4 lg:space-y-6">

        {/* FULL-WIDTH SUMMARY CARD */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 dark:from-emerald-800 dark:to-emerald-950 text-white rounded-2xl shadow-md overflow-hidden transition-colors duration-300">
          <div className="grid grid-cols-2">
            <div className="p-5 lg:p-6 border-r border-white/10">
              <p className="text-white text-xs font-semibold uppercase tracking-widest mb-2">This Week</p>
              <p className="text-3xl lg:text-4xl font-light tracking-tight text-white">Rs {displayTotal.toFixed(2)}</p>
            </div>
            <div className="p-5 lg:p-6">
              <p className="text-white text-xs font-semibold uppercase tracking-widest mb-2">Monthly Budget</p>
              {hasBudget ? (
                <>
                  {monthlyTotal > profile.monthly_budget ? (
                    <p className="text-sm lg:text-base font-semibold text-white">
                      Over by Rs {Math.round(monthlyTotal - profile.monthly_budget).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-sm lg:text-base font-semibold text-emerald-300">
                      ✓ Rs {Math.round(profile.monthly_budget - monthlyTotal).toLocaleString()} remaining
                    </p>
                  )}
                  <p className="text-xs text-white mt-1">
                    Rs {Math.round(monthlyTotal).toLocaleString()} / Rs {Math.round(profile.monthly_budget).toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="text-sm text-white mt-1">No budget set</p>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE: Add Expense button */}
        <button
          onClick={() => setSheetOpen(true)}
          className="lg:hidden w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
        >
          + Add Expense
        </button>

        {/* MOBILE: Tabs */}
        <div className="lg:hidden flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors
              ${activeTab === 'expenses'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors
              ${activeTab === 'stats'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            Stats
          </button>
        </div>

        {/* TWO-COLUMN GRID */}
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">

          {/* LEFT: Add Expense Form — desktop only */}
          <div className="hidden lg:flex lg:flex-col lg:gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 p-6 transition-colors duration-300">
              <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 mb-3">Add Expense</h2>
              <form onSubmit={handleAddExpense} className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full border border-emerald-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full border border-emerald-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
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
                  <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                    Note <span className="text-emerald-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="What was this for?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full border border-emerald-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
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
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-5 rounded-lg transition-all duration-200 disabled:opacity-50 active:scale-[0.98] whitespace-nowrap"
                  >
                    {loading ? 'Adding...' : 'Add Expense'}
                  </button>
                </div>
              </form>
            </div>

            {/* This Week at a Glance — only shown when right column is tall enough to need filling */}
            {weeklyExpenses.length > SHOW_INSIGHTS_THRESHOLD && (() => {
              const dailyAvg = weeklyTotal / 7
              const biggest = weeklyExpenses.reduce((max, e) => parseFloat(e.amount) > parseFloat(max.amount) ? e : max)
              const biggestColors = CATEGORY_COLORS[biggest.category] || CATEGORY_COLORS.Other
              const biggestDate = new Date(biggest.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              return (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 p-4 transition-colors duration-300">
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Daily Average</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      Rs {Math.round(dailyAvg).toLocaleString()} <span className="text-sm font-normal text-gray-400">/ day</span>
                    </p>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-700 mt-3 pt-3">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Biggest Expense</p>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: biggestColors.bar }} />
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{biggest.category}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white ml-auto">Rs {parseFloat(biggest.amount).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 ml-4">{biggestDate}</p>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* RIGHT: Stats + Expense List */}
          <div className="flex flex-col gap-3">

            {/* Category Breakdown — desktop: always | mobile: Stats tab */}
            {sortedCategories.length > 0 && (
              <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 p-4 transition-colors duration-300 ${activeTab === 'stats' ? 'block' : 'hidden'} lg:block`}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest">
                    Spending by Category
                  </h2>
                  {sortedCategories.length > 3 && (
                    <button
                      onClick={() => setShowAllCategories(v => !v)}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      {showAllCategories ? 'show less' : `+${sortedCategories.length - 3} more`}
                    </button>
                  )}
                </div>
                <div>
                  {(showAllCategories ? sortedCategories : sortedCategories.slice(0, 3)).map(([cat, total]) => {
                    const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other
                    const rawPct = (total / weeklyTotal) * 100
                    const pct = rawPct > 0 && rawPct < 1 ? '<1' : Math.round(rawPct)

                    const catBudget = catBudgetMap[cat]
                    const monthlySpent = monthlyCategoryTotals[cat] || 0
                    const budgetPct = catBudget ? (monthlySpent / catBudget) * 100 : null
                    const isOver = budgetPct !== null && budgetPct > 100
                    const isNearly = budgetPct !== null && budgetPct >= 80 && !isOver
                    const barFill = isOver ? '#ef4444' : isNearly ? '#f59e0b' : colors.bar
                    const trackFill = isOver ? '#fee2e2' : isNearly ? '#fef3c7' : colors.light

                    return (
                      <div key={cat} className="py-1.5">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: barFill }} />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{cat}</span>
                            {isOver && <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide">over by Rs {Math.round(monthlySpent - catBudget).toLocaleString()}</span>}
                            {isNearly && <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wide">nearly</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400 dark:text-gray-500">{pct}%</span>
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">Rs {Math.round(total).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: trackFill }}>
                          <div
                            className="h-1 rounded-full"
                            style={{
                              width: barsAnimated ? `${rawPct}%` : '0%',
                              backgroundColor: barFill,
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

            {/* Expense List — desktop: always | mobile: Expenses tab */}
            <div className={`${activeTab === 'expenses' ? 'block' : 'hidden'} lg:block`}>
              <h2 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mb-3">
                All Expenses
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 overflow-hidden">
                <div className="expense-scroll overflow-y-auto max-h-[400px]">
                  {fetching ? (
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : expenses.length === 0 ? (
                    <div className="p-10 flex flex-col items-center text-center">
                      <div className="text-4xl mb-3">💸</div>
                      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">No expenses yet</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Add your first expense above to get started.</p>
                    </div>
                  ) : (
                    <ul>
                      {expenses.map((expense, index) => {
                        const colors = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.Other
                        const date = new Date(expense.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        const isNew = newIds.has(expense.id)
                        const shouldAnimate = isNew || !listLoaded
                        return (
                          <li
                            key={expense.id}
                            className={`py-2 px-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 ${shouldAnimate ? 'animate-slideUp' : ''}`}
                            style={!listLoaded && !isNew ? { animationDelay: `${index * 60}ms`, opacity: 0, animationFillMode: 'forwards' } : {}}
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors.bar }} />
                            <div className="flex-1 min-w-0 flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">{expense.category}</span>
                              {expense.is_recurring && (
                                <span className="text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded-full flex-shrink-0">↻</span>
                              )}
                              {expense.note && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 truncate">· {expense.note}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-xs text-gray-400 dark:text-gray-500">{date}</span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">Rs {parseFloat(expense.amount).toFixed(2)}</span>
                              <button
                                onClick={() => openEditSheet(expense)}
                                className="w-6 h-6 rounded flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-150"
                                title="Edit"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(expense.id)}
                                disabled={deletingId === expense.id}
                                className="w-6 h-6 rounded flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150 disabled:opacity-40 text-base leading-none"
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
              </div>
            </div>

          </div>
        </div>

        {/* MOBILE BOTTOM SHEET — backdrop */}
        {sheetOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
        )}

        {/* EDIT BOTTOM SHEET — backdrop */}
        {editSheetOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditSheetOpen(false)}
          />
        )}

        {/* EDIT BOTTOM SHEET — panel */}
        <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl transition-transform duration-300 ${editSheetOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">Edit Expense</h2>
              <button
                onClick={() => setEditSheetOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditExpense} className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  required
                  className="w-full border border-emerald-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  required
                  className="w-full border border-emerald-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
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
                <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                  Note <span className="text-emerald-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="What was this for?"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full border border-emerald-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
                  <input
                    type="checkbox"
                    checked={editRecurring}
                    onChange={(e) => setEditRecurring(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Recurring monthly</span>
                </label>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-5 rounded-lg transition-all duration-200 disabled:opacity-50 active:scale-[0.98] whitespace-nowrap"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* MOBILE ADD BOTTOM SHEET — panel */}
        <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl transition-transform duration-300 lg:hidden ${sheetOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">Add Expense</h2>
              <button
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={async (e) => { await handleAddExpense(e); setSheetOpen(false) }} className="space-y-4">
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
        </div>

      </main>

      <AiAssistant
        periodLabel="This Week"
        total={weeklyTotal}
        transactionCount={weeklyExpenses.length}
        categoryTotals={sortedCategories.map(([cat, amt]) => ({ category: cat, amount: amt.toFixed(2) }))}
        open={aiOpen}
        onClose={() => setAiOpen(false)}
      />
    </div>
  )
}

export default Dashboard
