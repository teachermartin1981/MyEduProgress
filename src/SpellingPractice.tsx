import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Headphones, RotateCcw, Volume2, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from './lib/supabase'
import SpellingAssessment from './SpellingAssessment'

type WordRow = {
  id: string
  word: string
  english_description: string
  context_sentence: string
  accepted_spellings: string[]
  sort_order: number
}
type Props = {
  list: { id: string; title: string; grade_label: string; list_number: number }
  onBack: () => void
  studentSessionToken?: string
}

function speak(text: string, voiceURI = '') {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = window.speechSynthesis.getVoices().find(item => item.voiceURI === voiceURI)
  if (voice) { utterance.voice = voice; utterance.lang = voice.lang }
  else utterance.lang = 'en-GB'
  utterance.rate = 0.86
  window.speechSynthesis.speak(utterance)
}

function speakSequence(parts: string[], voiceURI = '') {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const queue = [...parts]
  const playNext = () => {
    const text = queue.shift()
    if (!text) return
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = window.speechSynthesis.getVoices().find(item => item.voiceURI === voiceURI)
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang }
    else utterance.lang = 'en-GB'
    utterance.rate = 0.88
    utterance.onend = playNext
    window.speechSynthesis.speak(utterance)
  }
  playNext()
}

export default function SpellingPractice({ list, onBack, studentSessionToken }: Props) {
  const [words, setWords] = useState<WordRow[]>([])
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState(false)
  const [showMeaning, setShowMeaning] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assessmentMode, setAssessmentMode] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceURI, setVoiceURI] = useState(() => { try { return localStorage.getItem('eduassess-spelling-voice') || '' } catch { return '' } })

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const refreshVoices = () => {
      const english = window.speechSynthesis.getVoices().filter(voice => /^en(-|_)/i.test(voice.lang))
      setVoices(english)
      setVoiceURI(current => {
        if (current && english.some(voice => voice.voiceURI === current)) return current
        let saved = ''
        try { saved = localStorage.getItem('eduassess-spelling-voice') || '' } catch {}
        const preferred = english.find(voice => voice.voiceURI === saved) || english.find(voice => /^en-GB/i.test(voice.lang)) || english[0]
        return preferred?.voiceURI || ''
      })
    }
    refreshVoices()
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices)
  }, [])

  useEffect(() => {
    try { if (voiceURI) localStorage.setItem('eduassess-spelling-voice', voiceURI) } catch {}
  }, [voiceURI])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('spelling_word_bank')
        .select('id, word, english_description, context_sentence, accepted_spellings, sort_order')
        .eq('list_id', list.id)
        .eq('is_published', true)
        .order('sort_order')
      if (!active) return
      if (error) setError('The practice words could not be loaded. Please try again.')
      else if (!data?.length) setError('This list has no published words yet.')
      else setWords(data as WordRow[])
      setLoading(false)
    }
    void load()
    return () => { active = false; window.speechSynthesis?.cancel() }
  }, [list.id])

  const current = words[index]
  const accepted = useMemo(() => current ? [current.word, ...(current.accepted_spellings || [])].map(x => x.trim().toLocaleLowerCase()) : [], [current])
  const isCorrect = accepted.includes(answer.trim().toLocaleLowerCase())

  if (assessmentMode) return <SpellingAssessment list={list} studentSessionToken={studentSessionToken} voiceURI={voiceURI} onBack={() => setAssessmentMode(false)} />

  function replay() {
    if (!current) return
    speakSequence([current.word, current.context_sentence, 'Write down the word.', current.word], voiceURI)
  }

  function next() {
    window.speechSynthesis?.cancel()
    setIndex(value => Math.min(value + 1, words.length - 1))
    setAnswer('')
    setChecked(false)
  }

  function previous() {
    window.speechSynthesis?.cancel()
    setIndex(value => Math.max(value - 1, 0))
    setAnswer('')
    setChecked(false)
  }

  return <section className="spelling-practice">
    <div className="spelling-practice-top">
      <button className="spelling-back" onClick={() => { window.speechSynthesis?.cancel(); onBack() }}><ArrowLeft size={16}/> All spelling lists</button>
      <span>{list.grade_label} · List {list.list_number}</span>
    </div>
    <h2>{list.title}</h2>
    {loading ? <p className="spelling-state">Loading practice words…</p> : error ? <p className="spelling-state error">{error}</p> : current && <>
      <div className="spelling-practice-progress"><span>Word {index + 1} of {words.length}</span><div className="skill-track"><span style={{ width: ((index + 1) / words.length * 100) + '%' }}/></div></div>
      <div className="spelling-prompt spelling-prompt-compact">
        <div className="spelling-prompt-icon"><Headphones size={19}/></div>
        <h3>Listen, read and spell</h3>
        <p>Listen carefully. Use the sentence to help you work out which word you need to write.</p>
        <div className="spelling-audio-actions">
          <button className="spelling-audio-button" onClick={replay}><Volume2 size={15}/> Play word and sentence</button>
          <button className="spelling-replay-link" onClick={() => speak(current.word, voiceURI)}><RotateCcw size={13}/> Word only</button>
        </div>
      </div>
      <div className="spelling-context spelling-context-collapsed">
        <button className="spelling-context-toggle" onClick={() => setShowContext(value => !value)}>
          <span>CONTEXT SENTENCE</span>{showContext ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
        </button>
        {showContext && <p>{current.context_sentence}</p>}
      </div>
      <div className="spelling-meaning">
        <button onClick={() => setShowMeaning(value => !value)}>{showMeaning ? <EyeOff size={15}/> : <Eye size={15}/>} {showMeaning ? 'Hide meaning' : 'Show meaning'}</button>
        {showMeaning && <p>{current.english_description}</p>}
      </div>
      <form className="spelling-answer-form" onSubmit={event => { event.preventDefault(); setChecked(true) }}>
        <label htmlFor="spelling-practice-answer">Type the word you heard</label>
        <input id="spelling-practice-answer" value={answer} onChange={event => { setAnswer(event.target.value); setChecked(false) }} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} placeholder="Write your spelling here" />
        {!checked ? <button className="primary-button" type="submit" disabled={!answer.trim()}>Check spelling <CheckCircle2 size={17}/></button> : <div className={isCorrect ? 'spelling-feedback correct' : 'spelling-feedback retry'}>{isCorrect ? 'Correct! Well done.' : 'Not quite. Listen again and have another try.'}{!isCorrect && <button type="button" onClick={() => { setAnswer(''); setChecked(false) }}>Try again</button>}</div>}
      </form>
      {words.length >= 25 && <div className="spelling-assessment-launch"><div><strong>Ready to test your spelling?</strong><p>25 random words · 24 correct answers needed to pass</p></div><button className="primary-button" onClick={() => setAssessmentMode(true)}>Take mastery test <ArrowRight size={16}/></button></div>}
      <div className="spelling-voice-setting"><label htmlFor="spelling-voice-select">Pronunciation accent</label><select id="spelling-voice-select" value={voiceURI} onChange={event => setVoiceURI(event.target.value)} disabled={!voices.length}><option value="">Default English voice</option>{voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}</select></div>
      <div className="spelling-practice-nav">
        <button className="secondary-button" onClick={previous} disabled={index === 0}>Previous</button>
        <span>{index + 1} / {words.length}</span>
        <button className="primary-button" onClick={next} disabled={index === words.length - 1}>Next word <ArrowRight size={16}/></button>
      </div>
    </>}
  </section>
}
