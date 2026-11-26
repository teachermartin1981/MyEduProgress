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
    const esc=(value:string)=>value.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch))
    const selected=student?[student]:accessCodes
    const rows=selected.map(x=>'<tr><td class="student-id">'+esc(x.student_number)+'</td><td>'+esc(x.display_name)+'</td><td><span class="pac">'+esc(x.pac||'Not generated')+'</span></td></tr>').join('')
    const individual=!!student
    const intro=individual
      ? 'This is your personal login code for MyEduProgress. Keep it somewhere safe and do not share it with other students.'
      : 'This secure class register contains the student login details for MyEduProgress. Give each student only their own Personal Access Code. Please store this document securely and do not display the full list to students.'
    const logo='<div class="brand-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.5c3.2-.9 6.2-.2 8.5 1.8v12c-2.3-2-5.3-2.7-8.5-1.8zM20.5 5.5c-3.2-.9-6.2-.2-8.5 1.8v12c2.3-2 5.3-2.7 8.5-1.8z" fill="none" stroke="white" stroke-width="1.6" stroke-linejoin="round"/><path d="m15 11 1.5 1.5 3-3" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'
    const html='<!doctype html><html><head><meta charset="utf-8"><title>MyEduProgress – Student access details</title><style>'+
      '*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:34px;color:#1d2944;background:#fff}.page{max-width:900px;margin:0 auto}.masthead{display:flex;align-items:center;gap:12px;padding-bottom:22px;border-bottom:2px solid #e9edf6}.brand-mark{width:44px;height:44px;border-radius:13px;background:#5868df;display:grid;place-items:center;box-shadow:0 5px 14px #5868df30}.brand-mark svg{width:26px;height:26px}.brand-name{font-size:23px;font-weight:800;letter-spacing:-.7px;color:#1d2944}.brand-name span{color:#5868df}.document-label{margin-left:auto;text-align:right;color:#78839a;font-size:10px;letter-spacing:1.3px;text-transform:uppercase;font-weight:700}.intro{padding:25px 0 18px}.eyebrow{font-size:10px;letter-spacing:1.5px;color:#5868df;font-weight:800;text-transform:uppercase;margin-bottom:8px}h1{font-size:25px;letter-spacing:-.6px;margin:0 0 8px;color:#1d2944}.intro p{font-size:13px;line-height:1.65;color:#66738d;max-width:700px;margin:0}.class-meta{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 20px}.meta-chip{background:#f3f5fb;border:1px solid #e7ebf4;border-radius:8px;padding:8px 11px;font-size:11px;color:#53617c}.meta-chip strong{color:#273653}.table-title{font-size:13px;font-weight:700;color:#35425e;margin:0 0 9px}table{width:100%;border-collapse:collapse;font-size:12px}thead{display:table-header-group}th{background:#f1f4fb;color:#52617c;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.7px;padding:12px;border-top:1px solid #e3e8f2;border-bottom:1px solid #dce3ef}td{padding:13px 12px;border-bottom:1px solid #e8edf5;color:#34415d}tbody tr:nth-child(even){background:#fbfcfe}.student-id{font-weight:700;color:#5868df;width:18%}.pac{display:inline-block;background:#eef1ff;color:#3345a4;border:1px solid #dce2ff;border-radius:6px;padding:7px 11px;font-family:Consolas,monospace;font-size:13px;font-weight:800;letter-spacing:1.6px}.footer{margin-top:26px;padding-top:13px;border-top:1px solid #e8edf5;display:flex;justify-content:space-between;gap:15px;color:#8993a7;font-size:9px}.footer strong{color:#5868df}.single-card{margin-top:18px;padding:20px;border:1px solid #dfe5f2;border-radius:14px;background:#fbfcff}.single-card .pac{font-size:19px;padding:12px 18px}.single-card p{font-size:11px;color:#78839a;margin:9px 0 0}@page{size:A4 portrait;margin:14mm}@media print{body{padding:0}.page{max-width:none}.brand-mark{print-color-adjust:exact;-webkit-print-color-adjust:exact}.pac,.meta-chip,.single-card,th{print-color-adjust:exact;-webkit-print-color-adjust:exact}}'+
      '</style></head><body><main class="page"><header class="masthead">'+logo+'<div class="brand-name">MyEdu<span>Progress</span></div><div class="document-label">Student access<br>information</div></header><section class="intro"><div class="eyebrow">Every student. Every step. Every achievement.</div><h1>'+(individual?'Your MyEduProgress login details':'Student Personal Access Codes')+'</h1><p>'+intro+'</p></section><div class="class-meta"><div class="meta-chip">Class: <strong>'+esc(currentClass?.name||'Class')+'</strong></div><div class="meta-chip">Students: <strong>'+selected.length+'</strong></div><div class="meta-chip">Prepared: <strong>'+new Date().toLocaleDateString()+'</strong></div></div>'+(individual?'<section class="single-card"><div class="table-title">'+esc(student?.display_name||'Student')+' · Student ID '+esc(student?.student_number||'')+'</div><div class="pac">'+esc(student?.pac||'Not generated')+'</div><p>Enter your Student ID and this Personal Access Code on the MyEduProgress student login page.</p></section>':'<div class="table-title">Class access register</div><table><thead><tr><th>Student ID</th><th>Student name</th><th>Personal Access Code</th></tr></thead><tbody>'+rows+'</tbody></table>')+'<footer class="footer"><span><strong>MyEduProgress</strong> · Secure student access information</span><span>Keep confidential · '+new Date().toLocaleDateString()+'</span></footer></main><script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>'
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
