import { getActiveTopics } from '@/lib/queries'
import LogForm from '@/components/LogForm'

export const runtime = 'nodejs'

export default async function LogPage() {
  const topics = await getActiveTopics()
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Log Activity</h1>
        <p className="text-slate-500 text-sm mt-1">Record a new community post, article, or answer</p>
      </div>
      <LogForm topics={topics} />
    </div>
  )
}
