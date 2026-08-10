export const runtime = 'nodejs'
import { getTopLevelStats, getActivitiesThisWeek, getPlatformWeeklyCount } from '@/lib/queries'
import Link from 'next/link'

const PLATFORM_CLASS: Record<string, string> = {
  Reddit: 'platform-reddit', Quora: 'platform-quora', 'Dev.to': 'platform-devto',
  Medium: 'platform-medium', LinkedIn: 'platform-linkedin', Facebook: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
  Instagram: 'bg-pink-600/20 text-pink-400 border-pink-500/30', Other: 'platform-other',
}
const TYPE_CLASS: Record<string, string> = {
  'Article': 'badge-article', 'Post / Thread': 'badge-post', 'Comment / Answer': 'badge-comment',
}

export default async function ThisWeekPage() {
  const stats = await getTopLevelStats()
  const weekActivities = await getActivitiesThisWeek()
  const platformBreakdown = await getPlatformWeeklyCount()

  const topicCounts: Record<string, number> = {}
  weekActivities.forEach(a => {
    const tags: string[] = JSON.parse(a.topic_tags || '[]')
    tags.forEach(t => { topicCounts[t] = (topicCounts[t] ?? 0) + 1 })
  })
  const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">This Week</h1>
          <p className="text-slate-500 text-sm mt-1">Your GEO community activity snapshot</p>
        </div>
        <Link href="/log" className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Log Activity
        </Link>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Activities</div>
          <div className="text-xs text-slate-600 mt-1">All time</div>
        </div>
        <div className="stat-card" style={{ borderColor: '#8b5cf640' }}>
          <div className="stat-value" style={{ color: '#a78bfa' }}>{stats.thisWeek}</div>
          <div className="stat-label">This Week</div>
          {stats.thisWeek === 0 && (
            <div className="stat-delta-down">No activity yet</div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-value text-emerald-400">{stats.promotionalCount}</div>
          <div className="stat-label">Enacton Mentioned</div>
          <div className="text-xs text-slate-600 mt-1">{stats.organicCount} Organic Value Posts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-lg">{stats.topPlatform}</div>
          <div className="stat-label">Top Platform</div>
          <div className="text-xs text-slate-600 mt-1">All time</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Platform breakdown this week */}
        <div className="card">
          <div className="section-title">Platforms This Week</div>
          {platformBreakdown.length === 0 ? (
            <p className="text-slate-500 text-sm">No activity logged yet this week.</p>
          ) : (
            <div className="space-y-3">
              {platformBreakdown.map(p => (
                <div key={p.platform} className="flex items-center justify-between">
                  <span className={`badge ${PLATFORM_CLASS[p.platform] ?? 'platform-other'}`}>{p.platform}</span>
                  <span className="text-white font-semibold">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top topics this week */}
        <div className="card">
          <div className="section-title">Top Topics This Week</div>
          {topTopics.length === 0 ? (
            <p className="text-slate-500 text-sm">No topics logged this week.</p>
          ) : (
            <div className="space-y-3">
              {topTopics.map(([topic, count]) => (
                <div key={topic} className="flex items-center justify-between">
                  <span className="text-sm text-slate-300 truncate mr-2">{topic}</span>
                  <span className="text-white font-semibold flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick tip */}
        <div className="card" style={{ borderColor: '#8b5cf630', background: '#1a1040' }}>
          <div className="section-title" style={{ color: '#a78bfa' }}>💡 Daily Logging Routine</div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Track posts daily across Reddit, Quora, Dev.to, Medium, LinkedIn, Facebook, and Instagram. Specify if Enacton was mentioned.
          </p>
          <Link href="/log" className="btn-primary mt-4 inline-block text-center w-full" style={{ textAlign: 'center', display: 'block' }}>
            Log Post Now
          </Link>
        </div>
      </div>

      {/* Recent 5 activities */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="section-title mb-0">Recent Activity</div>
          <Link href="/feed" className="text-sm text-violet-400 hover:text-violet-300">View full feed →</Link>
        </div>

        {weekActivities.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-500 text-sm">Nothing logged this week yet.</p>
            <Link href="/log" className="btn-primary mt-4 inline-block">Log your first activity</Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Post / Link</th>
                <th>Mention</th>
                <th>Topics</th>
                <th>Type</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {weekActivities.slice(0, 5).map(a => {
                const tags: string[] = JSON.parse(a.topic_tags || '[]')
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`badge ${PLATFORM_CLASS[a.platform] ?? 'platform-other'}`}>{a.platform}</span>
                        {a.subreddit && <span className="text-[0.7rem] px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-400 border border-orange-800/40 font-mono">{a.subreddit}</span>}
                      </div>
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <a href={a.url} target="_blank" rel="noopener noreferrer"
                        className="text-slate-200 hover:text-violet-300 transition-colors truncate block text-sm underline decoration-slate-700 underline-offset-2">
                        {a.title || a.url}
                      </a>
                    </td>
                    <td>
                      {a.is_promotional === 1 ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">🟢 Mentioned</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/50">⚪ Organic</span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 2).map(tag => (
                          <span key={tag} className="tag-pill text-xs" style={{ background: '#8b5cf620', color: '#c4b5fd', border: '1px solid #8b5cf640' }}>{tag}</span>
                        ))}
                        {tags.length > 2 && <span className="text-slate-500 text-xs">+{tags.length - 2}</span>}
                      </div>
                    </td>
                    <td><span className={`badge ${TYPE_CLASS[a.activity_type] ?? 'badge-comment'}`}>{a.activity_type}</span></td>
                    <td className="text-slate-500 text-xs">{a.date_posted}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
