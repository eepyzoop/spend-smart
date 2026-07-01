import { useState } from 'react'
import { supabase } from './supabaseClient'

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-3xl transition-transform hover:scale-110 focus:outline-none"
        >
          <span className={(hovered || value) >= star ? 'text-amber-400' : 'text-gray-200 dark:text-gray-600'}>
            ★
          </span>
        </button>
      ))}
    </div>
  )
}

function FeedbackModal({ isOpen, onClose, user, profile }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (rating === 0) { setError('Please select a star rating.'); return }
    if (comment.trim().length < 10) { setError('Please write at least 10 characters.'); return }

    setLoading(true)
    setError('')

    const displayName =
      profile?.display_name ||
      user?.email?.split('@')[0] ||
      'Anonymous'

    const { error: dbError } = await supabase.from('reviews').insert({
      user_id: user.id,
      display_name: displayName,
      rating,
      comment: comment.trim(),
    })

    setLoading(false)
    if (dbError) {
      setError('Something went wrong. Please try again.')
    } else {
      setSubmitted(true)
    }
  }

  function handleClose() {
    setRating(0)
    setComment('')
    setSubmitted(false)
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slideUp">
        {submitted ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">💚</div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Thanks for the feedback!
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Your review helps make SpendSmart better.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Rate SpendSmart</h3>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Your rating
                </label>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Your thoughts
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="What do you think about SpendSmart?"
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition-colors"
                />
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Submitting…' : 'Submit Review'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default FeedbackModal
