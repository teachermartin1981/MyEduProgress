import { useState } from 'react'
import { ArrowLeft, BookOpen, BookOpenCheck, BookText, CheckCircle2, ChevronRight, Clock3, GraduationCap, LockKeyhole, Medal, SpellCheck, Trophy } from 'lucide-react'
import SpellingJourney from './SpellingJourney'

type Props = { onBack: () => void }

const journeys = [
  { id: 'placement', title: 'Placement Exams', subtitle: 'Discover and track your CEFR level', level: 'Last result: A2', icon: GraduationCap, detail: 'Your latest placement result is A2. Previous placement results will remain here so you can compare your progress over time.' },
  { id: 'grammar', title: 'Grammar Journey', subtitle: 'Topics mastered and topics to practise', level: '12 topics explored', icon: BookOpen, detail: 'See each grammar topic as mastered, needs practice or not studied yet. Your next recommended step will be based on your assessment results.' },
  { id: 'reading', title: 'Reading & Writing Journey', subtitle: 'Track reading and writing development', level: '2 skills in progress', icon: BookText, detail: 'Follow your reading comprehension and writing development, including teacher feedback and rubric results.' },
]

export default function StudentDashboard({ onBack }: Props) {
  const [openJourney, setOpenJourney] = useState<string | null>(null)
  const tasks = [
    { title: 'Writing: My Favourite Sport', by: 'Assigned by your teacher', due: 'Due Friday', status: 'Not started', tone: 'pending' },
    { title: 'Grammar: Future Tenses', by: 'Assigned by your teacher', due: 'Continue your work', status: 'In progress', tone: 'progress' },
  ]
  const scores = [
    { title: 'Grammar – Past Tenses', score: '85%', date: 'Today' },
    { title: 'Reading – School Life', score: '78%', date: 'Yesterday' },
    { title: 'Spelling – Level 2', score: '92%', date: 'Monday' },
  ]
  const skills = [{ name: 'Grammar', value: 72 }, { name: 'Reading', value: 64 }, { name: 'Vocabulary', value: 81 }, { name: 'Writing', value: 58 }]
  return (
    <div className="student-shell">
      <header className="student-topbar">
        <a className="brand" href="#" onClick={e => e.preventDefault()}><span className="brand-mark"><BookOpenCheck size={21}/></span><span>MyEdu<span>Progress</span></span></a>
        <button className="student-back" onClick={onBack}><ArrowLeft size={16}/> Back to login</button>
      </header>
      <main className="student-main">
        <div className="student-welcome">
          <div><div className="student-kicker">STUDENT DASHBOARD · PREVIEW</div><h1>Welcome back! <span>👋</span></h1><p>Your English learning journey, all in one place.</p></div>
          <div className="student-avatar"><GraduationCap size={25}/></div>
        </div>
        <div className="student-summary">
          <article className="student-stat level-stat"><span>Current English level</span><strong>A2</strong><small>CEFR level · Example</small></article>
          <article className="student-stat"><span>Completed assessments</span><strong>24</strong><small>Across your learning journeys</small></article>
        </div>
        <section className="student-section">
          <div className="student-section-heading"><div><h2>My Progress</h2><p>See how your English skills are developing.</p></div></div>
          <div className="student-progress-card">
            {skills.map(skill => <div className="skill-row" key={skill.name}><div className="skill-label"><span>{skill.name}</span><strong>{skill.value}%</strong></div><div className="skill-track"><span style={{ width: skill.value + '%' }}/></div></div>)}
            <small className="preview-note">Illustrative scores for dashboard preview — live progress will use your assessment results.</small>
          </div>
        </section>
        <section className="student-section">
          <div className="student-section-heading"><div><h2>Latest Scores</h2><p>Your most recent completed assessments.</p></div><span className="student-text-link">View all <ChevronRight size={15}/></span></div>
          <div className="student-score-list">{scores.map(item => <div className="student-score" key={item.title}><div><strong>{item.title}</strong><small>{item.date}</small></div><b>{item.score}</b></div>)}</div>
        </section>
        <section className="student-section">
          <div className="student-section-heading"><div><h2>Assigned by My Teacher</h2><p>Work your teacher wants you to complete.</p></div><span className="student-count">2 tasks</span></div>
          <div className="student-task-list">{tasks.map(task => <article className="student-task" key={task.title}><div className="task-icon"><Clock3 size={19}/></div><div className="task-content"><strong>{task.title}</strong><small>{task.by} · {task.due}</small><span className={'task-status ' + task.tone}>{task.status}</span></div><ChevronRight size={18}/></article>)}</div>
        </section>
        <section className="student-section">
          <div className="student-section-heading"><div><h2>My Learning Journeys</h2><p>Choose a journey and keep building your skills.</p></div></div>
          <SpellingJourney />
          <div className="student-journey-grid">{journeys.map(item => { const Icon = item.icon; const expanded = openJourney === item.id; return <article className={'student-journey ' + (expanded ? 'expanded' : '')} key={item.id}><button onClick={() => setOpenJourney(expanded ? null : item.id)} aria-expanded={expanded}><span className={'journey-icon journey-' + item.id}><Icon size={21}/></span><span className="journey-copy"><strong>{item.title}</strong><small>{item.subtitle}</small><em>{item.level}</em></span><ChevronRight className="journey-chevron" size={18}/></button>{expanded && <p className="journey-detail">{item.detail}</p>}</article> })}</div>
        </section>
        <section className="student-section">
          <div className="student-section-heading"><div><h2>My Achievements</h2><p>Celebrate the milestones along the way.</p></div><Trophy size={21} className="achievement-icon"/></div>
          <div className="student-achievements"><span><Medal size={17}/> First Test</span><span><SpellCheck size={17}/> Spelling Star</span><span><CheckCircle2 size={17}/> Grammar Master</span></div>
        </section>
        <div className="student-preview-footer"><LockKeyhole size={14}/> This is a visual preview with sample information. Student sign-in and live assessment data will be connected in a later development step.</div>
      </main>
    </div>
  )
}
