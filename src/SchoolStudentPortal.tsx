import { useState } from 'react'
import { BookOpenCheck, LogOut, GraduationCap, ShieldCheck } from 'lucide-react'

type Student = {
  id: string; student_number: string; display_name: string;
  workspace_id: string; workspace_name: string; class_id?: string | null; class_name?: string | null;
}
type Props = { student: Student; sessionToken: string; onSignOut: () => void }

export default function SchoolStudentPortal({ student, sessionToken, onSignOut }: Props) {
  const [message] = useState('Your school login is active. Learning activities will appear here as they are connected to your student account.')
  return <div className="student-portal-shell">
    <header className="workspace-topbar">
      <a className="brand" href={import.meta.env.BASE_URL}><span className="brand-mark"><BookOpenCheck size={21}/></span><span>MyEdu<span>Progress</span></span></a>
      <div className="workspace-user"><span>{student.display_name}</span><small>School student</small><button className="secondary-button" onClick={onSignOut}><LogOut size={16}/> Sign out</button></div>
    </header>
    <main className="workspace-main">
      <section className="workspace-welcome">
        <div><div className="card-kicker">STUDENT DASHBOARD</div><h1>Welcome, {student.display_name}</h1><p>{student.workspace_name}</p></div>
        <div className="workspace-avatar"><GraduationCap size={25}/></div>
      </section>
      <section className="student-dashboard-card">
        <h2>Your learning space</h2>
        <div className="student-profile-details">
          <div><span>Student ID</span><strong>{student.student_number}</strong></div>
          <div><span>Class</span><strong>{student.class_name || 'Not assigned'}</strong></div>
        </div>
        <div className="notice info"><ShieldCheck size={16}/>{message}</div>
        <p className="form-help">Keep your Personal Access Code private. If you need a new one, ask your teacher.</p>
      </section>
    </main>
  </div>
}
