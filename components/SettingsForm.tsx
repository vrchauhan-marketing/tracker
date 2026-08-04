'use client'
import { useState, useTransition } from 'react'
import { addTopicAction, toggleTopicAction, renameTopicAction, saveWeeklyTargetAction } from '@/app/settings/actions'
import type { Topic } from '@/lib/queries'

const PRESET_COLORS = [
  '#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b','#ec4899','#ef4444','#84cc16','#6b7280','#f97316'
]

export default function SettingsForm({ topics, weeklyTarget }: { topics: Topic[]; weeklyTarget: string }) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#8b5cf6')
  const [addResult, setAddResult] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [target, setTarget] = useState(weeklyTarget)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('name', newName)
    fd.append('color', newColor)
    startTransition(async () => {
      const res = await addTopicAction(fd)
      if (res.success) { setNewName(''); setAddResult('Added!') }
      else setAddResult(res.error || 'Error')
      setTimeout(() => setAddResult(null), 2500)
    })
  }

  function handleToggle(id: string, current: number) {
    startTransition(() => toggleTopicAction(id, current === 0))
  }

  function handleRename(id: string) {
    if (!editName.trim()) return
    startTransition(async () => {
      await renameTopicAction(id, editName)
      setEditingId(null)
      setEditName('')
    })
  }

  function handleSaveTarget(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('weekly_target', target)
    startTransition(() => saveWeeklyTargetAction(fd))
  }

  return (
    <div className="space-y-6">
      {/* Weekly Target */}
      <div className="card">
        <div className="section-title">Weekly Activity Target</div>
        <p className="text-sm text-slate-500 mb-4">
          The dotted line on the Content Velocity chart. Set it to how many activities your team should log per week.
        </p>
        <form onSubmit={handleSaveTarget} className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            max="100"
            value={target}
            onChange={e => setTarget(e.target.value)}
            className="input"
            style={{ width: '120px' }}
          />
          <button type="submit" className="btn-primary" disabled={isPending}>Save Target</button>
        </form>
      </div>

      {/* Manage Topics */}
      <div className="card">
        <div className="section-title">Topic Tags</div>
        <p className="text-sm text-slate-500 mb-5">
          These are the GEO topics shown in the Log form dropdown and Analytics charts. Toggle to disable without deleting. Rename anytime.
        </p>

        <div className="space-y-2 mb-6">
          {topics.map(topic => (
            <div key={topic.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg"
              style={{ background: '#0f172a', border: '1px solid #1e293b', opacity: topic.is_active ? 1 : 0.5 }}>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: topic.color }} />
                {editingId === topic.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="input text-sm"
                      style={{ width: '220px', padding: '4px 8px' }}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(topic.id); if (e.key === 'Escape') setEditingId(null) }}
                      autoFocus
                    />
                    <button onClick={() => handleRename(topic.id)} className="btn-primary text-xs px-3 py-1">Save</button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary text-xs px-3 py-1">Cancel</button>
                  </div>
                ) : (
                  <span className="text-sm text-slate-300">{topic.name}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingId !== topic.id && (
                  <button
                    onClick={() => { setEditingId(topic.id); setEditName(topic.name) }}
                    className="text-slate-600 hover:text-slate-300 transition-colors text-xs px-2 py-1"
                  >Edit</button>
                )}
                <button
                  onClick={() => handleToggle(topic.id, topic.is_active)}
                  disabled={isPending}
                  className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                    topic.is_active
                      ? 'border-red-900 text-red-500 hover:bg-red-950'
                      : 'border-green-900 text-green-500 hover:bg-green-950'
                  }`}
                >
                  {topic.is_active ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add new topic */}
        <div className="pt-4" style={{ borderTop: '1px solid #1e293b' }}>
          <p className="text-sm font-medium text-slate-400 mb-3">Add New Topic</p>
          <form onSubmit={handleAdd} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="label">Topic Name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="input"
                placeholder="e.g. DevOps & Cloud"
                required
              />
            </div>
            <div>
              <label className="label">Color</label>
              <div className="flex gap-1.5 flex-wrap" style={{ maxWidth: '160px' }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setNewColor(c)}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                    style={{ background: c, outline: newColor === c ? '2px solid white' : 'none', outlineOffset: 2 }}
                  />
                ))}
              </div>
            </div>
            <button type="submit" className="btn-primary flex-shrink-0" disabled={isPending || !newName.trim()}>
              Add Topic
            </button>
          </form>
          {addResult && (
            <p className={`text-xs mt-2 ${addResult === 'Added!' ? 'text-green-400' : 'text-red-400'}`}>{addResult}</p>
          )}
        </div>
      </div>
    </div>
  )
}
