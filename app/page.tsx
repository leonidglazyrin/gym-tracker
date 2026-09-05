"use client";

import { useMemo, useState } from "react";
import { BarChart3, Dumbbell, UserRound, Plus, Check } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type SetRow = { reps:number; weight:number; done:boolean };
type Exercise = { name:string; muscle:string; sets:SetRow[] };

const starters: Exercise[] = [
 {name:"Bench Press",muscle:"Chest",sets:[{reps:8,weight:135,done:false},{reps:8,weight:135,done:false},{reps:6,weight:145,done:false}]},
 {name:"Squat",muscle:"Legs",sets:[{reps:5,weight:185,done:false},{reps:5,weight:185,done:false}]},
];
const progress = [{d:"Jun 1",w:125},{d:"Jun 15",w:135},{d:"Jul 1",w:140},{d:"Jul 15",w:145},{d:"Aug 1",w:150},{d:"Aug 15",w:155}];

export default function Home(){
 const [tab,setTab]=useState<"today"|"progress"|"profile">("today");
 const [exercises,setExercises]=useState(starters);
 const [selected,setSelected]=useState(0);
 const [profile,setProfile]=useState("Jonny");
 const current=exercises[selected];
 const completed=useMemo(()=>exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0),[exercises]);
 function updateSet(i:number,key:"reps"|"weight",value:string){ setExercises(es=>es.map((e,ei)=>ei!==selected?e:{...e,sets:e.sets.map((s,si)=>si===i?{...s,[key]:Number(value)}:s)})); }
 function toggle(i:number){setExercises(es=>es.map((e,ei)=>ei!==selected?e:{...e,sets:e.sets.map((s,si)=>si===i?{...s,done:!s.done}:s)}));}
 function addSet(){setExercises(es=>es.map((e,ei)=>ei!==selected?e:{...e,sets:[...e.sets,{reps:e.sets.at(-1)?.reps||8,weight:e.sets.at(-1)?.weight||0,done:false}]}));}
 function addExercise(){const name=prompt("Exercise name");if(!name)return;setExercises(es=>[...es,{name,muscle:"Custom",sets:[{reps:8,weight:0,done:false}]}]);setSelected(exercises.length);}
 return <main className="app">
  <header className="top"><div className="logo">RepTrack</div><button className="pill" onClick={()=>setTab("profile")}>{profile}</button></header>
  {tab==="today"&&<>
   <section className="hero"><div className="label">Today</div><h1>Get it done.</h1><div className="muted">{completed} sets completed · Keep your momentum.</div></section>
   <div className="grid"><div className="stat"><b>{exercises.length}</b><span className="muted">Exercises</span></div><div className="stat"><b>{completed}</b><span className="muted">Sets done</span></div><div className="stat"><b>52m</b><span className="muted">Est. time</span></div></div>
   <section className="card"><div className="section-head"><h2>Exercises</h2><button className="secondary" onClick={addExercise}><Plus size={15}/> Add</button></div><div className="row">{exercises.map((e,i)=><button key={e.name} className={"secondary"+(i===selected?" active":"")} onClick={()=>setSelected(i)}>{e.name}</button>)}</div></section>
   <section className="card section"><div className="section-head"><div><h2>{current.name}</h2><span className="muted">{current.muscle} · {current.sets.length} sets</span></div><span className="pill">Last: {current.sets[0]?.weight || 0} lb</span></div>
    <div className="sets">{current.sets.map((s,i)=><div className="set" key={i}><span className="setnum">{i+1}</span><input aria-label="reps" type="number" value={s.reps} onChange={e=>updateSet(i,"reps",e.target.value)}/><input aria-label="weight" type="number" value={s.weight} onChange={e=>updateSet(i,"weight",e.target.value)}/><span className="label">lb</span><button className={"check "+(s.done?"done":"")} onClick={()=>toggle(i)}>{s.done&&<Check size={18}/>}</button></div>)}</div>
    <div className="row section"><button className="secondary" onClick={addSet}>+ Add set</button><button className="primary" onClick={()=>toggle(current.sets.findIndex(s=>!s.done))}>Save set</button></div>
   </section>
  </>}
  {tab==="progress"&&<><section className="hero"><div className="label">Progress</div><h1>Stronger over time.</h1><div className="muted">Your best Bench Press weight, lb.</div></section><section className="card"><div className="section-head"><h2>Bench Press</h2><span className="pill">+30 lb</span></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={progress}><CartesianGrid vertical={false}/><XAxis dataKey="d" tickLine={false}/><YAxis domain={[100,170]} tickLine={false}/><Tooltip/><Bar dataKey="w" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></div></section><section className="card section"><div className="section-head"><h2>Recent sessions</h2><span className="muted">6 weeks</span></div><div className="history">{progress.slice().reverse().slice(0,4).map(p=><div key={p.d}><span>{p.d}</span><b>{p.w} lb × 1</b></div>)}</div></section></>}
  {tab==="profile"&&<><section className="hero"><div className="label">Profile</div><h1>Train your way.</h1><div className="muted">Your workout history stays with your profile.</div></section><section className="card"><div className="field"><label>Name</label><input value={profile} onChange={e=>setProfile(e.target.value)}/></div><div className="grid"><div className="stat"><b>18</b><span className="muted">Workouts</span></div><div className="stat"><b>142</b><span className="muted">Sets</span></div><div className="stat"><b>7</b><span className="muted">Exercises</span></div></div><button className="primary" onClick={()=>alert("Profile saved")}>Save profile</button></section></>}
  <nav className="bottom"><button className={"nav "+(tab==="today"?"active":"")} onClick={()=>setTab("today")}><Dumbbell size={17}/><br/>Today</button><button className={"nav "+(tab==="progress"?"active":"")} onClick={()=>setTab("progress")}><BarChart3 size={17}/><br/>Progress</button><button className={"nav "+(tab==="profile"?"active":"")} onClick={()=>setTab("profile")}><UserRound size={17}/><br/>Profile</button></nav>
 </main>
}
