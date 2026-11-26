import { BookOpenCheck, LogOut, GraduationCap } from 'lucide-react'
import SpellingJourney from './SpellingJourney'

type Student = {
  id: string; student_number: string; display_name: string;
  workspace_id: string; workspace_name: string; class_id?: string | null; class_name?: string | null;
}
type Props = { student: Student; sessionToken: string; onSignOut: () => void }

export default function SchoolStudentPortal({ student, sessionToken, onSignOut }: Props) {
  return <div className="student-portal-shell">
    <header className="workspace-topbar">
      <a className="brand" href={import.meta.env.BASE_URL}><span className="brand-mark"><BookOpenCheck size={21}/></span><span>MyEdu<span>Progress</span></span></a>
      <div className="workspace-user"><span>{student.display_name}</span><small>School student</small><button className="secondary-button" onClick={onSignOut}><LogOut size={16}/> Sign out</button></div>
    </header>
    <main className="workspace-main">
      <section className="workspace-welcome student-welcome">
        <div>
          <div className="card-kicker">STUDENT DASHBOARD</div>
          <h1>Welcome, {student.display_name}</h1>
          <p>{student.workspace_name}</p>
          <div className="student-profile-details">
            <div><span>Student ID</span><strong>{student.student_number}</strong></div>
            <div><span>Class</span><strong>{student.class_name || 'Not assigned'}</strong></div>
          </div>
        </div>
        <div className="workspace-avatar"><GraduationCap size={25}/></div>
      </section>
      <SpellingJourney studentSessionToken={sessionToken} />
      <section className="student-dashboard-card"><p className="form-help">More assigned learning activities will appear here as they become available.</p></section>
    </main>
  </div>
}
