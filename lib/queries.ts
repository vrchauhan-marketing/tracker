import 'server-only'
import { db } from './db'
import { randomUUID } from 'crypto'

export type Platform = 'Reddit' | 'Quora' | 'Dev.to' | 'Medium' | 'LinkedIn' | 'Other'
export type ActivityType = 'Article' | 'Post / Thread' | 'Comment / Answer'

export interface Activity {
  id: string
  created_at: string
  date_posted: string
  platform: Platform
  activity_type: ActivityType
  url: string
  title: string | null
  topic_tags: string  // JSON string
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

// ─── Activities ───────────────────────────────────────────────

export function getAllActivities(): Activity[] {
  return db.prepare(`
    SELECT * FROM activities ORDER BY date_posted DESC, created_at DESC
  `).all() as Activity[]
}

export function getActivitiesThisWeek(): Activity[] {
  return db.prepare(`
    SELECT * FROM activities
    WHERE date(date_posted) >= date('now', 'weekday 0', '-7 days')
    ORDER BY date_posted DESC
  `).all() as Activity[]
}

export function getActivitiesFiltered(platform?: string, topic?: string): Activity[] {
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

  query += ` ORDER BY date_posted DESC, created_at DESC`
  return db.prepare(query).all(...params) as Activity[]
}

export function getActivityByUrl(url: string): Activity | undefined {
  return db.prepare(`SELECT * FROM activities WHERE url = ?`).get(url) as Activity | undefined
}

export function insertActivity(data: {
  date_posted: string
  platform: string
  activity_type: string
  url: string
  title?: string
  topic_tags: string[]
  notes?: string
  screenshot?: string
  logged_by?: string
}): { success: boolean; error?: string } {
  try {
    db.prepare(`
      INSERT INTO activities (id, date_posted, platform, activity_type, url, title, topic_tags, notes, screenshot, logged_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      data.date_posted,
      data.platform,
      data.activity_type,
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

export function updateScrapedMetrics(id: string, data: {
  scraped_upvotes?: number
  scraped_comments?: number
  scraped_views?: number
  title?: string
}) {
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
}

// ─── Analytics Queries ────────────────────────────────────────

export function getWeeklyVelocity(): { week: string; count: number }[] {
  return db.prepare(`
    SELECT
      strftime('%Y-W%W', date_posted) AS week,
      COUNT(*) AS count
    FROM activities
    WHERE date_posted >= date('now', '-84 days')
    GROUP BY week
    ORDER BY week ASC
  `).all() as { week: string; count: number }[]
}

export function getPlatformDistribution(): { platform: string; count: number }[] {
  return db.prepare(`
    SELECT platform, COUNT(*) AS count
    FROM activities
    GROUP BY platform
    ORDER BY count DESC
  `).all() as { platform: string; count: number }[]
}

export function getActivityTypeBreakdown(): { activity_type: string; count: number }[] {
  return db.prepare(`
    SELECT activity_type, COUNT(*) AS count
    FROM activities
    GROUP BY activity_type
    ORDER BY count DESC
  `).all() as { activity_type: string; count: number }[]
}

export function getTopLevelStats() {
  const total = (db.prepare(`SELECT COUNT(*) as c FROM activities`).get() as any).c
  const thisWeek = (db.prepare(`
    SELECT COUNT(*) as c FROM activities
    WHERE date(date_posted) >= date('now', 'weekday 0', '-7 days')
  `).get() as any).c
  const thisMonth = (db.prepare(`
    SELECT COUNT(*) as c FROM activities
    WHERE strftime('%Y-%m', date_posted) = strftime('%Y-%m', 'now')
  `).get() as any).c
  const topPlatform = (db.prepare(`
    SELECT platform FROM activities
    GROUP BY platform ORDER BY COUNT(*) DESC LIMIT 1
  `).get() as any)?.platform || '—'

  return { total, thisWeek, thisMonth, topPlatform }
}

export function getPlatformWeeklyCount(): { platform: string; count: number }[] {
  return db.prepare(`
    SELECT platform, COUNT(*) as count FROM activities
    WHERE date(date_posted) >= date('now', 'weekday 0', '-7 days')
    GROUP BY platform
  `).all() as { platform: string; count: number }[]
}

// ─── Topics ──────────────────────────────────────────────────

export function getAllTopics(): Topic[] {
  return db.prepare(`SELECT * FROM topics ORDER BY name ASC`).all() as Topic[]
}

export function getActiveTopics(): Topic[] {
  return db.prepare(`SELECT * FROM topics WHERE is_active = 1 ORDER BY name ASC`).all() as Topic[]
}

export function insertTopic(name: string, color: string): { success: boolean; error?: string } {
  try {
    db.prepare(`INSERT INTO topics (id, name, color) VALUES (?, ?, ?)`).run(randomUUID(), name, color)
    return { success: true }
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return { success: false, error: 'Topic already exists' }
    return { success: false, error: e.message }
  }
}

export function toggleTopic(id: string, isActive: boolean) {
  db.prepare(`UPDATE topics SET is_active = ? WHERE id = ?`).run(isActive ? 1 : 0, id)
}

export function renameTopic(id: string, name: string) {
  db.prepare(`UPDATE topics SET name = ? WHERE id = ?`).run(name, id)
}

// ─── Settings ────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as any
  return row?.value ?? null
}

export function setSetting(key: string, value: string) {
  db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(key, value)
}
