import { useState, useEffect } from 'react'
import { Plus, Check, Trash2, Calendar, X } from 'lucide-react'

const STORAGE_KEY = 'flair_personal_tasks'

const PRIORITIES = [
  { id: 'high', label: 'High', dot: 'bg-red-500' },
  { id: 'medium', label: 'Medium', dot: 'bg-yellow-500' },
  { id: 'low', label: 'Low', dot: 'bg-gray-300' },
]

const fmtDue = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export default function PersonalTasks() {
  const [tasks, setTasks] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [draft, setDraft] = useState({ title: '', priority: 'medium', dueDate: '' })

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { setTasks(JSON.parse(saved)) } catch {}
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks, loaded])

  function addTask() {
    if (!draft.title.trim()) return
    setTasks((prev) => [
      { id: Date.now().toString(), ...draft, title: draft.title.trim(), done: false, createdAt: new Date().toISOString() },
      ...prev,
    ])
    setDraft({ title: '', priority: 'medium', dueDate: '' })
    setShowAdd(false)
  }

  const toggle = (id) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const remove = (id) => setTasks((prev) => prev.filter((t) => t.id !== id))

  const open = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  const priorityRank = { high: 0, medium: 1, low: 2 }
  const sorted = [...open].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Personal Tasks</h1>
          <p className="text-sm text-gray-500">{open.length} to do</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add task
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">New task</h2>
            <button onClick={() => setShowAdd(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            autoFocus
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="What needs doing?"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          />
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDraft((d) => ({ ...d, priority: p.id }))}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    draft.priority === p.id
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={draft.dueDate}
              onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
              className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg text-gray-500"
            />
            <button
              onClick={addTask}
              className="ml-auto px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        {sorted.length === 0 ? (
          <p className="px-4 py-10 text-sm text-gray-400 text-center">Nothing on the list — enjoy it ✨</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {sorted.map((t) => (
              <li key={t.id} className="px-4 py-3 flex items-center gap-3 group">
                <button
                  onClick={() => toggle(t.id)}
                  className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-gray-900 flex items-center justify-center flex-shrink-0 transition-colors"
                  title="Mark done"
                >
                  <Check className="w-3 h-3 text-transparent group-hover:text-gray-300" />
                </button>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITIES.find((p) => p.id === t.priority)?.dot}`} />
                <span className="flex-1 text-sm text-gray-900 min-w-0 truncate">{t.title}</span>
                {t.dueDate && (
                  <span className="text-[11px] text-gray-400 flex items-center gap-1 flex-shrink-0">
                    <Calendar className="w-3 h-3" /> {fmtDue(t.dueDate)}
                  </span>
                )}
                <button
                  onClick={() => remove(t.id)}
                  className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {done.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone((s) => !s)}
            className="text-xs text-gray-400 hover:text-gray-600 mb-2"
          >
            {showDone ? 'Hide' : 'Show'} completed ({done.length})
          </button>
          {showDone && (
            <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {done.map((t) => (
                <li key={t.id} className="px-4 py-2.5 flex items-center gap-3 group">
                  <button
                    onClick={() => toggle(t.id)}
                    className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"
                    title="Mark not done"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </button>
                  <span className="flex-1 text-sm text-gray-400 line-through min-w-0 truncate">{t.title}</span>
                  <button
                    onClick={() => remove(t.id)}
                    className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
