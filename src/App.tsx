import { useState, type FormEvent } from 'react'
import { ArrowRight, BookOpenCheck, Building2, GraduationCap, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Portal = 'student' | 'staff'
type Notice = { kind: 'error' | 'success' | 'info'; text: string } | null

export default function App() {
  const [portal, setPortal] = useState<Portal>('student')
  const [staffRole, setStaffRole] = useState<'teacher' | 'admin'>('teacher')
  const [studentId, setStudentId] = useState('')
  const [pac, setPac] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  async function handleStudentLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice({
      kind: 'info',
      text: 'Student sign-in is being prepared. Your Student ID and access code will be verified securely by the MyEduProgress server.',
    })
  }

  async function handleStaffLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    if (!supabase) {
      setNotice({ kind: 'error', text: 'The website is not connected to Supabase yet. Add the project settings to your local environment before signing in.' })
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setNotice({ kind: 'error', text: error.message })
      return
    }
    setNotice({ kind: 'success', text: 'You are signed in. Your role and school dashboard will be loaded when the account setup workflow is added.' })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="MyEduProgress home">
          <span className="brand-mark"><BookOpenCheck size={21} /></span>
          <span>MyEdu<span>Progress</span></span>
        </a>
        <button className="staff-link" onClick={() => { setPortal('staff'); setNotice(null) }}>
          School &amp; Teacher Login <ArrowRight size={15} />
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14} /> A clearer picture of learning</div>
            <h1>Every student.<br /><span>Every step.</span><br />Every achievement.</h1>
            <p className="hero-lede">A smarter way for schools to assess, support and track student progress — all in one place.</p>
            <div className="trust-points">
              <span><ShieldCheck size={16} /> School-focused</span>
              <span><Building2 size={16} /> Built for growing schools</span>
            </div>
          </div>

          <section className="login-card" aria-label="Login">
            <div className="card-heading">
              <div>
                <div className="card-kicker">WELCOME BACK</div>
                <h2>{portal === 'student' ? 'Student login' : 'School portal'}</h2>
                <p>{portal === 'student' ? 'Use the login details provided by your school.' : 'Sign in to your school workspace.'}</p>
              </div>
              <div className="card-icon">{portal === 'student' ? <GraduationCap size={23} /> : <Building2 size={23} />}</div>
            </div>

            <div className="portal-switch" role="tablist" aria-label="Choose login type">
              <button className={portal === 'student' ? 'active' : ''} onClick={() => { setPortal('student'); setNotice(null) }}>Student</button>
              <button className={portal === 'staff' ? 'active' : ''} onClick={() => { setPortal('staff'); setNotice(null) }}>Teacher / Admin</button>
            </div>

            {portal === 'student' ? (
              <form onSubmit={handleStudentLogin} className="login-form">
                <label>Student ID
                  <input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="Enter your Student ID" autoComplete="username" required />
                </label>
                <label>Personal Access Code
                  <div className="input-wrap"><LockKeyhole size={17} /><input value={pac} onChange={e => setPac(e.target.value)} placeholder="Enter your access code" type="password" autoComplete="current-password" required /></div>
                </label>
                <button className="primary-button" type="submit">Student login <ArrowRight size={17} /></button>
                <p className="form-help">Ask your teacher if you need help with your login details.</p>
              </form>
            ) : (
              <form onSubmit={handleStaffLogin} className="login-form">
                <div className="role-switch">
                  <button type="button" className={staffRole === 'teacher' ? 'selected' : ''} onClick={() => setStaffRole('teacher')}><BookOpenCheck size={15} /> Teacher</button>
                  <button type="button" className={staffRole === 'admin' ? 'selected' : ''} onClick={() => setStaffRole('admin')}><Building2 size={15} /> School admin</button>
                </div>
                <label>Email address
                  <div className="input-wrap"><Mail size={17} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.com" autoComplete="username" required /></div>
                </label>
                <label>Password
                  <div className="input-wrap"><LockKeyhole size={17} /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required /></div>
                </label>
                <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} /></button>
                <p className="form-help">Accounts are created by your school. New school registration will be added in the setup stage.</p>
              </form>
            )}

            {notice && <div className={`notice ${notice.kind}`} role="status">{notice.text}</div>}
            {!isSupabaseConfigured && <div className="connection-note"><span /> Preview mode · Supabase connection not configured</div>}
          </section>
        </section>

        <section className="bottom-strip">
          <div><span className="strip-icon"><ShieldCheck size={18} /></span><span><strong>One secure school space</strong><small>Each school has its own protected data.</small></span></div>
          <div><span className="strip-icon"><GraduationCap size={18} /></span><span><strong>Student-centred</strong><small>Progress that follows the learner.</small></span></div>
          <div><span className="strip-icon"><BookOpenCheck size={18} /></span><span><strong>Connected learning tools</strong><small>Assessments, feedback and growth.</small></span></div>
        </section>
      </main>
      <footer><span>© {new Date().getFullYear()} MyEduProgress</span><span>Every student. Every step. Every achievement.</span></footer>
    </div>
  )
}