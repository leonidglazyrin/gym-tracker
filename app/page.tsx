"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Check, Dumbbell, LogOut, Plus, Trash2, UserRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createAccount, db, deleteAccount, getSession, Session, updateProfileName } from "../lib/supabase";

type DbExercise = { id:string; name:string; muscle_group:string|null; is_custom:boolean; user_id:string|null };
type SetRow = { id?:string; set_number:number; reps:number; weight:number; completed_at?:string|null; done:boolean };
type WorkoutExercise = { id:string; exercise_id:string; sort_order:number; exercise:DbExercise; sets:SetRow[] };
type CatalogExercise = DbExercise & { image:string };

const exerciseImageBase="https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const imageFor=(name:string)=>`${exerciseImageBase}${encodeURIComponent(name.trim().replace(/ /g,"_"))}/0.jpg`;
const muscleGroups=["Chest","Back","Legs","Shoulders","Biceps","Triceps","Abs","Calves","Lower Back"];

export default function Home(){
  const [session,setSession]=useState<Session|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [name,setName]=useState("");
  const [tab,setTab]=useState<"today"|"progress"|"profile">("today");
  const [catalog,setCatalog]=useState<CatalogExercise[]>([]);
  const [workoutExercises,setWorkoutExercises]=useState<WorkoutExercise[]>([]);
  const [selected,setSelected]=useState(0);
  const [progress,setProgress]=useState<{d:string;w:number}[]>([]);
  const [saving,setSaving]=useState(false);
  const [deleting,setDeleting]=useState(false);
  const [newExercise,setNewExercise]=useState("");
  const [newMuscle,setNewMuscle]=useState("Chest");

  const current=workoutExercises[selected];
  const completed=useMemo(()=>workoutExercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0),[workoutExercises]);
  const totalSets=useMemo(()=>workoutExercises.reduce((n,e)=>n+e.sets.length,0),[workoutExercises]);

  useEffect(()=>{(async()=>{
    try{const s=await getSession();if(s){setSession(s);setName(s.user.user_metadata?.display_name||"");await loadData(s);}}
    catch(e){setError(e instanceof Error?e.message:"Could not load app");}
    finally{setLoading(false);}
  })();},[]);

  async function ensureExerciseLibrary(s:Session){
    const profiles=await db<any[]>(`profiles?select=exercise_library_initialized&id=eq.${s.user.id}&limit=1`,{},s);
    if(profiles[0]?.exercise_library_initialized)return;
    const templates=await db<DbExercise[]>("exercises?select=*&user_id=is.null&order=name",{},s);
    if(templates.length)await db("exercises",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(templates.map(e=>({name:e.name,muscle_group:e.muscle_group,is_custom:false,user_id:s.user.id})))},s);
    await db(`profiles?id=eq.${s.user.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({exercise_library_initialized:true})},s);
  }

  async function loadData(s:Session){
    await ensureExerciseLibrary(s);
    const ex=await db<DbExercise[]>(`exercises?select=*&user_id=eq.${s.user.id}&order=name`,{},s);
    setCatalog(ex.map(e=>({...e,image:imageFor(e.name)})));
    const start=new Date();start.setHours(0,0,0,0);
    const wr=await db<any[]>(`workouts?select=*&user_id=eq.${s.user.id}&started_at=gte.${encodeURIComponent(start.toISOString())}&order=started_at.desc&limit=1`,{},s);
    let workout=wr[0];
    if(!workout)workout=(await db<any[]>("workouts",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({user_id:s.user.id})},s))[0];
    const wes=await db<any[]>(`workout_exercises?select=*&workout_id=eq.${workout.id}&order=sort_order`,{},s);
    const sr=wes.length?await db<any[]>(`sets?select=*&workout_exercise_id=in.(${wes.map(w=>w.id).join(",")})&order=set_number`,{},s):[];
    const by:Record<string,SetRow[]>={};sr.forEach(x=>(by[x.workout_exercise_id] ||= []).push({...x,done:!!x.completed_at}));
    const byEx=Object.fromEntries(ex.map(x=>[x.id,x]));
    setWorkoutExercises(wes.map(w=>({...w,exercise:byEx[w.exercise_id],sets:by[w.id]||[{set_number:1,reps:8,weight:0,done:false}]})).filter(w=>w.exercise));
    setSelected(0);
    await loadProgress(s,ex[0]?.id);
  }

  async function loadProgress(s:Session,exerciseId?:string){
    if(!exerciseId){setProgress([]);return;}
    const wes=await db<any[]>(`workout_exercises?select=id,workout:workouts!inner(user_id,started_at)&exercise_id=eq.${exerciseId}&workout.user_id=eq.${s.user.id}&order=workout(started_at).asc`,{},s);
    if(!wes.length){setProgress([]);return;}
    const sets=await db<any[]>(`sets?select=*&workout_exercise_id=in.(${wes.map(w=>w.id).join(",")})&completed_at=not.is.null&order=completed_at`,{},s);
    const map=new Map<string,string>();wes.forEach(w=>map.set(w.id,new Date(w.workout.started_at).toLocaleDateString(undefined,{month:"short",day:"numeric"})));
    setProgress(sets.map(x=>({d:map.get(x.workout_exercise_id)||"",w:Number(x.weight)})).filter(x=>x.w>0));
  }

  useEffect(()=>{if(session&&current)loadProgress(session,current.exercise_id).catch(()=>{});},[selected,session,current?.exercise_id]);

  async function start(n:string){
    if(!n.trim())return;setError("");setLoading(true);
    try{const s=await createAccount(n);setSession(s);setName(n.trim());await db("profiles",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({id:s.user.id,display_name:n.trim()})},s);await loadData(s);}
    catch(e){setError(e instanceof Error?e.message:"Could not create account");}
    finally{setLoading(false);}
  }

  async function addExercise(e:CatalogExercise){
    if(!session)return;
    const existing=workoutExercises.findIndex(x=>x.exercise_id===e.id);if(existing>=0){setSelected(existing);return;}
    const workout=await db<any[]>(`workouts?select=id&user_id=eq.${session.user.id}&order=started_at.desc&limit=1`,{},session);
    const row=await db<any[]>("workout_exercises",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({workout_id:workout[0].id,exercise_id:e.id,sort_order:workoutExercises.length})},session);
    setWorkoutExercises(x=>[...x,{...row[0],exercise:e,sets:[{set_number:1,reps:8,weight:0,done:false}]}]);setSelected(workoutExercises.length);
  }

  async function createCustomExercise(){
    if(!session||!newExercise.trim())return;setError("");
    try{const rows=await db<DbExercise[]>("exercises",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({name:newExercise.trim(),muscle_group:newMuscle,is_custom:true,user_id:session.user.id})},session);const e={...rows[0],image:imageFor(newExercise.trim())};setCatalog(x=>[...x,e].sort((a,b)=>a.name.localeCompare(b.name)));setNewExercise("");await addExercise(e);}
    catch(e){setError(e instanceof Error?e.message:"Could not create exercise");}
  }

  async function removeExercise(){
    if(!session||!current)return;
    if(!window.confirm(`Delete ${current.exercise.name} from your exercise library? Its workout history will also be deleted.`))return;
    try{await db(`exercises?id=eq.${current.exercise.id}`,{method:"DELETE"},session);const next=workoutExercises.filter(x=>x.exercise_id!==current.exercise.id);setWorkoutExercises(next);setCatalog(x=>x.filter(x=>x.id!==current.exercise.id));setSelected(Math.max(0,Math.min(selected,next.length-1)));setProgress([]);}
    catch(e){setError(e instanceof Error?e.message:"Could not delete exercise");}
  }

  function editSet(i:number,key:"reps"|"weight",v:string){setWorkoutExercises(es=>es.map((e,ei)=>ei!==selected?e:{...e,sets:e.sets.map((s,si)=>si===i?{...s,[key]:Number(v)}:s)}));}
  function addSet(){if(!current)return;setWorkoutExercises(es=>es.map((e,ei)=>ei!==selected?e:{...e,sets:[...e.sets,{set_number:e.sets.length+1,reps:e.sets.at(-1)?.reps||8,weight:e.sets.at(-1)?.weight||0,done:false}]}));}

  async function saveSet(i:number){
    if(!session||!current)return;const s=current.sets[i];if(!s||s.reps<=0)return;setSaving(true);
    try{if(s.id)await db(`sets?id=eq.${s.id}`,{method:"PATCH",body:JSON.stringify({reps:s.reps,weight:s.weight,completed_at:new Date().toISOString()})},session);else{const ins=await db<any[]>("sets",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({workout_exercise_id:current.id,set_number:s.set_number,reps:s.reps,weight:s.weight,completed_at:new Date().toISOString()})},session);s.id=ins[0]?.id;}setWorkoutExercises(es=>es.map((e,ei)=>ei!==selected?e:{...e,sets:e.sets.map((x,si)=>si===i?{...x,done:true,completed_at:new Date().toISOString()}:x)}));}
    finally{setSaving(false);}
  }

  async function saveName(){if(!session||!name.trim())return;const s=await updateProfileName(session,name);setSession(s);await db("profiles",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({id:s.user.id,display_name:name.trim()})},s);}
  function forgetDevice(){localStorage.removeItem("reptrack-user");location.reload();}
  async function removeAccount(){if(!session||deleting)return;if(!window.confirm("Delete your profile and all workouts permanently? This cannot be undone."))return;setDeleting(true);setError("");try{await deleteAccount(session);location.reload()}catch(e){setError(e instanceof Error?e.message:"Could not delete profile");setDeleting(false)}}

  if(loading)return <main className="app"><div className="loading">Loading your gym...</div></main>;
  if(!session)return <main className="app auth-screen"><div className="logo">RepTrack</div><section className="hero auth-hero"><div className="label">Your gym log</div><h1>Just your name. Then train.</h1><div className="muted">No email. No password. Your browser remembers you.</div></section><section className="card"><div className="field"><label>Your name</label><input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&start(name)} placeholder="e.g. Alex"/></div>{error&&<p className="error">{error}</p>}<button className="primary" onClick={()=>start(name)} disabled={!name.trim()}>Start training</button><p className="tiny">Your name is all you need. Your browser remembers this profile.</p></section></main>;

  return <main className="app"><header className="top"><div className="logo">RepTrack</div><button className="pill" onClick={()=>setTab("profile")}>{name||"Profile"}</button></header>
    {tab==="today"&&<>
      <section className="hero today-hero"><div className="label">Today</div><h1>Your workout, right here.</h1><div className="muted">{completed} of {totalSets} sets completed · Stay focused on the next set.</div></section>
      <section className="card workout-card">
        <div className="section-head"><div><div className="label">Current workout</div><h2>{workoutExercises.length?`${workoutExercises.length} exercises`:"Nothing planned yet"}</h2></div><span className="pill">{completed}/{totalSets} done</span></div>
        {workoutExercises.length>0&&<div className="workout-tabs">{workoutExercises.map((e,i)=><button key={e.id} className={"workout-tab "+(i===selected?"active":"")} onClick={()=>setSelected(i)}><img src={e.exercise?e.exercise.user_id?imageFor(e.exercise.name):imageFor(e.exercise.name):""} alt=""/><span><b>{i+1}</b>{e.exercise.name}</span><small>{e.sets.filter(s=>s.done).length}/{e.sets.length}</small></button>)}</div>}
        {current&&<div className="current-exercise"><div className="current-cover"><img src={imageFor(current.exercise.name)} alt="" onError={e=>{e.currentTarget.style.display="none"}}/><div className="cover-fallback"><Dumbbell size={28}/></div></div><div className="current-body"><div className="section-head"><div><h2>{current.exercise.name}</h2><span className="muted">{current.exercise.muscle_group} · {current.sets.length} sets</span></div><button className="danger-icon" title="Delete exercise" onClick={removeExercise}><Trash2 size={17}/></button></div>
          <div className="sets">{current.sets.map((s,i)=><div className="set" key={s.id||i}><span className="setnum">{i+1}</span><input aria-label="reps" type="number" min="1" value={s.reps} onChange={e=>editSet(i,"reps",e.target.value)}/><input aria-label="weight" type="number" min="0" value={s.weight} onChange={e=>editSet(i,"weight",e.target.value)}/><span className="label">lb</span><button className={"check "+(s.done?"done":"")} onClick={()=>saveSet(i)} disabled={saving}>{s.done?<Check size={18}/>:<span>✓</span>}</button></div>)}</div><button className="secondary full" onClick={addSet}>+ Add set</button>
        </div></div>}
        {!workoutExercises.length&&<div className="empty-workout"><Dumbbell size={24}/><p>Add an exercise below to start today's workout.</p></div>}
      </section>

      <section className="card library-card"><div className="section-head"><div><div className="label">Exercise library</div><h2>Add to today's workout</h2></div><span className="muted">{catalog.length} exercises</span></div>
        <div className="custom-row"><input value={newExercise} onChange={e=>setNewExercise(e.target.value)} placeholder="Add your own exercise"/><select value={newMuscle} onChange={e=>setNewMuscle(e.target.value)}>{muscleGroups.map(m=><option key={m}>{m}</option>)}</select><button className="secondary icon-button" onClick={createCustomExercise} disabled={!newExercise.trim()}><Plus size={17}/></button></div>
        <div className="exercise-grid">{catalog.map(e=><button className="exercise-card" key={e.id} onClick={()=>addExercise(e)}><div className="exercise-image"><img src={e.image} alt="" onError={ev=>{ev.currentTarget.style.display="none"}}/><Dumbbell size={20}/></div><span>{e.name}</span><small>{e.muscle_group}{e.is_custom?" · Custom":""}</small></button>)}</div>
        <p className="tiny image-credit">Exercise illustrations use the public-domain Free Exercise DB image library.</p>
      </section>
      {error&&<p className="error">{error}</p>}
    </>}
    {tab==="progress"&&<><section className="hero"><div className="label">Progress</div><h1>Real numbers. Real progress.</h1><div className="muted">{current?.exercise.name||"Add an exercise"} · saved sets only.</div></section><section className="card"><div className="section-head"><h2>{current?.exercise.name||"Choose an exercise"}</h2><span className="pill">{progress.length} entries</span></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={progress}><CartesianGrid vertical={false}/><XAxis dataKey="d" tickLine={false}/><YAxis tickLine={false}/><Tooltip/><Bar dataKey="w" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></div></section></>}
    {tab==="profile"&&<><section className="hero"><div className="label">Profile</div><h1>Hey {name}.</h1><div className="muted">Your workouts stay linked to your profile on this browser.</div></section><section className="card"><div className="field"><label>Name</label><input value={name} onChange={e=>setName(e.target.value)}/></div><button className="primary" onClick={saveName}>Save profile</button><button className="danger" onClick={forgetDevice}><LogOut size={15}/> Forget this device</button><button className="danger" onClick={removeAccount} disabled={deleting}><Trash2 size={15}/> {deleting?"Deleting profile…":"Delete profile permanently"}</button>{error&&<p className="error">{error}</p>}</section></>}
    <nav className="bottom"><button className={"nav "+(tab==="today"?"active":"")} onClick={()=>setTab("today")}><Dumbbell size={17}/><br/>Today</button><button className={"nav "+(tab==="progress"?"active":"")} onClick={()=>setTab("progress")}><BarChart3 size={17}/><br/>Progress</button><button className={"nav "+(tab==="profile"?"active":"")} onClick={()=>setTab("profile")}><UserRound size={17}/><br/>Profile</button></nav>
  </main>;
}
