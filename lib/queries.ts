import 'server-only'
import { db } from './db'
import { randomUUID } from 'crypto'

export type Platform = 'Reddit' | 'Quora' | 'Dev.to' | 'Medium' | 'LinkedIn' | 'Facebook' | 'Instagram' | 'Other'
export type ActivityType = 'Article' | 'Post / Thread' | 'Comment / Answer'

export interface Activity {
  id: string
  created_at: string
  date_posted: string
  platform: Platform
  activity_type: ActivityType
  subreddit: string | null
  is_promotional: number // 1 = Mentioned Enacton, 0 = No Mention
  url: string
  title: string | null
  topic_tags: string
  notes: string | null
  screenshot: string | null
  logged_by: string | null
  scraped_upvotes: number
  scraped_comments: number
  scraped_views: number
  last_scraped_at: string | null
}

export interface Topic {
  id: string
  name: string
  color: string
  is_active: number
  created_at: string
}

const DEFAULT_TOPICS: Topic[] = [
  { id: '1', name: 'MVP Development & Rescue', color: '#8b5cf6', is_active: 1, created_at: '' },
  { id: '2', name: 'SaaS Development', color: '#3b82f6', is_active: 1, created_at: '' },
  { id: '3', name: 'AI / LLM Integration', color: '#06b6d4', is_active: 1, created_at: '' },
  { id: '4', name: 'React Native / Mobile', color: '#10b981', is_active: 1, created_at: '' },
  { id: '5', name: 'Custom Software Dev', color: '#f59e0b', is_active: 1, created_at: '' },
  { id: '6', name: 'Team Augmentation', color: '#ec4899', is_active: 1, created_at: '' },
  { id: '7', name: 'Technical Due Diligence', color: '#ef4444', is_active: 1, created_at: '' },
  { id: '8', name: 'Startup Advisory', color: '#84cc16', is_active: 1, created_at: '' },
  { id: '9', name: 'Other', color: '#6b7280', is_active: 1, created_at: '' },
]

// ─── Activities ───────────────────────────────────────────────

export function getAllActivities(): Activity[] {
  if (!db) return []
  try {
    return db.prepare(`SELECT * FROM activities ORDER BY date_posted DESC, created_at DESC`).all() as Activity[]
  } catch { return [] }
}

export function getActivitiesThisWeek(): Activity[] {
  if (!db) return []
  try {
    return db.prepare(`
      SELECT * FROM activities
      WHERE date(date_posted) >= date('now', '-7 days')
      ORDER BY date_posted DESC, created_at DESC
    `).all() as Activity[]
  } catch { return [] }
}

export function getActivitiesFiltered(platform?: string, topic?: string, promotional?: string): Activity[] {
  if (!db) return []
  try {
    let query = `SELECT * FROM activities WHERE 1=1`
    const params: string[] = []

    if (platform && platform !== 'all') {
      query += ` AND platform = ?`
      params.push(platform)
    }
    if (topic && topic !== 'all') {
      query += ` AND topic_tags LIKE ?`
      params.push(`%${topic}%`)
    }
    if (promotional && promotional !== 'all') {
      query += ` AND is_promotional = ?`
      params.push(promotional === 'yes' ? '1' : '0')
    }

    query += ` ORDER BY date_posted DESC, created_at DESC`
    return db.prepare(query).all(...params) as Activity[]
  } catch { return [] }
}

export function getActivityByUrl(url: string): Activity | undefined {
  if (!db) return undefined
  try {
    return db.prepare(`SELECT * FROM activities WHERE url = ?`).get(url) as Activity | undefined
  } catch { return undefined }
}

export function getActivityById(id: string): Activity | undefined {
  if (!db) return undefined
  try {
    return db.prepare(`SELECT * FROM activities WHERE id = ?`).get(id) as Activity | undefined
  } catch { return undefined }
}

export function insertActivity(data: {
  date_posted: string
  platform: string
  activity_type: string
  subreddit?: string
  is_promotional?: number
  url: string
  title?: string
  topic_tags: string[]
  notes?: string
  screenshot?: string
  logged_by?: string
}): { success: boolean; error?: string } {
  if (!db) return { success: false, error: 'Database connection not available.' }
  try {
    db.prepare(`
      INSERT INTO activities (id, date_posted, platform, activity_type, subreddit, is_promotional, url, title, topic_tags, notes, screenshot, logged_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      data.date_posted,
      data.platform,
      data.activity_type,
      data.subreddit || null,
      data.is_promotional ?? 0,
      data.url,
      data.title || null,
      JSON.stringify(data.topic_tags),
      data.notes || null,
      data.screenshot || null,
      data.logged_by || null
    )
    return { success: true }
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'DUPLICATE_URL' }
    }
    return { success: false, error: e.message }
  }
}

export function updateActivity(id: string, data: {
  date_posted: string
  platform: string
  activity_type: string
  subreddit?: string
  is_promotional?: number
  url: string
  title?: string
  topic_tags: string[]
  notes?: string
  logged_by?: string
}): { success: boolean; error?: string } {
  if (!db) return { success: false, error: 'Database connection not available.' }
  try {
    db.prepare(`
      UPDATE activities
      SET date_posted = ?,
          platform = ?,
          activity_type = ?,
          subreddit = ?,
          is_promotional = ?,
          url = ?,
          title = ?,
          topic_tags = ?,
          notes = ?,
          logged_by = ?
      WHERE id = ?
    `).run(
      data.date_posted,
      data.platform,
      data.activity_type,
      data.subreddit || null,
      data.is_promotional ?? 0,
      data.url,
      data.title || null,
      JSON.stringify(data.topic_tags),
      data.notes || null,
      data.logged_by || null,
      id
    )
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export function deleteActivity(id: string): { success: boolean; error?: string } {
  if (!db) return { success: false, error: 'Database connection not available.' }
  try {
    db.prepare(`DELETE FROM activities WHERE id = ?`).run(id)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export function updateScrapedMetrics(id: string, data: {
  scraped_upvotes?: number
  scraped_comments?: number
  scraped_views?: number
  title?: string
}) {
  if (!db) return
  try {
    db.prepare(`
      UPDATE activities
      SET scraped_upvotes = ?,
          scraped_comments = ?,
          scraped_views = ?,
          title = COALESCE(?, title),
          last_scraped_at = datetime('now')
      WHERE id = ?
    `).run(
      data.scraped_upvotes ?? 0,
      data.scraped_comments ?? 0,
      data.scraped_views ?? 0,
      data.title || null,
      id
    )
  } catch {}
}

// ─── Analytics Queries ────────────────────────────────────────

export function getWeeklyVelocity(): { week: string; count: number }[] {
  if (!db) return []
  try {
    return db.prepare(`
      SELECT
        strftime('%Y-W%W', date_posted) AS week,
        COUNT(*) AS count
      FROM activities
      WHERE date_posted >= date('now', '-84 days')
      GROUP BY week
      ORDER BY week ASC
    `).all() as { week: string; count: number }[]
  } catch { return [] }
}

export function getPlatformDistribution(): { platform: string; count: number }[] {
  if (!db) return []
  try {
    return db.prepare(`
      SELECT platform, COUNT(*) AS count
      FROM activities
      GROUP BY platform
      ORDER BY count DESC
    `).all() as { platform: string; count: number }[]
  } catch { return [] }
}

export function getActivityTypeBreakdown(): { activity_type: string; count: number }[] {
  if (!db) return []
  try {
    return db.prepare(`
      SELECT activity_type, COUNT(*) AS count
      FROM activities
      GROUP BY activity_type
      ORDER BY count DESC
    `).all() as { activity_type: string; count: number }[]
  } catch { return [] }
}

export function getTopLevelStats() {
  if (!db) return { total: 0, thisWeek: 0, thisMonth: 0, topPlatform: '—', promotionalCount: 0, organicCount: 0 }
  try {
    const total = (db.prepare(`SELECT COUNT(*) as c FROM activities`).get() as any)?.c || 0
    const thisWeek = (db.prepare(`
      SELECT COUNT(*) as c FROM activities
      WHERE date(date_posted) >= date('now', '-7 days')
    `).get() as any)?.c || 0
    const thisMonth = (db.prepare(`
      SELECT COUNT(*) as c FROM activities
      WHERE strftime('%Y-%m', date_posted) = strftime('%Y-%m', 'now')
    `).get() as any)?.c || 0
    const topPlatform = (db.prepare(`
      SELECT platform FROM activities
      GROUP BY platform ORDER BY COUNT(*) DESC LIMIT 1
    `).get() as any)?.platform || '—'
    const promotionalCount = (db.prepare(`
      SELECT COUNT(*) as c FROM activities WHERE is_promotional = 1
    `).get() as any)?.c || 0
    const organicCount = (db.prepare(`
      SELECT COUNT(*) as c FROM activities WHERE is_promotional = 0
    `).get() as any)?.c || 0

    return { total, thisWeek, thisMonth, topPlatform, promotionalCount, organicCount }
  } catch {
    return { total: 0, thisWeek: 0, thisMonth: 0, topPlatform: '—', promotionalCount: 0, organicCount: 0 }
  }
}

export function getPlatformWeeklyCount(): { platform: string; count: number }[] {
  if (!db) return []
  try {
    return db.prepare(`
      SELECT platform, COUNT(*) as count FROM activities
      WHERE date(date_posted) >= date('now', '-7 days')
      GROUP BY platform
    `).all() as { platform: string; count: number }[]
  } catch { return [] }
}

// ─── Topics ──────────────────────────────────────────────────

export function getAllTopics(): Topic[] {
  if (!db) return DEFAULT_TOPICS
  try {
    const topics = db.prepare(`SELECT * FROM topics ORDER BY name ASC`).all() as Topic[]
    return topics.length ? topics : DEFAULT_TOPICS
  } catch { return DEFAULT_TOPICS }
}

export function getActiveTopics(): Topic[] {
  if (!db) return DEFAULT_TOPICS
  try {
    const topics = db.prepare(`SELECT * FROM topics WHERE is_active = 1 ORDER BY name ASC`).all() as Topic[]
    return topics.length ? topics : DEFAULT_TOPICS
  } catch { return DEFAULT_TOPICS }
}

export function insertTopic(name: string, color: string): { success: boolean; error?: string } {
  if (!db) return { success: false, error: 'Database connection not available.' }
  try {
    db.prepare(`INSERT INTO topics (id, name, color) VALUES (?, ?, ?)`).run(randomUUID(), name, color)
    return { success: true }
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return { success: false, error: 'Topic already exists' }
    return { success: false, error: e.message }
  }
}

export function toggleTopic(id: string, isActive: boolean) {
  if (!db) return
  try { db.prepare(`UPDATE topics SET is_active = ? WHERE id = ?`).run(isActive ? 1 : 0, id) } catch {}
}

export function renameTopic(id: string, name: string) {
  if (!db) return
  try { db.prepare(`UPDATE topics SET name = ? WHERE id = ?`).run(name, id) } catch {}
}

// ─── Settings ────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  if (!db) return '10'
  try {
    const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as any
    return row?.value ?? '10'
  } catch { return '10' }
}

export function setSetting(key: string, value: string) {
  if (!db) return
  try { db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(key, value) } catch {}
}
