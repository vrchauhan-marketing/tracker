export const runtime = 'nodejs'
import {
  getTopLevelStats,
  getWeeklyVelocity,
  getPlatformDistribution,
  getActivityTypeBreakdown,
  getAllTopics,
  getAllActivities,
  getSetting,
} from '@/lib/queries'
import AnalyticsCharts from '@/components/AnalyticsCharts'

export default async function AnalyticsPage() {
  const stats = await getTopLevelStats()
  const velocity = await getWeeklyVelocity()
  const platforms = await getPlatformDistribution()
  const types = await getActivityTypeBreakdown()
  const allTopics = await getAllTopics()
  const allActivities = await getAllActivities()
  const rawTarget = await getSetting('weekly_target')
  const weeklyTarget = parseInt(rawTarget ?? '10')

  // Calculate topic coverage from all activities
  const topicCounts: Record<string, number> = {}
  allActivities.forEach(a => {
    try {
      const tags: string[] = JSON.parse(a.topic_tags || '[]')
      tags.forEach(t => { topicCounts[t] = (topicCounts[t] ?? 0) + 1 })
    } catch {}
  })

  const topicData = allTopics
    .filter(t => t.is_active)
    .map(t => ({ name: t.name, count: topicCounts[t.name] ?? 0, color: t.color }))
    .sort((a, b) => b.count - a.count)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Your GEO performance overview</p>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Activities</div>
        </div>
        <div className="stat-card" style={{ borderColor: '#8b5cf640' }}>
          <div className="stat-value" style={{ color: '#a78bfa' }}>{stats.thisWeek}</div>
          <div className="stat-label">This Week</div>
          <div className={stats.thisWeek >= weeklyTarget ? 'stat-delta-up' : 'stat-delta-down'}>
            {stats.thisWeek >= weeklyTarget ? `✓ On target (${weeklyTarget})` : `Target: ${weeklyTarget}`}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.thisMonth}</div>
          <div className="stat-label">This Month</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-lg">{stats.topPlatform}</div>
          <div className="stat-label">Top Platform</div>
        </div>
      </div>

      {/* Charts (client component) */}
      <AnalyticsCharts
        velocity={velocity}
        platforms={platforms}
        types={types}
        topicData={topicData}
        weeklyTarget={weeklyTarget}
      />
    </div>
  )
}
