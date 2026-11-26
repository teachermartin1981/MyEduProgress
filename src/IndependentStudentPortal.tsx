import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, BookOpenCheck, GraduationCap, LogOut, Mail, ShieldCheck, UserPlus, XCircle } from 'lucide-react'
import { supabase } from './lib/supabase'

type Props = { displayName: string; onSignOut: () => void }
type Tutor = { id: string; tutor_user_id: string; permission: string; active: boolean; created_at: string; invite?: { tutor_email?: string } | null }

export default function IndependentStudentPortal({ displayName, onSignOut }: Props) {
  const [email, setEmail] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null)

  async function loadTutors() {
    const { data, error } = await supabase.functions.invoke('independent-students', { body: { action: 'list_tutors' } })
    if (error || data?.error) setNotice({ kind: 'error', text: data?.error || error.message })
    else setTutors(data.tutors || [])
  }
  useEffect(() => {
    void loadTutors()
    const token = new URLSearchParams(window.location.search).get('tutor_invite')
    if (token) {
      setBusy(true)
      supabase.functions.invoke('independent-students', { body: { action: 'accept_tutor_invite', token } })
        .then(({ data, error }) => {
          if (error || data?.error) setNotice({ kind: 'error', text: data?.error || error.message })
          else { setNotice({ kind: 'success', text: data.message || 'Tutor access accepted.' }); void loadTutors() }
        }).finally(() => {
          setBusy(false)
          const clean = new URL(window.location.href); clean.searchParams.delete('tutor_invite')
          window.history.replaceState({}, '', clean.toString())
        })
    }
  }, [])

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(null); setInviteUrl('')
    const { data, error } = await supabase.functions.invoke('independent-students', {
      body: { action: 'create_tutor_invite', tutor_email: email.trim().toLowerCase() },
    })
    setBusy(false)
    if (error || data?.error) setNotice({ kind: 'error', text: data?.error || error.message })
    else { setInviteUrl(data.invite_url); setNotice({ kind: 'success', text: 'Invitation created. Share the private link with your teacher or tutor. It expires in 7 days.' }); setEmail('') }
  }

  async function revoke(id: string) {
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('independent-students', { body: { action: 'revoke_tutor', link_id: id } })
    setBusy(false)
    if (error || data?.error) setNotice({ kind: 'error', text: data?.error || error.message })
    else { setNotice({ kind: 'success', text: 'Tutor access revoked.' }); void loadTutors() }
  }

  return <div className="workspace-shell">
    <header className="workspace-topbar">
      <a className="brand" href={import.meta.env.BASE_URL}><span className="brand-mark"><BookOpenCheck size={21}/></span><span>MyEdu<span>Progress</span></span></a>
      <div className="workspace-user"><span>{displayName}</span><small>Independent Student</small><button className="secondary-button" onClick={onSignOut}><LogOut size={16}/> Sign out</button></div>
    </header>
    <main className="workspace-main">
      <div className="workspace-welcome"><div><div className="card-kicker">INDEPENDENT STUDENT ACCOUNT</div><h1>Welcome, {displayName}</h1><p>Your personal English learning space.</p></div><div className="workspace-avatar"><GraduationCap size={25}/></div></div>
      {notice && <div className={`notice ${notice.kind}`} role="status">{notice.text}</div>}
      <section className="independent-card">
        <div className="independent-card-heading"><div><div className="card-kicker">YOUR LEARNING SPACE</div><h2>Start building your English progress</h2><p>Your account is ready. Learning activities, CEFR placement and live progress will be connected to this dashboard in the next development stage.</p></div><ShieldCheck size={27}/></div>
        <div className="independent-features"><span>CEFR placement</span><span>Grammar</span><span>Reading &amp; listening</span><span>Spelling &amp; vocabulary</span><span>Writing feedback</span><span>Progress history</span></div>
      </section>
      <section className="independent-card">
        <div className="independent-card-heading"><div><div className="card-kicker">OPTIONAL · PRIVATE ACCESS</div><h2>Invite a teacher or tutor</h2><p>Give someone you trust read-only access to your progress. You can revoke access at any time.</p></div><UserPlus size={26}/></div>
        <form className="independent-invite-form" onSubmit={createInvite}>
          <label>Teacher or tutor email address<div className="input-wrap"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="teacher@example.com" required/></div></label>
          <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : 'Create invitation'} <ArrowRight size={17}/></button>
        </form>
        {inviteUrl && <div className="independent-share"><span>{inviteUrl}</span><button className="secondary-button" onClick={() => navigator.clipboard.writeText(inviteUrl)}>Copy invitation link</button></div>}
        <div className="independent-tutors"><h3>Current tutor access</h3>
          {tutors.filter(t => t.active).length === 0 ? <p>No teachers or tutors have access yet.</p> : tutors.filter(t => t.active).map(t => <div className="independent-tutor" key={t.id}><span>{t.invite?.tutor_email || 'Connected tutor'}<small>Read-only progress access</small></span><button disabled={busy} onClick={() => void revoke(t.id)}><XCircle size={15}/> Revoke</button></div>)}
        </div>
      </section>
      <p className="independent-footnote">For learners under 18, a parent or legal guardian must complete registration and confirm permission. School-provided Student ID and PAC accounts remain separate.</p>
    </main>
  </div>
}
