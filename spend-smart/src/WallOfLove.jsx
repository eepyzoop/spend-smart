import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Logo from './Logo'
import FlyingDollars from './FlyingDollars'
import FeedbackModal from './FeedbackModal'

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <span
          key={s}
          className={`text-lg ${s <= rating ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`}
        >
          ★
        </span>
      ))}
    </div>
  )
}

function WallOfLove() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })

    supabase
      .from('reviews')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReviews(data || [])
        setLoading(false)
      })
  }, [])

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className="min-h-screen bg-emerald-50 dark:bg-gray-900 transition-colors duration-300">
      <FlyingDollars />

      {user && (
        <FeedbackModal
          isOpen={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          user={user}
          profile={null}
        />
      )}

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-10 pb-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link to={user ? '/dashboard' : '/login'} className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="font-semibold text-emerald-800 dark:text-emerald-300 tracking-tight">
              SpendSmart
            </span>
          </Link>
          <Link
            to={user ? '/dashboard' : '/login'}
            className="text-sm text-emerald-700 dark:text-emerald-400 font-medium hover:underline"
          >
            {user ? '← Dashboard' : 'Sign in →'}
          </Link>
        </div>

        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Wall of Love</h1>
          <p className="text-gray-500 dark:text-gray-400">What real users say about SpendSmart</p>

          {avgRating && (
            <div className="mt-5 inline-flex items-center gap-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-3 shadow-sm">
              <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{avgRating}</span>
              <Stars rating={Math.round(parseFloat(avgRating))} />
              <span className="text-sm text-gray-400">
                {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 animate-pulse h-36" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            No reviews yet — be the first!
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {reviews.map(r => (
              <div
                key={r.id}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm flex flex-col gap-3"
              >
                <Stars rating={r.rating} />
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed flex-1">
                  "{r.comment}"
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-gray-50 dark:border-gray-700">
                  <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">
                    {r.display_name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rate section */}
        <div className="mt-12 text-center">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-6 py-8 shadow-sm">
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">Enjoying SpendSmart?</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Your review helps others discover the app.</p>
            {user ? (
              <button
                onClick={() => setFeedbackOpen(true)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
              >
                Write a Review
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-block px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
              >
                Sign in to leave a review
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WallOfLove
