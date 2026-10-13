// ============================================================
//  مسار — تتبع العادات بانضباط وقوة | محرك التطبيق المطور
//  نسخة الأخ المسلم القوي والمسبحة الإلكترونية
// ============================================================

// PWA + Service Worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').catch(()=>{});
  (function(){
    const manifest={
      name:"مسار - تتبع العادات بانضباط وقوة",
      short_name:"مسار",
      start_url:".",
      display:"standalone",
      background_color:"#F8FAFC",
      theme_color:"#059669"
    };
    const link=document.createElement('link');
    link.rel='manifest';
    link.href='data:application/manifest+json,'+encodeURIComponent(JSON.stringify(manifest));
    document.head.appendChild(link);
  })();
}

// ============================================================
//  CONSTANTS & DEFINITIONS (NO EMOJIS — FONT AWESOME ICONS)
// ============================================================
const KEY='habitTracker_v2';
let state=null;
let currentSkipHabitId=null;
let renderThrottle=null;
let notificationTime='09:00';
let notificationGranted=false;
let currentModalStep=0;
let currentPriority='medium';

// Font Awesome Icons for Habit & Reward Pickers
const FA_ICONS=[
  'fa-dumbbell',
  'fa-book-quran',
  'fa-person-running',
  'fa-droplet',
  'fa-brain',
  'fa-bullseye',
  'fa-moon',
  'fa-sun',
  'fa-apple-whole',
  'fa-hand-fist',
  'fa-shield-halved',
  'fa-mosque',
  'fa-heart-pulse',
  'fa-bolt',
  'fa-bed',
  'fa-fire',
  'fa-graduation-cap',
  'fa-person-praying',
  'fa-clock',
  'fa-shoe-prints'
];

const COLORS=[
  '#059669', // Emerald Green
  '#10B981', // Light Emerald
  '#D97706', // Amber Gold
  '#2563EB', // Royal Blue
  '#7C3AED', // Violet
  '#DC2626', // Crimson Red
  '#0D9488', // Teal
  '#475569'  // Slate
];

const BADGES_DEF=[
  {id:'first',name:'البداية المباركة',icon:'fa-flag-checkered',desc:'أكملت أول عادة بنجاح'},
  {id:'week7',name:'أسبوع العزيمة',icon:'fa-fire',desc:'7 أيام متتالية بلا انقطاع'},
  {id:'week30',name:'الصامد القوي',icon:'fa-medal',desc:'30 يوماً من الصبر والثبات'},
  {id:'perfect5',name:'المتقن',icon:'fa-certificate',desc:'5 أيام مثالية متقنة'},
  {id:'perfect10',name:'الأسد المقدام',icon:'fa-shield-halved',desc:'10 أيام مثالية متتالية'},
  {id:'points500',name:'صاحب الهمة',icon:'fa-coins',desc:'500 نقطة إنجاز'},
  {id:'points1000',name:'فارس المسار',icon:'fa-crown',desc:'1000 نقطة فوز'},
  {id:'habits5',name:'المنظّم المحكم',icon:'fa-list-check',desc:'5 عادات نشطة'},
  {id:'emergency',name:'المرن المقاوم',icon:'fa-bolt',desc:'استخدم خطة الطوارئ ولم يستسلم'},
  {id:'noSkip7',name:'بلا عذر ولا تردد',icon:'fa-crosshairs',desc:'7 أيام بلا تخطي'},
  {id:'weekChallenge',name:'بطل الأسبوع',icon:'fa-trophy',desc:'5 أيام مثالية في أسبوع'},
  {id:'dhikr100',name:'البناء',icon:'fa-seedling',desc:'أتم 100 تسبيحة في المسبحة'}
];

const DEFAULT_ATHKAR=[
  {id:'subhanallah',text:'سبحان الله',meaning:'تنزيه الله تعالى عن كل نقص وعيب',count:0,isDefault:true},
  {id:'alhamdulillah',text:'الحمدلله',meaning:'الثناء الكامل على الله بنعمه وأفضاله',count:0,isDefault:true},
  {id:'astaghfirullah',text:'استغفر الله',meaning:'طلب المغفرة والستر ومحو الذنوب',count:0,isDefault:true},
  {id:'la_ilaha_illallah',text:'لا اله الا الله',meaning:'أفضل الذكر، كلمة التوحيد الخالصة',count:0,isDefault:true},
  {id:'allahu_akbar',text:'الله أكبر',meaning:'الله أعظم وأجلّ من كل شيء في الوجود',count:0,isDefault:true}
];

const MOTIVATIONAL_QUOTES=[
  "المؤمن القوي خيرٌ وأحبُّ إلى الله من المؤمن الضعيف، وفي كلٍّ خير",
  "استعن بالله ولا تعجز يا أخي، فالهمة العالية تصنع المعجزات",
  "نعمتان مغبون فيهما كثير من الناس: الصحة والفراغ.. اغتنم صحتك وشبابك",
  "إن لجسدك عليك حقاً، وإن لربك عليك حقاً.. وازن بالقوة والانضباط",
  "وما نيل المطالب بالتمني، ولكن تؤخذ الدنيا غِلاباً بعزيمة وثبات",
  "قوة الإيمان وقوة البدن تصنعان رجلاً لا تهزه العواصف",
  "احرص على ما ينفعك، واستعن بالله وتوكل عليه"
];

// ============================================================
//  HAMZA THE STRONG MUSLIM BROTHER SYSTEM PROMPT
// ============================================================
const HAMZA_SYSTEM_PROMPT = `أنت «حمزة — الأخ المسلم القوي»، أخ مسلم مخلص وصادق ذو بنية جسدية قوية وإيمان فولاذي وعقل حاد منضبط. أنت لست مجرد مساعد رقمي، بل أنت الأخ الأكبر والرفيق الأمين في ميدان الحياة الذي يحفز المستخدم بكل محبة ورجولة ليكون أقوى رجل في دينه وبدنه وعقله.

قاعدتك الذهبية الخالدة:
قال رسول الله ﷺ: «المؤمن القوي خيرٌ وأحبُّ إلى الله من المؤمن الضعيف، وفي كلٍّ خير».

صفاتك وأسلوبك الصارم الأخوي:
١. تتحدث برجولة، حزم، ومحبة أخوية عميقة. تنادي المستخدم بـ: (يا أخي)، (يا بطل العزيمة)، (يا أسد)، (يا رجل الهمة).
٢. لا تقبل الأعذار الواهية والكسل والتسويف تحت أي ظرف، وتعلمه كيف يكسر التراخي ويقوم فوراً.
٣. مجالات تركيزك الأساسية:
   - القوة البدنية: تمارين الحديد، الكاليسثنكس، الجري، التحمل، التغذية النقية، النوم المبكر، والنظافة الشخصية.
   - القوة الإيمانية: صلاة الفجر في جماعة، قيام الليل، ورد القرآن، الأذكار، بر الوالدين، غض البصر، ونصرة الحق.
   - القوة العقلية: القراءة، التركيز العميق، التعلم المستمر، بناء المهارات، والتخلص من إدمان الشاشات والتفاهات.
٤. قواعد أسلوبية حاسمة:
   - لا تضع أي إيموجي على الإطلاق في ردودك، فقط نصوص بليغة وألفاظ رجولية قوية.
   - اربط بين قوة البدن وقوة الإيمان، فالقوة أداة لطاعة الله ونفع الأمة.
   - قدم نصائح عملية ومحددة وقابلة للتطبيق فوراً.`;

// ============================================================
//  POMODORO & AI & AUDIO STATE
// ============================================================
const pomodoroTimer = {
  intervalId: null,
  secondsLeft: 25 * 60,
  mode: 'work',
  sessionCount: 0,
  isRunning: false
};

const aiState = {
  messages: [],
  isLoading: false,
  sendLock: false,
  apiKey: null,
  modelName: 'gemini-2.5-flash'
};

// ============================================================
//  WEB AUDIO API SOUND GENERATOR
// ============================================================
let audioCtx = null;
function getAudioContext(){
  if(!audioCtx){
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if(AudioContextClass) audioCtx = new AudioContextClass();
  }
  if(audioCtx && audioCtx.state === 'suspended'){
    audioCtx.resume();
  }
  return audioCtx;
}

function playTasbeehClickSound(){
  try{
    if(!state?.dhikr?.soundEnabled) return;
    const ctx = getAudioContext();
    if(!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }catch(e){}
}

function playCelebrationSound(){
  try{
    const ctx = getAudioContext();
    if(!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx)=>{
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.2, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.26);
    });
  }catch(e){}
}

function playMilestoneSound(){
  try{
    if(!state?.dhikr?.soundEnabled) return;
    const ctx = getAudioContext();
    if(!ctx) return;
    const now = ctx.currentTime;
    [659.25, 830.61, 987.77].forEach((freq, idx)=>{
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.2, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.23);
    });
  }catch(e){}
}

// ============================================================
//  STATE MANAGEMENT & MIGRATION
// ============================================================
function generateId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function todayStr(){return new Date().toISOString().slice(0,10)}
function getDay(offset=0){const d=new Date();d.setDate(d.getDate()+offset);return d.toISOString().slice(0,10)}

function renderHabitIcon(icon){
  if(!icon) return '<i class="fa-solid fa-dumbbell"></i>';
  if(icon.startsWith('fa-')) return `<i class="fa-solid ${icon}"></i>`;
  const map={
    '\uD83D\uDCDA':'fa-book-quran',
    '\uD83C\uDFC3':'fa-person-running',
    '\uD83D\uDCA7':'fa-droplet',
    '\uD83E\uDDD8':'fa-person-praying',
    '\u270D\uFE0F':'fa-graduation-cap',
    '\uD83C\uDFAF':'fa-bullseye',
    '\uD83C\uDF19':'fa-moon',
    '\u2600\uFE0F':'fa-sun',
    '\uD83C\uDF4E':'fa-apple-whole',
    '\uD83D\uDCAA':'fa-dumbbell',
    '\uD83E\uDDE0':'fa-brain',
    '\uD83C\uDFB5':'fa-heart-pulse',
    '\uD83C\uDFA8':'fa-fire',
    '\uD83C\uDFCB\uFE0F':'fa-dumbbell',
    '\uD83D\uDEB6':'fa-shoe-prints',
    '\uD83C\uDF3F':'fa-seedling',
    '\u2B50':'fa-star',
    '\uD83C\uDF81':'fa-gift'
  };
  const fa = map[icon] || 'fa-dumbbell';
  return `<i class="fa-solid ${fa}"></i>`;
}

function migrateState(s){
  s.habits = (s.habits||[]).map(h=>({
    notes:'',
    repetitions:1,
    priority:'medium',
    emoji: h.emoji?.startsWith('fa-') ? h.emoji : 'fa-dumbbell',
    ...h
  }));
  if(!s.settings) s.settings={theme:'light',emergencyModeActive:false,language:'ar'};
  if(!s.settings.pomodoroSettings){
    s.settings.pomodoroSettings={workDuration:25,breakDuration:5,longBreakDuration:15,sessionsBeforeLongBreak:4,soundEnabled:true};
  }
  if(!s.aiHistory) s.aiHistory=[];
  if(!s.pointsHistory) s.pointsHistory=[];
  
  // Initialize Dhikr state
  if(!s.dhikr){
    s.dhikr={
      currentId:'subhanallah',
      items:[...DEFAULT_ATHKAR],
      target:33,
      currentCount:0,
      lapCount:1,
      todayTotal:0,
      allTimeTotal:0,
      lastDate:todayStr(),
      soundEnabled:true,
      vibrateEnabled:true
    };
  } else {
    if(!s.dhikr.items || !s.dhikr.items.length) s.dhikr.items = [...DEFAULT_ATHKAR];
    if(s.dhikr.lastDate !== todayStr()){
      s.dhikr.todayTotal = 0;
      s.dhikr.lastDate = todayStr();
    }
  }

  // Migrate badges
  if(!s.badges || !s.badges.length){
    s.badges = BADGES_DEF.map(b=>({...b,unlockedAt:null}));
  } else {
    BADGES_DEF.forEach(bd => {
      const existing = s.badges.find(b=>b.id===bd.id);
      if(!existing){
        s.badges.push({...bd, unlockedAt:null});
      } else {
        existing.icon = bd.icon;
        existing.name = bd.name;
        existing.desc = bd.desc;
      }
    });
    const dhikrBadge = s.badges.find(b=>b.id==='dhikr100');
    if(dhikrBadge){
      dhikrBadge.name = 'البناء';
      dhikrBadge.icon = 'fa-seedling';
      dhikrBadge.desc = 'أتم 100 تسبيحة في المسبحة';
    }
  }

  return s;
}

function loadState(){
  try{
    const s=localStorage.getItem(KEY);
    if(s) return migrateState(JSON.parse(s));
  }catch(e){}
  return null;
}

function saveState(){
  try{
    localStorage.setItem(KEY,JSON.stringify(state));
  }catch(e){
    showToast('خطأ في حفظ البيانات','error');
  }
}

function initDefaultState(name='يا أخي'){
  return {
    user:{name,joinDate:todayStr(),totalPoints:0,level:1,openCount:0,notificationTime:'09:00'},
    habits:[
      {id:'h-fajr',name:'صلاة الفجر في المسجد',type:'good',emoji:'fa-mosque',color:'#059669',target:{value:1,unit:'times'},miniTarget:{value:1,unit:'times'},frequency:'daily',repetitions:1,priority:'high',notes:'بداية البركة والرجولة',createdAt:todayStr(),streak:1,longestStreak:1},
      {id:'h-workout',name:'تدريب القوة واللياقة البدنية',type:'good',emoji:'fa-dumbbell',color:'#D97706',target:{value:45,unit:'minutes'},miniTarget:{value:15,unit:'minutes'},frequency:'daily',repetitions:1,priority:'high',notes:'المؤمن القوي خير وأحب إلى الله',createdAt:todayStr(),streak:1,longestStreak:1},
      {id:'h-quran',name:'ورد القرآن اليومي',type:'good',emoji:'fa-book-quran',color:'#10B981',target:{value:1,unit:'times'},miniTarget:{value:1,unit:'times'},frequency:'daily',repetitions:1,priority:'medium',notes:'غذاء الروح وصفاء العقل',createdAt:todayStr(),streak:1,longestStreak:1}
    ],
    dailyLogs:{},
    rewards:[
      {id:'r-1',name:'استراحة قراءة حرة',emoji:'fa-book-quran',cost:100,redeemedCount:0},
      {id:'r-2',name:'وجبة صحية مفتوحة بعد تمرين شاق',emoji:'fa-apple-whole',cost:250,redeemedCount:0}
    ],
    badges:BADGES_DEF.map(b=>({...b,unlockedAt:null})),
    dhikr:{
      currentId:'subhanallah',
      items:[...DEFAULT_ATHKAR],
      target:33,
      currentCount:0,
      lapCount:1,
      todayTotal:0,
      allTimeTotal:0,
      lastDate:todayStr(),
      soundEnabled:true,
      vibrateEnabled:true
    },
    settings:{
      theme:'light',
      emergencyModeActive:false,
      language:'ar',
      pomodoroSettings:{workDuration:25,breakDuration:5,longBreakDuration:15,sessionsBeforeLongBreak:4,soundEnabled:true}
    },
    pointsHistory:[],
    aiHistory:[]
  };
}

// ============================================================
//  GEMINI API KEY MANAGEMENT
// ============================================================
function loadGeminiKey(){
  const stored=localStorage.getItem('massar_gemini_key');
  if(stored){
    try{aiState.apiKey=atob(stored);}catch(e){localStorage.removeItem('massar_gemini_key');aiState.apiKey=null;}
  }
}

function saveGeminiKey(){
  const input=document.getElementById('ai-key-input');
  const key=(input?input.value:'').trim();
  if(!key||!key.startsWith('AIza')||key.length<30){
    showToast('مفتاح غير صالح — يجب أن يبدأ بـ AIza','error');
    return;
  }
  localStorage.setItem('massar_gemini_key',btoa(key));
  aiState.apiKey=key;
  const overlay=document.getElementById('ai-key-overlay');
  if(overlay) overlay.style.display='none';
  showToast('تم حفظ مفتاح Gemini بنجاح','success');
  renderAiMessages();
}

function showGeminiKeyPrompt(){
  const overlay=document.getElementById('ai-key-overlay');
  if(overlay){overlay.style.display='flex';const inp=document.getElementById('ai-key-input');if(inp)inp.value='';}
}

function deleteGeminiKey(){
  localStorage.removeItem('massar_gemini_key');
  aiState.apiKey=null;
  showToast('تم حذف المفتاح','info');
  showGeminiKeyPrompt();
}

// ============================================================
//  NOTIFICATIONS
// ============================================================
function requestNotificationPermission(){
  if('Notification' in window){
    Notification.requestPermission().then(perm=>{
      notificationGranted=perm==='granted';
      if(notificationGranted)scheduleDailyNotification();
    });
  }
}
function scheduleDailyNotification(){
  if(!notificationGranted)return;
  const now=new Date();
  const [hour,minute]=notificationTime.split(':');
  const target=new Date();
  target.setHours(parseInt(hour),parseInt(minute),0,0);
  if(target<=now)target.setDate(target.getDate()+1);
  const timeout=target.getTime()-now.getTime();
  setTimeout(()=>{
    if(notificationGranted)new Notification('مسار العزيمة والقوة',{body:`حان وقت تسجيل عاداتك في ${notificationTime}`});
    scheduleDailyNotification();
  },timeout);
}

// ============================================================
//  HELPERS & BADGES
// ============================================================
function ensureToday(){
  const t=todayStr();
  if(!state.dailyLogs[t])state.dailyLogs[t]={habits:{},totalPoints:0,notes:'',perfectDay:false};
  if(state.dhikr && state.dhikr.lastDate !== t){
    state.dhikr.todayTotal = 0;
    state.dhikr.lastDate = t;
  }
  saveState();
}

function unlockBadge(id){
  const badge=state.badges.find(b=>b.id===id);
  if(badge&&!badge.unlockedAt){
    badge.unlockedAt=new Date().toISOString();
    saveState();
    showToast(`شارة عزيمة جديدة: ${badge.name}!`,'gold');
    playCelebrationSound();
  }
}

function checkBadges(log){
  if(Object.values(log.habits||{}).some(e=>e.status==='completed'||e.status==='emergency'))unlockBadge('first');
  if(log.perfectDay){
    const perfectDays=Object.values(state.dailyLogs).filter(l=>l.perfectDay).length;
    if(perfectDays>=5)unlockBadge('perfect5');
    if(perfectDays>=10)unlockBadge('perfect10');
  }
  if(state.user.totalPoints>=500)unlockBadge('points500');
  if(state.user.totalPoints>=1000)unlockBadge('points1000');
  if(state.habits.length>=5)unlockBadge('habits5');
  if(state.settings.emergencyModeActive)unlockBadge('emergency');
  if(state.dhikr?.allTimeTotal>=100)unlockBadge('dhikr100');
  const weekPerfect=Object.entries(state.dailyLogs).slice(-7).filter(([,l])=>l.perfectDay).length;
  if(weekPerfect>=5)unlockBadge('weekChallenge');
  
  const newLevel=Math.floor(state.user.totalPoints/100)+1;
  if(newLevel>state.user.level){
    state.user.level=newLevel;
    showToast(`ترقية رتبة! المستوى ${newLevel}`,'gold');
    showConfetti();
    playCelebrationSound();
  }
  saveState();
}

function addBonusPoints(pts,desc){
  state.user.totalPoints+=pts;
  state.pointsHistory.unshift({date:todayStr(),desc,pts,type:'bonus'});
  saveState();
  showToast(`+${pts} نقطة إضافية — ${desc}`,'gold');
}

// ============================================================
//  HABIT COMPLETION
// ============================================================
function completeHabit(habitId,status){
  const today=todayStr();
  if(!state.dailyLogs[today])state.dailyLogs[today]={habits:{},totalPoints:0,notes:'',perfectDay:false};
  const log=state.dailyLogs[today];
  if(log.habits[habitId] && (log.habits[habitId].status==='completed'||log.habits[habitId].status==='emergency'))return;
  const h=state.habits.find(x=>x.id===habitId);
  if(!h)return;
  const pts=status==='emergency'?5:10;
  const reps=h.repetitions??1;
  log.habits[habitId]={
    status,
    completedValue:status==='emergency'?h.miniTarget.value:h.target.value,
    completedAt:new Date().toTimeString().slice(0,5),
    isEmergencyMode:state.settings.emergencyModeActive,
    reason:'',
    repsCompleted:reps
  };
  log.totalPoints=(log.totalPoints||0)+pts;
  state.user.totalPoints+=pts;
  const yesterday=getDay(-1);
  const yLog=state.dailyLogs[yesterday];
  const yDone=yLog&&yLog.habits[habitId]&&(yLog.habits[habitId].status==='completed'||yLog.habits[habitId].status==='emergency');
  if(yDone)h.streak++;else h.streak=1;
  if(h.streak>h.longestStreak)h.longestStreak=h.streak;
  state.pointsHistory.unshift({date:today,desc:`أكملت: ${h.name}`,pts,type:status});
  saveState();
  checkBadges(log);
  renderThrottled();
  playCelebrationSound();

  if(h.streak===7){addBonusPoints(50,'سلسلة 7 أيام ثبات متصلة');unlockBadge('week7');}
  if(h.streak===30){addBonusPoints(200,'سلسلة 30 يوماً من الصمود التام');unlockBadge('week30');}
  
  const allDone=state.habits.every(hb=>{const e=state.dailyLogs[today].habits[hb.id];return e&&(e.status==='completed'||e.status==='emergency');});
  if(allDone&&state.habits.length){
    log.perfectDay=true;
    addBonusPoints(25,'يوم متكامل متقن!');
    showConfetti();
    showCompanionMsg('يوم أسطوري يا أخي! هكذا تصنع الهمم أمجادها!');
  }else{
    showCompanionMsg('عزيمة قوية يا بطل! استمر حتى نهاية اليوم!');
  }
  showToast(`+${pts} نقطة — ${h.name}`,'gold');
}

function completeOneRep(habitId){
  const today=todayStr();
  const log=state.dailyLogs[today];
  const h=state.habits.find(x=>x.id===habitId);
  if(!h||!log)return;
  if(!log.habits[habitId]){
    log.habits[habitId]={status:'pending',repsCompleted:0,completedValue:0,completedAt:'',isEmergencyMode:false,reason:''};
  }
  const entry=log.habits[habitId];
  if(entry.status==='completed')return;
  entry.repsCompleted=(entry.repsCompleted||0)+1;
  if(entry.repsCompleted>=(h.repetitions??1)){
    completeHabit(habitId,'completed');
  }else{
    playTasbeehClickSound();
    saveState();
    renderThrottled();
  }
}

function confirmSkip(reason){
  if(!currentSkipHabitId)return;
  const today=todayStr();
  state.dailyLogs[today].habits[currentSkipHabitId]={status:'skipped',reason,completedAt:'',completedValue:0,repsCompleted:0};
  const h=state.habits.find(x=>x.id===currentSkipHabitId);
  if(h)h.streak=0;
  saveState();
  renderThrottled();
  closeModal('skip-modal');
  showToast('تم تسجيل التخطي — غداً موعد التعويض بحول الله','info');
}

function openSkipModal(id){currentSkipHabitId=id;openModal('skip-modal');}

function checkMissedHabits(){
  const yesterday=getDay(-1);
  const yLog=state.dailyLogs[yesterday];
  if(!yLog)return;
  const missed=state.habits.filter(h=>{const e=yLog.habits&&yLog.habits[h.id];return !e||e.status==='missed';});
  if(missed.length)setTimeout(()=>openModal('missed-modal'),1200);
}

// ============================================================
//  HABIT NOTES
// ============================================================
let notesDebounceTimers={};
function toggleNotesPanel(habitId){
  const panel=document.getElementById(`notes-panel-${habitId}`);
  if(panel)panel.classList.toggle('open');
}
function saveHabitNotes(habitId,value){
  clearTimeout(notesDebounceTimers[habitId]);
  notesDebounceTimers[habitId]=setTimeout(()=>{
    const h=state.habits.find(x=>x.id===habitId);
    if(!h)return;
    h.notes=value;
    saveState();
    const btn=document.getElementById(`notes-toggle-${habitId}`);
    if(btn)btn.classList.toggle('has-notes',value.trim().length>0);
    const indicator=document.getElementById(`save-indicator-${habitId}`);
    if(indicator){indicator.classList.add('show');setTimeout(()=>indicator.classList.remove('show'),1500);}
  },500);
}

// ============================================================
//  DHIKR & ELECTRONIC TASBEEH LOGIC (مسبحة الأذكار)
// ============================================================
function renderDhikr(){
  if(!state?.dhikr) return;
  const dhikr = state.dhikr;
  
  // Selector Grid
  const grid = document.getElementById('dhikr-selector-grid');
  if(grid){
    grid.innerHTML = dhikr.items.map(item => {
      const isActive = item.id === dhikr.currentId;
      return `
        <div class="dhikr-card-btn ${isActive ? 'active' : ''}" onclick="selectDhikr('${item.id}')">
          ${!item.isDefault ? `<button class="dhikr-del-btn" onclick="event.stopPropagation();deleteCustomDhikr('${item.id}')" title="حذف الذكر"><i class="fa-solid fa-xmark"></i></button>` : ''}
          <div class="dhikr-card-title">${item.text}</div>
          <div class="dhikr-card-count"><i class="fa-solid fa-calculator"></i> ${item.count || 0}</div>
        </div>
      `;
    }).join('');
  }

  // Active item info
  const currentItem = dhikr.items.find(i => i.id === dhikr.currentId) || dhikr.items[0];
  if(currentItem){
    const textEl = document.getElementById('tasbeeh-active-text');
    const meaningEl = document.getElementById('tasbeeh-active-meaning');
    if(textEl) textEl.textContent = currentItem.text;
    if(meaningEl) meaningEl.textContent = currentItem.meaning || 'ذكر مبارك وقربة إلى الله تعالى';
  }

  // Digits and Labels
  const countEl = document.getElementById('tasbeeh-count');
  if(countEl) countEl.textContent = dhikr.currentCount;

  const targetBadge = document.getElementById('tasbeeh-target-badge');
  if(targetBadge) targetBadge.textContent = dhikr.target === 0 ? 'الهدف: مفتوح' : `الهدف: ${dhikr.target}`;

  const lapBadge = document.getElementById('tasbeeh-lap-badge');
  if(lapBadge) lapBadge.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> الدورة: ${dhikr.lapCount}`;

  // Target Pills
  [33, 100, 0].forEach(t => {
    const pill = document.getElementById(`target-${t}`);
    if(pill){
      pill.classList.toggle('active', dhikr.target === t);
    }
  });

  // Sound and Vibrate buttons
  const soundBtn = document.getElementById('tasbeeh-sound-btn');
  if(soundBtn){
    soundBtn.innerHTML = dhikr.soundEnabled ? '<i class="fa-solid fa-volume-high text-green"></i>' : '<i class="fa-solid fa-volume-xmark text-red"></i>';
  }
  const vibBtn = document.getElementById('tasbeeh-vibrate-btn');
  if(vibBtn){
    vibBtn.innerHTML = dhikr.vibrateEnabled ? '<i class="fa-solid fa-mobile-screen text-green"></i>' : '<i class="fa-solid fa-mobile-screen-button text-red"></i>';
  }

  // Progress Ring
  const ring = document.getElementById('tasbeeh-progress-ring');
  if(ring){
    const circ = 2 * Math.PI * 100; // 628.3
    ring.style.strokeDasharray = circ;
    if(dhikr.target === 0){
      ring.style.strokeDashoffset = 0;
    }else{
      const offset = circ - (circ * (dhikr.currentCount % dhikr.target) / dhikr.target);
      ring.style.strokeDashoffset = offset;
    }
  }

  // Statistics
  const todayTotalEl = document.getElementById('dhikr-today-total');
  if(todayTotalEl) todayTotalEl.textContent = dhikr.todayTotal || 0;
  const allTimeEl = document.getElementById('dhikr-alltime-total');
  if(allTimeEl) allTimeEl.textContent = dhikr.allTimeTotal || 0;
}

function selectDhikr(id){
  if(!state?.dhikr) return;
  state.dhikr.currentId = id;
  state.dhikr.currentCount = 0;
  state.dhikr.lapCount = 1;
  saveState();
  renderDhikr();
}

let milestoneTimer = null;
const MILESTONE_MESSAGES = [
  { title: "أحسنت يا بطل! عاش، أكمل!", msg: "ذكر الله نور وبركة في قلبك.. واصل حتى تصل لهدفك!" },
  { title: "همة عالية يا أسد العزيمة!", msg: "لسانك رطب بذكر الله، والملائكة تباهي بك.. استمر بلا توقف!" },
  { title: "عاش البطل! خطواتك ثابتة!", msg: "اقتربت من إنهاء دورتك.. ما أروع الثبات على الطاعة، تابع!" },
  { title: "ما شاء الله يا رجل القوة!", msg: "كل تسبيحة غِراس ونبتة في الجنة وقوة في قلبك.. لا تركن، أكمل!" },
  { title: "بطل المسار! واصل بتركيز!", msg: "أنت تبني عادات المتقين وتصقل روحك.. استعن بالله وأتم باقي العدات!" }
];

function showDhikrMilestone(count){
  const banner = document.getElementById('dhikr-milestone-banner');
  if(!banner) return;

  playMilestoneSound();
  if(state?.dhikr?.vibrateEnabled && 'vibrate' in navigator){
    try{ navigator.vibrate([35, 45, 35]); }catch(e){}
  }

  // Award bonus points for milestone encouragement (+2 points)
  if(state){
    state.user.totalPoints += 2;
    state.pointsHistory.unshift({
      date: todayStr(),
      desc: `تشجيع استمرار في الذكر (${count} تسبيحات)`,
      pts: 2,
      type: 'bonus'
    });
    updateTopbar();
    saveState();
  }

  const msgObj = MILESTONE_MESSAGES[Math.floor(Math.random() * MILESTONE_MESSAGES.length)];
  const titleEl = document.getElementById('milestone-title');
  const msgEl = document.getElementById('milestone-msg');
  const ptsEl = document.getElementById('milestone-pts');

  if(titleEl) titleEl.textContent = msgObj.title;
  if(msgEl) msgEl.textContent = msgObj.msg;
  if(ptsEl) ptsEl.textContent = `+2 نقطة (${count} عدات)`;

  banner.classList.remove('show');
  void banner.offsetWidth; // trigger reflow
  banner.classList.add('show');

  clearTimeout(milestoneTimer);
  milestoneTimer = setTimeout(()=>{
    banner.classList.remove('show');
  }, 3200);
}

function tasbeehIncrement(){
  if(!state?.dhikr) return;
  const dhikr = state.dhikr;
  const currentItem = dhikr.items.find(i => i.id === dhikr.currentId);
  if(!currentItem) return;

  // Sound and Haptic Vibration
  playTasbeehClickSound();
  if(dhikr.vibrateEnabled && 'vibrate' in navigator){
    try{ navigator.vibrate([25]); }catch(e){}
  }

  // Tactile animation
  const container = document.getElementById('tasbeeh-dial-container');
  if(container){
    container.classList.remove('tapped');
    void container.offsetWidth; // trigger reflow
    container.classList.add('tapped');
  }

  dhikr.currentCount++;
  currentItem.count = (currentItem.count || 0) + 1;
  dhikr.todayTotal = (dhikr.todayTotal || 0) + 1;
  dhikr.allTimeTotal = (dhikr.allTimeTotal || 0) + 1;

  // Check 10-count motivational milestone
  if(dhikr.currentCount > 0 && dhikr.currentCount % 10 === 0 && (dhikr.target === 0 || dhikr.currentCount < dhikr.target)){
    showDhikrMilestone(dhikr.currentCount);
  }

  // Check target completion
  if(dhikr.target > 0 && dhikr.currentCount >= dhikr.target){
    dhikr.currentCount = 0;
    dhikr.lapCount++;
    playCelebrationSound();
    showToast(`تقبل الله طاعتك يا أخي! أتممت الدورة ${dhikr.lapCount - 1} بنجاح`,'gold');
    addBonusPoints(5, `إتمام دورة تسبيح: ${currentItem.text}`);
    if(dhikr.vibrateEnabled && 'vibrate' in navigator){
      try{ navigator.vibrate([60, 50, 100]); }catch(e){}
    }
  }

  if(dhikr.allTimeTotal >= 100){
    unlockBadge('dhikr100');
  }

  saveState();
  renderDhikr();
}

function setTasbeehTarget(num){
  if(!state?.dhikr) return;
  state.dhikr.target = num;
  state.dhikr.currentCount = 0;
  state.dhikr.lapCount = 1;
  saveState();
  renderDhikr();
}

function resetTasbeeh(){
  if(!state?.dhikr) return;
  state.dhikr.currentCount = 0;
  state.dhikr.lapCount = 1;
  saveState();
  renderDhikr();
  showToast('تمت إعادة ضبط المسبحة','info');
}

function toggleTasbeehSound(){
  if(!state?.dhikr) return;
  state.dhikr.soundEnabled = !state.dhikr.soundEnabled;
  saveState();
  renderDhikr();
  showToast(state.dhikr.soundEnabled ? 'تم تفعيل صوت التسبيح' : 'تم كتم الصوت','info');
}

function toggleTasbeehVibrate(){
  if(!state?.dhikr) return;
  state.dhikr.vibrateEnabled = !state.dhikr.vibrateEnabled;
  saveState();
  renderDhikr();
  showToast(state.dhikr.vibrateEnabled ? 'تم تفعيل الاهتزاز' : 'تم إيقاف الاهتزاز','info');
}

function showAddDhikrModal(){
  document.getElementById('custom-dhikr-text').value = '';
  document.getElementById('custom-dhikr-meaning').value = '';
  openModal('dhikr-modal');
}

function saveCustomDhikr(){
  const text = (document.getElementById('custom-dhikr-text').value || '').trim();
  const meaning = (document.getElementById('custom-dhikr-meaning').value || '').trim();
  const target = parseInt(document.getElementById('custom-dhikr-target').value) || 33;
  if(!text){
    showToast('أدخل نص الذكر أولاً','error');
    return;
  }
  const newItem = {
    id: 'custom-' + generateId(),
    text,
    meaning: meaning || 'ذكر مستحب من اختيارك',
    count: 0,
    isDefault: false
  };
  state.dhikr.items.push(newItem);
  state.dhikr.currentId = newItem.id;
  state.dhikr.target = target;
  state.dhikr.currentCount = 0;
  state.dhikr.lapCount = 1;
  saveState();
  closeModal('dhikr-modal');
  renderDhikr();
  showToast('تمت إضافة الذكر بنجاح','success');
}

function deleteCustomDhikr(id){
  if(confirm('هل تريد حذف هذا الذكر من المسبحة؟')){
    state.dhikr.items = state.dhikr.items.filter(i => i.id !== id);
    if(state.dhikr.currentId === id){
      state.dhikr.currentId = state.dhikr.items[0]?.id || 'subhanallah';
      state.dhikr.currentCount = 0;
      state.dhikr.lapCount = 1;
    }
    saveState();
    renderDhikr();
    showToast('تم حذف الذكر','info');
  }
}

// ============================================================
//  RENDER FUNCTIONS
// ============================================================
function renderThrottled(){
  if(renderThrottle)clearTimeout(renderThrottle);
  renderThrottle=setTimeout(()=>{render();renderThrottle=null;},50);
}

function render(){
  if(!state)return;
  ensureToday();
  updateTopbar();
  renderDashboard();
  renderManageHabits();
  renderDhikr();
  renderRewards();
  updateCompanion();
}

function updateTopbar(){
  document.getElementById('points-num').textContent=state.user.totalPoints;
  const em=document.getElementById('emergency-toggle');
  if(state.settings.emergencyModeActive)em.classList.add('active');
  else em.classList.remove('active');
}

function renderDashboard(){
  const today=todayStr();
  const log=state.dailyLogs[today];
  const hh=new Date().getHours();
  
  // Inspiring greeting
  const greetingEl=document.getElementById('greeting');
  if(greetingEl){
    const timeGreeting = hh < 12 ? 'صباح العزيمة والبركة' : hh < 17 ? 'طاب يومك بالقوة والإنجاز' : 'مساء الهمة والثبات';
    greetingEl.innerHTML = `<i class="fa-solid fa-handshake-angle text-gold"></i> ${timeGreeting}، ${state.user.name||'يا أخي'}`;
  }

  const d=new Date();
  const dayNames=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  document.getElementById('date-display').textContent=`${dayNames[d.getDay()]}، ${d.getDate()} / ${d.getMonth()+1}`;

  // Rotate Hadith / Motivating quote
  const qIdx = (d.getDate() + d.getMonth()) % MOTIVATIONAL_QUOTES.length;
  document.getElementById('daily-msg').querySelector('span').textContent = MOTIVATIONAL_QUOTES[qIdx];

  // Hamza daily advice
  const hamzaMsgEl = document.getElementById('hamza-daily-msg');
  if(hamzaMsgEl){
    const hamzaQuotes = [
      "\"استعن بالله ولا تعجز يا أخي! القوة في البدن واليقين في القلب يصنعان المجد. لا مكان للكسل في مسارنا اليوم!\"",
      "\"المؤمن القوي حجة على غيره؛ أتقن صلاتك، أصلح بدنك بالحديد والحركة، ونقِّ عقلك من التوافه!\"",
      "\"يا أسد العزيمة، عاداتك اليوم هي التي تبني مستقبلك غداً. لا تركن للراحة حتى تنهي ما عليك!\"",
      "\"ركعتان في جوف الليل وتمرين شاق في الصباح كفيلان بأن يجعلاك أصلب من الفولاذ بإذن الله!\""
    ];
    hamzaMsgEl.textContent = hamzaQuotes[d.getDate() % hamzaQuotes.length];
  }

  // Ring Progress
  const dailyH=state.habits.filter(h=>h.frequency==='daily');
  const completed=dailyH.filter(h=>log.habits[h.id]&&(log.habits[h.id].status==='completed'||log.habits[h.id].status==='emergency')).length;
  const pct=dailyH.length?Math.round(completed/dailyH.length*100):0;
  const circ=194.7;
  const ringProgress = document.getElementById('ring-progress');
  if(ringProgress){
    ringProgress.style.strokeDashoffset=circ-(circ*pct/100);
  }
  document.getElementById('ring-pct').textContent=pct+'%';

  // Dashboard Habits List
  const container=document.getElementById('habits-dashboard-list');
  if(!state.habits.length){
    container.innerHTML=`
      <div class="card" style="text-align:center;padding:36px 20px">
        <div style="font-size:2.5rem;color:var(--green);margin-bottom:12px"><i class="fa-solid fa-seedling"></i></div>
        <h3 style="margin-bottom:8px">ابدأ بناء مسارك القوي</h3>
        <p style="color:var(--text3);font-size:.88rem;margin-bottom:16px">أضف عاداتك اليومية الأولى وانطلق نحو جسم وعقل رائعين</p>
        <button class="btn btn-primary" onclick="showPage('habits');showAddHabitModal()">
          <i class="fa-solid fa-plus"></i> أضف أول عادة
        </button>
      </div>`;
    return;
  }

  container.innerHTML=state.habits.map(h=>{
    const entry=log.habits[h.id];
    const isDone=entry&&(entry.status==='completed'||entry.status==='emergency');
    const isSkipped=entry&&entry.status==='skipped';
    const em=state.settings.emergencyModeActive;
    const reps=h.repetitions??1;
    const repsCompleted=entry?.repsCompleted??0;
    const priority=h.priority??'medium';
    const priorityBadge=priority==='high'?'<i class="fa-solid fa-circle text-red" title="أولوية عالية" style="font-size:.65rem"></i>':priority==='low'?'<i class="fa-solid fa-circle text-green" title="أولوية منخفضة" style="font-size:.65rem"></i>':'';

    let actions='';
    let repSection='';
    if(isDone){
      actions=`<button class="habit-btn done-state" disabled><i class="fa-solid fa-check"></i> مكتملة بنجاح</button>`;
    }else if(isSkipped){
      actions=`<button class="habit-btn done-state" disabled style="background:var(--bg3);color:var(--text3)"><i class="fa-solid fa-forward-step"></i> تم التخطي</button>`;
    }else if(reps>1){
      const boxesHtml=Array.from({length:Math.min(reps, 12)},(_,i)=>
        `<div class="rep-box ${i<repsCompleted?'filled':''}" onclick="${i>=repsCompleted?`completeOneRep('${h.id}')`:''}" title="${i<repsCompleted?'مكتمل':'انقر للتسجيل'}">
          ${i<repsCompleted?'<i class="fa-solid fa-check"></i>':''}
        </div>`
      ).join('');
      repSection=`<div style="margin-bottom:10px"><div class="rep-boxes">${boxesHtml}</div><div class="rep-progress-label">${repsCompleted}/${reps} مكتمل</div></div>`;
      actions=`<button class="habit-btn skip" onclick="openSkipModal('${h.id}')"><i class="fa-solid fa-forward-step"></i> تخطي</button>`;
    }else{
      actions=`
        <button class="habit-btn complete" onclick="completeHabit('${h.id}','completed')">
          <i class="fa-solid fa-check"></i> إكمال
        </button>
        ${em?`<button class="habit-btn emergency-action" onclick="completeHabit('${h.id}','emergency')"><i class="fa-solid fa-bolt"></i> طوارئ</button>`:''}
        <button class="habit-btn skip" onclick="openSkipModal('${h.id}')">
          <i class="fa-solid fa-forward-step"></i> تخطي
        </button>
      `;
    }

    const hasNotes=(h.notes||'').trim().length>0;

    return `
      <div class="habit-card ${isDone?'completed':''}" style="--habit-color:${h.color}">
        <div class="habit-header">
          <div class="habit-icon-box" style="color:${h.color}">
            ${renderHabitIcon(h.emoji)}
          </div>
          <div class="habit-info">
            <div class="habit-name">${priorityBadge} <span>${h.name}</span></div>
            <div class="habit-meta">
              <span><i class="fa-solid fa-bullseye"></i> ${em?h.miniTarget.value:h.target.value} ${(em?h.miniTarget.unit:h.target.unit)==='minutes'?'دقيقة':'مرة'}</span>
              ${h.streak>0?`<span class="streak-badge"><i class="fa-solid fa-fire text-gold"></i> ${h.streak} يوم</span>`:''}
            </div>
          </div>
        </div>
        <div class="habit-progress-bar"><div class="habit-progress-fill" style="width:${isDone?100:reps>1?Math.round(repsCompleted/reps*100):0}%"></div></div>
        ${repSection}
        <div class="habit-actions">${actions}</div>
        <div class="habit-footer-row">
          <button class="notes-toggle-btn ${hasNotes?'has-notes':''}" id="notes-toggle-${h.id}" onclick="toggleNotesPanel('${h.id}')" title="ملاحظات العادة">
            <i class="fa-solid fa-note-sticky"></i>
          </button>
          <span class="save-indicator" id="save-indicator-${h.id}"><i class="fa-solid fa-check"></i> تم الحفظ</span>
        </div>
        <div class="notes-panel" id="notes-panel-${h.id}">
          <textarea class="form-input" rows="2" placeholder="ملاحظاتك وانضباطك في هذه العادة..." dir="rtl"
            style="font-size:.85rem;resize:none"
            oninput="saveHabitNotes('${h.id}',this.value)">${h.notes||''}</textarea>
        </div>
      </div>
    `;
  }).join('');
}

function renderManageHabits(){
  const container=document.getElementById('habits-manage-list');
  if(!container) return;
  if(!state.habits.length){
    container.innerHTML='<div class="card" style="text-align:center;padding:30px;color:var(--text3)"><i class="fa-solid fa-clipboard-list" style="font-size:2rem;margin-bottom:8px"></i><p>لا توجد عادات حالياً</p></div>';
    return;
  }
  container.innerHTML=state.habits.map(h=>`
    <div class="habits-list-item">
      <div class="habit-icon-box" style="width:40px;height:40px;color:${h.color}">
        ${renderHabitIcon(h.emoji)}
      </div>
      <div style="flex:1">
        <div style="font-weight:800;font-size:.95rem">${h.name}</div>
        <div style="font-size:.74rem;color:var(--text3);font-weight:600">
          ${h.type==='bad'?'تقليل وتخلص':'بناء وتثبيت'} · <i class="fa-solid fa-fire text-gold"></i> ${h.streak} يوم · ${h.repetitions>1?`${h.repetitions}× `:''}
        </div>
      </div>
      <div class="habits-list-actions">
        <button class="small-action-btn" onclick="editHabit('${h.id}')" title="تعديل"><i class="fa-solid fa-pen"></i></button>
        <button class="small-action-btn delete" onclick="deleteHabit('${h.id}')" title="حذف"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    </div>
  `).join('');
}

function renderRewards(){
  const ptsEl=document.getElementById('reward-pts-display');
  if(ptsEl) ptsEl.textContent=state.user.totalPoints;
  const lvlEl=document.getElementById('reward-level');
  if(lvlEl) lvlEl.textContent=state.user.level;
  const lvlPct=Math.min(100,(state.user.totalPoints%(state.user.level*100))/(state.user.level*100)*100);
  const barEl=document.getElementById('level-bar-fill');
  if(barEl) barEl.style.width=lvlPct+'%';

  // Badges
  const badgesEl=document.getElementById('badges-grid');
  if(badgesEl){
    badgesEl.innerHTML=state.badges.map(b=>`
      <div class="badge-item ${b.unlockedAt?'':'locked'}">
        <div class="badge-icon"><i class="fa-solid ${b.icon}"></i></div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
      </div>
    `).join('');
  }

  // Rewards
  const rl=document.getElementById('rewards-list');
  if(rl){
    if(!state.rewards.length) rl.innerHTML='<div class="card" style="text-align:center;padding:24px;color:var(--text3)"><p>أضف مكافآتك الخاصة لتكافئ نفسك على الإنجاز</p></div>';
    else rl.innerHTML=state.rewards.map(r=>`
      <div class="reward-card">
        <div class="reward-icon-box">${renderHabitIcon(r.emoji)}</div>
        <div class="reward-info">
          <div style="font-weight:800">${r.name}</div>
          <div class="reward-cost"><i class="fa-solid fa-star"></i> ${r.cost} نقطة</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="redeemReward('${r.id}')"><i class="fa-solid fa-check"></i> استبدل</button>
        <button class="small-action-btn delete" onclick="deleteReward('${r.id}')" title="حذف"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `).join('');
  }

  // History
  const ph=document.getElementById('points-history-list');
  if(ph){
    if(!state.pointsHistory.length) ph.innerHTML='<p style="text-align:center;color:var(--text3);padding:14px">لا يوجد سجل نقاط حتى الآن</p>';
    else ph.innerHTML=state.pointsHistory.slice(0,15).map(h=>`
      <div class="history-item">
        <div class="history-icon"><i class="fa-solid fa-bolt"></i></div>
        <div>
          <div style="font-weight:700;font-size:.88rem">${h.desc}</div>
          <div style="font-size:.72rem;color:var(--text3)">${h.date}</div>
        </div>
        <div class="history-pts">+${h.pts}</div>
      </div>
    `).join('');
  }
}

function renderAnalytics(){
  const allStreaks=state.habits.map(h=>h.longestStreak);
  const perfectDays=Object.values(state.dailyLogs).filter(l=>l.perfectDay).length;
  let bestHabit='-';
  if(state.habits.length){
    let bestStreak=0;
    state.habits.forEach(h=>{if(h.streak>bestStreak){bestStreak=h.streak;bestHabit=h.name;}});
  }

  document.getElementById('analytics-stats').innerHTML=`
    <div class="stat-card"><div class="stat-value text-gold">${allStreaks.length?Math.max(...allStreaks):0}</div><div class="stat-label">أطول سلسلة أيام</div></div>
    <div class="stat-card"><div class="stat-value text-green">${perfectDays}</div><div class="stat-label">أيام مثالية متقنة</div></div>
    <div class="stat-card"><div class="stat-value text-green">${state.user.totalPoints}</div><div class="stat-label">إجمالي النقاط</div></div>
    <div class="stat-card"><div class="stat-value text-gold">${state.user.level}</div><div class="stat-label">رتبة المستوى</div></div>
    <div class="stat-card"><div class="stat-value text-blue">${Math.round((Object.values(state.dailyLogs).filter(l=>Object.values(l.habits||{}).some(e=>e.status==='completed')).length/(Object.keys(state.dailyLogs).length||1))*100)}%</div><div class="stat-label">نسبة الإنجاز</div></div>
    <div class="stat-card"><div class="stat-value" style="font-size:.95rem;padding-top:4px">${bestHabit}</div><div class="stat-label">أقوى عادة ثابتة</div></div>
  `;

  // Week Bars
  const wb=document.getElementById('week-bars');
  const days=['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
  const weekData=[];
  for(let i=6;i>=0;i--){
    const d=getDay(-i);
    const log=state.dailyLogs[d];
    const dailyH=state.habits.length||1;
    let done=0;
    if(log&&log.habits) done=Object.values(log.habits).filter(e=>e.status==='completed'||e.status==='emergency').length;
    weekData.push({day:days[new Date(d).getDay()],pct:Math.round(done/dailyH*100)});
  }
  const maxPct=Math.max(...weekData.map(d=>d.pct),1);
  wb.innerHTML=weekData.map(d=>`
    <div style="flex:1;text-align:center">
      <div style="font-size:.7rem;font-weight:700;margin-bottom:4px">${d.pct}%</div>
      <div class="week-bar ${d.pct===maxPct&&d.pct>0?'best':''}" style="height:${Math.max(6,d.pct/maxPct*80)}px">
        <span class="week-bar-label">${d.day}</span>
      </div>
    </div>
  `).join('');

  drawHeatmap();
  drawPointsChart();
  renderInsights();
}

function drawHeatmap(){
  const container=document.getElementById('heatmap-container');
  const days=[];
  for(let i=89;i>=0;i--){
    const date=getDay(-i);
    const log=state.dailyLogs[date];
    let intensity=0;
    if(log){
      const habits=state.habits.length||1;
      const done=Object.values(log.habits||{}).filter(e=>e.status==='completed'||e.status==='emergency').length;
      intensity=Math.floor((done/habits)*4);
    }
    days.push({date,intensity});
  }
  container.innerHTML=days.map(d=>`<div class="heatmap-day" data-intensity="${d.intensity}" title="${d.date}"></div>`).join('');
}

function drawPointsChart(){
  const canvas=document.getElementById('points-chart');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  canvas.width=canvas.offsetWidth||320;
  canvas.height=120;
  const logs=Object.entries(state.dailyLogs).sort((a,b)=>a[0].localeCompare(b[0])).slice(-14);
  if(!logs.length)return;
  const pts=logs.map(([,l])=>l.totalPoints||0);
  const maxP=Math.max(...pts,1);
  const w=canvas.width,h=canvas.height,pad=20;
  ctx.clearRect(0,0,w,h);
  const step=(w-pad*2)/(pts.length-1||1);
  const green=getComputedStyle(document.documentElement).getPropertyValue('--green').trim()||'#059669';
  ctx.beginPath();
  ctx.strokeStyle=green;
  ctx.lineWidth=3;
  pts.forEach((p,i)=>{
    const x=pad+i*step;
    const y=h-pad-(p/maxP)*(h-pad*2);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.stroke();
  ctx.fillStyle=green+'22';
  ctx.beginPath();
  pts.forEach((p,i)=>{
    const x=pad+i*step;
    const y=h-pad-(p/maxP)*(h-pad*2);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.lineTo(pad+(pts.length-1)*step,h-pad);
  ctx.lineTo(pad,h-pad);
  ctx.fill();
}

function renderInsights(){
  const el=document.getElementById('insights-section');
  if(el){
    el.innerHTML=`
      <div class="card" style="display:flex;gap:12px;align-items:flex-start">
        <div style="font-size:1.6rem;color:var(--gold)"><i class="fa-solid fa-lightbulb"></i></div>
        <div>
          <div style="font-weight:800;margin-bottom:4px">توجيه الأداء من الأخ القوي</div>
          <p style="font-size:.85rem;color:var(--text2)">حافظ على وقت صلاة الفجر والورد اليومي والتمرين؛ الاستمرارية في الثلاثي (الروح، الجسد، العقل) تثمر ثباتاً هائلاً.</p>
        </div>
      </div>
    `;
  }
}

// ============================================================
//  FLOATING COMPANION
// ============================================================
function showCompanionMsg(msg){
  const bubble=document.getElementById('companion-bubble');
  if(!bubble)return;
  bubble.textContent=msg;
  bubble.classList.add('show');
  setTimeout(()=>bubble.classList.remove('show'),4500);
}
function updateCompanion(){}
function companionClick(){
  const msgs=[
    "«المؤمن القوي خير وأحب إلى الله من المؤمن الضعيف»",
    "استعن بالله ولا تعجز يا أخي! استمر في مسارك!",
    "تذكر: التعب يزول، وأجر الانضباط يبقى ويُثمر!",
    "صلاتك، تمرينك، وردك.. ثلاثية الرجال الأقوياء!"
  ];
  showCompanionMsg(msgs[Math.floor(Math.random()*msgs.length)]);
}

// ============================================================
//  HABIT MODAL (3 STEPS)
// ============================================================
function goToStep(n){
  if(n===1){
    const name=document.getElementById('habit-name-input').value.trim();
    if(!name){
      const inp=document.getElementById('habit-name-input');
      inp.classList.add('shake');
      setTimeout(()=>inp.classList.remove('shake'),400);
      inp.style.borderColor='var(--red)';
      setTimeout(()=>inp.style.borderColor='',800);
      showToast('أدخل اسم العادة أولاً يا أخي','info');
      return;
    }
  }
  document.getElementById(`modal-step-${currentModalStep}`).classList.remove('active');
  document.getElementById(`sdot-${currentModalStep}`).classList.remove('active');
  currentModalStep=n;
  document.getElementById(`modal-step-${n}`).classList.add('active');
  document.getElementById(`sdot-${n}`).classList.add('active');
}

function selectPriority(p){
  currentPriority=p;
  document.getElementById('habit-priority-input').value=p;
  ['high','medium','low'].forEach(x=>{
    const btn=document.getElementById(`prio-${x}`);
    if(btn){
      btn.className='priority-pill';
      if(x===p)btn.classList.add(`active-${x}`);
    }
  });
}

function updateCharCounter(len){
  const el=document.getElementById('char-counter');
  if(el){el.textContent=`${len} / 50`;el.classList.toggle('warn',len>40);}
}

function toggleOptionalNotes(){
  const area=document.getElementById('optional-notes-area');
  if(area)area.classList.toggle('open');
}

function buildIconPicker(){
  const container=document.getElementById('habit-icon-picker');
  if(!container)return;
  const current=document.getElementById('habit-emoji-input').value||'fa-dumbbell';
  container.innerHTML='';
  FA_ICONS.forEach(icon=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='icon-opt'+(icon===current?' selected':'');
    btn.innerHTML=`<i class="fa-solid ${icon}"></i>`;
    btn.title=icon;
    btn.onclick=()=>{
      container.querySelectorAll('.icon-opt').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('habit-emoji-input').value=icon;
    };
    container.appendChild(btn);
  });
}

function buildRewardIconPicker(){
  const container=document.getElementById('reward-icon-picker');
  if(!container)return;
  const current=document.getElementById('reward-emoji-input').value||'fa-gift';
  container.innerHTML='';
  FA_ICONS.forEach(icon=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='icon-opt'+(icon===current?' selected':'');
    btn.innerHTML=`<i class="fa-solid ${icon}"></i>`;
    btn.onclick=()=>{
      container.querySelectorAll('.icon-opt').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('reward-emoji-input').value=icon;
    };
    container.appendChild(btn);
  });
}

function buildColorPicker(){
  const picker=document.getElementById('habit-color-picker');
  if(!picker)return;
  const current=document.getElementById('habit-color-input').value;
  picker.innerHTML='';
  COLORS.forEach(c=>{
    const d=document.createElement('div');
    d.className='color-opt'+(c===current?' selected':'');
    d.style.background=c;
    d.title=c;
    d.onclick=()=>{
      picker.querySelectorAll('.color-opt').forEach(x=>x.classList.remove('selected'));
      d.classList.add('selected');
      document.getElementById('habit-color-input').value=c;
    };
    picker.appendChild(d);
  });
}

function saveHabit(){
  const name=document.getElementById('habit-name-input').value.trim();
  if(!name){showToast('أدخل اسم العادة أولاً','info');return;}
  const id=document.getElementById('edit-habit-id').value;
  const data={
    name,
    type:document.getElementById('habit-type-input').value,
    emoji:document.getElementById('habit-emoji-input')?.value||'fa-dumbbell',
    color:document.getElementById('habit-color-input')?.value||'#059669',
    target:{value:parseInt(document.getElementById('habit-target-input').value)||1,unit:document.getElementById('habit-unit-input').value},
    miniTarget:{value:parseInt(document.getElementById('habit-mini-input').value)||1,unit:document.getElementById('habit-mini-unit-input').value},
    frequency:'daily',
    repetitions:Math.min(50,Math.max(1,parseInt(document.getElementById('habit-reps-input').value)||1)),
    priority:document.getElementById('habit-priority-input').value||'medium',
    notes:document.getElementById('habit-base-notes-input').value||''
  };

  if(id){
    const idx=state.habits.findIndex(x=>x.id===id);
    if(idx>-1){
      state.habits[idx]={...state.habits[idx],...data};
    }
  }else{
    state.habits.push({...data,id:generateId(),createdAt:todayStr(),streak:0,longestStreak:0});
  }
  saveState();
  renderThrottled();
  closeModal('habit-modal');
  showToast(`${id?'تم تعديل العادة بنجاح':'تمت إضافة العادة بنجاح'}`,'success');
}

function deleteHabit(id){
  if(confirm('هل أنت متأكد من حذف هذه العادة نهائياً؟')){
    state.habits=state.habits.filter(x=>x.id!==id);
    saveState();
    renderThrottled();
    showToast('تم حذف العادة','info');
  }
}

function editHabit(id){
  const h=state.habits.find(x=>x.id===id);
  if(!h)return;
  currentModalStep=0;
  document.querySelectorAll('.modal-step').forEach((s,i)=>{s.classList.toggle('active',i===0);});
  document.querySelectorAll('[id^=sdot-]').forEach((d,i)=>{d.classList.toggle('active',i===0);});
  document.getElementById('edit-habit-id').value=id;
  document.getElementById('habit-name-input').value=h.name;
  updateCharCounter(h.name.length);
  document.getElementById('habit-base-notes-input').value=h.notes||'';
  document.getElementById('habit-type-input').value=h.type;
  document.getElementById('habit-target-input').value=h.target.value;
  document.getElementById('habit-unit-input').value=h.target.unit;
  document.getElementById('habit-mini-input').value=h.miniTarget.value;
  document.getElementById('habit-mini-unit-input').value=h.miniTarget.unit;
  document.getElementById('habit-reps-input').value=h.repetitions??1;
  document.getElementById('habit-emoji-input').value=h.emoji||'fa-dumbbell';
  document.getElementById('habit-color-input').value=h.color||'#059669';
  selectPriority(h.priority||'medium');
  buildIconPicker();
  buildColorPicker();
  openModal('habit-modal');
}

function showAddHabitModal(){
  currentModalStep=0;
  document.querySelectorAll('.modal-step').forEach((s,i)=>{s.classList.toggle('active',i===0);});
  document.querySelectorAll('[id^=sdot-]').forEach((d,i)=>{d.classList.toggle('active',i===0);});
  document.getElementById('edit-habit-id').value='';
  document.getElementById('habit-name-input').value='';
  document.getElementById('habit-base-notes-input').value='';
  updateCharCounter(0);
  document.getElementById('habit-type-input').value='good';
  document.getElementById('habit-target-input').value='1';
  document.getElementById('habit-unit-input').value='times';
  document.getElementById('habit-mini-input').value='1';
  document.getElementById('habit-mini-unit-input').value='times';
  document.getElementById('habit-reps-input').value='1';
  document.getElementById('habit-emoji-input').value='fa-dumbbell';
  document.getElementById('habit-color-input').value='#059669';
  selectPriority('medium');
  buildIconPicker();
  buildColorPicker();
  openModal('habit-modal');
}

// ============================================================
//  REWARDS CRUD
// ============================================================
function showAddRewardModal(){
  document.getElementById('reward-name-input').value='';
  document.getElementById('reward-cost-input').value=100;
  document.getElementById('reward-emoji-input').value='fa-gift';
  buildRewardIconPicker();
  openModal('reward-modal');
}

function saveReward(){
  const name=document.getElementById('reward-name-input').value.trim();
  if(!name){showToast('أدخل اسم المكافأة','error');return;}
  state.rewards.push({
    id:generateId(),
    name,
    emoji:document.getElementById('reward-emoji-input').value||'fa-gift',
    cost:parseInt(document.getElementById('reward-cost-input').value)||100,
    redeemedCount:0
  });
  saveState();
  renderThrottled();
  closeModal('reward-modal');
  showToast('تمت إضافة المكافأة','success');
}

function deleteReward(id){
  if(confirm('حذف هذه المكافأة؟')){
    state.rewards=state.rewards.filter(x=>x.id!==id);
    saveState();
    renderThrottled();
  }
}

function redeemReward(id){
  const r=state.rewards.find(x=>x.id===id);
  if(!r)return;
  if(state.user.totalPoints<r.cost){
    showToast('نقاطك لا تكفي بعد — واصل إكمال العادات لكسب النقاط','info');
    return;
  }
  if(confirm(`استبدال "${r.name}" بـ ${r.cost} نقطة؟`)){
    state.user.totalPoints-=r.cost;
    r.redeemedCount++;
    state.pointsHistory.unshift({date:todayStr(),desc:`استبدال مكافأة: ${r.name}`,pts:-r.cost,type:'redeem'});
    saveState();
    renderThrottled();
    showConfetti();
    playCelebrationSound();
    showToast(`مبارك استحقاقك لـ: ${r.name}!`,'gold');
  }
}

function showConfetti(){
  const wrap=document.getElementById('confetti-wrap');
  if(!wrap)return;
  wrap.innerHTML='';
  for(let i=0;i<40;i++){
    const p=document.createElement('div');
    p.className='confetti-piece';
    p.style.cssText=`left:${Math.random()*100}%;background:${COLORS[Math.floor(Math.random()*COLORS.length)]};animation:confettiFall ${1+Math.random()*2}s linear forwards;`;
    wrap.appendChild(p);
  }
  setTimeout(()=>wrap.innerHTML='',3000);
}

// ============================================================
//  DATA BACKUP / RESTORE
// ============================================================
function exportData(){
  const dataStr=JSON.stringify(state,null,2);
  const blob=new Blob([dataStr],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`massar-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('تم تصدير نسخة احتياطية بنجاح','success');
}

function importData(file){
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const imported=JSON.parse(e.target.result);
      if(imported.habits&&imported.user){
        state=migrateState(imported);
        saveState();
        renderThrottled();
        showToast('تم استيراد البيانات بنجاح تام','success');
      }else throw new Error();
    }catch(err){showToast('الملف غير صالح','error');}
  };
  reader.readAsText(file);
}

function resetApp(){
  if(confirm('تحذير: سيتم مسح كافة البيانات والعادات نهائياً. هل أنت متأكد؟')){
    localStorage.removeItem(KEY);
    location.reload();
  }
}

// ============================================================
//  UI MODALS, THEME & TOAST
// ============================================================
function openModal(id){
  const el=document.getElementById(id);
  if(el)el.classList.add('open');
}
function closeModal(id){
  const el=document.getElementById(id);
  if(el)el.classList.remove('open');
}

let toastTimer=null;
function showToast(msg,type='info'){
  const t=document.getElementById('toast');
  if(!t)return;
  const icon = type==='success'?'<i class="fa-solid fa-check"></i>':
               type==='error'?'<i class="fa-solid fa-triangle-exclamation"></i>':
               type==='gold'?'<i class="fa-solid fa-star"></i>':'<i class="fa-solid fa-circle-info"></i>';
  t.innerHTML=`${icon} <span>${msg}</span>`;
  t.className=`toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),3200);
}

function showPage(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const targetPage=document.getElementById(`page-${page}`);
  const targetNav=document.getElementById(`nav-${page}`);
  if(targetPage) targetPage.classList.add('active');
  if(targetNav) targetNav.classList.add('active');
  
  if(page==='dhikr') renderDhikr();
  if(page==='analytics') renderAnalytics();
  if(page==='pomodoro'){
    updatePomodoroDisplay();
    updatePomodoroUI();
  }
  if(page==='ai'){
    renderAiMessages();
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

function toggleTheme(){
  if(!state)return;
  state.settings.theme=state.settings.theme==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',state.settings.theme);
  const icon=document.getElementById('theme-icon');
  if(icon){
    icon.className=state.settings.theme==='dark'?'fa-solid fa-sun':'fa-solid fa-moon';
  }
  saveState();
}

function applyTheme(){
  const t=state?.settings?.theme||'light';
  document.documentElement.setAttribute('data-theme',t);
  const icon=document.getElementById('theme-icon');
  if(icon){
    icon.className=t==='dark'?'fa-solid fa-sun':'fa-solid fa-moon';
  }
}

function toggleEmergency(){
  state.settings.emergencyModeActive=!state.settings.emergencyModeActive;
  saveState();
  renderThrottled();
  showToast(state.settings.emergencyModeActive?'وضع الطوارئ مفعل — أهداف مصغرة للحفاظ على السلسلة':'تم تعطيل وضع الطوارئ','info');
}

// ============================================================
//  POMODORO TIMER
// ============================================================
function getPomodoroSeconds(mode){
  const s=state.settings.pomodoroSettings;
  if(mode==='work')return s.workDuration*60;
  if(mode==='break')return s.breakDuration*60;
  return s.longBreakDuration*60;
}

function pomodoroStart(){
  if(pomodoroTimer.isRunning)return;
  pomodoroTimer.isRunning=true;
  pomodoroTimer.intervalId=setInterval(()=>{
    pomodoroTimer.secondsLeft--;
    updatePomodoroDisplay();
    if(pomodoroTimer.secondsLeft<=0)pomodoroAutoSwitch();
  },1000);
  updatePomodoroUI();
}

function pomodoroPause(){
  clearInterval(pomodoroTimer.intervalId);
  pomodoroTimer.isRunning=false;
  updatePomodoroUI();
  document.title='مسار';
}

function pomodoroReset(){
  pomodoroPause();
  pomodoroTimer.secondsLeft=getPomodoroSeconds(pomodoroTimer.mode);
  updatePomodoroDisplay();
}

function pomodoroAutoSwitch(){
  pomodoroPause();
  playCelebrationSound();
  if(pomodoroTimer.mode==='work'){
    pomodoroTimer.sessionCount++;
    pomodoroTimer.mode=(pomodoroTimer.sessionCount%state.settings.pomodoroSettings.sessionsBeforeLongBreak===0)?'longBreak':'break';
    addBonusPoints(10,'إتمام جلسة تركيز كاملة');
  }else{
    pomodoroTimer.mode='work';
  }
  pomodoroTimer.secondsLeft=getPomodoroSeconds(pomodoroTimer.mode);
  updatePomodoroDisplay();
  updatePomodoroUI();
  pomodoroStart();
}

function updatePomodoroDisplay(){
  const m=String(Math.floor(pomodoroTimer.secondsLeft/60)).padStart(2,'0');
  const s=String(pomodoroTimer.secondsLeft%60).padStart(2,'0');
  const el=document.getElementById('pomodoro-time');
  if(el)el.textContent=`${m}:${s}`;
  const ring=document.getElementById('pomodoro-ring');
  if(ring){
    const total=getPomodoroSeconds(pomodoroTimer.mode);
    const pct=pomodoroTimer.secondsLeft/total;
    const circ=2*Math.PI*54;
    ring.style.strokeDashoffset=circ*pct;
  }
  document.title=pomodoroTimer.isRunning?`${m}:${s} — مسار التركيز`:'مسار';
}

function updatePomodoroUI(){
  const btn=document.getElementById('pomodoro-main-btn');
  if(!btn)return;
  btn.innerHTML=pomodoroTimer.isRunning?'<i class="fa-solid fa-pause"></i> إيقاف مؤقت':'<i class="fa-solid fa-play"></i> ابدأ';
  const modeLabel=document.getElementById('pomodoro-mode-label');
  if(modeLabel){
    const modeMap={
      work:{text:'<i class="fa-solid fa-bolt"></i> وقت التركيز العميق',cls:''},
      break:{text:'<i class="fa-solid fa-mug-hot"></i> استراحة قصيرة',cls:'break'},
      longBreak:{text:'<i class="fa-solid fa-bed"></i> استراحة طويلة',cls:'longBreak'}
    };
    modeLabel.innerHTML=modeMap[pomodoroTimer.mode].text;
    modeLabel.className='pomodoro-mode-label '+modeMap[pomodoroTimer.mode].cls;
  }
  const dotsContainer=document.getElementById('pomodoro-session-dots');
  if(!dotsContainer)return;
  const total=state.settings.pomodoroSettings.sessionsBeforeLongBreak;
  const currentInCycle=pomodoroTimer.sessionCount%total;
  dotsContainer.innerHTML=Array.from({length:total},(_,i)=>{
    let cls='session-dot';
    if(i<currentInCycle)cls+=' done';
    else if(i===currentInCycle&&pomodoroTimer.mode==='work')cls+=' current';
    return `<div class="${cls}" title="جلسة ${i+1}"></div>`;
  }).join('');
}

function pomodoroToggle(){pomodoroTimer.isRunning?pomodoroPause():pomodoroStart();}
function pomodoroSkipSession(){pomodoroAutoSwitch();}
function updatePomodoroSettings(){
  const work=parseInt(document.getElementById('pomo-work-input').value)||25;
  const brk=parseInt(document.getElementById('pomo-break-input').value)||5;
  state.settings.pomodoroSettings.workDuration=work;
  state.settings.pomodoroSettings.breakDuration=brk;
  saveState();
  if(!pomodoroTimer.isRunning){
    pomodoroTimer.secondsLeft=getPomodoroSeconds(pomodoroTimer.mode);
    updatePomodoroDisplay();
  }
}

// ============================================================
//  HAMZA THE STRONG BROTHER AI ENGINE (OFFLINE + GEMINI)
// ============================================================
function generateHamzaOfflineReply(userText){
  const t = userText.toLowerCase();
  const today = todayStr();
  const log = state.dailyLogs[today] || {habits:{}};
  const habits = state.habits || [];
  const completedHabits = habits.filter(h => log.habits[h.id] && (log.habits[h.id].status==='completed'||log.habits[h.id].status==='emergency'));
  const pendingHabits = habits.filter(h => !log.habits[h.id] || log.habits[h.id].status==='pending');

  // Audit habits query
  if(t.includes('قيم') || t.includes('حلل') || t.includes('عاداتي') || t.includes('أدائي')){
    if(!habits.length){
      return `السلام عليك يا أخي!
تفقدت مسارك الآن ولم أجد أي عادات مسجلة بعد!
المسلم القوي رجل أهداف وخطة واضحة؛ لا تدع يومك يمر هباءً.
ابدأ الآن بإضافة ثلاث عادات أساسية:
١. صلاة الفجر في المسجد.
٢. ٤٥ دقيقة تمرين بدني شاق (حديد أو سويدي).
٣. ورد القرآن الكريم وقراءة نافعة.
قم الآن واضغط على زر إضافة عادة وانطلق!`;
    }

    let review = `حيّاك الله يا أخي القوي! تفقدت مسارك اليوم وإليك تقييمي الصريح:

إجمالي عاداتك: ${habits.length} عادات.
العادات المنجزة اليوم: ${completedHabits.length} من ${habits.length}.
`;

    if(completedHabits.length === habits.length){
      review += `
ما شاء الله تبارك الله! يوم كامل مكلل بالنصر والانضباط.
هكذا هم رجال العزيمة؛ لم تترك للشيطان ولا للكسل ثغرة.
حافظ على هذا المستوى، وتذكر أن تثبيت الإنجاز أشق من بدئه. استمر في ثباتك!`;
    } else {
      review += `
المتبقي عليك اليوم: ${pendingHabits.map(h=>h.name).join('، ')}.
يا أخي، اليوم لم ينتهِ بعد! لا تركن إلى الفراش أو المشتتات وعليك مهام لم تكتمل.
استعن بالله وقم فوراً، أنجز ما بقي عليك لتنام قرير العين راضياً عن يومك!`;
    }
    return review;
  }

  // Workout & Fitness Query
  if(t.includes('تمرين') || t.includes('عضلات') || t.includes('جسم') || t.includes('حديد') || t.includes('لياقة') || t.includes('رياضة')){
    return `السلام عليك يا رجل القوة!
قال رسول الله ﷺ: «المؤمن القوي خيرٌ وأحبُّ إلى الله من المؤمن الضعيف، وفي كلٍّ خير».

إليك خطة البناء الجسدي الفولاذي:
١. جدول التمرين (٤ إلى ٥ أيام أسبوعياً):
   - اليوم الأول: دفع (صدر + كتف أمامي + ترايسبس).
   - اليوم الثاني: سحب (ظهر + كتف خلفي + بايسبس + عقلة).
   - اليوم الثالث: أرجل وبطن (سكوات + طعنات + تمديد).
   - اليوم الرابع: راحة نشطة أو مشي سريع ٥ كيلومترات بعد الفجر.
   - اليوم الخامس: تمرين شامل أو كاليسثنكس عالي الكثافة.

٢. التغذية الصافية:
   - ابتعد تماماً عن السكريات المصنعة والزيوت المهدرجة والمشروبات الغازية.
   - ركز على البروتين النظيف (بيض، لحم، سمك، دجاج) والكربوهيدرات المعقدة والماء الوفير (٣ لتر يومياً).

٣. النوم والتعافي:
   - نم مبكراً بعد صلاة العشاء لتستيقظ نشيطاً قبل الفجر، ففي البكور بركة وهرمون النمو يعمل ليلاً.
اجعل نيتك في تمرينك قوة تعينك على طاعة الله ونفع عباده!`;
  }

  // Laziness / Procrastination
  if(t.includes('كسل') || t.includes('تسويف') || t.includes('تعب') || t.includes('حمسني') || t.includes('إحباط')){
    return `اسمعني جيداً يا أخي وركز معي!
الكسل ليس قدراً محتوماً، بل هو وساوس واستسلام لنفسك الأمارة بالسوء.
ألم تسمع استعاذة نبيك ﷺ: «اللهم إني أعوذ بك من العجز والكسل»؟
الرجال لا ينتظرون أن تأتيهم "الرغبة" ليعملوا؛ الرجال يتحركون ويبدأون حتى تأتي الرغبة في خضم المعركة!

قم الآن فوراً:
١. توضأ بماء بارد واغسل وجهك.
٢. اشرب كوب ماء كبير.
٣. أدِّ صلاتك أو افتح عادة واحدة فقط واعمل عليها لـ ١٠ دقائق دون توقف.
لا تدع يومك يضيع في التافهات، فالعمر ساعات معدودة!`;
  }

  // Fajr and Spiritual strength
  if(t.includes('فجر') || t.includes('قرآن') || t.includes('صلاة') || t.includes('ذكر') || t.includes('روح')){
    return `أكرمك الله يا أخي!
صلاة الفجر هي ميزان الرجولة والهمة؛ من ضبط فجره انضبط له سائر يومه.

نصائحي الذهبية للثبات على الفجر:
١. لا تسهر بعد العشاء بلا حاجة شرعية أو علم نافع.
٢. اترك الهاتف خارج غرفة النوم أو بعيداً عن متناول يدك تماماً.
٣. اضبط نيتك قبل أن تغمض عينيك، وقل أذكار النوم.
٤. قف فور أن ينطلق الأذان ولا تعاود وضع رأسك على الوسادة؛ فالدقيقة الأولى تحسم المعركة.
واعلم أن ركعتي الفجر خير من الدنيا وما فيها!`;
  }

  // General brotherly advice
  return `حيّاك الله يا أخي وبطل العزيمة!
معك أخوك حمزة، مستعد دائماً للوقوف معك ومتابعة انضباطك في كل تفاصيل يومك.

تذكر دائماً ميزاننا:
- جسد قوي مفتول العضلات صحيح البنية.
- عقل حاد قارئ متفكر يتقن مهارته.
- روح خاشعة موصولة بالله تقية صابرة.

ما الذي يشغلك الآن؟ هل تود أن نراجع عاداتك اليوم، أم نضع خطة تدريب وتغذية، أم ننظم جدول استيقاظك وفجرك؟ اطرح ما عندك وسأكون لك ناصحاً أميناً!`;
}

function renderAiMessages(){
  const container=document.getElementById('ai-messages-list');
  if(!container)return;

  if(aiState.messages.length===0&&!aiState.isLoading){
    container.innerHTML=`
      <div class="ai-welcome">
        <div class="ai-welcome-avatar"><i class="fa-solid fa-shield-halved"></i></div>
        <div style="font-weight:900;font-size:1.25rem;color:var(--text);margin-bottom:4px">أنا أخوك حمزة</div>
        <div style="color:var(--green);font-size:0.85rem;font-weight:700;margin-bottom:12px">«المؤمن القوي خير وأحب إلى الله من المؤمن الضعيف»</div>
        <p style="color:var(--text3);font-size:0.88rem;max-width:380px;margin:0 auto">أنا هنا لأدفعك لتكون أقوى في بدنك، أصفى في عقلك، وأثبت في إيمانك. اختر ما تريد أن نبدأ به:</p>
        <div class="ai-suggestions">
          <button class="ai-suggestion-chip" onclick="aiQuickSend('حلل عاداتي وأدائي اليوم يا أخي')">
            <i class="fa-solid fa-clipboard-check text-green"></i> حلل عاداتي وأدائي اليوم يا أخي
          </button>
          <button class="ai-suggestion-chip" onclick="aiQuickSend('ضع لي خطة لياقة وتدريب لبناء جسم قوي')">
            <i class="fa-solid fa-dumbbell text-gold"></i> خطة تدريب ولياقة لبناء جسم قوي
          </button>
          <button class="ai-suggestion-chip" onclick="aiQuickSend('أشعر بالكسل والتسويف، حمسني وأعدني للمسار')">
            <i class="fa-solid fa-bolt text-red"></i> أشعر بالكسل والتسويف، حمسني وأعدني للمسار
          </button>
          <button class="ai-suggestion-chip" onclick="aiQuickSend('كيف أنظم استيقاظي لصلاة الفجر وأبدأ يومي ببركة؟')">
            <i class="fa-solid fa-mosque text-blue"></i> كيف أنظم فجري وأبدأ يومي ببركة وقوة؟
          </button>
        </div>
      </div>`;
    return;
  }

  let html=aiState.messages.map(m=>`
    <div class="ai-msg ai-msg--${m.role==='user'?'user':'assistant'}">
      ${m.role!=='user'?'<div class="ai-avatar"><i class="fa-solid fa-shield-halved"></i></div>':''}
      <div class="ai-bubble">${formatAiText(m.text)}</div>
      ${m.role==='user'?'<div class="ai-avatar ai-avatar--user"><i class="fa-solid fa-user"></i></div>':''}
    </div>`).join('');

  if(aiState.isLoading){
    html+=`<div class="ai-msg ai-msg--assistant"><div class="ai-avatar"><i class="fa-solid fa-shield-halved"></i></div><div class="ai-bubble ai-typing"><span></span><span></span><span></span></div></div>`;
  }

  container.innerHTML=html;
  scrollAiToBottom();
}

function formatAiText(text){
  return text
    .replace(/\n/g,'<br>')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/^\s*[\-\*]\s+(.*)$/gm,'• $1');
}

function scrollAiToBottom(){
  const container=document.getElementById('ai-messages-list');
  if(container)container.scrollTop=container.scrollHeight;
}

async function sendToGemini(userMessage){
  aiState.isLoading=true;
  renderAiMessages();

  // If NO API key is configured, use the smart built-in offline engine!
  if(!aiState.apiKey){
    setTimeout(()=>{
      const reply = generateHamzaOfflineReply(userMessage);
      aiState.messages.push({role:'model',text:reply});
      aiState.isLoading=false;
      aiState.sendLock=false;
      if(state){
        state.aiHistory=aiState.messages.slice(-20);
        saveState();
      }
      renderAiMessages();
    }, 400);
    return;
  }

  // Construct rich context for online Gemini call
  const today=todayStr();
  const log=state.dailyLogs[today]||{habits:{}};
  const habitsSummary=(state.habits||[]).map(h=>{
    const status=log.habits[h.id]?.status||'لم تسجل بعد';
    return `${h.name} (${status}, سلسلة: ${h.streak} يوم)`;
  }).join(' | ');

  const contextPrompt = `${HAMZA_SYSTEM_PROMPT}

سياق المستخدم الحالي في التطبيق:
الاسم: ${state.user.name}
المستوى: ${state.user.level} (إجمالي النقاط: ${state.user.totalPoints})
عادات اليوم وحالتها: [${habitsSummary}]
تسبيحات اليوم: ${state.dhikr?.todayTotal||0}`;

  const contents=[
    {role:'user',parts:[{text:`تعليمات وهوية الشخصية: ${contextPrompt}`}]},
    {role:'model',parts:[{text:'أنا حمزة، حاضر ومعك يا أخي في كل خطوة.'}]}
  ];

  aiState.messages.slice(-6).forEach(m=>{
    contents.push({
      role:m.role==='user'?'user':'model',
      parts:[{text:m.text}]
    });
  });

  try{
    const response=await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${aiState.modelName}:generateContent?key=${aiState.apiKey}`,
      {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          contents,
          generationConfig:{temperature:0.7,maxOutputTokens:1200}
        })
      }
    );

    const data=await response.json();

    if(!response.ok){
      const errMsg=data.error?.message||'خطأ في الاتصال';
      if(errMsg.includes('API key') || errMsg.includes('invalid') || errMsg.includes('expired')){
        localStorage.removeItem('massar_gemini_key');
        aiState.apiKey=null;
        const fallback = generateHamzaOfflineReply(userMessage);
        aiState.messages.push({role:'model',text:fallback});
        showToast('مفتاح API غير صالح — تم التحويل للمحرك المدمج تلقائياً','info');
        return;
      }
      throw new Error(errMsg);
    }

    const replyText=data.candidates?.[0]?.content?.parts?.[0]?.text||generateHamzaOfflineReply(userMessage);
    aiState.messages.push({role:'model',text:replyText});
    if(state){
      state.aiHistory=aiState.messages.slice(-20);
      saveState();
    }
  }catch(err){
    const fallback = generateHamzaOfflineReply(userMessage);
    aiState.messages.push({role:'model',text:fallback});
  }finally{
    aiState.isLoading=false;
    aiState.sendLock=false;
    renderAiMessages();
  }
}

function aiSubmit(){
  if(aiState.sendLock)return;
  const input=document.getElementById('ai-input');
  const text=(input.value||'').trim();
  if(!text)return;

  aiState.sendLock=true;
  aiState.messages.push({role:'user',text});
  input.value='';
  input.style.height='auto';
  renderAiMessages();
  sendToGemini(text);
}

function aiQuickSend(text){
  if(aiState.sendLock)return;
  aiState.sendLock=true;
  aiState.messages.push({role:'user',text});
  renderAiMessages();
  sendToGemini(text);
}

function clearAiHistory(){
  if(confirm('هل تريد مسح سجل المحادثة مع الأخ القوي؟')){
    aiState.messages=[];
    if(state){
      state.aiHistory=[];
      saveState();
    }
    renderAiMessages();
  }
}

// ============================================================
//  INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded',()=>{
  state=loadState();
  if(!state){
    state=initDefaultState('يا أخي');
    saveState();
  }else{
    if(!state.user.notificationTime)state.user.notificationTime='09:00';
    saveState();
  }

  applyTheme();
  ensureToday();
  checkMissedHabits();
  renderThrottled();
  setInterval(()=>renderThrottled(),60000);

  // Topbar Buttons
  document.getElementById('theme-btn').onclick=toggleTheme;
  document.getElementById('emergency-toggle').onclick=toggleEmergency;
  document.getElementById('settings-btn').onclick=()=>openModal('settings-modal');
  document.getElementById('export-data-btn').onclick=exportData;
  document.getElementById('reset-app-btn').onclick=resetApp;
  document.getElementById('request-notif-btn').onclick=()=>{
    requestNotificationPermission();
    const time=document.getElementById('notif-time').value;
    if(time){state.user.notificationTime=time;notificationTime=time;saveState();scheduleDailyNotification();}
  };
  document.getElementById('import-file').onchange=e=>{if(e.target.files[0])importData(e.target.files[0]);};
  document.getElementById('companion-body').onclick=companionClick;

  buildIconPicker();
  buildColorPicker();

  if('Notification' in window&&Notification.permission==='default'){
    setTimeout(()=>requestNotificationPermission(),5000);
  }

  // Pomodoro
  if(!state.settings.pomodoroSettings){
    state.settings.pomodoroSettings={workDuration:25,breakDuration:5,longBreakDuration:15,sessionsBeforeLongBreak:4,soundEnabled:true};
    saveState();
  }
  const circ=2*Math.PI*54;
  const ring=document.getElementById('pomodoro-ring');
  if(ring){ring.style.strokeDasharray=circ;ring.style.strokeDashoffset=0;}
  updatePomodoroDisplay();
  updatePomodoroUI();

  document.getElementById('pomo-work-input').value=state.settings.pomodoroSettings.workDuration;
  document.getElementById('pomo-break-input').value=state.settings.pomodoroSettings.breakDuration;
  document.getElementById('pomo-sound-toggle').checked=state.settings.pomodoroSettings.soundEnabled;

  // AI State
  loadGeminiKey();
  if(state.aiHistory&&state.aiHistory.length){
    aiState.messages=[...state.aiHistory];
  }
  renderAiMessages();
});

// ============================================================
//  WINDOW EXPORTS (GLOBAL SCOPE)
// ============================================================
window.showPage=showPage;
window.completeHabit=completeHabit;
window.completeOneRep=completeOneRep;
window.openSkipModal=openSkipModal;
window.confirmSkip=confirmSkip;
window.showAddHabitModal=showAddHabitModal;
window.saveHabit=saveHabit;
window.editHabit=editHabit;
window.deleteHabit=deleteHabit;
window.showAddRewardModal=showAddRewardModal;
window.saveReward=saveReward;
window.deleteReward=deleteReward;
window.redeemReward=redeemReward;
window.closeModal=closeModal;
window.toggleNotesPanel=toggleNotesPanel;
window.saveHabitNotes=saveHabitNotes;
window.pomodoroToggle=pomodoroToggle;
window.pomodoroReset=pomodoroReset;
window.pomodoroSkipSession=pomodoroSkipSession;
window.updatePomodoroSettings=updatePomodoroSettings;
window.aiSubmit=aiSubmit;
window.aiQuickSend=aiQuickSend;
window.saveGeminiKey=saveGeminiKey;
window.deleteGeminiKey=deleteGeminiKey;
window.clearAiHistory=clearAiHistory;
window.showGeminiKeyPrompt=showGeminiKeyPrompt;
window.goToStep=goToStep;
window.selectPriority=selectPriority;
window.updateCharCounter=updateCharCounter;
window.toggleOptionalNotes=toggleOptionalNotes;

// Dhikr Exports
window.selectDhikr=selectDhikr;
window.tasbeehIncrement=tasbeehIncrement;
window.setTasbeehTarget=setTasbeehTarget;
window.resetTasbeeh=resetTasbeeh;
window.toggleTasbeehSound=toggleTasbeehSound;
window.toggleTasbeehVibrate=toggleTasbeehVibrate;
window.showAddDhikrModal=showAddDhikrModal;
window.saveCustomDhikr=saveCustomDhikr;
window.deleteCustomDhikr=deleteCustomDhikr;
window.showDhikrMilestone=showDhikrMilestone;