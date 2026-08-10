export const runtime = 'nodejs'
import { getActivitiesFiltered, getActiveTopics } from '@/lib/queries'
import Link from 'next/link'
import FeedFilters from '@/components/FeedFilters'

const PLATFORM_CLASS: Record<string, string> = {
  Reddit: 'platform-reddit', Quora: 'platform-quora', 'Dev.to': 'platform-devto',
  Medium: 'platform-medium', LinkedIn: 'platform-linkedin', Facebook: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
  Instagram: 'bg-pink-600/20 text-pink-400 border-pink-500/30', Other: 'platform-other',
}
const TYPE_CLASS: Record<string, string> = {
  'Article': 'badge-article', 'Post / Thread': 'badge-post', 'Comment / Answer': 'badge-comment',
}

function formatDateHeader(dateStr: string): string {
  try {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'

    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; topic?: string; promotional?: string }>
}) {
  const params = await searchParams
  const platform = params.platform || 'all'
  const topic = params.topic || 'all'
  const promotional = params.promotional || 'all'

  const activities = getActivitiesFiltered(platform, topic, promotional)
  const topics = getActiveTopics()

  // Group activities by date_posted for Day-by-Day view
  const groupedByDate: Record<string, typeof activities> = {}
  activities.forEach(a => {
    const d = a.date_posted || 'Unknown Date'
    if (!groupedByDate[d]) groupedByDate[d] = []
    groupedByDate[d].push(a)
  })

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Feed</h1>
          <p className="text-slate-500 text-sm mt-1">{activities.length} total activities logged</p>
        </div>
        <Link href="/log" className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Log Activity
        </Link>
      </div>

      {/* Filters Component */}
      <FeedFilters topics={topics} />

      {activities.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-slate-400 font-medium">No activities found matching filters.</p>
          <Link href="/log" className="btn-primary mt-4 inline-block">Log new activity</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(dateStr => {
            const dayActivities = groupedByDate[dateStr]
            return (
              <div key={dateStr} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-md text-xs font-semibold bg-violet-950/80 text-violet-300 border border-violet-800/50">
                    📅 {formatDateHeader(dateStr)} ({dateStr})
                  </div>
                  <span className="text-xs text-slate-500">{dayActivities.length} post{dayActivities.length > 1 ? 's' : ''}</span>
                  <div className="flex-1 h-[1px] bg-slate-800/80" />
                </div>

                {/* Day Table */}
                <div className="card p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="pl-6">Platform</th>
                          <th>Post / Link</th>
                          <th>Mention</th>
                          <th>Topics</th>
                          <th>Type</th>
                          <th>Engagement</th>
                          <th>Logged By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayActivities.map(a => {
                          const tags: string[] = JSON.parse(a.topic_tags || '[]')
                          return (
                            <tr key={a.id}>
                              <td className="pl-6">
                                <div className="flex flex-col gap-1 items-start">
                                  <span className={`badge ${PLATFORM_CLASS[a.platform] ?? 'platform-other'}`}>{a.platform}</span>
                                  {a.subreddit && (
                                    <span className="text-[0.7rem] px-2 py-0.5 rounded bg-orange-950/60 text-orange-400 border border-orange-800/40 font-mono">
                                      {a.subreddit}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ maxWidth: '320px' }}>
                                <div className="flex items-start gap-2.5">
                                  {a.screenshot && (
                                    <img src={a.screenshot} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0 mt-0.5 border border-slate-700" />
                                  )}
                                  <div>
                                    <a
                                      href={a.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-slate-200 hover:text-violet-300 transition-colors text-sm leading-snug font-medium block underline decoration-slate-700 underline-offset-2 hover:decoration-violet-400"
                                    >
                                      {a.title || a.url}
                                    </a>
                                    {a.notes && (
                                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.notes}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                {a.is_promotional === 1 ? (
                                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 font-medium">
                                    🟢 Mentioned Enacton
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-800/60 text-slate-400 border border-slate-700/50">
                                    ⚪ Organic Value
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="flex flex-wrap gap-1">
                                  {tags.slice(0, 2).map(tag => (
                                    <span key={tag} className="tag-pill" style={{ background: '#8b5cf620', color: '#c4b5fd', border: '1px solid #8b5cf640', fontSize: '0.7rem' }}>{tag}</span>
                                  ))}
                                  {tags.length > 2 && <span className="text-slate-600 text-xs">+{tags.length - 2}</span>}
                                </div>
                              </td>
                              <td><span className={`badge ${TYPE_CLASS[a.activity_type] ?? 'badge-comment'}`}>{a.activity_type}</span></td>
                              <td className="text-slate-500 text-xs whitespace-nowrap">
                                {a.scraped_upvotes > 0 && <div>⬆ {a.scraped_upvotes}</div>}
                                {a.scraped_comments > 0 && <div>💬 {a.scraped_comments}</div>}
                                {a.scraped_views > 0 && <div>👁 {a.scraped_views}</div>}
                                {!a.scraped_upvotes && !a.scraped_comments && !a.scraped_views && (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                              <td className="text-slate-500 text-xs font-medium">{a.logged_by || '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
