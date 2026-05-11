import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  'How are sales doing this week?',
  'Show me my top customers',
  'What\'s my ROAS looking like?',
  'How are my Klaviyo flows performing?',
  'Give me a full business overview',
  'What should I focus on today?',
]

function Markdown({ text }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold text-white mt-3">{line.slice(4)}</h3>
        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-white mt-3">{line.slice(3)}</h2>
        if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-white mt-3">{line.slice(2)}</h1>
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-white">{line.slice(2, -2)}</p>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 text-gray-200">{formatInline(line.slice(2))}</li>
        if (line.match(/^\d+\.\s/)) return <li key={i} className="ml-4 text-gray-200 list-decimal">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (line.trim() === '') return <div key={i} className="h-1" />
        if (line.startsWith('```')) return null
        return <p key={i} className="text-gray-200 leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text) {
  return text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|£[\d,.]+)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="text-blue-300">{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-white/10 px-1.5 py-0.5 rounded text-blue-300 text-sm">{part.slice(1, -1)}</code>
    if (part.startsWith('£')) return <span key={i} className="text-green-400 font-semibold">{part}</span>
    return part
  })
}

export default function Jarvis() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function send(text) {
    const msg = text || input.trim()
    if (!msg || loading) return

    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-10),
        }),
      })

      const json = await res.json()
      if (!res.ok || json.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Something went wrong: ${json.error || 'Unknown error'}`, error: true }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: json.response,
          tools: json.tools_used || [],
        }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Connection error: ${e.message}`, error: true }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800/50 bg-gray-900/50 backdrop-blur flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg">Jarvis</h1>
          <p className="text-gray-400 text-xs">Connected to Shopify, Klaviyo, Meta Ads, Google Ads, Revolut</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-400/20 flex items-center justify-center mb-4 border border-blue-500/20">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Hey Karl, I'm Jarvis</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-md">Your AI business assistant. I have access to all your Flair data — orders, marketing, finance, customers. Ask me anything.</p>
            <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="text-left px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 text-gray-300 text-sm transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user'
              ? 'bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3'
              : 'bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-5 py-4'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              ) : (
                <>
                  {msg.error ? (
                    <p className="text-red-400 text-sm">{msg.content}</p>
                  ) : (
                    <Markdown text={msg.content} />
                  )}
                  {msg.tools?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/10">
                      {msg.tools.map((t, j) => (
                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {t.replace('get_', '').replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-gray-400 text-sm ml-1">Analysing your data...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-800/50 bg-gray-900/30">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl focus-within:border-blue-500/40 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Jarvis anything about your business..."
              rows={1}
              className="w-full bg-transparent text-white placeholder-gray-500 px-4 py-3 text-sm resize-none focus:outline-none"
              style={{ maxHeight: '120px' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
            />
          </div>
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className={`p-3 rounded-xl transition-all ${input.trim() && !loading ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white/5 text-gray-600'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
