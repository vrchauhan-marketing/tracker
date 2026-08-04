export const runtime = 'nodejs'
import { getActivitiesFiltered, getActiveTopics } from '@/lib/queries'
import Link from 'next/link'
import FeedFilters from '@/components/FeedFilters'

const PLATFORM_CLASS: Record<string, string> = {
  Reddit: 'platform-reddit', Quora: 'platform-quora', 'Dev.to': 'platform-devto',
  Medium: 'platform-medium', LinkedIn: 'platform-linkedin', Other: 'platform-other',
}
const TYPE_CLASS: Record<string, string> = {
  'Article': 'badge-article', 'Post / Thread': 'badge-post', 'Comment / Answer': 'badge-comment',
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; topic?: string }>
}) {
  const params = await searchParams
  const platform = params.platform || 'all'
  const topic = params.topic || 'all'
  const activities = getActivitiesFiltered(platform, topic)
  const topics = getActiveTopics()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Feed</h1>
          <p className="text-slate-500 text-sm mt-1">{activities.length} activities logged</p>
        </div>
        <Link href="/log" className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Log Activity
        </Link>
      </div>

      {/* Filters Component (Client) */}
      <FeedFilters topics={topics} />

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {activities.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-500 text-sm">No activities found.</p>
            <Link href="/log" className="btn-primary mt-4 inline-block">Log your first activity</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="pl-6">Platform</th>
                  <th>Post</th>
                  <th>Topics</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Engagement</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {activities.map(a => {
                  const tags: string[] = JSON.parse(a.topic_tags || '[]')
                  return (
                    <tr key={a.id}>
                      <td className="pl-6">
                        <span className={`badge ${PLATFORM_CLASS[a.platform] ?? 'platform-other'}`}>{a.platform}</span>
                      </td>
                      <td style={{ maxWidth: '300px' }}>
                        <div className="flex items-start gap-2">
                          {a.screenshot && (
                            <img src={a.screenshot} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <a href={a.url} target="_blank" rel="noopener noreferrer"
                              className="text-slate-200 hover:text-violet-300 transition-colors text-sm leading-snug block">
                              {a.title || a.url}
                            </a>
                            {a.notes && (
                              <p className="text-xs text-slate-600 mt-0.5 truncate max-w-xs">{a.notes}</p>
                            )}
                          </div>
                        </div>
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
                      <td className="text-slate-500 text-xs whitespace-nowrap">{a.date_posted}</td>
                      <td className="text-slate-600 text-xs whitespace-nowrap">
                        {a.scraped_upvotes > 0 && <div>⬆ {a.scraped_upvotes}</div>}
                        {a.scraped_comments > 0 && <div>💬 {a.scraped_comments}</div>}
                        {a.scraped_views > 0 && <div>👁 {a.scraped_views}</div>}
                        {!a.scraped_upvotes && !a.scraped_comments && !a.scraped_views && (
                          <span className="text-slate-700">—</span>
                        )}
                        {a.last_scraped_at && (
                          <div className="text-slate-700 mt-0.5" style={{ fontSize: '0.65rem' }}>
                            scraped {a.last_scraped_at.split('T')[0]}
                          </div>
                        )}
                      </td>
                      <td className="text-slate-600 text-xs">{a.logged_by || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
