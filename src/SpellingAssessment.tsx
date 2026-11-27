import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Headphones, Loader2, Volume2, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from './lib/supabase'

type ListInfo = { id: string; title: string; grade_label: string; list_number: number }
type Question = { question_number: number; spoken_word: string; context_sentence: string; english_description: string }
type SavedAnswer = { question_number: number; answer: string; description_opened: boolean; replay_count: number }
type Result = {
  correct_count: number; total: number; score_percent: number; passed: boolean;
  required_correct: number; duration_seconds: number;
  answers: { question_number: number; submitted_answer: string; correct_answer: string; is_correct: boolean }[];
  unlocked_list: { title: string; grade_label: string; list_number: number } | null;
}
type Props = { list: ListInfo; onBack: () => void; studentSessionToken?: string; voiceURI?: string }

function playSequence(question: Question, voiceURI = '') {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const parts = [question.spoken_word, question.context_sentence, 'Write down the word.', question.spoken_word]
  let index = 0
  const next = () => {
    if (index >= parts.length) return
    const utterance = new SpeechSynthesisUtterance(parts[index++])
    utterance.rate = 0.88
    const voice = window.speechSynthesis.getVoices().find(item => item.voiceURI === voiceURI)
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang }
    else utterance.lang = 'en-GB'
    utterance.onend = next
    window.speechSynthesis.speak(utterance)
  }
  next()
}

export default function SpellingAssessment({ list, onBack, studentSessionToken, voiceURI = '' }: Props) {
  const [attemptId, setAttemptId] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [saved, setSaved] = useState<SavedAnswer[]>([])
  const [showMeaning, setShowMeaning] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [replays, setReplays] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let active = true
    supabase.functions.invoke('spelling-assessment', { body: { action: 'start_test', list_id: list.id, ...(studentSessionToken ? { session_token: studentSessionToken } : {}) } })
      .then(({ data, error: invokeError }) => {
        if (!active) return
        if (invokeError || data?.error) setError(data?.error || invokeError.message || 'The assessment could not be started.')
        else { setAttemptId(data.attempt_id); setQuestions(data.questions || []) }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; window.speechSynthesis?.cancel() }
  }, [list.id])

  const current = questions[index]
  useEffect(() => {
    if (current && !result) playSequence(current, voiceURI)
    return () => { window.speechSynthesis?.cancel() }
  }, [current, result, voiceURI])

  function snapshot(): SavedAnswer {
    return { question_number: index + 1, answer, description_opened: showMeaning, replay_count: replays }
  }
  function goNext() {
    setSaved(previous => [...previous.filter(x => x.question_number !== index + 1), snapshot()])
    setAnswer('')
    setShowMeaning(false)
    setReplays(0)
    setIndex(value => Math.min(value + 1, questions.length - 1))
  }
  function replay() {
    if (!current || replays >= 2) return
    setReplays(value => value + 1)
    playSequence(current, voiceURI)
  }
  async function submit() {
    if (!attemptId || questions.length !== 25) return
    const all = [...saved.filter(x => x.question_number !== index + 1), snapshot()]
    setSubmitting(true); setError('')
    const { data, error: invokeError } = await supabase.functions.invoke('spelling-assessment', {
      body: { action: 'submit_test', attempt_id: attemptId, answers: all, ...(studentSessionToken ? { session_token: studentSessionToken } : {}) },
    })
    setSubmitting(false)
    if (invokeError || data?.error) { setError(data?.error || invokeError.message || 'Your answers could not be submitted.'); return }
    window.speechSynthesis?.cancel()
    setResult(data as Result)
  }

  return <section className="spelling-practice spelling-assessment">
    <div className="spelling-practice-top">
      <button className="spelling-back" onClick={() => { window.speechSynthesis?.cancel(); onBack() }}><ArrowLeft size={16}/> Back to spelling lists</button>
      <span>MASTERY ASSESSMENT</span>
    </div>
    <h2>{list.title}</h2>
    {loading ? <p className="spelling-state"><Loader2 size={17}/> Preparing your 25-question assessment…</p> :
      error && !current && !result ? <div className="spelling-state error">{error}<button className="secondary-button" onClick={onBack}>Return to list</button></div> :
      result ? <div className="spelling-assessment-result">
        <div className="spelling-prompt-icon"><CheckCircle2 size={26}/></div>
        <h3>{result.passed ? 'List mastered!' : 'Keep practising'}</h3>
        <div className="spelling-score">{result.correct_count} / {result.total}</div>
        <p>You scored {result.score_percent}%. You need 24 out of 25 correct answers to pass.</p>
        <strong className={result.passed ? 'spelling-feedback correct' : 'spelling-feedback retry'}>{result.passed ? 'Passed — the next list is now unlocked.' : 'Not passed yet. Practise and try again.'}</strong>
        {result.unlocked_list && <p className="spelling-unlocked">Unlocked: {result.unlocked_list.grade_label} · List {result.unlocked_list.list_number} — {result.unlocked_list.title}</p>}
        <div className="spelling-review-list">{result.answers.map(item => <div key={item.question_number} className={item.is_correct ? 'correct' : 'retry'}><span>{item.question_number}.</span><span>{item.submitted_answer || 'No answer'}</span><strong>{item.correct_answer}</strong></div>)}</div>
        <button className="primary-button" onClick={onBack}>Return to spelling journey</button>
      </div> : current && <>
        <div className="spelling-assessment-rules">25 words · 2 additional replays · 24 correct to pass</div>
        <div className="spelling-practice-progress"><span>Question {index + 1} of 25</span><div className="skill-track"><span style={{ width: ((index + 1) / 25 * 100) + '%' }}/></div></div>
        <div className="spelling-test-audio-row">
          <button className="spelling-play-round" onClick={replay} disabled={replays >= 2} aria-label="Replay word and sentence"><Volume2 size={18}/></button>
          <span>Play word and sentence</span><small>{2-replays} replays left</small>
        </div>
        <div className="spelling-context spelling-context-collapsed">
          <button className="spelling-context-toggle" onClick={()=>setShowContext(v=>!v)}><span>SHOW CONTEXT SENTENCE</span>{showContext?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
          {showContext && <p>{current.context_sentence}</p>}
        </div>
        <div className="spelling-meaning">
          <button onClick={() => setShowMeaning(value => !value)}>{showMeaning ? <EyeOff size={15}/> : <Eye size={15}/>} {showMeaning ? 'Hide meaning' : 'Show meaning (optional)'}</button>
          {showMeaning && <p>{current.english_description}</p>}
        </div>
        <form className="spelling-answer-form" onSubmit={event => { event.preventDefault(); if (index < 24) goNext(); else void submit() }}>
          <label htmlFor="spelling-assessment-answer">Your spelling</label>
          <input id="spelling-assessment-answer" value={answer} onChange={event => setAnswer(event.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} placeholder="Type the word you heard" />
          <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : index < 24 ? 'Next question' : 'Submit assessment'} {submitting ? <Loader2 size={16}/> : <ArrowRight size={16}/>}</button>
        </form>
        {error && <p className="spelling-state error">{error}</p>}
        <div className="spelling-practice-nav"><span>Answers saved on this device for this attempt: {saved.length + 1} / 25</span></div>
      </>}
  </section>
}
