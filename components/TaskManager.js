import { useState, useEffect } from 'react'
import {
  Plus,
  Check,
  Archive,
  Trash2,
  Tag,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronDown,
  X,
  Filter,
  Upload,
  Download,
  MoreHorizontal,
  Sparkles,
  Loader2,
} from 'lucide-react'

const TAGS = [
  { id: 'finance', label: 'Finance', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'marketing', label: 'Marketing', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'orders', label: 'Orders', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'products', label: 'Products', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'ideas', label: 'Ideas', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'operations', label: 'Operations', color: 'bg-gray-100 text-gray-700 border-gray-200' },
]

const PRIORITIES = [
  { id: 'high', label: 'High', color: 'text-red-600' },
  { id: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { id: 'low', label: 'Low', color: 'text-gray-500' },
]

export default function TaskManager() {
  const [tasks, setTasks] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [filterTag, setFilterTag] = useState(null)
  const [filterPriority, setFilterPriority] = useState(null)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    tags: [],
    priority: 'medium',
    dueDate: '',
  })
  const [editingTask, setEditingTask] = useState(null)
  const [loadingStrategic, setLoadingStrategic] = useState(false)

  // Load tasks from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('flair_tasks')
    if (saved) {
      setTasks(JSON.parse(saved))
    }
  }, [])

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('flair_tasks', JSON.stringify(tasks))
  }, [tasks])

  const addTask = () => {
    if (!newTask.title.trim()) return

    const task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      tags: newTask.tags,
      priority: newTask.priority,
      dueDate: newTask.dueDate,
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    }

    setTasks([task, ...tasks])
    setNewTask({ title: '', description: '', tags: [], priority: 'medium', dueDate: '' })
    setShowAddModal(false)
  }

  const updateTask = () => {
    if (!editingTask || !editingTask.title.trim()) return

    setTasks(tasks.map(t => t.id === editingTask.id ? editingTask : t))
    setEditingTask(null)
  }

  const toggleComplete = (taskId) => {
    setTasks(tasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t
    ))
  }

  const archiveTask = (taskId) => {
    setTasks(tasks.map(t =>
      t.id === taskId ? { ...t, archived: true, archivedAt: new Date().toISOString() } : t
    ))
  }

  const deleteTask = (taskId) => {
    setTasks(tasks.filter(t => t.id !== taskId))
  }

  const restoreTask = (taskId) => {
    setTasks(tasks.map(t =>
      t.id === taskId ? { ...t, archived: false, archivedAt: null } : t
    ))
  }

  const toggleTag = (tagId, isEditing = false) => {
    if (isEditing && editingTask) {
      const tags = editingTask.tags.includes(tagId)
        ? editingTask.tags.filter(t => t !== tagId)
        : [...editingTask.tags, tagId]
      setEditingTask({ ...editingTask, tags })
    } else {
      const tags = newTask.tags.includes(tagId)
        ? newTask.tags.filter(t => t !== tagId)
        : [...newTask.tags, tagId]
      setNewTask({ ...newTask, tags })
    }
  }

  const exportTasks = () => {
    const data = JSON.stringify(tasks, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flair-tasks-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const importTasks = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result)
        if (Array.isArray(imported)) {
          setTasks([...imported, ...tasks])
        }
      } catch (err) {
        alert('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }

  const clearCompleted = () => {
    setTasks(tasks.map(t => t.completed ? { ...t, archived: true, archivedAt: new Date().toISOString() } : t))
  }

  const deleteAllArchived = () => {
    if (confirm('Delete all archived tasks? This cannot be undone.')) {
      setTasks(tasks.filter(t => !t.archived))
    }
  }

  const importStrategicPlan = async () => {
    setLoadingStrategic(true)
    try {
      const res = await fetch('/api/seed-tasks')
      const data = await res.json()

      if (data.tasks && Array.isArray(data.tasks)) {
        // Get existing task IDs to avoid duplicates
        const existingIds = new Set(tasks.map(t => t.id))

        // Filter out tasks that already exist
        const newTasks = data.tasks.filter(t => !existingIds.has(t.id))

        if (newTasks.length === 0) {
          alert('Strategic tasks already imported!')
        } else {
          setTasks([...newTasks, ...tasks])
          alert(`Imported ${newTasks.length} strategic tasks!`)
        }
      }
    } catch (err) {
      console.error('Error importing strategic tasks:', err)
      alert('Failed to import strategic tasks')
    } finally {
      setLoadingStrategic(false)
    }
  }

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (showArchived !== t.archived) return false
    if (filterTag && !t.tags.includes(filterTag)) return false
    if (filterPriority && t.priority !== filterPriority) return false
    return true
  })

  // Sort: incomplete first, then by priority, then by date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  const stats = {
    total: tasks.filter(t => !t.archived).length,
    completed: tasks.filter(t => t.completed && !t.archived).length,
    urgent: tasks.filter(t => !t.completed && !t.archived && t.priority === 'high').length,
    archived: tasks.filter(t => t.archived).length,
  }

  const getTagStyle = (tagId) => {
    return TAGS.find(t => t.id === tagId)?.color || 'bg-gray-100 text-gray-700'
  }

  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Manager</h1>
          <p className="text-gray-500 mt-1">Track and manage your business tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={importStrategicPlan}
            disabled={loadingStrategic}
            className="flex items-center gap-2 px-3 py-2 text-sm text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg disabled:opacity-50"
          >
            {loadingStrategic ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Strategic Plan
          </button>
          <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer">
            <Upload className="w-4 h-4" />
            Import
            <input type="file" accept=".json" onChange={importTasks} className="hidden" />
          </label>
          <button
            onClick={exportTasks}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Active Tasks</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.urgent}</p>
              <p className="text-sm text-gray-500">High Priority</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Archive className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.archived}</p>
              <p className="text-sm text-gray-500">Archived</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showArchived ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {showArchived ? 'Show Active' : 'Show Archived'}
        </button>
        <div className="h-6 w-px bg-gray-200" />
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filter:</span>
        </div>
        <select
          value={filterTag || ''}
          onChange={(e) => setFilterTag(e.target.value || null)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Tags</option>
          {TAGS.map(tag => (
            <option key={tag.id} value={tag.id}>{tag.label}</option>
          ))}
        </select>
        <select
          value={filterPriority || ''}
          onChange={(e) => setFilterPriority(e.target.value || null)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        {(filterTag || filterPriority) && (
          <button
            onClick={() => { setFilterTag(null); setFilterPriority(null) }}
            className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
        <div className="flex-1" />
        {!showArchived && stats.completed > 0 && (
          <button
            onClick={clearCompleted}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Archive completed
          </button>
        )}
        {showArchived && stats.archived > 0 && (
          <button
            onClick={deleteAllArchived}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Delete all archived
          </button>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {sortedTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">
              {showArchived ? 'No archived tasks' : 'No tasks yet. Add one to get started!'}
            </p>
          </div>
        ) : (
          sortedTasks.map(task => (
            <div
              key={task.id}
              className={`bg-white rounded-xl border border-gray-200 p-4 transition-all ${
                task.completed ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                {!task.archived && (
                  <button
                    onClick={() => toggleComplete(task.id)}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      task.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {task.completed && <Check className="w-3 h-3" />}
                  </button>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-medium text-gray-900 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-1">
                      {/* Priority indicator */}
                      <span className={`text-xs font-medium ${PRIORITIES.find(p => p.id === task.priority)?.color}`}>
                        {task.priority === 'high' && '!!!'}
                        {task.priority === 'medium' && '!!'}
                        {task.priority === 'low' && '!'}
                      </span>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                  )}

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {/* Tags */}
                    {task.tags.map(tagId => {
                      const tag = TAGS.find(t => t.id === tagId)
                      return tag ? (
                        <span
                          key={tagId}
                          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${tag.color}`}
                        >
                          {tag.label}
                        </span>
                      ) : null
                    })}

                    {/* Due date */}
                    {task.dueDate && (
                      <span className={`flex items-center gap-1 text-xs ${
                        isOverdue(task.dueDate) ? 'text-red-600 font-medium' : 'text-gray-500'
                      }`}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(task.dueDate)}
                        {isOverdue(task.dueDate) && ' (overdue)'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {task.archived ? (
                    <>
                      <button
                        onClick={() => restoreTask(task.id)}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        title="Restore"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Edit"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => archiveTask(task.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New Task</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="What needs to be done?"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Add more details..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                        newTask.tags.includes(tag.id)
                          ? tag.color
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={addTask}
                disabled={!newTask.title.trim()}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Edit Task</h2>
              <button
                onClick={() => setEditingTask(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id, true)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                        editingTask.tags.includes(tag.id)
                          ? tag.color
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editingTask.dueDate || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  deleteTask(editingTask.id)
                  setEditingTask(null)
                }}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={updateTask}
                  disabled={!editingTask.title.trim()}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Export tags for use in other components
export { TAGS }
