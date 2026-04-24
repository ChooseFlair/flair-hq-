import { useState } from 'react'
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

export default function AISummary({ pageType, data, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(true)

  const generateSummary = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType, data }),
      })

      const result = await res.json()

      if (result.error) {
        setError(result.error)
      } else {
        setSummary(result.summary)
      }
    } catch (err) {
      setError('Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  // Auto-generate on mount if no summary
  useState(() => {
    if (!summary && data) {
      generateSummary()
    }
  }, [data])

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl mb-6 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Insights</h3>
            <p className="text-xs text-gray-500">Powered by Claude</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              generateSummary()
            }}
            disabled={loading}
            className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh insights"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="px-5 pb-5">
          {loading ? (
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
              <span className="text-sm">Analyzing your data...</span>
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
              {error}
              <button
                onClick={generateSummary}
                className="ml-2 text-red-700 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          ) : summary ? (
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {summary}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              <button
                onClick={generateSummary}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Click to generate AI insights
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
