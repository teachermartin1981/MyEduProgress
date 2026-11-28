import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, RotateCcw, Volume2, ChevronDown, ChevronUp, Copy, Check, Loader2 } from 'lucide-react'
import { supabase } from './lib/supabase'
import SpellingAssessment from './SpellingAssessment'

type WordRow = { id: string; word: string; english_description: string; context_sentence: string; accepted_spellings: string[]; sort_order: number }
type WordStat = { attempts: number; correct: number; incorrect: number }
type Mode = 'progress' | 'practice' | 'test'
type Props = { list: { id: string; title: string; grade_label: string; list_number: number }; onBack: () => void; studentSessionToken?: string; initialMode?: Mode }

function play(parts: string[], voiceURI: string, rate = 0.88) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const queue = [...parts]
  const next = () => {
    const value = queue.shift()
    if (!value) return
    const utterance = new SpeechSynthesisUtterance(value)
    const voice = window.speechSynthesis.getVoices().find(item => item.voiceURI === voiceURI)
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang } else utterance.lang = 'en-GB'
    utterance.rate = rate
    utterance.onend = next
    window.speechSynthesis.speak(utterance)
  }
  next()
}

export default function SpellingPractice({ list, onBack, studentSessionToken, initialMode = 'practice' }: Props) {
  const mode = initialMode
  const [words, setWords] = useState<WordRow[]>([])
  const [stats, setStats] = useState<Record<string, WordStat>>({})
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [showMeaning, setShowMeaning] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceURI, setVoiceURI] = useState(() => { try { return localStorage.getItem('eduassess-spelling-voice') || '' } catch { return '' } })
  const current = words[index]

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const refresh = () => {
      const english = window.speechSynthesis.getVoices().filter(v => /^en(-|_)/i.test(v.lang))
      setVoices(english)
      setVoiceURI(old => old && english.some(v => v.voiceURI === old) ? old : english.find(v => v.voiceURI === localStorage.getItem('eduassess-spelling-voice'))?.voiceURI || english.find(v => /^en-GB/i.test(v.lang))?.voiceURI || english[0]?.voiceURI || '')
    }
    refresh()
    window.speechSynthesis.addEventListener('voiceschanged', refresh)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh)
  }, [])
  useEffect(() => { try { if (voiceURI) localStorage.setItem('eduassess-spelling-voice', voiceURI) } catch {} }, [voiceURI])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setError('')
      const { data, error: wordError } = await supabase.from('spelling_word_bank')
        .select('id,word,english_description,context_sentence,accepted_spellings,sort_order')
        .eq('list_id', list.id).eq('is_published', true).order('sort_order')
      if (!active) return
      if (wordError || !data?.length) { setError('The spelling words could not be loaded.'); setLoading(false); return }
      setWords(data as WordRow[])
      const { data: progress, error: progressError } = await supabase.functions.invoke('spelling-assessment', {
        body: { action: 'get_word_progress', list_id: list.id, ...(studentSessionToken ? { session_token: studentSessionToken } : {}) }
      })
      if (!active) return
      if (!progressError && progress?.stats) setStats(progress.stats)
      else if (progressError) setError('Word history could not be loaded. Please refresh.')
      setLoading(false)
    }
    void load()
    return () => { active = false; window.speechSynthesis?.cancel() }
  }, [list.id, studentSessionToken])

  if (mode === 'test') return <SpellingAssessment list={list} studentSessionToken={studentSessionToken} voiceURI={voiceURI} onBack={onBack} />

  function resetWord(nextIndex: number) {
    setIndex(nextIndex); setAnswer(''); setChecked(false); setCorrect(false); setShowContext(false); setShowMeaning(false); setCopied(false)
  }
  function playWord() {
    if (current) play([current.word, current.context_sentence, 'Write down the word.', current.word], voiceURI)
  }
  async function checkPractice(event: React.FormEvent) {
    event.preventDefault()
    if (!current || !answer.trim() || checked || saving) return
    setSaving(true); setError('')
    const { data, error: saveError } = await supabase.functions.invoke('spelling-assessment', {
      body: { action: 'record_practice', list_id: list.id, word_id: current.id, answer, ...(studentSessionToken ? { session_token: studentSessionToken } : {}) }
    })
    setSaving(false)
    if (saveError || data?.error) { setError(data?.error || 'Your answer could not be saved.'); return }
    setCorrect(Boolean(data.is_correct)); setChecked(true)
    setStats(old => {
      const prev = old[current.id] || { attempts: 0, correct: 0, incorrect: 0 }
      return { ...old, [current.id]: { attempts: prev.attempts + 1, correct: prev.correct + (data.is_correct ? 1 : 0), incorrect: prev.incorrect + (data.is_correct ? 0 : 1) } }
    })
  }
  async function copyWord() {
    if (!current) return
    try { await navigator.clipboard.writeText(current.word); setCopied(true) } catch { setError('Copy is not available in this browser.') }
  }

  return <section className="spelling-practice spelling-word-workspace">
    <div className="spelling-practice-top"><button className="spelling-back" onClick={()=>{window.speechSynthesis?.cancel();onBack()}}><ArrowLeft size={15}/> Spelling lists</button><span>{list.grade_label === 'Kindergarten' ? 'Foundation' : list.grade_label} · List {list.list_number}</span></div>
    <h2>{list.title}</h2>
    {loading ? <p className="spelling-state"><Loader2 size={16}/> Loading word history…</p> : mode === 'progress' ? <>
      <div className="spelling-progress-summary"><strong>Word progress</strong><span>{words.filter(w => (stats[w.id]?.attempts || 0) > 0).length} of {words.length} words practised</span></div>
      <div className="spelling-word-bank-grid">
        {words.map(word => { const s=stats[word.id] || {attempts:0,correct:0,incorrect:0}; const learned=s.correct>0; return <div className={`spelling-word-bank-tile ${learned?'is-learned':''}`} key={word.id}>
          <strong>{learned && <span className="spelling-word-check">✓ </span>}{word.word}</strong>
          {s.attempts>0 && <small className="spelling-mistakes">Mistakes: {s.incorrect}</small>}
          {s.attempts>0 && <small>Attempts: {s.attempts}</small>}
        </div> })}
      </div>
    </> : loading ? <p className="spelling-state"><Loader2 size={16}/> Loading words…</p> : error && !current ? <p className="spelling-state error">{error}</p> : current && <>
      <div className="spelling-practice-progress"><span>Word {index+1} of {words.length}</span><div className="skill-track"><span style={{width:((index+1)/words.length*100)+'%'}}/></div></div>
      <div className="spelling-practice-compact-prompt">
        <button className="spelling-play-round" onClick={playWord} aria-label="Play word and sentence"><Volume2 size={18}/></button>
        <div><strong>{mode === 'practice' ? 'Listen and practise' : 'Listen and spell'}</strong><small>{mode === 'practice' ? 'Listen as often as you need.' : 'Listen carefully and write the word.'}</small></div>
        {mode === 'practice' && <button className="spelling-word-only" onClick={()=>play([current.word],voiceURI)}><RotateCcw size={13}/> Word</button>}
      </div>
      <div className="spelling-context spelling-context-collapsed">
        <button className="spelling-context-toggle" onClick={()=>setShowContext(v=>!v)}><span>CONTEXT SENTENCE</span>{showContext?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
        {showContext && <p>{current.context_sentence}</p>}
      </div>
      <div className="spelling-meaning">
        <button onClick={()=>setShowMeaning(v=>!v)}>{showMeaning?<EyeOff size={14}/>:<Eye size={14}/>} {showMeaning?'Hide meaning':'Show meaning'}</button>
        {showMeaning && <p>{current.english_description}</p>}
      </div>
      <form className="spelling-answer-form spelling-answer-compact" onSubmit={checkPractice}>
        <label htmlFor="spelling-practice-answer">Your spelling</label>
        <input id="spelling-practice-answer" value={answer} onChange={e=>setAnswer(e.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} placeholder="Type the word you heard"/>
        {!checked ? <button className="primary-button" type="submit" disabled={!answer.trim() || saving}>{saving?'Saving…':'Check'}</button> : <div className={correct?'spelling-feedback correct':'spelling-feedback retry'}>
          {correct ? 'Correct!' : <>Not quite. The correct word is <strong>{current.word}</strong>. <button type="button" className="spelling-copy-word" onClick={copyWord}>{copied?<Check size={13}/>:<Copy size={13}/>} {copied?'Copied':'Copy word'}</button></>}
          <button type="button" onClick={()=>resetWord(Math.min(index+1,words.length-1))}>{index === words.length-1?'Finish':'Next word'} <ArrowRight size={14}/></button>
        </div>}
      </form>
      {error && <p className="spelling-state error">{error}</p>}
      <div className="spelling-practice-nav"><button className="secondary-button" onClick={()=>resetWord(Math.max(0,index-1))} disabled={index===0}>Previous</button><span>{index+1} / {words.length}</span><button className="secondary-button" onClick={()=>resetWord(Math.min(words.length-1,index+1))} disabled={index===words.length-1}>Skip <ArrowRight size={14}/></button></div>
    </>}
    <div className="spelling-voice-setting"><label htmlFor="spelling-voice-select">Pronunciation accent</label><select id="spelling-voice-select" value={voiceURI} onChange={e=>setVoiceURI(e.target.value)} disabled={!voices.length}><option value="">Default English voice</option>{voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}</select></div>
  </section>
}
