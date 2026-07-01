import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'

const EXAMPLE_PROMPTS = [
  'Summarise my spending this month',
  'Which category am I overspending on?',
  'Give me tips to cut my biggest expense',
  'How can I save more this month?',
]

function AiAssistant({ periodLabel, total, transactionCount, categoryTotals }) {
  const [aiOpen, setAiOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (aiOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiOpen])

  async function sendMessage(text) {
    const userText = text ?? input
    if (!userText.trim() || aiLoading) return

    setInput('')
    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setAiLoading(true)

    const expenseContext = {
      month: periodLabel,
      total: total.toFixed(2),
      transactions: transactionCount,
      byCategory: categoryTotals,
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { messages: newMessages, expenseContext },
      })
      if (error) throw error
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, I couldn't connect right now. Try again in a moment." },
      ])
    }

    setAiLoading(false)
  }

  return (
    <>
      <button
        onClick={() => setAiOpen(o => !o)}
        className="fixed bottom-5 right-5 w-12 h-12 bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-800 dark:hover:bg-emerald-700 text-white rounded-full shadow-xl flex items-center justify-center text-xl transition-all duration-200 hover:scale-110 active:scale-95 z-50"
        title="AI Assistant"
      >
        ✨
      </button>

      <div
        className={`fixed bottom-20 right-5 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-emerald-100 dark:border-gray-700 z-50 flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          aiOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="bg-emerald-700 dark:bg-emerald-900 text-white px-4 py-3 flex justify-between items-center flex-shrink-0">
          <span className="font-semibold text-sm">✨ AI Assistant</span>
          <button
            onClick={() => setAiOpen(false)}
            className="text-emerald-300 hover:text-white text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: '280px' }}>
          {messages.length === 0 ? (
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Try asking:</p>
              <div className="space-y-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="block w-full text-left text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900 hover:text-emerald-700 dark:hover:text-emerald-300 px-3 py-2 rounded-lg transition-colors border border-gray-100 dark:border-gray-600"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`text-sm px-3 py-2 rounded-xl leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white ml-auto max-w-[85%]'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 max-w-[90%]'
                }`}
              >
                {msg.content}
              </div>
            ))
          )}
          {aiLoading && (
            <div className="bg-gray-100 dark:bg-gray-700 text-gray-400 text-sm px-3 py-2 rounded-xl w-14 animate-pulse">
              ...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 p-3 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask anything..."
            className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
          />
          <button
            onClick={() => sendMessage()}
            disabled={aiLoading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 disabled:opacity-40 active:scale-95"
          >
            →
          </button>
        </div>
      </div>
    </>
  )
}

export default AiAssistant
