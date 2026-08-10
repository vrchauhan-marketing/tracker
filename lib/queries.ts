import 'server-only'
import { getSql } from './db'
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

export async function getAllActivities(): Promise<Activity[]> {
  const sql = await getSql()
  if (!sql) return []
  try {
    return await sql`SELECT * FROM activities ORDER BY date_posted DESC, created_at DESC` as any
  } catch { return [] }
}

export async function getActivitiesThisWeek(): Promise<Activity[]> {
  const sql = await getSql()
  if (!sql) return []
  try {
    return await sql`
      SELECT * FROM activities
      WHERE date_posted >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY date_posted DESC, created_at DESC
    ` as any
  } catch { return [] }
}

export async function getActivitiesFiltered(platform?: string, topic?: string, promotional?: string): Promise<Activity[]> {
  const sql = await getSql()
  if (!sql) return []
  try {
    let query = sql`SELECT * FROM activities WHERE 1=1`

    if (platform && platform !== 'all') {
      query = sql`${query} AND platform = ${platform}`
    }
    if (topic && topic !== 'all') {
      query = sql`${query} AND topic_tags LIKE ${'%' + topic + '%'}`
    }
    if (promotional && promotional !== 'all') {
      query = sql`${query} AND is_promotional = ${promotional === 'yes' ? 1 : 0}`
    }

    query = sql`${query} ORDER BY date_posted DESC, created_at DESC`
    return await query as any
  } catch { return [] }
}

export async function getActivityByUrl(url: string): Promise<Activity | undefined> {
  const sql = await getSql()
  if (!sql) return undefined
  try {
    const rows = await sql`SELECT * FROM activities WHERE url = ${url}`
    return rows[0] as any
  } catch { return undefined }
}

export async function getActivityById(id: string): Promise<Activity | undefined> {
  const sql = await getSql()
  if (!sql) return undefined
  try {
    const rows = await sql`SELECT * FROM activities WHERE id = ${id}`
    return rows[0] as any
  } catch { return undefined }
}

export async function insertActivity(data: {
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
}): Promise<{ success: boolean; error?: string }> {
  const sql = await getSql()
  if (!sql) return { success: false, error: 'Database connection not available.' }
  try {
    await sql`
      INSERT INTO activities (id, date_posted, platform, activity_type, subreddit, is_promotional, url, title, topic_tags, notes, screenshot, logged_by)
      VALUES (
        ${randomUUID()},
        ${data.date_posted},
        ${data.platform},
        ${data.activity_type},
        ${data.subreddit || null},
        ${data.is_promotional ?? 0},
        ${data.url},
        ${data.title || null},
        ${JSON.stringify(data.topic_tags)},
        ${data.notes || null},
        ${data.screenshot || null},
        ${data.logged_by || null}
      )
    `
    return { success: true }
  } catch (e: any) {
    if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
      return { success: false, error: 'DUPLICATE_URL' }
    }
    return { success: false, error: e.message }
  }
}

export async function updateActivity(id: string, data: {
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
}): Promise<{ success: boolean; error?: string }> {
  const sql = await getSql()
  if (!sql) return { success: false, error: 'Database connection not available.' }
  try {
    await sql`
      UPDATE activities
      SET date_posted = ${data.date_posted},
          platform = ${data.platform},
          activity_type = ${data.activity_type},
          subreddit = ${data.subreddit || null},
          is_promotional = ${data.is_promotional ?? 0},
          url = ${data.url},
          title = ${data.title || null},
          topic_tags = ${JSON.stringify(data.topic_tags)},
          notes = ${data.notes || null},
          logged_by = ${data.logged_by || null}
      WHERE id = ${id}
    `
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteActivity(id: string): Promise<{ success: boolean; error?: string }> {
  const sql = await getSql()
  if (!sql) return { success: false, error: 'Database connection not available.' }
  try {
    await sql`DELETE FROM activities WHERE id = ${id}`
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateScrapedMetrics(id: string, data: {
  scraped_upvotes?: number
  scraped_comments?: number
  scraped_views?: number
  title?: string
}) {
  const sql = await getSql()
  if (!sql) return
  try {
    await sql`
      UPDATE activities
      SET scraped_upvotes = ${data.scraped_upvotes ?? 0},
          scraped_comments = ${data.scraped_comments ?? 0},
          scraped_views = ${data.scraped_views ?? 0},
          title = COALESCE(${data.title || null}, title),
          last_scraped_at = NOW()
      WHERE id = ${id}
    `
  } catch {}
}

// ─── Analytics Queries ────────────────────────────────────────

export async function getWeeklyVelocity(): Promise<{ week: string; count: number }[]> {
  const sql = await getSql()
  if (!sql) return []
  try {
    return await sql`
      SELECT
        to_char(date_posted, 'YYYY-W"W"IW') AS week,
        COUNT(*)::int AS count
      FROM activities
      WHERE date_posted >= CURRENT_DATE - INTERVAL '84 days'
      GROUP BY week
      ORDER BY week ASC
    ` as any
  } catch { return [] }
}

export async function getPlatformDistribution(): Promise<{ platform: string; count: number }[]> {
  const sql = await getSql()
  if (!sql) return []
  try {
    return await sql`
      SELECT platform, COUNT(*)::int AS count
      FROM activities
      GROUP BY platform
      ORDER BY count DESC
    ` as any
  } catch { return [] }
}

export async function getActivityTypeBreakdown(): Promise<{ activity_type: string; count: number }[]> {
  const sql = await getSql()
  if (!sql) return []
  try {
    return await sql`
      SELECT activity_type, COUNT(*)::int AS count
      FROM activities
      GROUP BY activity_type
      ORDER BY count DESC
    ` as any
  } catch { return [] }
}

export async function getTopLevelStats() {
  const sql = await getSql()
  if (!sql) return { total: 0, thisWeek: 0, thisMonth: 0, topPlatform: '—', promotionalCount: 0, organicCount: 0 }
  try {
    const totalRow = await sql`SELECT COUNT(*)::int as c FROM activities`
    const total = totalRow[0]?.c || 0

    const thisWeekRow = await sql`
      SELECT COUNT(*)::int as c FROM activities
      WHERE date_posted >= CURRENT_DATE - INTERVAL '7 days'
    `
    const thisWeek = thisWeekRow[0]?.c || 0

    const thisMonthRow = await sql`
      SELECT COUNT(*)::int as c FROM activities
      WHERE to_char(date_posted, 'YYYY-MM') = to_char(CURRENT_DATE, 'YYYY-MM')
    `
    const thisMonth = thisMonthRow[0]?.c || 0

    const topPlatformRow = await sql`
      SELECT platform FROM activities
      GROUP BY platform ORDER BY COUNT(*) DESC LIMIT 1
    `
    const topPlatform = topPlatformRow[0]?.platform || '—'

    const promotionalRow = await sql`
      SELECT COUNT(*)::int as c FROM activities WHERE is_promotional = 1
    `
    const promotionalCount = promotionalRow[0]?.c || 0

    const organicRow = await sql`
      SELECT COUNT(*)::int as c FROM activities WHERE is_promotional = 0
    `
    const organicCount = organicRow[0]?.c || 0

    return { total, thisWeek, thisMonth, topPlatform, promotionalCount, organicCount }
  } catch {
    return { total: 0, thisWeek: 0, thisMonth: 0, topPlatform: '—', promotionalCount: 0, organicCount: 0 }
  }
}

export async function getPlatformWeeklyCount(): Promise<{ platform: string; count: number }[]> {
  const sql = await getSql()
  if (!sql) return []
  try {
    return await sql`
      SELECT platform, COUNT(*)::int as count FROM activities
      WHERE date_posted >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY platform
    ` as any
  } catch { return [] }
}

// ─── Topics ──────────────────────────────────────────────────

export async function getAllTopics(): Promise<Topic[]> {
  const sql = await getSql()
  if (!sql) return DEFAULT_TOPICS
  try {
    const topics = await sql`SELECT * FROM topics ORDER BY name ASC` as any
    return topics.length ? topics : DEFAULT_TOPICS
  } catch { return DEFAULT_TOPICS }
}

export async function getActiveTopics(): Promise<Topic[]> {
  const sql = await getSql()
  if (!sql) return DEFAULT_TOPICS
  try {
    const topics = await sql`SELECT * FROM topics WHERE is_active = 1 ORDER BY name ASC` as any
    return topics.length ? topics : DEFAULT_TOPICS
  } catch { return DEFAULT_TOPICS }
}

export async function insertTopic(name: string, color: string): Promise<{ success: boolean; error?: string }> {
  const sql = await getSql()
  if (!sql) return { success: false, error: 'Database connection not available.' }
  try {
    await sql`INSERT INTO topics (id, name, color) VALUES (${randomUUID()}, ${name}, ${color})`
    return { success: true }
  } catch (e: any) {
    if (e.message?.includes('unique') || e.message?.includes('duplicate')) return { success: false, error: 'Topic already exists' }
    return { success: false, error: e.message }
  }
}

export async function toggleTopic(id: string, isActive: boolean) {
  const sql = await getSql()
  if (!sql) return
  try { await sql`UPDATE topics SET is_active = ${isActive ? 1 : 0} WHERE id = ${id}` } catch {}
}

export async function renameTopic(id: string, name: string) {
  const sql = await getSql()
  if (!sql) return
  try { await sql`UPDATE topics SET name = ${name} WHERE id = ${id}` } catch {}
}

// ─── Settings ────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const sql = await getSql()
  if (!sql) return '10'
  try {
    const row = await sql`SELECT value FROM settings WHERE key = ${key}`
    return row[0]?.value ?? '10'
  } catch { return '10' }
}

export async function setSetting(key: string, value: string) {
  const sql = await getSql()
  if (!sql) return
  try { await sql`INSERT INTO settings (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value` } catch {}
}
