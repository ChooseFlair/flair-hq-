import { useState } from 'react'
import { format, subDays, subMonths, subYears, startOfYear } from 'date-fns'
import { Calendar, ChevronDown } from 'lucide-react'

const presets = [
  { label: '7d', value: '7d', days: 7 },
  { label: '30d', value: '30d', days: 30 },
  { label: '90d', value: '90d', days: 90 },
  { label: '6mo', value: '6m', months: 6 },
  { label: '1yr', value: '1y', years: 1 },
  { label: 'YTD', value: 'ytd', days: null },
  { label: 'All', value: 'all', years: 5 },
]

export default function DateRangePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handlePresetClick = (preset) => {
    let startDate, endDate
    endDate = new Date()

    if (preset.value === 'ytd') {
      startDate = startOfYear(new Date())
    } else if (preset.months) {
      startDate = subMonths(new Date(), preset.months)
    } else if (preset.years) {
      startDate = subYears(new Date(), preset.years)
    } else {
      startDate = subDays(new Date(), preset.days)
    }

    onChange({
      startDate,
      endDate,
      preset: preset.value,
    })
    setIsOpen(false)
  }

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({
        startDate: new Date(customStart),
        endDate: new Date(customEnd),
        preset: 'custom',
      })
      setIsOpen(false)
    }
  }

  const formatDateRange = () => {
    if (!value?.startDate || !value?.endDate) return 'Select dates'
    return `${format(value.startDate, 'MMM d')} - ${format(value.endDate, 'MMM d, yyyy')}`
  }

  const getPresetLabel = () => {
    const preset = presets.find(p => p.value === value?.preset)
    return preset?.label || 'Custom'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-gray-700">{getPresetLabel()}</span>
        <span className="text-gray-400">|</span>
        <span className="text-gray-600">{formatDateRange()}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {/* Presets */}
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Quick Select</p>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetClick(preset)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      value?.preset === preset.value
                        ? 'bg-green-100 text-green-700 font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Range */}
            <div className="p-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Custom Range</p>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500">Start</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500">End</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <button
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
                className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Custom Range
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
