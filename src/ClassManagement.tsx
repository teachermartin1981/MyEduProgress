import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { Archive, BookOpen, ChevronRight, Plus, RefreshCw, Users, UserPlus, Upload, X, KeyRound, Printer, RotateCcw } from 'lucide-react'

type Props = { workspaceId: string; workspaceName: string; role: 'owner'|'admin'|'teacher'; workspaceType: 'teacher'|'school' }
type ClassRow = { id: string; name: string; active: boolean; academic_year_id: string | null }
type StudentRow = { id: string; student_number: string; display_name: string; status: string; workspace_class_enrollments?: { id: string; class_id: string; ended_at: string | null; workspace_classes?: { name: string } | null }[] }
type TeacherRow = { membership_id: string; user_id: string; full_name: string; assigned_classes: { id: string; name: string; active: boolean }[] }
type Notice = { kind: 'error'|'success'; text: string } | null
type AccessCodeRow = { id:string; student_number:string; display_name:string; pac:string|null }

export default function ClassManagement({ workspaceId, workspaceName, role, workspaceType }: Props) {
  const [classes,setClasses]=useState<ClassRow[]>([])
  const [students,setStudents]=useState<StudentRow[]>([])
  const [activeTeacherCount,setActiveTeacherCount]=useState(0)
  const [teachers,setTeachers]=useState<TeacherRow[]>([])
  const [expandedTeacher,setExpandedTeacher]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState<Notice>(null)
  const [newClass,setNewClass]=useState('')
  const [selectedClass,setSelectedClass]=useState('')
  const [studentNumber,setStudentNumber]=useState('')
  const [studentName,setStudentName]=useState('')
  const [bulkText,setBulkText]=useState('')
  const [showBulk,setShowBulk]=useState(false)
  const [showAdd,setShowAdd]=useState(false)
  const [accessCodes,setAccessCodes]=useState<AccessCodeRow[]>([])
  const [showAccessCodes,setShowAccessCodes]=useState(false)
  const [accessBusy,setAccessBusy]=useState(false)
  const canManage = role === 'owner' || role === 'admin'
  const call = useCallback(async (action:string, extra:Record<string,unknown>={}) => {
    const {data,error}=await supabase.functions.invoke('workspace-academics',{body:{action,workspace_id:workspaceId,...extra}})
    if(error || data?.error) throw new Error(data?.error || error.message)
    return data
  },[workspaceId])
  const load=useCallback(async()=>{
    setLoading(true)
    try { const data=await call('list'); setClasses(data.classes||[]); setStudents(data.students||[]); setActiveTeacherCount(data.active_teacher_count||0); setTeachers(data.teachers||[]) }
    catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not load classes.'})}
    finally{setLoading(false)}
  },[call])
  useEffect(()=>{void load()},[load])
  const activeClasses=classes.filter(c=>c.active)
  const currentClass=activeClasses.find(c=>c.id===selectedClass) || activeClasses[0]
  const classStudents=useMemo(()=>students.filter(s=>s.workspace_class_enrollments?.some(e=>e.ended_at===null && e.class_id===currentClass?.id)),[students,currentClass])
  async function createClass(e:React.FormEvent){e.preventDefault();if(!newClass.trim())return;setBusy(true);setNotice(null);try{const d=await call('create_class',{name:newClass.trim()});setNewClass('');setSelectedClass(d.class.id);setNotice({kind:'success',text:'Class created.'});await load()}catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not create class.'})}finally{setBusy(false)}}

  async function loadAccessCodes(classId=currentClass?.id){
    if(!classId)return;setAccessBusy(true);setNotice(null)
    try{const d=await call('get_class_credentials',{class_id:classId});setAccessCodes(d.students||[]);setShowAccessCodes(true)}
    catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not load access codes.'})}
    finally{setAccessBusy(false)}
  }
  async function generateMissingPacs(){
    if(!currentClass)return;setAccessBusy(true);setNotice(null)
    try{
      const d=await call('generate_missing_class_pacs',{class_id:currentClass.id})
      await loadAccessCodes()
      setNotice({kind:'success',text:d.generated_count+' missing Personal Access Codes generated.'})
    }catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not generate missing access codes.'})}
    finally{setAccessBusy(false)}
  }
  async function resetPac(studentId:string){
    setAccessBusy(true);setNotice(null)
    try{await call('reset_student_pac',{student_id:studentId});await loadAccessCodes();setNotice({kind:'success',text:'New Personal Access Code generated.'})}
    catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not reset access code.'})}
    finally{setAccessBusy(false)}
  }
  function printCodes(student?:AccessCodeRow){
    const rows=(student?[student]:accessCodes).map(x=>'<tr><td>'+x.student_number+'</td><td>'+x.display_name+'</td><td><b>'+(x.pac||'Not generated')+'</b></td></tr>').join('')
    const html='<!doctype html><html><head><title>Student access codes</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#17233d}h1{font-size:22px}p{color:#64748b}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #d8deea;padding:10px;text-align:left}th{background:#f1f4fa}b{letter-spacing:1px}</style></head><body><h1>'+(currentClass?.name||'Class')+' – Student Access Codes</h1><p>Keep this list secure. Give each student only their own access code.</p><table><thead><tr><th>Student ID</th><th>Student name</th><th>Personal Access Code</th></tr></thead><tbody>'+rows+'</tbody></table><script>window.onload=function(){window.print()}</script></body></html>'
    const w=window.open('','_blank');if(!w){setNotice({kind:'error',text:'Please allow pop-ups to print access codes.'});return}w.document.write(html);w.document.close()
  }
  async function addStudent(e:React.FormEvent){e.preventDefault();if(!currentClass)return;setBusy(true);setNotice(null);try{const d=await call('add_student',{class_id:currentClass.id,student_number:studentNumber.trim(),display_name:studentName.trim()});setStudentNumber('');setStudentName('');setShowAdd(false);setNotice({kind:'success',text:'Student added. Personal Access Code: '+d.pac});await load();await loadAccessCodes()}catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not add student.'})}finally{setBusy(false)}}

  async function bulkAdd(e:React.FormEvent){e.preventDefault();if(!currentClass)return;const rows=bulkText.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const parts=line.includes('\t')?line.split('\t'):line.split(',');return {student_number:(parts[0]||'').trim(),display_name:parts.slice(1).join(',').trim()}});setBusy(true);setNotice(null);try{const d=await call('bulk_add_students',{class_id:currentClass.id,students:rows});setBulkText('');setShowBulk(false);setNotice({kind:'success',text:d.created_count+' students added. Personal Access Codes generated.'});await load();await loadAccessCodes()}catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not import students.'})}finally{setBusy(false)}}
  async function archiveClass(id:string){if(!window.confirm('Archive this class? Student records and history will be retained.'))return;setBusy(true);try{await call('archive_class',{class_id:id});setNotice({kind:'success',text:'Class archived. Student records have been retained.'});await load()}catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not archive class.'})}finally{setBusy(false)}}
  return <div className="class-management">
    <div className="management-heading"><div><div className="student-kicker">{workspaceType==='school'?'SCHOOL ADMINISTRATION':'TEACHER WORKSPACE'}</div><h2>Classes & Students</h2><p>{workspaceName} · Manage your English classes and student records.</p></div><button className="management-refresh" onClick={load} title="Refresh"><RefreshCw size={16}/></button></div>
    <div className="management-summary"><div><Users size={19}/><span><b>{activeTeacherCount}</b><small>Active teachers</small></span></div><div><BookOpen size={19}/><span><b>{activeClasses.length}</b><small>Active classes</small></span></div><div><Users size={19}/><span><b>{students.filter(s=>s.status==='active').length}</b><small>Student records</small></span></div></div>
    {notice&&<div className={'management-notice '+notice.kind}>{notice.text}</div>}
    {workspaceType==='school'&&<section className="teacher-directory"><div className="teacher-directory-heading"><div><h3>School teachers</h3><p>Click a teacher to see their assigned classes.</p></div><span>{teachers.length} active</span></div>{loading?<p className="class-empty">Loading teachers…</p>:teachers.length===0?<p className="class-empty">No teachers have joined this school yet. Invite teachers above to get started.</p>:teachers.map(t=><div className="teacher-directory-item" key={t.membership_id}><button className="teacher-directory-toggle" onClick={()=>setExpandedTeacher(expandedTeacher===t.membership_id?'':t.membership_id)}><span className="teacher-avatar">{t.full_name.trim().charAt(0).toUpperCase()}</span><span className="teacher-name">{t.full_name}<small>{t.assigned_classes.length} assigned {t.assigned_classes.length===1?'class':'classes'}</small></span><ChevronRight className={expandedTeacher===t.membership_id?'teacher-chevron expanded':'teacher-chevron'} size={17}/></button>{expandedTeacher===t.membership_id&&<div className="teacher-assigned-classes">{t.assigned_classes.filter(x=>x.active).length? t.assigned_classes.filter(x=>x.active).map(cls=><span key={cls.id}>{cls.name}</span>):<p>No classes assigned yet.</p>}</div>}</div>)}</section>}
    {canManage&&<form className="create-class-form" onSubmit={createClass}><label>Create a class<input value={newClass} onChange={e=>setNewClass(e.target.value)} placeholder="e.g. M1/1" maxLength={120} required/></label><button className="primary-button" disabled={busy}><Plus size={17}/> Create class</button></form>}
    <div className="class-layout">
      <aside className="class-sidebar"><div className="class-sidebar-title">YOUR CLASSES <span>{activeClasses.length}</span></div>{loading?<p className="class-empty">Loading classes…</p>:activeClasses.length===0?<p className="class-empty">No classes yet. Create your first class above.</p>:activeClasses.map(c=><button key={c.id} className={'class-choice '+(currentClass?.id===c.id?'selected':'')} onClick={()=>{setSelectedClass(c.id);setShowAdd(false);setShowBulk(false)}}><span>{c.name}</span><ChevronRight size={16}/></button>)}
        {classes.some(c=>!c.active)&&<div className="archived-label">{classes.filter(c=>!c.active).length} archived classes</div>}
      </aside>
      <section className="class-detail">{currentClass?<><div className="class-detail-heading"><div><h3>{currentClass.name}</h3><p>{classStudents.length} currently enrolled</p></div>{canManage&&<button className="archive-class" onClick={()=>archiveClass(currentClass.id)} disabled={busy}><Archive size={14}/> Archive</button>}</div>
        {canManage&&<div className="student-actions"><button onClick={()=>{setShowAdd(!showAdd);setShowBulk(false)}}><UserPlus size={15}/> Add student</button><button onClick={()=>{setShowBulk(!showBulk);setShowAdd(false)}}><Upload size={15}/> Bulk import</button><button onClick={()=>loadAccessCodes()} disabled={accessBusy}><KeyRound size={15}/> {accessBusy?'Loading…':'Access codes'}</button></div>}
        {showAdd&&<form className="student-entry-form" onSubmit={addStudent}><label>Student number<input value={studentNumber} onChange={e=>setStudentNumber(e.target.value)} required/></label><label>Student name<input value={studentName} onChange={e=>setStudentName(e.target.value)} required/></label><div><button className="primary-button" disabled={busy}>{busy?'Saving…':'Add student'}</button><button type="button" className="cancel-inline" onClick={()=>setShowAdd(false)}><X size={15}/></button></div></form>}

        {showAccessCodes&&<section className="access-code-panel"><div className="access-code-heading"><div><h4>Student Personal Access Codes</h4><p>Keep these codes confidential. Give each student only their own code.</p></div><div><button type="button" onClick={()=>generateMissingPacs()} disabled={accessBusy}><KeyRound size={15}/> Generate missing</button><button type="button" onClick={()=>printCodes()} disabled={!accessCodes.length}><Printer size={15}/> Print class list</button><button type="button" onClick={()=>setShowAccessCodes(false)}><X size={15}/></button></div></div><div className="access-code-table-wrap"><table className="student-table"><thead><tr><th>Student ID</th><th>Student name</th><th>Personal Access Code</th><th>Actions</th></tr></thead><tbody>{accessCodes.map(a=><tr key={a.id}><td>{a.student_number}</td><td>{a.display_name}</td><td><strong className="pac-value">{a.pac||'Not generated'}</strong></td><td><button className="pac-action" onClick={()=>printCodes(a)} title="Print this student"><Printer size={14}/></button><button className="pac-action" onClick={()=>resetPac(a.id)} disabled={accessBusy} title="Generate a new code"><RotateCcw size={14}/></button></td></tr>)}</tbody></table></div></section>}
        {showBulk&&<form className="bulk-entry-form" onSubmit={bulkAdd}><label>Paste student number and name — one student per line<textarea value={bulkText} onChange={e=>setBulkText(e.target.value)} placeholder={'422, Chao\n426, Maprom\n427, Mali'} rows={6} required/></label><small>Use a comma or tab between the student number and name. Maximum 500 students per import.</small><div><button className="primary-button" disabled={busy}>{busy?'Importing…':'Import students'}</button><button type="button" className="cancel-inline" onClick={()=>setShowBulk(false)}><X size={15}/></button></div></form>}
        <div className="student-table-wrap"><table className="student-table"><thead><tr><th>Student ID</th><th>Student name</th><th>Status</th></tr></thead><tbody>{classStudents.map(s=><tr key={s.id}><td>{s.student_number}</td><td>{s.display_name}</td><td><span className="active-student">Active</span></td></tr>)}</tbody></table>{classStudents.length===0&&<div className="class-empty">No students in this class yet. Add students individually or import a list.</div>}</div>
      </>:<div className="class-empty large">Select a class or create your first one.</div>}</section>
    </div>
  </div>
}
