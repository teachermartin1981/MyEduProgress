import { useState, type FormEvent } from 'react'
import StudentDashboard from './StudentDashboard'
import ClassManagement from './ClassManagement'
import ActivityManager from './ActivityManager'
import IndependentStudentPortal from './IndependentStudentPortal'
import { ArrowRight, BookOpenCheck, Building2, GraduationCap, LockKeyhole, Mail, ShieldCheck, Sparkles, UserPlus, LogOut, CheckCircle2 } from 'lucide-react'
import { supabase } from './lib/supabase'

type Portal = 'student' | 'staff'
type WorkspaceType = 'teacher' | 'school'
type PlanId = 'teacher_monthly' | 'teacher_annual' | 'school_monthly'
type IndependentUser = { id: string; displayName: string }
type Notice = { kind: 'error' | 'success' | 'info'; text: string } | null
type Workspace = { id: string; name: string; type: WorkspaceType; role: 'owner' | 'admin' | 'teacher' }

export default function App() {
  const [portal, setPortal] = useState<Portal>('student')
  const [staffMode, setStaffMode] = useState<'login' | 'signup'>('login')
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('teacher')
  const [planId, setPlanId] = useState<PlanId>('teacher_monthly')
  const [studentId, setStudentId] = useState('')
  const [pac, setPac] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [showStudentPreview, setShowStudentPreview] = useState(false)
  const [studentMode, setStudentMode] = useState<'school' | 'independent-login' | 'independent-signup'>('school')
  const [independentName, setIndependentName] = useState('')
  const [adultConfirmed, setAdultConfirmed] = useState(false)
  const [independentUser, setIndependentUser] = useState<IndependentUser | null>(null)

  async function finishIndependentProfile(userId: string, fallbackName?: string) {
    const { data: profile, error } = await supabase.from('independent_student_profiles').select('display_name').eq('user_id', userId).maybeSingle()
    if (error) throw new Error('Could not load your student profile.')
    if (profile) { setIndependentUser({ id: userId, displayName: profile.display_name }); return }
    const metadata = (await supabase.auth.getUser()).data.user?.user_metadata || {}
    const displayName = fallbackName || String(metadata.full_name || '')
    const { data, error: createError } = await supabase.functions.invoke('independent-students', { body: { action: 'create_profile', display_name: displayName, adult_or_guardian_confirmed: metadata.adult_or_guardian_confirmed === true } })
    if (createError || data?.error) throw new Error(data?.error || createError.message)
    setIndependentUser({ id: userId, displayName })
  }

  async function handleStudentLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (studentMode === 'school') { setNotice({ kind: 'info', text: 'School Student ID and PAC sign-in is being connected to the secure student login service.' }); return }
    setBusy(true); setNotice(null)
    if (studentMode === 'independent-signup') {
      if (!adultConfirmed) { setBusy(false); setNotice({ kind: 'error', text: 'A parent or legal guardian must complete registration for learners under 18. Please confirm adult/guardian responsibility.' }); return }
      const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { full_name: independentName.trim(), adult_or_guardian_confirmed: true, account_type: 'independent_student' }, emailRedirectTo: window.location.origin + import.meta.env.BASE_URL } })
      if (error) { setBusy(false); setNotice({ kind: 'error', text: error.message }); return }
      if (data.session && data.user) { try { await finishIndependentProfile(data.user.id, independentName.trim()); setNotice({ kind: 'success', text: 'Your independent student account is ready.' }) } catch (e) { setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Profile setup failed.' }) } }
      else { setNotice({ kind: 'success', text: 'Account created. Confirm your email, then sign in here to finish setting up your student profile.' }); setStudentMode('independent-login') }
      setBusy(false); return
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error || !data.user) { setBusy(false); setNotice({ kind: 'error', text: error?.message || 'Sign-in failed.' }); return }
    try { await acceptPendingTutorInvite(); await finishIndependentProfile(data.user.id); setNotice({ kind: 'success', text: 'Welcome back!' }) } catch (e) { setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Student profile could not be loaded.' }) }
    setBusy(false)
  }

  async function createWorkspace(accessToken: string, details: { fullName: string; name: string; type: WorkspaceType; planId: PlanId }) {
    const { data, error } = await supabase.functions.invoke('workspace-onboarding', {
      body: {
        action: 'create_workspace',
        full_name: details.fullName,
        workspace_name: details.name,
        workspace_type: details.type,
        plan_id: details.planId,
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (error || data?.error) throw new Error(data?.error || error.message)
    return String(data.workspace_id)
  }

  async function loadWorkspace(userId: string) {
    const { data, error } = await supabase.from('workspace_memberships')
      .select('workspace_id, role, workspaces!inner(name, workspace_type)')
      .eq('user_id', userId).eq('active', true).limit(1).maybeSingle()
    if (error) throw new Error('Could not load your workspace. Please try again.')
    if (!data) throw new Error('This account is not connected to a workspace yet. Register a workspace or ask its owner for an invitation.')
    const details = data.workspaces as unknown as { name: string; workspace_type: WorkspaceType }
    setWorkspace({
      id: data.workspace_id,
      name: details.name,
      type: details.workspace_type,
      role: data.role as Workspace['role'],
    })
  }

  async function acceptPendingTutorInvite() {
    const token = new URLSearchParams(window.location.search).get('tutor_invite')
    if (!token) return false
    const { data, error } = await supabase.functions.invoke('independent-students', { body: { action: 'accept_tutor_invite', token } })
    const clean = new URL(window.location.href); clean.searchParams.delete('tutor_invite')
    window.history.replaceState({}, '', clean.toString())
    if (error || data?.error) throw new Error(data?.error || error.message)
    setNotice({ kind: 'success', text: 'Tutor invitation accepted. You now have read-only access to the learner’s progress.' })
    return true
  }

  async function handleStaffLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null); setBusy(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user || !data.session) {
      setBusy(false); setNotice({ kind: 'error', text: error?.message || 'Sign-in failed.' }); return
    }
    try {
      await acceptPendingTutorInvite()
      const { data: existing, error: membershipError } = await supabase.from('workspace_memberships')
        .select('id').eq('user_id', data.user.id).eq('active', true).limit(1).maybeSingle()
      if (membershipError) throw new Error('Could not check your workspace membership.')
      if (!existing) {
        const metadata = data.user.user_metadata || {}
        const type = metadata.workspace_type as WorkspaceType
        const plan = metadata.plan_id as PlanId
        if (!metadata.workspace_name || !metadata.full_name || !['teacher', 'school'].includes(type) ||
            !['teacher_monthly', 'teacher_annual', 'school_monthly'].includes(plan)) {
          throw new Error('No workspace is connected to this account. Please register as a teacher or school, or ask for an invitation.')
        }
        await createWorkspace(data.session.access_token, {
          fullName: String(metadata.full_name),
          name: String(metadata.workspace_name),
          type,
          planId: plan,
        })
      }
      await loadWorkspace(data.user.id)
      setNotice({ kind: 'success', text: 'Signed in successfully.' })
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Workspace setup failed.' })
    } finally { setBusy(false) }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(null); setBusy(true)
    const selectedPlan: PlanId = workspaceType === 'school' ? 'school_monthly' : planId
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          workspace_name: workspaceName.trim(),
          workspace_type: workspaceType,
          plan_id: selectedPlan,
        },
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
      },
    })
    if (error) {
      setBusy(false); setNotice({ kind: 'error', text: error.message }); return
    }
    if (data.session && data.user) {
      try {
        await createWorkspace(data.session.access_token, {
          fullName, name: workspaceName, type: workspaceType, planId: selectedPlan,
        })
        await loadWorkspace(data.user.id)
        setNotice({ kind: 'success', text: 'Your workspace has been created. Welcome to MyEduProgress!' })
      } catch (e) {
        setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Workspace setup failed.' })
      }
    } else {
      setNotice({ kind: 'success', text: 'Account created. Check your email to confirm your address. Then return here and sign in to finish setting up your workspace.' })
      setStaffMode('login')
    }
    setBusy(false)
  }

  async function handleInviteTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!workspace) return
    setBusy(true); setNotice(null)
    const { data, error } = await supabase.functions.invoke('workspace-onboarding', {
      body: { action: 'invite_workspace_teacher', workspace_id: workspace.id, full_name: inviteName, email: inviteEmail },
    })
    setBusy(false)
    if (error || data?.error) setNotice({ kind: 'error', text: data?.error || error.message })
    else { setNotice({ kind: 'success', text: 'Teacher invitation sent.' }); setInviteName(''); setInviteEmail('') }
  }

  async function signOut() {
    await supabase.auth.signOut(); setWorkspace(null); setIndependentUser(null); setNotice({ kind: 'info', text: 'You have signed out.' })
  }

  if (independentUser) return <IndependentStudentPortal displayName={independentUser.displayName} onSignOut={signOut} />

  if (showStudentPreview) return <StudentDashboard onBack={() => setShowStudentPreview(false)} />

  const activeWorkspace = workspace as Workspace | null
  if (activeWorkspace) return (
    <div className="workspace-shell">
      <header className="workspace-topbar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="MyEduProgress home"><span className="brand-mark"><BookOpenCheck size={21} /></span><span>MyEdu<span>Progress</span></span></a>
        <div className="workspace-user"><span>{activeWorkspace.name}</span><small>{activeWorkspace.role === 'owner' ? 'Workspace Owner' : activeWorkspace.role === 'admin' ? 'Administrator' : 'Teacher'}</small><button className="secondary-button" onClick={signOut}><LogOut size={16}/> Sign out</button></div>
      </header>
      <main className="workspace-main">
        <div className="workspace-welcome"><div><div className="card-kicker">{activeWorkspace.type === 'school' ? 'SCHOOL WORKSPACE' : 'TEACHER WORKSPACE'}</div><h1>{activeWorkspace.name}</h1><p>Welcome back. Here's your learning workspace overview.</p></div><div className="workspace-avatar">{activeWorkspace.type === 'school' ? <Building2 size={25}/> : <GraduationCap size={25}/>}</div></div>
        {notice && <div className={`notice ${notice.kind}`} role="status">{notice.text}</div>}
        {activeWorkspace.type === 'school' && ['owner','admin'].includes(activeWorkspace.role) && (
          <section className="workspace-invite-panel">
            <form className="login-form invite-form" onSubmit={handleInviteTeacher}>
              <h3><UserPlus size={17}/> Invite a teacher</h3>
              <div className="workspace-invite-fields">
                <label>Teacher's full name<input value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder="Teacher name" required/></label>
                <label>Teacher's email<div className="input-wrap"><Mail size={17}/><input type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="teacher@school.com" required/></div></label>
                <button className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send invitation'} <ArrowRight size={17}/></button>
              </div>
              <p className="form-help">The school plan includes up to 100 active teacher accounts.</p>
            </form>
          </section>
        )}
        <ClassManagement workspaceId={activeWorkspace.id} workspaceName={activeWorkspace.name} role={activeWorkspace.role} workspaceType={activeWorkspace.type} />
        <ActivityManager workspaceId={activeWorkspace.id} role={activeWorkspace.role} />
      </main>
    </div>
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="MyEduProgress home"><span className="brand-mark"><BookOpenCheck size={21} /></span><span>MyEdu<span>Progress</span></span></a>
        <button className="staff-link" onClick={() => { setPortal('staff'); setNotice(null) }}>Teacher &amp; School Login <ArrowRight size={15} /></button>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14} /> A clearer picture of learning</div>
            <h1>Every student.<br /><span>Every step.</span><br />Every achievement.</h1>
            <p className="hero-lede">A smarter way for teachers and schools to assess, support and track student progress — all in one place.</p>
            <div className="trust-points"><span><ShieldCheck size={16} /> Secure workspaces</span><span><Building2 size={16} /> Built for teachers and schools</span></div>
          </div>
          <section className="login-card" aria-label="Login">
            {workspace ? (
              <>
                <div className="card-heading"><div><div className="card-kicker">{workspace.type === 'teacher' ? 'TEACHER WORKSPACE' : 'SCHOOL WORKSPACE'}</div><h2>Welcome back</h2><p>{workspace.name}</p></div><div className="card-icon">{workspace.type === 'teacher' ? <GraduationCap size={23}/> : <Building2 size={23}/>}</div></div>
                <div className="notice success"><CheckCircle2 size={14}/> Signed in as {workspace.role === 'owner' ? 'Workspace Owner' : workspace.role === 'admin' ? 'Administrator' : 'Teacher'}.</div>
                {workspace.type === 'school' && ['owner','admin'].includes(workspace.role) ? (
                  <>
                    <form className="login-form invite-form" onSubmit={handleInviteTeacher}>
                      <h3><UserPlus size={17}/> Invite a teacher</h3>
                      <label>Teacher's full name<input value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder="Teacher name" required/></label>
                      <label>Teacher's email<div className="input-wrap"><Mail size={17}/><input type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="teacher@school.com" required/></div></label>
                      <button className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send teacher invitation'} <ArrowRight size={17}/></button>
                      <p className="form-help">The school plan includes up to 100 active teacher accounts.</p>
                    </form>
                    <ClassManagement workspaceId={workspace.id} workspaceName={workspace.name} role={workspace.role} workspaceType={workspace.type} />
                    <ActivityManager workspaceId={workspace.id} role={workspace.role} />
                  </>
                ) : (
                  <ClassManagement workspaceId={workspace.id} workspaceName={workspace.name} role={workspace.role} workspaceType={workspace.type} />
                )}
                <button className="secondary-button" onClick={signOut}><LogOut size={16}/> Sign out</button>
              </>
            ) : (
              <>
                <div className="card-heading"><div><div className="card-kicker">WELCOME TO MYEDUPROGRESS</div><h2>{portal === 'student' ? 'Student login' : staffMode === 'signup' ? 'Create your workspace' : 'Teacher & school portal'}</h2><p>{portal === 'student' ? 'Use the login details provided by your teacher.' : staffMode === 'signup' ? 'Start with an individual teacher or school workspace.' : 'Sign in to continue your learning journey.'}</p></div><div className="card-icon">{portal === 'student' ? <GraduationCap size={23}/> : <Building2 size={23}/>}</div></div>
                <div className="portal-switch" role="tablist" aria-label="Choose login type">
                  <button className={portal === 'student' ? 'active' : ''} onClick={() => {setPortal('student');setNotice(null)}}>Student</button>
                  <button className={portal === 'staff' ? 'active' : ''} onClick={() => {setPortal('staff');setNotice(null)}}>Teacher / School</button>
                </div>
                {portal === 'student' ? (
                  <>
                    <div className="mode-switch student-mode-switch">
                      <button type="button" className={studentMode==='school'?'selected':''} onClick={()=>{setStudentMode('school');setNotice(null)}}>School student</button>
                      <button type="button" className={studentMode!=='school'?'selected':''} onClick={()=>{setStudentMode('independent-login');setNotice(null)}}>Independent learner</button>
                    </div>
                    <form onSubmit={handleStudentLogin} className="login-form">
                      {studentMode === 'school' ? <>
                        <label>Student ID<input value={studentId} onChange={e=>setStudentId(e.target.value)} placeholder="Enter your Student ID" required/></label>
                        <label>Personal Access Code<div className="input-wrap"><LockKeyhole size={17}/><input value={pac} onChange={e=>setPac(e.target.value)} type="password" placeholder="Enter your access code" required/></div></label>
                        <button className="primary-button">Student login <ArrowRight size={17}/></button>
                        <p className="form-help">Ask your teacher if you need help with your login details.</p>
                      </> : <>
                        {studentMode === 'independent-signup' && <label>Your name<input value={independentName} onChange={e=>setIndependentName(e.target.value)} placeholder="Student name" required/></label>}
                        <label>Email address<div className="input-wrap"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></div></label>
                        <label>Password<div className="input-wrap"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required/></div></label>
                        {studentMode === 'independent-signup' && <label className="consent-check"><input type="checkbox" checked={adultConfirmed} onChange={e=>setAdultConfirmed(e.target.checked)}/> I am 18 or older, or I am the parent/legal guardian completing this registration and confirming permission for the learner.</label>}
                        <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : studentMode==='independent-signup'?'Create student account':'Sign in'} <ArrowRight size={17}/></button>
                        <button type="button" className="preview-link" onClick={()=>{setStudentMode(studentMode==='independent-signup'?'independent-login':'independent-signup');setNotice(null)}}>{studentMode==='independent-signup'?'Already have an account? Sign in':'New independent learner? Create an account'}</button>
                        <p className="form-help">Monthly $3.99 · Annual $25 · Lifetime $50 launch offer for the first 100 students.</p>
                      </>}
                    </form>
                    <button type="button" className="preview-link" onClick={() => setShowStudentPreview(true)}>Preview the student dashboard</button>
                  </>                ) : (
                  <>
                    <div className="mode-switch">
                      <button className={staffMode==='login'?'selected':''} onClick={()=>{setStaffMode('login');setNotice(null)}}>Sign in</button>
                      <button className={staffMode==='signup'?'selected':''} onClick={()=>{setStaffMode('signup');setNotice(null)}}>Register</button>
                    </div>
                    {staffMode === 'signup' && (
                      <div className="role-switch">
                        <button type="button" className={workspaceType==='teacher'?'selected':''} onClick={()=>{setWorkspaceType('teacher');setPlanId('teacher_monthly');setNotice(null)}}><GraduationCap size={15}/> Individual teacher</button>
                        <button type="button" className={workspaceType==='school'?'selected':''} onClick={()=>{setWorkspaceType('school');setNotice(null)}}><Building2 size={15}/> Register a school</button>
                      </div>
                    )}
                    <form onSubmit={staffMode==='signup'?handleSignup:handleStaffLogin} className="login-form">
                      {staffMode==='signup' && <>
                        <label>Your full name<input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your name" required/></label>
                        <label>{workspaceType==='teacher'?'Workspace name':'School name'}<input value={workspaceName} onChange={e=>setWorkspaceName(e.target.value)} placeholder={workspaceType==='teacher'?'e.g. My Teaching Workspace':'School name'} required/></label>
                        {workspaceType === 'teacher' ? (
                          <div className="plan-picker">
                            <span className="plan-label">Choose your teacher plan</span>
                            <button type="button" className={planId==='teacher_monthly'?'plan-option chosen':''} onClick={()=>setPlanId('teacher_monthly')}><span>Monthly</span><strong>$9.90 <small>/ month</small></strong></button>
                            <button type="button" className={planId==='teacher_annual'?'plan-option chosen':''} onClick={()=>setPlanId('teacher_annual')}><span>Annual</span><strong>$50 <small>/ year</small></strong><em>Save $68.80</em></button>
                          </div>
                        ) : (
                          <div className="school-plan-note"><strong>$50 / month</strong><span>Up to 100 teachers in one school workspace.</span></div>
                        )}
                      </>}
                      <label>Email address<div className="input-wrap"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></div></label>
                      <label>Password<div className="input-wrap"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={staffMode==='signup'?'At least 8 characters':'Enter your password'} minLength={staffMode==='signup'?8:undefined} required/></div></label>
                      <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : staffMode==='signup'?'Create workspace account':'Sign in'} <ArrowRight size={17}/></button>
                      <p className="form-help">{staffMode==='signup'?'Your subscription will be recorded during setup. Payment activation will come later.':'Use the email address and password connected to your workspace.'}</p>
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
          <div><span className="strip-icon"><ShieldCheck size={18}/></span><span><strong>Secure workspaces</strong><small>Your classes and student data stay protected.</small></span></div>
          <div><span className="strip-icon"><GraduationCap size={18}/></span><span><strong>Student-centred</strong><small>Progress that follows the learner.</small></span></div>
          <div><span className="strip-icon"><BookOpenCheck size={18}/></span><span><strong>Connected learning tools</strong><small>Assessments, feedback and growth.</small></span></div>
        </section>
      </main>
      <footer><span>© {new Date().getFullYear()} MyEduProgress</span><span>Every student. Every step. Every achievement.</span></footer>
    </div>
  )
}
