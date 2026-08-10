export const runtime = 'nodejs'
import { getAllTopics, getSetting } from '@/lib/queries'
import SettingsForm from '@/components/SettingsForm'

export default async function SettingsPage() {
  const topics = await getAllTopics()
  const rawTarget = await getSetting('weekly_target')
  const weeklyTarget = rawTarget ?? '10'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage topic tags and dashboard preferences</p>
      </div>
      <SettingsForm topics={topics} weeklyTarget={weeklyTarget} />
    </div>
  )
}
