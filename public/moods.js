export const timeMoods = [
 {id:'morning',title:'Slow Wake-Up',icon:'☀',hours:'5 AM–11 AM',description:'Quiet piano, soft jazz and a gentle start.',prompt:'Quiet wake-up music: soft piano, gentle acoustic textures and mellow jazz. Instrumental only, 60–85 BPM, gentle percussion, no harsh sounds, no big drops. Keep the musical energy low.'},
 {id:'daytime',title:'Find Your Flow',icon:'↗',hours:'11 AM–5 PM',description:'Steady grooves for a productive afternoon.',prompt:'Daytime focus: instrumental lo-fi, light jazz and warm synth grooves, 80–105 BPM. Steady and optimistic without distracting vocals or dramatic changes.'},
 {id:'evening',title:'Evening Unwind',icon:'◐',hours:'5 PM–10 PM',description:'Warm, mellow sounds to ease out of the day.',prompt:'An evening wind-down playlist with mellow soul textures, relaxed jazz and soft synths, 65–95 BPM. Mostly instrumental, unhurried and warm.'},
 {id:'night',title:'Late-Night Grind',icon:'☾',hours:'10 PM–5 AM',description:'Deep focus for studying after dark.',prompt:'Late-night grind for studying: instrumental lo-fi hip-hop, ambient synth and restrained electronic beats, 70–100 BPM. No vocals, no sudden drops or loud peaks; maintain a consistent focused pulse, not party music.'}
];
export const dayMoods = [
 {id:0,title:'Sunday Reset',prompt:'Sunday reset: reflective, spacious and restorative.'},
 {id:1,title:'Monday Momentum',prompt:'Monday momentum: gently build motivation and a sense of a fresh start.'},
 {id:2,title:'Tuesday Tunnel Vision',prompt:'Tuesday tunnel vision: steady, grounded concentration for getting things done.'},
 {id:3,title:'Wednesday Balance',prompt:'Wednesday balance: warm, balanced melodies with a little midweek lift.'},
 {id:4,title:'Thursday Push',prompt:'Thursday push: purposeful rhythms and quiet confidence to finish the week well.'},
 {id:5,title:'Friday Freedom',prompt:'Friday freedom: playful, optimistic melodies and a feeling of release.'},
 {id:6,title:'Saturday Drift',prompt:'Saturday drift: relaxed exploration, varied textures and an easy weekend feel.'}
];
export function timeMoodAt(hour){if(!Number.isInteger(hour)||hour<0||hour>23)throw Error('Invalid hour');return hour>=5&&hour<11?'morning':hour>=11&&hour<17?'daytime':hour>=17&&hour<22?'evening':'night';}
export function moodFor(date=new Date(),time='auto',day='auto'){
 const period=timeMoods.find(x=>x.id===(time==='auto'?timeMoodAt(date.getHours()):time));
 const weekday=dayMoods.find(x=>x.id===(day==='auto'?date.getDay():Number(day)));
 if(!period||!weekday)throw Error('Invalid mood selection');
 return {key:period.id+'-'+weekday.id,title:period.title+' · '+weekday.title,period,weekday,request:`Create a cohesive mood playlist: ${period.title}, with a ${weekday.title} feel. ${period.prompt} ${weekday.prompt} The time-of-day energy and vocal restrictions take priority over the day theme. Pick only fitting library songs; if none fit and new originals are allowed, compose matching songs. Vary melodies and instrumentation while maintaining the mood.`};
}
export function normalizeMoodLibrary(value){
 if(!Array.isArray(value))return [];
 return value.filter(x=>x&&typeof x.key==='string'&&/^(morning|daytime|evening|night)-[0-6]$/.test(x.key)&&typeof x.title==='string'&&Array.isArray(x.trackIds)).slice(-28).map(x=>({key:x.key,title:x.title.slice(0,120),trackIds:[...new Set(x.trackIds.filter(id=>typeof id==='string'&&/^[a-f\d-]{36}$/.test(id)))].slice(-100)}));
}
export function rememberMoodTrack(library,mood,trackId){const result=normalizeMoodLibrary(library),existing=result.find(x=>x.key===mood.key);if(existing)existing.trackIds=[...new Set([...existing.trackIds,trackId])].slice(-100);else result.push({key:mood.key,title:mood.title,trackIds:[trackId]});return normalizeMoodLibrary(result);}
