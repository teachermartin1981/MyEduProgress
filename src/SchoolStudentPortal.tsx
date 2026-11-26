import { useState } from 'react'
import { BookOpenCheck, LogOut, GraduationCap, SpellCheck, BookOpen, PenLine, Headphones, Languages, ClipboardList, Trophy, ChevronRight, ArrowLeft, Clock3, BarChart3 } from 'lucide-react'
import SpellingJourney from './SpellingJourney'

type Student = { id: string; student_number: string; display_name: string; workspace_id: string; workspace_name: string; class_id?: string | null; class_name?: string | null }
type Props = { student: Student; sessionToken: string; onSignOut: () => void }
type Section = 'home' | 'spelling' | 'reading' | 'writing' | 'listening' | 'grammar'

const journeys = [
 {id:'spelling' as const,title:'Spelling',subtitle:'Build accuracy and confidence',icon:SpellCheck,tone:'spelling',status:'Available'},
 {id:'reading' as const,title:'Reading',subtitle:'Understand texts and find meaning',icon:BookOpen,tone:'reading',status:'Coming soon'},
 {id:'writing' as const,title:'Writing',subtitle:'Develop ideas and express yourself',icon:PenLine,tone:'writing',status:'Coming soon'},
 {id:'listening' as const,title:'Listening',subtitle:'Train your ears and understanding',icon:Headphones,tone:'listening',status:'Coming soon'},
 {id:'grammar' as const,title:'Grammar',subtitle:'Learn how English works',icon:Languages,tone:'grammar',status:'Coming soon'},
]

export default function SchoolStudentPortal({student,sessionToken,onSignOut}:Props){
 const [section,setSection]=useState<Section>('home')
 const [notice,setNotice]=useState('')
 const activeJourney=journeys.find(item=>item.id===section)
 return <div className="student-portal-shell">
  <header className="workspace-topbar">
   <a className="brand" href={import.meta.env.BASE_URL} onClick={e=>{e.preventDefault();setSection('home')}}><span className="brand-mark"><BookOpenCheck size={21}/></span><span>MyEdu<span>Progress</span></span></a>
   <div className="workspace-user"><span>{student.display_name}</span><small>School student</small><button className="secondary-button" onClick={onSignOut}><LogOut size={16}/> Sign out</button></div>
  </header>
  <main className="workspace-main student-home-main">
  {section==='home'?<>
   <section className="workspace-welcome student-welcome"><div><div className="card-kicker">STUDENT DASHBOARD</div><h1>Welcome, {student.display_name}</h1><p>{student.workspace_name}</p><div className="student-profile-details"><div><span>Student ID</span><strong>{student.student_number}</strong></div><div><span>Class</span><strong>{student.class_name||'Not assigned'}</strong></div></div></div><div className="workspace-avatar"><GraduationCap size={25}/></div></section>
   <section className="student-cefr-card">
    <div className="student-cefr-main"><div><span className="student-card-kicker">ENGLISH PROGRESS</span><h2>Your English Level</h2><p>Based on your results across the five English skill areas.</p></div><div className="student-cefr-score"><strong>—</strong><span>/ 100</span><em>Not assessed yet</em></div></div>
    <div className="student-cefr-scale" aria-label="CEFR levels from A1 to C2">{['A1','A2','B1','B2','C1','C2'].map((level,i)=><div className="student-cefr-step" key={level}><span>{level}</span><small>{['Beginner','Elementary','Intermediate','Upper intermediate','Advanced','Proficient'][i]}</small></div>)}</div>
    <div className="student-cefr-footer"><span><BarChart3 size={16}/> Your next target will appear after your first assessment.</span><span>5 skill areas</span></div>
   </section>
   <section className="student-home-section"><div className="student-home-section-heading"><div><h2>My Learning</h2><p>Choose a subject to continue learning.</p></div></div>
    <div className="student-learning-grid">{journeys.map(item=>{const Icon=item.icon;return <button key={item.id} className="student-learning-card" onClick={()=>item.id==='spelling'?setSection('spelling'):setNotice(item.title+' activities are being prepared and will appear here soon.')}><span className={'student-learning-icon '+item.tone}><Icon size={23}/></span><span className="student-learning-copy"><strong>{item.title}</strong><small>{item.subtitle}</small><em>{item.status}</em></span><ChevronRight size={19} className="student-learning-arrow"/></button>})}</div>
    {notice&&<div className="student-coming-notice">{notice}<button onClick={()=>setNotice('')}>Dismiss</button></div>}
   </section>
   <section className="student-overview-grid">
    <article className="student-overview-card"><div className="student-home-section-heading"><div><h2>Open Assignments</h2><p>Tasks from your teachers.</p></div><ClipboardList size={20}/></div><div className="student-empty-state"><Clock3 size={20}/><strong>No open assignments</strong><span>When your teacher assigns work, it will appear here.</span></div></article>
    <article className="student-overview-card"><div className="student-home-section-heading"><div><h2>Latest Test Scores</h2><p>Your most recent results.</p></div><BarChart3 size={20}/></div><div className="student-empty-state"><BarChart3 size={20}/><strong>No test results yet</strong><span>Completed assessments and feedback will appear here.</span></div></article>
   </section>
   <section className="student-overall-card"><div><span className="student-card-kicker">YOUR PROGRESS</span><h2>Overall Learning Progress</h2><p>Your progress across all five learning areas will build up as you complete activities and assessments.</p></div><div className="student-progress-placeholder"><Trophy size={23}/><strong>Ready for your first challenge?</strong><span>Start with Spelling and keep building your skills.</span><button onClick={()=>setSection('spelling')}>Open Spelling <ChevronRight size={15}/></button></div></section>
   <p className="student-dashboard-footnote">Your results are personal to you. Keep practising, complete your assignments, and watch your progress grow.</p>
  </>:<div className="student-journey-page"><button className="student-journey-back" onClick={()=>setSection('home')}><ArrowLeft size={16}/> Back to dashboard</button><div className="student-journey-page-heading"><div className="student-learning-icon spelling"><SpellCheck size={25}/></div><div><span className="student-card-kicker">SELF-PACED MASTERY</span><h1>{activeJourney?.title} Journey</h1><p>{activeJourney?.subtitle}</p></div></div><SpellingJourney studentSessionToken={sessionToken}/></div>}
  </main>
 </div>
}
