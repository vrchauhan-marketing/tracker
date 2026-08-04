import 'server-only'

export type Platform = 'Reddit' | 'Quora' | 'Dev.to' | 'Medium' | 'LinkedIn' | 'Other'
export type ActivityType = 'Article' | 'Post / Thread' | 'Comment / Answer'

// Detect platform from URL domain
export function detectPlatform(url: string): Platform {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    if (hostname.includes('reddit.com')) return 'Reddit'
    if (hostname.includes('quora.com')) return 'Quora'
    if (hostname.includes('dev.to')) return 'Dev.to'
    if (hostname.includes('medium.com')) return 'Medium'
    if (hostname.includes('linkedin.com')) return 'LinkedIn'
  } catch {}
  return 'Other'
}

// Detect activity type from URL pattern
export function detectActivityType(url: string): ActivityType {
  try {
    const lower = url.toLowerCase()
    // Reddit: /r/sub/comments/id/title = Post; /r/sub/comments/id/title/?context = Comment
    if (lower.includes('reddit.com') && lower.includes('/comments/')) {
      // If URL ends with comment hash or has context param it's a comment
      if (lower.includes('?context') || /#[a-z0-9]+$/.test(lower)) return 'Comment / Answer'
      return 'Post / Thread'
    }
    // Quora: question URLs are posts, /profile/ answers are answers
    if (lower.includes('quora.com')) {
      if (lower.includes('/answer/') || lower.includes('/profile/')) return 'Comment / Answer'
      return 'Post / Thread'
    }
    // Dev.to and Medium are always articles
    if (lower.includes('dev.to') || lower.includes('medium.com')) return 'Article'
  } catch {}
  return 'Post / Thread'
}

// Scrape metadata from a URL using available methods
export async function scrapeActivity(url: string, id: string): Promise<void> {
  const platform = detectPlatform(url)

  try {
    if (platform === 'Dev.to') {
      await scrapeDevTo(url, id)
    } else if (platform === 'Reddit') {
      await scrapeReddit(url, id)
    } else {
      await scrapeGeneric(url, id)
    }
  } catch (e) {
    // Scraping is best-effort — never throws to caller
    console.error(`[scraper] Failed for ${url}:`, e)
  }
}

async function scrapeDevTo(url: string, id: string): Promise<void> {
  // Dev.to has a public API — no key needed
  const slug = url.split('dev.to/').pop()?.replace(/\//g, '/')
  if (!slug) return

  const apiUrl = `https://dev.to/api/articles/${slug}`
  const res = await fetch(apiUrl, {
    headers: { 'User-Agent': 'EnactonTracker/1.0' },
    signal: AbortSignal.timeout(8000)
  })
  if (!res.ok) return

  const data = await res.json()
  const { updateScrapedMetrics } = await import('./queries')
  updateScrapedMetrics(id, {
    scraped_views: data.page_views_count ?? 0,
    scraped_upvotes: data.positive_reactions_count ?? 0,
    scraped_comments: data.comments_count ?? 0,
    title: data.title
  })
}

async function scrapeReddit(url: string, id: string): Promise<void> {
  // Use Reddit's JSON API (append .json to any Reddit URL)
  const jsonUrl = url.replace(/\/$/, '') + '.json'
  const res = await fetch(jsonUrl, {
    headers: { 'User-Agent': 'EnactonTracker/1.0' },
    signal: AbortSignal.timeout(8000)
  })
  if (!res.ok) return

  const data = await res.json()
  const post = data?.[0]?.data?.children?.[0]?.data
  if (!post) return

  const { updateScrapedMetrics } = await import('./queries')
  updateScrapedMetrics(id, {
    scraped_upvotes: post.score ?? 0,
    scraped_comments: post.num_comments ?? 0,
    scraped_views: post.view_count ?? 0,
    title: post.title
  })
}

async function scrapeGeneric(url: string, id: string): Promise<void> {
  // Try to fetch the page and extract Open Graph title
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'EnactonTracker/1.0' },
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) return
    const html = await res.text()
    const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<title>([^<]+)<\/title>/i)
    if (titleMatch?.[1]) {
      const { updateScrapedMetrics } = await import('./queries')
      updateScrapedMetrics(id, { title: titleMatch[1].trim() })
    }
  } catch {}
}
