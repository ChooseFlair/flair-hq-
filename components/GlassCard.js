// Reusable glassmorphism card components

export function GlassCard({ children, className = '', hover = true, padding = true }) {
  return (
    <div className={`
      bg-white/60 backdrop-blur-xl
      border border-white/50
      rounded-2xl
      shadow-[0_8px_32px_rgba(44,74,62,0.08)]
      ${hover ? 'hover:bg-white/80 hover:shadow-[0_12px_40px_rgba(44,74,62,0.12)] transition-all duration-300' : ''}
      ${padding ? 'p-6' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}

export function GlassCardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-b border-flair-100/50 bg-white/30 rounded-t-2xl ${className}`}>
      {children}
    </div>
  )
}

export function GlassMetric({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  trendValue,
  color = 'flair'
}) {
  const colorClasses = {
    flair: 'text-flair-600 bg-flair-50',
    sage: 'text-sage-600 bg-sage-50',
    cream: 'text-cream-600 bg-cream-50',
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    red: 'text-red-600 bg-red-50',
    orange: 'text-orange-600 bg-orange-50',
  }

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-5 hover:bg-white/80 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
          <p className="text-sm text-flair-500 font-medium">{label}</p>
        </div>
        {trend && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-flair-400'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
            {trendValue}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${colorClasses[color].split(' ')[0]}`}>{value}</p>
      {subValue && (
        <p className="text-xs text-flair-400 mt-1">{subValue}</p>
      )}
    </div>
  )
}

export function GlassButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const variants = {
    primary: 'bg-flair-700/90 text-white hover:bg-flair-600 shadow-lg shadow-flair-700/20',
    secondary: 'bg-white/60 text-flair-700 border border-flair-200 hover:bg-white/80',
    sage: 'bg-sage-400/90 text-white hover:bg-sage-500 shadow-lg shadow-sage-400/20',
    ghost: 'text-flair-600 hover:bg-flair-50',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={`
        backdrop-blur-sm rounded-xl font-medium
        transition-all duration-200 active:scale-[0.98]
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}

export function GlassInput({ className = '', ...props }) {
  return (
    <input
      className={`
        w-full px-4 py-3
        bg-white/50 backdrop-blur-sm
        border border-flair-100
        rounded-xl
        text-flair-700 placeholder-flair-300
        focus:bg-white/80 focus:border-flair-300 focus:ring-2 focus:ring-flair-100
        outline-none transition-all duration-200
        ${className}
      `}
      {...props}
    />
  )
}

export function GlassBadge({ children, color = 'flair', className = '' }) {
  const colors = {
    flair: 'bg-flair-100/80 text-flair-700 border-flair-200/50',
    sage: 'bg-sage-100/80 text-sage-700 border-sage-200/50',
    cream: 'bg-cream-100/80 text-cream-700 border-cream-200/50',
    green: 'bg-green-100/80 text-green-700 border-green-200/50',
    red: 'bg-red-100/80 text-red-700 border-red-200/50',
    blue: 'bg-blue-100/80 text-blue-700 border-blue-200/50',
    purple: 'bg-purple-100/80 text-purple-700 border-purple-200/50',
    orange: 'bg-orange-100/80 text-orange-700 border-orange-200/50',
    yellow: 'bg-yellow-100/80 text-yellow-700 border-yellow-200/50',
  }

  return (
    <span className={`
      inline-flex items-center px-2.5 py-1
      text-xs font-medium rounded-lg
      backdrop-blur-sm border
      ${colors[color]}
      ${className}
    `}>
      {children}
    </span>
  )
}

export function GlassTable({ children, className = '' }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(44,74,62,0.08)] ${className}`}>
      {children}
    </div>
  )
}

export function GlassGradient({ variant = 'flair', children, className = '' }) {
  const gradients = {
    flair: 'from-flair-600 to-flair-700',
    sage: 'from-sage-400 to-sage-500',
    cream: 'from-cream-400 to-cream-500',
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
  }

  return (
    <div className={`bg-gradient-to-br ${gradients[variant]} rounded-2xl p-6 text-white shadow-lg ${className}`}>
      {children}
    </div>
  )
}

export default GlassCard
