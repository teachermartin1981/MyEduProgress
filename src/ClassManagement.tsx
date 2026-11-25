import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { Archive, BookOpen, ChevronRight, Plus, RefreshCw, Users, UserPlus, Upload, X } from 'lucide-react'

type Props = { workspaceId: string; workspaceName: string; role: 'owner'|'admin'|'teacher'; workspaceType: 'teacher'|'school' }
type ClassRow = { id: string; name: string; active: boolean; academic_year_id: string | null }
type StudentRow = { id: string; student_number: string; display_name: string; status: string; workspace_class_enrollments?: { id: string; class_id: string; ended_at: string | null; workspace_classes?: { name: string } | null }[] }
type Notice = { kind: 'error'|'success'; text: string } | null

export default function ClassManagement({ workspaceId, workspaceName, role, workspaceType }: Props) {
  const [classes,setClasses]=useState<ClassRow[]>([])
  const [students,setStudents]=useState<StudentRow[]>([])
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
  const canManage = role === 'owner' || role === 'admin'
  const call = useCallback(async (action:string, extra:Record<string,unknown>={}) => {
    const {data,error}=await supabase.functions.invoke('workspace-academics',{body:{action,workspace_id:workspaceId,...extra}})
    if(error || data?.error) throw new Error(data?.error || error.message)
    return data
  },[workspaceId])
  const load=useCallback(async()=>{
    setLoading(true)
    try { const data=await call('list'); setClasses(data.classes||[]); setStudents(data.students||[]) }
    catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not load classes.'})}
    finally{setLoading(false)}
  },[call])
  useEffect(()=>{void load()},[load])
  const activeClasses=classes.filter(c=>c.active)
  const currentClass=activeClasses.find(c=>c.id===selectedClass) || activeClasses[0]
  const classStudents=useMemo(()=>students.filter(s=>s.workspace_class_enrollments?.some(e=>e.ended_at===null && e.class_id===currentClass?.id)),[students,currentClass])
  async function createClass(e:React.FormEvent){e.preventDefault();if(!newClass.trim())return;setBusy(true);setNotice(null);try{const d=await call('create_class',{name:newClass.trim()});setNewClass('');setSelectedClass(d.class.id);setNotice({kind:'success',text:'Class created.'});await load()}catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not create class.'})}finally{setBusy(false)}}
  async function addStudent(e:React.FormEvent){e.preventDefault();if(!currentClass)return;setBusy(true);setNotice(null);try{await call('add_student',{class_id:currentClass.id,student_number:studentNumber.trim(),display_name:studentName.trim()});setStudentNumber('');setStudentName('');setShowAdd(false);setNotice({kind:'success',text:'Student added to the class.'});await load()}catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not add student.'})}finally{setBusy(false)}}
  async function bulkAdd(e:React.FormEvent){e.preventDefault();if(!currentClass)return;const rows=bulkText.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const parts=line.includes('\t')?line.split('\t'):line.split(',');return {student_number:(parts[0]||'').trim(),display_name:parts.slice(1).join(',').trim()}});setBusy(true);setNotice(null);try{const d=await call('bulk_add_students',{class_id:currentClass.id,students:rows});setBulkText('');setShowBulk(false);setNotice({kind:'success',text:`${d.created_count} students added to ${currentClass.name}.`});await load()}catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not import students.'})}finally{setBusy(false)}}
  async function archiveClass(id:string){if(!window.confirm('Archive this class? Student records and history will be retained.'))return;setBusy(true);try{await call('archive_class',{class_id:id});setNotice({kind:'success',text:'Class archived. Student records have been retained.'});await load()}catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not archive class.'})}finally{setBusy(false)}}
  return <div className="class-management">
    <div className="management-heading"><div><div className="student-kicker">{workspaceType==='school'?'SCHOOL ADMINISTRATION':'TEACHER WORKSPACE'}</div><h2>Classes & Students</h2><p>{workspaceName} · Manage your English classes and student records.</p></div><button className="management-refresh" onClick={load} title="Refresh"><RefreshCw size={16}/></button></div>
    <div className="management-summary"><div><BookOpen size={19}/><span><b>{activeClasses.length}</b><small>Active classes</small></span></div><div><Users size={19}/><span><b>{students.filter(s=>s.status==='active').length}</b><small>Student records</small></span></div></div>
    {notice&&<div className={'management-notice '+notice.kind}>{notice.text}</div>}
    {canManage&&<form className="create-class-form" onSubmit={createClass}><label>Create a class<input value={newClass} onChange={e=>setNewClass(e.target.value)} placeholder="e.g. M1/1" maxLength={120} required/></label><button className="primary-button" disabled={busy}><Plus size={17}/> Create class</button></form>}
    <div className="class-layout">
      <aside className="class-sidebar"><div className="class-sidebar-title">YOUR CLASSES <span>{activeClasses.length}</span></div>{loading?<p className="class-empty">Loading classes…</p>:activeClasses.length===0?<p className="class-empty">No classes yet. Create your first class above.</p>:activeClasses.map(c=><button key={c.id} className={'class-choice '+(currentClass?.id===c.id?'selected':'')} onClick={()=>{setSelectedClass(c.id);setShowAdd(false);setShowBulk(false)}}><span>{c.name}</span><ChevronRight size={16}/></button>)}
        {classes.some(c=>!c.active)&&<div className="archived-label">{classes.filter(c=>!c.active).length} archived classes</div>}
      </aside>
      <section className="class-detail">{currentClass?<><div className="class-detail-heading"><div><h3>{currentClass.name}</h3><p>{classStudents.length} currently enrolled</p></div>{canManage&&<button className="archive-class" onClick={()=>archiveClass(currentClass.id)} disabled={busy}><Archive size={14}/> Archive</button>}</div>
        {canManage&&<div className="student-actions"><button onClick={()=>{setShowAdd(!showAdd);setShowBulk(false)}}><UserPlus size={15}/> Add student</button><button onClick={()=>{setShowBulk(!showBulk);setShowAdd(false)}}><Upload size={15}/> Bulk import</button></div>}
        {showAdd&&<form className="student-entry-form" onSubmit={addStudent}><label>Student number<input value={studentNumber} onChange={e=>setStudentNumber(e.target.value)} required/></label><label>Student name<input value={studentName} onChange={e=>setStudentName(e.target.value)} required/></label><div><button className="primary-button" disabled={busy}>{busy?'Saving…':'Add student'}</button><button type="button" className="cancel-inline" onClick={()=>setShowAdd(false)}><X size={15}/></button></div></form>}
        {showBulk&&<form className="bulk-entry-form" onSubmit={bulkAdd}><label>Paste student number and name — one student per line<textarea value={bulkText} onChange={e=>setBulkText(e.target.value)} placeholder={'422, Chao\n426, Maprom\n427, Mali'} rows={6} required/></label><small>Use a comma or tab between the student number and name. Maximum 500 students per import.</small><div><button className="primary-button" disabled={busy}>{busy?'Importing…':'Import students'}</button><button type="button" className="cancel-inline" onClick={()=>setShowBulk(false)}><X size={15}/></button></div></form>}
        <div className="student-table-wrap"><table className="student-table"><thead><tr><th>Student ID</th><th>Student name</th><th>Status</th></tr></thead><tbody>{classStudents.map(s=><tr key={s.id}><td>{s.student_number}</td><td>{s.display_name}</td><td><span className="active-student">Active</span></td></tr>)}</tbody></table>{classStudents.length===0&&<div className="class-empty">No students in this class yet. Add students individually or import a list.</div>}</div>
      </>:<div className="class-empty large">Select a class or create your first one.</div>}</section>
    </div>
  </div>
}
