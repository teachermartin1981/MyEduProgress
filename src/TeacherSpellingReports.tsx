import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, BarChart3, CheckCircle2, Clock3, RefreshCw, SpellCheck, TrendingDown, Users } from 'lucide-react'
import { supabase } from './lib/supabase'

type ListInfo={grade_label:string;list_number:number;title:string}
type Progress={list_id:string;attempts_count:number;best_score:number;words_mastered?:number;is_unlocked:boolean;is_passed:boolean;passed_at:string|null;list:ListInfo|null}
type Attempt={id:string;list_id:string;correct_count:number|null;score_percent:number|null;passed:boolean|null;started_at:string;completed_at:string|null;duration_seconds:number|null;list:ListInfo|null}
type WeakWord={word:string;wrong:number;total:number;features:string[];focus:string|null;category:string|null}
type Student={id:string;student_number?:string;name:string;source:string;cefr_level?:string|null;progress:Progress[];attempts:Attempt[];weakWords:WeakWord[]}
type Props={workspaceId:string}
export default function TeacherSpellingReports({workspaceId}:Props){
 const [students,setStudents]=useState<Student[]>([])
 const [summary,setSummary]=useState({students:0,attempts:0,passed:0})
 const [selected,setSelected]=useState('')
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  const {data,error:invokeError}=await supabase.functions.invoke('spelling-reports',{body:{action:'teacher_spelling_report',workspace_id:workspaceId}})
  if(invokeError||data?.error){setError(data?.error||invokeError.message||'Could not load spelling reports.');setLoading(false);return}
  const rows=(data.students||[]) as Student[]
  setStudents(rows);setSummary(data.summary||{students:rows.length,attempts:0,passed:0})
  setSelected(current=>rows.some(s=>s.id===current)?current:rows[0]?.id||'')
  setLoading(false)
 },[workspaceId])
 useEffect(()=>{void load()},[load])
 const current=students.find(s=>s.id===selected)
 const avg=current?.attempts.length?Math.round(current.attempts.reduce((n,a)=>n+(a.score_percent||0),0)/current.attempts.length):0
 return <section className="teacher-spelling-reports">
  <div className="teacher-spelling-heading"><div><span className="student-kicker">LEARNER PERFORMANCE</span><h2><SpellCheck size={21}/> Spelling Progress &amp; Reports</h2><p>Review mastery, assessment history and spelling patterns for your students and learners who have granted you tutor access.</p></div><button className="management-refresh" onClick={()=>void load()} disabled={loading} title="Refresh reports"><RefreshCw size={16}/></button></div>
  {error&&<div className="management-notice error"><AlertCircle size={15}/>{error}</div>}
  <div className="teacher-spelling-summary">
   <div><Users size={18}/><span><b>{summary.students}</b><small>Learners</small></span></div>
   <div><BarChart3 size={18}/><span><b>{summary.attempts}</b><small>Completed tests</small></span></div>
   <div><CheckCircle2 size={18}/><span><b>{summary.passed}</b><small>Passed tests</small></span></div>
  </div>
  {loading?<div className="activity-empty">Loading spelling reports…</div>:students.length===0?<div className="activity-empty"><SpellCheck size={26}/><b>No spelling results yet</b><span>Student results will appear here after learners complete a spelling assessment. Independent learners appear after they grant you tutor access.</span></div>:<div className="teacher-spelling-layout">
   <aside className="teacher-spelling-roster"><h3>Learners <small>{students.length}</small></h3>{students.map(s=><button key={s.id} className={selected===s.id?'selected':''} onClick={()=>setSelected(s.id)}><span>{s.name}</span><small>{s.source==='workspace'?(s.student_number||'School student'):'Tutor access'} · {s.attempts.length} tests</small></button>)}</aside>
   {current&&<div className="teacher-spelling-detail">
    <div className="teacher-spelling-student-head"><div><h3>{current.name}</h3><p>{current.source==='workspace'?'School workspace student':'Independent learner · Read-only tutor access'}{current.cefr_level?' · '+current.cefr_level:''}</p></div><div className="teacher-spelling-average"><b>{avg}%</b><small>Average score</small></div></div>
    <div className="teacher-spelling-subhead"><h4>Mastery pathway</h4><span>{current.progress.filter(x=>x.is_passed).length} lists mastered</span></div>
    {current.progress.length===0?<p className="teacher-spelling-empty">No list progress recorded yet.</p>:<div className="teacher-spelling-progress">{current.progress.sort((a,b)=>(a.list?.grade_label||'').localeCompare(b.list?.grade_label||'')||(a.list?.list_number||0)-(b.list?.list_number||0)).map(p=><div key={p.list_id}><span className={p.is_passed?'passed':p.is_unlocked?'unlocked':'locked'}>{p.is_passed?<CheckCircle2 size={14}/>:p.is_unlocked?'●':'🔒'}</span><div><b>{p.list?.grade_label||'Spelling'} · List {p.list?.list_number||'—'}</b><small>{p.list?.title||'Curriculum list'} · {p.attempts_count} attempts · Best {p.best_score}/25</small></div><strong>{p.is_passed?'Mastered':p.is_unlocked?'In progress':'Locked'}</strong></div>)}</div>}
    <div className="teacher-spelling-subhead"><h4>Recent assessments</h4><span>{current.attempts.length} shown</span></div>
    {current.attempts.length===0?<p className="teacher-spelling-empty">No completed assessments yet.</p>:<div className="teacher-spelling-attempts"><div className="teacher-spelling-attempt-row header"><span>Assessment</span><span>Score</span><span>Result</span><span>Date</span></div>{current.attempts.map(a=><div className="teacher-spelling-attempt-row" key={a.id}><span>{a.list?.grade_label||'List'} · {a.list?.list_number||''}<small>{a.list?.title||'Spelling list'}</small></span><b>{a.correct_count??0}/25 ({a.score_percent??0}%)</b><strong className={a.passed?'passed':'retry'}>{a.passed?'Passed':'Retry'}</strong><time>{a.completed_at?new Date(a.completed_at).toLocaleDateString():'—'}</time></div>)}</div>}
    <div className="teacher-spelling-subhead"><h4><TrendingDown size={16}/> Words to revisit</h4><span>Based on incorrect responses</span></div>
    {current.weakWords.length===0?<p className="teacher-spelling-empty">No incorrect spelling responses recorded yet.</p>:<div className="teacher-spelling-weak">{current.weakWords.map(w=><div key={w.word}><b>{w.word}</b><span>{w.wrong} incorrect / {w.total} attempts</span><small>{w.features?.join(' · ')||w.focus||w.category||'Spelling practice'}</small></div>)}</div>}
   </div>}
  </div>}
  <p className="teacher-spelling-note"><Clock3 size={13}/> Reports update when you refresh or reopen this page. Student answers and spelling metadata are visible only to authorized workspace members or tutors with active access.</p>
 </section>
}
