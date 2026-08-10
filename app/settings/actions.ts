'use server'
import { revalidatePath } from 'next/cache'
import { insertTopic, toggleTopic, renameTopic, setSetting } from '@/lib/queries'

export async function addTopicAction(formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const color = (formData.get('color') as string) ?? '#8b5cf6'
  if (!name) return { success: false, error: 'Topic name is required' }
  const result = await insertTopic(name, color)
  revalidatePath('/settings')
  revalidatePath('/log')
  return result
}

export async function toggleTopicAction(id: string, isActive: boolean) {
  await toggleTopic(id, isActive)
  revalidatePath('/settings')
  revalidatePath('/log')
}

export async function renameTopicAction(id: string, name: string) {
  if (!name.trim()) return
  await renameTopic(id, name.trim())
  revalidatePath('/settings')
}

export async function saveWeeklyTargetAction(formData: FormData) {
  const target = formData.get('weekly_target') as string
  const n = parseInt(target)
  if (!isNaN(n) && n > 0) {
    await setSetting('weekly_target', String(n))
  }
  revalidatePath('/analytics')
  revalidatePath('/')
}
