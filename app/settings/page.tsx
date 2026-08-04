export const runtime = 'nodejs'
import { getAllTopics, getSetting } from '@/lib/queries'
import SettingsForm from '@/components/SettingsForm'

export default function SettingsPage() {
  const topics = getAllTopics()
  const weeklyTarget = getSetting('weekly_target') ?? '10'

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
