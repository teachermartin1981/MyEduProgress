import { useEffect, useState } from 'react'
import { CheckCircle2, LockKeyhole, SpellCheck } from 'lucide-react'
import { supabase } from './lib/supabase'
import SpellingPractice from './SpellingPractice'

type SpellingList = {
  id: string
  grade_code: string
  grade_label: string
  grade_order: number
  list_number: number
  title: string
  target_word_count: number
}

type Progress = { list_id: string; attempts_count: number; best_score: number; is_unlocked: boolean; is_passed: boolean; passed_at: string | null }
type ListStatus = SpellingList & { available_words: number; progress?: Progress }

type Props = { studentSessionToken?: string }

export default function SpellingJourney({ studentSessionToken }: Props) {
  const [lists, setLists] = useState<ListStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeList, setActiveList] = useState<ListStatus | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const { data: curriculum, error: curriculumError } = await supabase
        .from('spelling_curriculum_lists')
        .select('id, grade_code, grade_label, grade_order, list_number, title, target_word_count')
        .eq('is_published', true)
        .order('grade_order')
        .order('list_number')

      if (curriculumError) {
        if (active) { setError('Spelling lists could not be loaded. Please try again later.'); setLoading(false) }
        return
      }

      const { data: words, error: wordsError } = await supabase
        .from('spelling_word_bank')
        .select('list_id')
        .eq('is_published', true)

      if (wordsError) {
        if (active) { setError('The spelling word bank could not be loaded. Please try again later.'); setLoading(false) }
        return
      }

      const { data: progressData } = await supabase.functions.invoke('spelling-assessment', { body: { action: 'get_progress', ...(studentSessionToken ? { session_token: studentSessionToken } : {}) } })
      const progressByList = new Map<string, Progress>((progressData?.progress || []).map((item: Progress) => [item.list_id, item] as [string, Progress]))
      const counts = (words || []).reduce<Record<string, number>>((acc, row) => {
        acc[row.list_id] = (acc[row.list_id] || 0) + 1
        return acc
      }, {})

      if (active) {
        setLists((curriculum || []).map((list: SpellingList, index: number) => ({
          ...list,
          available_words: counts[list.id] || 0,
          progress: progressByList.get(list.id) || (index === 0 ? { list_id: list.id, attempts_count: 0, best_score: 0, is_unlocked: true, is_passed: false, passed_at: null } : undefined),
        })))
        setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [refreshKey, studentSessionToken])

  if (activeList) return <SpellingPractice list={activeList} studentSessionToken={studentSessionToken} onBack={() => { setActiveList(null); setRefreshKey(value => value + 1) }} />

  return (
    <section className="spelling-journey-panel">
      <div className="spelling-journey-heading">
        <div>
          <span className="student-kicker">SELF-PACED MASTERY</span>
          <h3><SpellCheck size={20}/> Spelling Journey</h3>
          <p>Build spelling confidence one list at a time.</p>
        </div>
      </div>
      {loading ? <p className="spelling-state">Loading spelling lists…</p> :
        error ? <p className="spelling-state error">{error}</p> :
        lists.length === 0 ? <div className="spelling-state"><LockKeyhole size={17}/> Spelling lists are being prepared. Your first lists will appear here when they are published.</div> :
        <div className="spelling-list-grid">
          {lists.map(list => {
            const target = Math.max(0, Number(list.target_word_count) || 0)
            const ready = Math.min(list.available_words, target)
            const percent = target ? Math.round(ready / target * 100) : 0
            const unlocked = Boolean(list.progress?.is_unlocked)
            const passed = Boolean(list.progress?.is_passed)
            return (
              <article className="spelling-list-card" key={list.id}>
                <div className="spelling-list-card-top">
                  <span>{list.grade_label}</span>
                  <small>List {list.list_number}</small>
                </div>
                <strong>{list.title}</strong>
                <div className="spelling-list-count"><b>{ready}</b> / {target} words ready</div>
                <div className="skill-track"><span style={{ width: percent + '%' }}/></div>
                <small className="spelling-list-foot">{passed ? <><CheckCircle2 size={13}/> Mastered · Best score {list.progress?.best_score}/25</> : unlocked ? (ready >= 25 ? 'Unlocked · Ready to practise and test' : 'Unlocked · Content preparation in progress') : 'Locked · Pass the previous list first'}</small>
                <button className="spelling-open-button" onClick={() => setActiveList(list)} disabled={ready === 0 || !unlocked}>{unlocked ? 'Practise this list' : 'Locked'}</button>
              </article>
            )
          })}
        </div>
      }
      <p className="spelling-journey-note">Practise at your own pace. Pass each assessment with at least 24 out of 25 correct answers to unlock the next list.</p>
    </section>
  )
}
