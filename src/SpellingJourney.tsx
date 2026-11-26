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

type ListStatus = SpellingList & { available_words: number }

export default function SpellingJourney() {
  const [lists, setLists] = useState<ListStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeList, setActiveList] = useState<ListStatus | null>(null)

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

      const counts = (words || []).reduce<Record<string, number>>((acc, row) => {
        acc[row.list_id] = (acc[row.list_id] || 0) + 1
        return acc
      }, {})

      if (active) {
        setLists((curriculum || []).map((list: SpellingList) => ({
          ...list,
          available_words: counts[list.id] || 0,
        })))
        setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  if (activeList) return <SpellingPractice list={activeList} onBack={() => setActiveList(null)} />

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
            return (
              <article className="spelling-list-card" key={list.id}>
                <div className="spelling-list-card-top">
                  <span>{list.grade_label}</span>
                  <small>List {list.list_number}</small>
                </div>
                <strong>{list.title}</strong>
                <div className="spelling-list-count"><b>{ready}</b> / {target} words ready</div>
                <div className="skill-track"><span style={{ width: percent + '%' }}/></div>
                <small className="spelling-list-foot">{ready >= target && target > 0 ? <><CheckCircle2 size={13}/> Ready to practise</> : 'Content preparation in progress'}</small>
                <button className="spelling-open-button" onClick={() => setActiveList(list)} disabled={ready === 0}>Practise this list</button>
              </article>
            )
          })}
        </div>
      }
      <p className="spelling-journey-note">Practise at your own pace. Assessment and automatic mastery tracking are the next development step.</p>
    </section>
  )
}
