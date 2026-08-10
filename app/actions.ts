'use server'
import { insertActivity } from '@/lib/queries'
import { detectPlatform, detectActivityType, extractSubreddit, scrapeActivity } from '@/lib/scraper'
import { revalidatePath } from 'next/cache'

export async function logActivityAction(formData: FormData) {
  const url = (formData.get('url') as string)?.trim()
  const platform = (formData.get('platform') as string) || detectPlatform(url)
  const activity_type = (formData.get('activity_type') as string) || detectActivityType(url)
  const date_posted = formData.get('date_posted') as string
  const title = (formData.get('title') as string)?.trim() || undefined
  const notes = (formData.get('notes') as string)?.trim() || undefined
  const logged_by = (formData.get('logged_by') as string)?.trim() || undefined
  const topic_tags: string[] = formData.getAll('topic_tags') as string[]
  
  // Subreddit (auto-extract from Reddit URL if left empty)
  let subreddit = (formData.get('subreddit') as string)?.trim() || undefined
  if (platform === 'Reddit' && !subreddit && url) {
    subreddit = extractSubreddit(url) || undefined
  }

  // Is Promotional (Enacton Mentioned)
  const is_promotional = formData.get('is_promotional') === '1' ? 1 : 0

  // Validate
  if (!url) return { success: false, error: 'URL is required' }
  if (!date_posted) return { success: false, error: 'Date is required' }
  if (!topic_tags.length) return { success: false, error: 'Select at least one topic' }

  // Handle screenshot: convert to base64
  let screenshot: string | undefined
  const screenshotFile = formData.get('screenshot') as File | null
  if (screenshotFile && screenshotFile.size > 0) {
    const buffer = await screenshotFile.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mime = screenshotFile.type || 'image/png'
    screenshot = `data:${mime};base64,${base64}`
  }

  const result = insertActivity({
    date_posted,
    platform,
    activity_type,
    subreddit,
    is_promotional,
    url,
    title,
    topic_tags,
    notes,
    screenshot,
    logged_by,
  })

  if (!result.success) {
    if (result.error === 'DUPLICATE_URL') {
      return { success: false, error: 'This URL is already logged. Check the Activity Feed.' }
    }
    return { success: false, error: result.error || 'Failed to save' }
  }

  // Get the ID of the newly inserted row for scraping
  const { getActivityByUrl } = await import('@/lib/queries')
  const saved = getActivityByUrl(url)
  if (saved) {
    // Fire-and-forget scrape (does not block form response)
    scrapeActivity(url, saved.id).catch(() => {})
  }

  revalidatePath('/')
  revalidatePath('/feed')
  return { success: true }
}
