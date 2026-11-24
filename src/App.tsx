import { useState, type FormEvent } from 'react'
import { ArrowRight, BookOpenCheck, Building2, GraduationCap, LockKeyhole, Mail, ShieldCheck, Sparkles, UserPlus, LogOut } from 'lucide-react'
import { supabase } from './lib/supabase'

type Portal = 'student' | 'staff'
type Notice = { kind: 'error' | 'success' | 'info'; text: string } | null
type Workspace = { schoolId: string; schoolName: string; role: 'school_admin' | 'teacher'; fullName: string }

export default function App() {
  const [portal, setPortal] = useState<Portal>('student')
  const [staffMode, setStaffMode] = useState<'login' | 'signup'>('login')
  const [studentId, setStudentId] = useState('')
  const [pac, setPac] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [schoolName, setSchoolName] = useState('Holy Mary Udonthani School')
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)

  async function handleStudentLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice({ kind: 'info', text: 'Student sign-in will be enabled after the secure Student ID and Personal Access Code service is completed.' })
  }

  async function finishSchoolSetup(accessToken: string, name: string, school: string) {
    const { data, error } = await supabase.functions.invoke('school-onboarding', {
      body: { action: 'bootstrap_school', full_name: name, school_name: school },
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (error || data?.error) throw new Error(data?.error || error.message)
    return data.school_id as string
  }

  async function loadWorkspace(userId: string, expectedRole?: 'school_admin' | 'teacher') {
    const { data, error } = await supabase.from('school_memberships')
      .select('school_id, role, active, schools(name)')
      .eq('user_id', userId).eq('active', true).limit(1).maybeSingle()
    if (error) throw new Error('Could not load your school membership. Please try again.')
    if (!data) throw new Error('This account is not connected to an active school. Ask your school administrator for an invitation.')
    if (expectedRole && data.role !== expectedRole) throw new Error(`This account has the role ${data.role === 'school_admin' ? 'School Admin' : 'Teacher'}, not ${expectedRole === 'school_admin' ? 'School Admin' : 'Teacher'}.`)
    const school = data.schools as unknown as { name: string } | null
    setWorkspace({ schoolId: data.school_id, schoolName: school?.name || 'Your school', role: data.role as Workspace['role'], fullName: '' })
  }

  async function handleStaffLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null); setBusy(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user || !data.session) {
      setBusy(false); setNotice({ kind: 'error', text: error?.message || 'Sign-in failed.' }); return
    }
    try {
      const { data: existing } = await supabase.from('school_memberships').select('id').eq('user_id', data.user.id).eq('active', true).limit(1).maybeSingle()
      if (!existing) {
        const metadata = data.user.user_metadata || {}
        if (!metadata.school_name || !metadata.full_name) throw new Error('This account has not been connected to a school. Please complete school registration or ask an administrator for an invitation.')
        await finishSchoolSetup(data.session.access_token, String(metadata.full_name), String(metadata.school_name))
      }
      await loadWorkspace(data.user.id)
      setNotice({ kind: 'success', text: 'Signed in successfully.' })
    } catch (e) {
      await supabase.auth.signOut()
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Account setup failed.' })
    } finally { setBusy(false) }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(null); setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName.trim(), school_name: schoolName.trim() },
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
      },
    })
    if (error) {
      setBusy(false); setNotice({ kind: 'error', text: error.message }); return
    }
    if (data.session) {
      try {
        await finishSchoolSetup(data.session.access_token, fullName, schoolName)
        await loadWorkspace(data.user!.id, 'school_admin')
        setNotice({ kind: 'success', text: 'Your school and administrator account have been created.' })
      } catch (e) {
        setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'School setup failed.' })
      }
    } else {
      setNotice({ kind: 'success', text: 'Account created. Check your email to confirm your address. Then return here and sign in to finish registering your school.' })
    }
    setBusy(false)
  }

  async function handleInviteTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!workspace) return
    setBusy(true); setNotice(null)
    const { data, error } = await supabase.functions.invoke('school-onboarding', {
      body: { action: 'invite_teacher', school_id: workspace.schoolId, full_name: inviteName, email: inviteEmail },
    })
    setBusy(false)
    if (error || data?.error) setNotice({ kind: 'error', text: data?.error || error.message })
    else { setNotice({ kind: 'success', text: 'Teacher invitation sent. They can accept the email invitation and set their password.' }); setInviteName(''); setInviteEmail('') }
  }

  async function signOut() {
    await supabase.auth.signOut(); setWorkspace(null); setNotice({ kind: 'info', text: 'You have signed out.' })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="MyEduProgress home"><span className="brand-mark"><BookOpenCheck size={21} /></span><span>MyEdu<span>Progress</span></span></a>
        <button className="staff-link" onClick={() => { setPortal('staff'); setNotice(null) }}>School &amp; Teacher Login <ArrowRight size={15} /></button>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14} /> A clearer picture of learning</div>
            <h1>Every student.<br /><span>Every step.</span><br />Every achievement.</h1>
            <p className="hero-lede">A smarter way for schools to assess, support and track student progress — all in one place.</p>
            <div className="trust-points"><span><ShieldCheck size={16} /> School-focused</span><span><Building2 size={16} /> Built for growing schools</span></div>
          </div>
          <section className="login-card" aria-label="Login">
            {workspace ? (
              <>
                <div className="card-heading"><div><div className="card-kicker">SCHOOL WORKSPACE</div><h2>Welcome, {workspace.role === 'school_admin' ? 'Administrator' : 'Teacher'}</h2><p>{workspace.schoolName}</p></div><div className="card-icon"><Building2 size={23}/></div></div>
                <div className="notice success">Signed in as {workspace.role === 'school_admin' ? 'School Admin' : 'Teacher'}.</div>
                {workspace.role === 'school_admin' ? (
                  <form className="login-form invite-form" onSubmit={handleInviteTeacher}>
                    <h3><UserPlus size={17}/> Invite a teacher</h3>
                    <label>Teacher's full name<input value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder="Teacher name" required/></label>
                    <label>Teacher's email<div className="input-wrap"><Mail size={17}/><input type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="teacher@school.com" required/></div></label>
                    <button className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send teacher invitation'} <ArrowRight size={17}/></button>
                    <p className="form-help">The teacher receives an email invitation to set their password. Their role is assigned by the server.</p>
                  </form>
                ) : <p className="form-help">Your teacher workspace is being prepared. Your school administrator can assign classes and assessments.</p>}
                <button className="secondary-button" onClick={signOut}><LogOut size={16}/> Sign out</button>
              </>
            ) : (
              <>
                <div className="card-heading"><div><div className="card-kicker">WELCOME BACK</div><h2>{portal === 'student' ? 'Student login' : staffMode === 'signup' ? 'Register your school' : 'School portal'}</h2><p>{portal === 'student' ? 'Use the login details provided by your school.' : staffMode === 'signup' ? 'Create the first administrator account for your school.' : 'Sign in to your school workspace.'}</p></div><div className="card-icon">{portal === 'student' ? <GraduationCap size={23}/> : <Building2 size={23}/>}</div></div>
                <div className="portal-switch" role="tablist" aria-label="Choose login type">
                  <button className={portal === 'student' ? 'active' : ''} onClick={() => {setPortal('student');setNotice(null)}}>Student</button>
                  <button className={portal === 'staff' ? 'active' : ''} onClick={() => {setPortal('staff');setNotice(null)}}>Teacher / Admin</button>
                </div>
                {portal === 'student' ? (
                  <form onSubmit={handleStudentLogin} className="login-form">
                    <label>Student ID<input value={studentId} onChange={e=>setStudentId(e.target.value)} placeholder="Enter your Student ID" required/></label>
                    <label>Personal Access Code<div className="input-wrap"><LockKeyhole size={17}/><input value={pac} onChange={e=>setPac(e.target.value)} type="password" placeholder="Enter your access code" required/></div></label>
                    <button className="primary-button">Student login <ArrowRight size={17}/></button>
                    <p className="form-help">Ask your teacher if you need help with your login details.</p>
                  </form>
                ) : (
                  <>
                    <div className="mode-switch">
                      <button className={staffMode==='login'?'selected':''} onClick={()=>{setStaffMode('login');setNotice(null)}}>Sign in</button>
                      <button className={staffMode==='signup'?'selected':''} onClick={()=>{setStaffMode('signup');setNotice(null)}}>Register school</button>
                    </div>
                    <form onSubmit={staffMode==='signup'?handleSignup:handleStaffLogin} className="login-form">
                      {staffMode==='signup' && <>
                        <label>Your full name<input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Administrator name" required/></label>
                        <label>School name<input value={schoolName} onChange={e=>setSchoolName(e.target.value)} required/></label>
                      </>}
                      <label>Email address<div className="input-wrap"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@school.com" required/></div></label>
                      <label>Password<div className="input-wrap"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={staffMode==='signup'?'At least 8 characters':'Enter your password'} minLength={staffMode==='signup'?8:undefined} required/></div></label>
                      <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : staffMode==='signup'?'Create school administrator account':'Sign in'} <ArrowRight size={17}/></button>
                      <p className="form-help">{staffMode==='signup'?'This one-time registration creates the first school and its administrator. Further school registrations are closed.':'Teacher accounts are invited by a school administrator.'}</p>
                    </form>
                  </>
                )}
                {notice && <div className={`notice ${notice.kind}`} role="status">{notice.text}</div>}
              </>
            )}
            {workspace && notice && <div className={`notice ${notice.kind}`} role="status">{notice.text}</div>}
          </section>
        </section>
        <section className="bottom-strip">
          <div><span className="strip-icon"><ShieldCheck size={18}/></span><span><strong>One secure school space</strong><small>Each school has its own protected data.</small></span></div>
          <div><span className="strip-icon"><GraduationCap size={18}/></span><span><strong>Student-centred</strong><small>Progress that follows the learner.</small></span></div>
          <div><span className="strip-icon"><BookOpenCheck size={18}/></span><span><strong>Connected learning tools</strong><small>Assessments, feedback and growth.</small></span></div>
        </section>
      </main>
      <footer><span>© {new Date().getFullYear()} MyEduProgress</span><span>Every student. Every step. Every achievement.</span></footer>
    </div>
  )
}
