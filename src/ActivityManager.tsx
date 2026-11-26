import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Plus, RefreshCw, BookOpen, PenLine, Headphones, SpellCheck, Languages, Mic, Combine, Archive, Send, FileEdit, X } from 'lucide-react'

type Props = { workspaceId: string; role: 'owner'|'admin'|'teacher' }
type Category = 'writing'|'reading'|'listening'|'spelling'|'grammar'|'speaking'|'mixed'
type Activity = { id:string; title:string; category_code:Category; activity_type:string; cefr_level:string|null; description:string|null; learning_objective:string|null; status:'draft'|'published'|'archived'; created_by:string|null; activity_skill_components?:{category_code:string;is_assessed:boolean}[] }
const categories:{code:Category;label:string;icon:any;description:string}[]=[
{code:'writing',label:'Writing',icon:PenLine,description:'Essays, paragraphs and written communication'},
{code:'reading',label:'Reading',icon:BookOpen,description:'Comprehension, inference and text analysis'},
{code:'listening',label:'Listening',icon:Headphones,description:'Audio comprehension and spoken instructions'},
{code:'spelling',label:'Spelling',icon:SpellCheck,description:'Dictation, spelling patterns and word accuracy'},
{code:'grammar',label:'Grammar',icon:Languages,description:'Grammar knowledge and sentence construction'},
{code:'speaking',label:'Speaking',icon:Mic,description:'Teacher-led oral assessment and presentations'},
{code:'mixed',label:'Mixed Skills',icon:Combine,description:'Integrated activities combining multiple skills'}
]
const skillCodes:Category[]=['writing','reading','listening','spelling','grammar','speaking']
const levels=['Pre-A1','A1','A2','B1','B2','C1','C2']

export default function ActivityManager({workspaceId,role}:Props){
 const [activities,setActivities]=useState<Activity[]>([])
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false)
 const [notice,setNotice]=useState<{kind:'error'|'success';text:string}|null>(null)
 const [showForm,setShowForm]=useState(false),[filter,setFilter]=useState('all')
 const [title,setTitle]=useState(''),[category,setCategory]=useState<Category>('reading')
 const [type,setType]=useState('practice'),[level,setLevel]=useState('A2')
 const [description,setDescription]=useState(''),[objective,setObjective]=useState('')
 const [skills,setSkills]=useState<Category[]>(['reading','writing']),[editing,setEditing]=useState<string|null>(null)
 const call=useCallback(async(action:string,extra:Record<string,unknown>={})=>{
  const {data,error}=await supabase.functions.invoke('workspace-academics',{body:{action,workspace_id:workspaceId,...extra}})
  if(error||data?.error)throw new Error(data?.error||error.message)
  return data
 },[workspaceId])
 const load=useCallback(async()=>{
  setLoading(true)
  try{const data=await call('list_activities');setActivities(data.activities||[])}
  catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not load activities.'})}
  finally{setLoading(false)}
 },[call])
 useEffect(()=>{void load()},[load])
 function resetForm(){setTitle('');setCategory('reading');setType('practice');setLevel('A2');setDescription('');setObjective('');setSkills(['reading','writing']);setEditing(null);setShowForm(false)}
 function openEdit(a:Activity){setEditing(a.id);setTitle(a.title);setCategory(a.category_code);setType(a.activity_type);setLevel(a.cefr_level||'');setDescription(a.description||'');setObjective(a.learning_objective||'');setSkills(a.activity_skill_components?.map(x=>x.category_code as Category)||[a.category_code]);setShowForm(true)}
 function toggleSkill(skill:Category){setSkills(old=>old.includes(skill)?old.filter(x=>x!==skill):[...old,skill])}
 async function save(e:React.FormEvent){
  e.preventDefault();setBusy(true);setNotice(null)
  try{
   const payload={title,category_code:category,activity_type:type,cefr_level:level||null,description,learning_objective:objective,skills:category==='mixed'?skills:[category]}
   if(editing)await call('update_activity',{activity_id:editing,...payload});else await call('create_activity',payload)
   setNotice({kind:'success',text:editing?'Activity updated.':'Activity saved as a draft.'});resetForm();await load()
  }catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not save activity.'})}
  finally{setBusy(false)}
 }
 async function changeStatus(a:Activity,status:string){
  setBusy(true);setNotice(null)
  try{await call('set_activity_status',{activity_id:a.id,status});setNotice({kind:'success',text:status==='published'?'Activity published.':status==='archived'?'Activity archived.':'Activity moved to drafts.'});await load()}
  catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not update activity.'})}
  finally{setBusy(false)}
 }
 const visible=activities.filter(a=>filter==='all'||a.category_code===filter)
 const skillName=(code:string)=>categories.find(c=>c.code===code)?.label||code
 return <section className="activity-manager">
  <div className="activity-heading"><div><div className="student-kicker">ENGLISH LEARNING LIBRARY</div><h2>Activity Manager</h2><p>Create and organize practice activities and assessments for your workspace.</p></div><button className="primary-button activity-create" onClick={()=>{resetForm();setShowForm(true)}}><Plus size={17}/> Create activity</button></div>
  <div className="activity-category-grid">{categories.map(c=>{const Icon=c.icon;const count=activities.filter(a=>a.category_code===c.code&&a.status!=='archived').length;return <button key={c.code} className={'activity-category '+(filter===c.code?'selected':'')} onClick={()=>setFilter(filter===c.code?'all':c.code)}><Icon size={19}/><span><b>{c.label}</b><small>{c.description}</small></span><strong>{count}</strong></button>})}</div>
  {notice&&<div className={'management-notice '+notice.kind}>{notice.text}</div>}
  {showForm&&<div className="activity-form-panel">
   <div className="activity-form-heading"><div><h3>{editing?'Edit activity':'Create an activity'}</h3><p>Start with the learning goal. You can add questions and scoring later.</p></div><button className="management-refresh" onClick={resetForm} aria-label="Close"><X size={17}/></button></div>
   <form onSubmit={save} className="activity-form">
    <label>Activity title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Reading: The Environment" minLength={2} maxLength={180} required/></label>
    <div className="activity-form-row">
     <label>Main category<select value={category} onChange={e=>setCategory(e.target.value as Category)}>{categories.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}</select></label>
     <label>Activity type<select value={type} onChange={e=>setType(e.target.value)}><option value="practice">Practice</option><option value="assessment">Assessment</option><option value="placement">Placement</option><option value="teacher_led">Teacher-led</option></select></label>
     <label>CEFR level<select value={level} onChange={e=>setLevel(e.target.value)}><option value="">Not set</option>{levels.map(l=><option key={l}>{l}</option>)}</select></label>
    </div>
    {category==='mixed'&&<fieldset className="activity-skills"><legend>Skills included in this activity (choose at least two)</legend>{skillCodes.map(s=><label key={s}><input type="checkbox" checked={skills.includes(s)} onChange={()=>toggleSkill(s)}/>{skillName(s)}</label>)}</fieldset>}
    {category==='speaking'&&<div className="activity-info-note">Speaking activities are teacher-led. Questions, student responses and rubric scoring will be added in the speaking assessment workflow.</div>}
    <label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2} placeholder="Briefly describe the activity."/></label>
    <label>Learning objective<textarea value={objective} onChange={e=>setObjective(e.target.value)} rows={2} placeholder="What should students know or be able to do?"/></label>
    <div className="activity-standards-note"><b>Standards alignment</b><span>CEFR level is selected above. Cambridge English, WIDA and Common Core descriptors will be attachable from the Standards Library as verified standards are added.</span></div>
    <div className="activity-form-actions"><button type="button" className="secondary-button" onClick={resetForm}>Cancel</button><button className="primary-button" disabled={busy||(category==='mixed'&&skills.length<2)}>{busy?'Saving…':'Save as draft'}</button></div>
   </form>
  </div>}
  <div className="activity-list-heading"><div><h3>Activities</h3><p>{visible.length} {visible.length===1?'activity':'activities'} {filter==='all'?'in this workspace':'in '+skillName(filter)}</p></div><div className="activity-list-tools"><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}</select><button className="management-refresh" onClick={load} title="Refresh"><RefreshCw size={16}/></button></div></div>
  {loading?<div className="activity-empty">Loading activities…</div>:visible.length===0?<div className="activity-empty"><BookOpen size={27}/><b>No activities here yet</b><span>Create your first English activity to start building your learning library.</span></div>:<div className="activity-list">{visible.map(a=>{const c=categories.find(x=>x.code===a.category_code)!;const Icon=c.icon;return <article className="activity-card" key={a.id}><div className="activity-card-icon"><Icon size={20}/></div><div className="activity-card-content"><div className="activity-card-title"><h4>{a.title}</h4><span className={'activity-status '+a.status}>{a.status}</span></div><div className="activity-meta"><span>{c.label}</span><span>{a.activity_type.replace('_',' ')}</span>{a.cefr_level&&<span>{a.cefr_level}</span>}</div>{a.category_code==='mixed'&&<div className="activity-skill-tags">{(a.activity_skill_components||[]).map(s=><span key={s.category_code}>{skillName(s.category_code)}</span>)}</div>}{a.learning_objective&&<p>{a.learning_objective}</p>}</div><div className="activity-card-actions"><button onClick={()=>openEdit(a)} title="Edit activity"><FileEdit size={16}/></button>{a.status==='draft'&&<button onClick={()=>changeStatus(a,'published')} disabled={busy} title="Publish"><Send size={16}/></button>}{a.status==='published'&&<button onClick={()=>changeStatus(a,'draft')} disabled={busy} title="Move to drafts"><FileEdit size={16}/></button>}{a.status!=='archived'&&<button onClick={()=>changeStatus(a,'archived')} disabled={busy} title="Archive"><Archive size={16}/></button>}</div></article>})}</div>}
 </section>
}
