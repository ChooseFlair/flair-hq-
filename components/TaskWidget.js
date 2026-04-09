import { useState, useEffect } from 'react'
import { Check, Plus, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { TAGS } from './TaskManager'

export default function TaskWidget({ filterTag, title = 'Tasks' }) {
  const [tasks, setTasks] = useState([])
  const [expanded, setExpanded] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // Load tasks from localStorage
  useEffect(() => {
    const loadTasks = () => {
      const saved = localStorage.getItem('flair_tasks')
      if (saved) {
        setTasks(JSON.parse(saved))
      }
    }

    loadTasks()

    // Listen for storage changes (from other tabs or TaskManager)
    const handleStorage = () => loadTasks()
    window.addEventListener('storage', handleStorage)

    // Poll for changes every 2 seconds (for same-tab updates)
    const interval = setInterval(loadTasks, 2000)

    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  // Filter tasks for this page
  const relevantTasks = tasks.filter(t =>
    !t.archived &&
    !t.completed &&
    t.tags.includes(filterTag)
  ).sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  const completedTasks = tasks.filter(t =>
    !t.archived &&
    t.completed &&
    t.tags.includes(filterTag)
  ).slice(0, 3) // Show max 3 completed

  const toggleComplete = (taskId) => {
    const updated = tasks.map(t =>
      t.id === taskId
        ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null }
        : t
    )
    setTasks(updated)
    localStorage.setItem('flair_tasks', JSON.stringify(updated))
  }

  const addQuickTask = () => {
    if (!newTaskTitle.trim()) return

    const newTask = {
      id: Date.now().toString(),
      title: newTaskTitle,
      description: '',
      tags: [filterTag],
      priority: 'medium',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    }

    const updated = [newTask, ...tasks]
    setTasks(updated)
    localStorage.setItem('flair_tasks', JSON.stringify(updated))
    setNewTaskTitle('')
    setShowAddForm(false)
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  const tagInfo = TAGS.find(t => t.id === filterTag)

  if (relevantTasks.length === 0 && completedTasks.length === 0 && !showAddForm) {
    return null // Don't show widget if no tasks for this page
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-6 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-gray-500" />
          <h3 className="font-medium text-gray-900">{title}</h3>
          {relevantTasks.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
              {relevantTasks.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowAddForm(!showAddForm)
              setExpanded(true)
            }}
            className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4">
          {/* Quick Add Form */}
          {showAddForm && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder={`Add ${tagInfo?.label || ''} task...`}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                onKeyDown={(e) => e.key === 'Enter' && addQuickTask()}
                autoFocus
              />
              <button
                onClick={addQuickTask}
                disabled={!newTaskTitle.trim()}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          )}

          {/* Active Tasks */}
          {relevantTasks.length > 0 ? (
            <div className="space-y-2">
              {relevantTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 group"
                >
                  <button
                    onClick={() => toggleComplete(task.id)}
                    className="mt-0.5 w-4 h-4 rounded-full border-2 border-gray-300 hover:border-green-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{task.title}</p>
                    {task.dueDate && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        Due {new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-bold ${getPriorityColor(task.priority)}`}>
                    {task.priority === 'high' && <AlertCircle className="w-4 h-4" />}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-2">
              No active {tagInfo?.label?.toLowerCase()} tasks
            </p>
          )}

          {/* Completed Tasks (collapsed section) */}
          {completedTasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-400 mb-2">Recently completed</p>
              <div className="space-y-1">
                {completedTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 text-sm text-gray-400"
                  >
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="line-through">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
