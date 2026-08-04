'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ReferenceLine,
} from 'recharts'

const COLORS = ['#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b','#ec4899','#ef4444','#84cc16','#6b7280']

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color || '#a78bfa', fontSize: 14, fontWeight: 600 }}>
          {p.value} {p.name}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsCharts({
  velocity,
  platforms,
  types,
  topicData,
  weeklyTarget,
}: {
  velocity: { week: string; count: number }[]
  platforms: { platform: string; count: number }[]
  types: { activity_type: string; count: number }[]
  topicData: { name: string; count: number; color: string }[]
  weeklyTarget: number
}) {
  const maxTopicCount = Math.max(...topicData.map(t => t.count), 1)

  return (
    <div className="space-y-6">
      {/* Velocity Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="section-title mb-0">Content Velocity — Last 12 Weeks</div>
          <span className="text-xs text-slate-500">Dotted line = weekly target ({weeklyTarget})</span>
        </div>
        {velocity.length === 0 ? (
          <div className="text-center py-10 text-slate-600 text-sm">No data yet. Start logging activities.</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={velocity} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={weeklyTarget} stroke="#8b5cf6" strokeDasharray="6 3" strokeWidth={1.5} />
              <Bar dataKey="count" name="activities" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Platform + Types */}
      <div className="grid grid-cols-2 gap-6">
        {/* Platform Donut */}
        <div className="card">
          <div className="section-title">Platform Distribution</div>
          {platforms.length === 0 ? (
            <div className="text-center py-10 text-slate-600 text-sm">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={platforms} dataKey="count" nameKey="platform" cx="45%" cy="50%" outerRadius={80} innerRadius={48}>
                  {platforms.map((p, i) => (
                    <Cell key={p.platform} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
                  wrapperStyle={{ paddingLeft: 16 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity Type Breakdown */}
        <div className="card">
          <div className="section-title">Activity Type Breakdown</div>
          {types.length === 0 ? (
            <div className="text-center py-10 text-slate-600 text-sm">No data yet.</div>
          ) : (
            <div className="space-y-4 pt-4">
              {types.map((t, i) => {
                const total = types.reduce((s, x) => s + x.count, 0)
                const pct = total > 0 ? Math.round((t.count / total) * 100) : 0
                const color = ['#60a5fa', '#4ade80', '#a1a1aa'][i] ?? '#8b5cf6'
                return (
                  <div key={t.activity_type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{t.activity_type}</span>
                      <span className="text-slate-400">{t.count} <span className="text-slate-600">({pct}%)</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Topic Coverage */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="section-title mb-0">Topic Coverage</div>
          <span className="text-xs text-slate-600">Orange = needs attention (under 5 posts)</span>
        </div>
        {topicData.length === 0 ? (
          <div className="text-center py-10 text-slate-600 text-sm">No topics defined.</div>
        ) : (
          <div className="space-y-3">
            {topicData.map(topic => {
              const pct = maxTopicCount > 0 ? (topic.count / maxTopicCount) * 100 : 0
              const lowAlert = topic.count < 5
              return (
                <div key={topic.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: lowAlert ? '#f97316' : topic.color }} />
                      <span className={lowAlert ? 'text-orange-400' : 'text-slate-300'}>{topic.name}</span>
                      {lowAlert && <span className="text-orange-500 text-xs">⚠ low coverage</span>}
                    </div>
                    <span className="text-slate-400 font-semibold">{topic.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 2)}%`, background: lowAlert ? '#f97316' : topic.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
