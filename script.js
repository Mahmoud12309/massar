// ============================================================
//  PWA + Service Worker
// ============================================================
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').catch(()=>{});
  (function(){const manifest={name:"مسار - تتبع العادات",short_name:"مسار",start_url:".",display:"standalone",background_color:"#FDF8F0",theme_color:"#2D6A4F",icons:[{src:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%232D6A4F'/%3E%3Ctext x='50' y='67' font-size='50' text-anchor='middle' fill='white' font-family='Arial'%3E⭐%3C/text%3E%3C/svg%3E",sizes:"any",type:"image/svg+xml"}]};const link=document.createElement('link');link.rel='manifest';link.href='data:application/manifest+json,'+encodeURIComponent(JSON.stringify(manifest));document.head.appendChild(link);})();
}

// ============================================================
//  CONSTANTS
// ============================================================
const KEY='habitTracker_v2';
let state=null;
let currentSkipHabitId=null;
let renderThrottle=null;
let notificationTime='09:00';
let notificationGranted=false;
let currentModalStep=0;
let currentPriority='medium';

const EMOJIS=['📚','🏃','💧','🧘','✍️','🎯','🌙','☀️','🍎','💪','🧠','🎵','🎨','🏋️','🚶','🌿'];
const COLORS=['#2D6A4F','#D4A017','#C0392B','#1A5276','#6C3483','#D35400','#1A7A4A','#784212'];
const BADGES_DEF=[
  {id:'first',name:'الأولى',emoji:'🌱',desc:'أكملت أول عادة'},
  {id:'week7',name:'أسبوع صلب',emoji:'🔥',desc:'7 أيام متتالية'},
  {id:'week30',name:'الصامد',emoji:'🏅',desc:'30 يوماً'},
  {id:'perfect5',name:'المثالي',emoji:'💯',desc:'5 أيام مثالية'},
  {id:'perfect10',name:'الأسطورة',emoji:'🦁',desc:'10 أيام مثالية'},
  {id:'points500',name:'الثري',emoji:'💰',desc:'500 نقطة'},
  {id:'points1000',name:'المليونير',emoji:'👑',desc:'1000 نقطة'},
  {id:'habits5',name:'المنظّم',emoji:'📋',desc:'5 عادات'},
  {id:'emergency',name:'المرن',emoji:'🆘',desc:'استخدم الطوارئ'},
  {id:'noSkip7',name:'بلا عذر',emoji:'🎯',desc:'7 أيام بلا تخطي'},
  {id:'weekChallenge',name:'بطل الأسبوع',emoji:'🏆',desc:'5 أيام مثالية في أسبوع'}
];

const GEMINI_SYSTEM_PROMPT = `أنت "زاد" — مساعد الإنتاجية الذكي لتطبيق مسار لتتبع العادات.
مهمتك: مساعدة المستخدم على:
١. اقتراح عادات يومية مفيدة وعملية
٢. تقسيم الأهداف الكبيرة إلى خطوات صغيرة قابلة للتنفيذ
٣. تقديم نصائح الإنتاجية بأسلوب ودي ومشجع
٤. الإجابة على أسئلة حول بناء العادات بعلم وثقة
قواعد:
- تحدث دائماً بالعربية الفصحى البسيطة
- اجعل ردودك موجزة (٣-٥ جمل كحد أقصى إلا عند الحاجة)
- ابدأ أحياناً بعبارة تشجيعية قصيرة
- إذا طُلب منك اقتراح عادات، قدّم ٣-٥ عادات على شكل قائمة مرقمة
- لا تخرج عن موضوع الإنتاجية والعادات والتطوير الشخصي`;

// ============================================================
//  AI STATE
// ============================================================


// ============================================================
//  POMODORO STATE (non-persisted)
// ============================================================
const pomodoroTimer = {
  intervalId: null,
  secondsLeft: 25 * 60,
  mode: 'work',
  sessionCount: 0,
  isRunning: false
};

// ============================================================
//  STATE MANAGEMENT
// ============================================================
function generateId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function todayStr(){return new Date().toISOString().slice(0,10)}
function getDay(offset=0){const d=new Date();d.setDate(d.getDate()+offset);return d.toISOString().slice(0,10)}

// میگریشن: إضافة الحقول الجديدة بشكل آمن مع الحفاظ على البيانات القديمة
function migrateState(s){
  // ترقية habits بإضافة الحقول الجديدة
  s.habits = (s.habits||[]).map(h=>({
    notes:'',
    repetitions:1,
    priority:'medium',
    ...h
  }));
  // ترقية الإعدادات
  if(!s.settings) s.settings={theme:'light',emergencyModeActive:false,language:'ar'};
  if(!s.settings.pomodoroSettings){
    s.settings.pomodoroSettings={workDuration:25,breakDuration:5,longBreakDuration:15,sessionsBeforeLongBreak:4,soundEnabled:true};
  }
  // سجل المحادثات
  if(!s.aiHistory) s.aiHistory=[];
  if(!s.pointsHistory) s.pointsHistory=[];
  // ترقية dailyLogs بإضافة repsCompleted
  Object.values(s.dailyLogs||{}).forEach(log=>{
    Object.keys(log.habits||{}).forEach(hid=>{
      const entry=log.habits[hid];
      if(entry.repsCompleted===undefined){
        const habit=s.habits.find(h=>h.id===hid);
        entry.repsCompleted = entry.status==='completed' ? (habit?.repetitions||1) : 0;
      }
    });
  });
  return s;
}

function loadState(){
  try{const s=localStorage.getItem(KEY);if(s)return migrateState(JSON.parse(s));}catch(e){}
  return null;
}

function saveState(){
  try{localStorage.setItem(KEY,JSON.stringify(state));}
  catch(e){showToast('❌ خطأ في الحفظ','error')}
}

function initDefaultState(name=''){
  return {
    user:{name,joinDate:todayStr(),totalPoints:0,level:1,openCount:0,notificationTime:'09:00'},
    habits:[],
    dailyLogs:{},
    rewards:[],
    badges:BADGES_DEF.map(b=>({...b,unlockedAt:null})),
    settings:{
      theme:'light',emergencyModeActive:false,language:'ar',
      pomodoroSettings:{workDuration:25,breakDuration:5,longBreakDuration:15,sessionsBeforeLongBreak:4,soundEnabled:true}
    },
    pointsHistory:[],
    aiHistory:[]
  };
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
    if(notificationGranted)new Notification('تذكير عاداتك اليومية 📋',{body:`حان وقت تسجيل عاداتك في ${notificationTime}`});
    scheduleDailyNotification();
  },timeout);
}
function showLocalNotification(title,body){
  if(notificationGranted)new Notification(title,{body});
}

// ============================================================
//  HELPERS
// ============================================================
function ensureToday(){
  const t=todayStr();
  if(!state.dailyLogs[t])state.dailyLogs[t]={habits:{},totalPoints:0,notes:'',perfectDay:false};
  saveState();
}

function unlockBadge(id){
  const badge=state.badges.find(b=>b.id===id);
  if(badge&&!badge.unlockedAt){
    badge.unlockedAt=new Date().toISOString();
    saveState();
    showToast(`🏅 شارة جديدة: ${badge.name}!`,'gold');
    showLocalNotification('شارة جديدة!',`حصلت على شارة ${badge.name}`);
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
  const weekPerfect=Object.entries(state.dailyLogs).slice(-7).filter(([,l])=>l.perfectDay).length;
  if(weekPerfect>=5)unlockBadge('weekChallenge');
  state.user.openCount=(state.user.openCount||0)+1;
  if(state.user.openCount>=30)unlockBadge('early');
  const newLevel=Math.floor(state.user.totalPoints/100)+1;
  if(newLevel>state.user.level){
    state.user.level=newLevel;
    showToast(`🎊 مستوى جديد! المستوى ${newLevel}`,'gold');
    showConfetti();
    showLocalNotification('ترقية!',`وصلت إلى المستوى ${newLevel}`);
  }
  saveState();
}

function addBonusPoints(pts,desc){
  state.user.totalPoints+=pts;
  state.pointsHistory.unshift({date:todayStr(),desc,pts,type:'bonus'});
  saveState();
  showToast(`🎉 +${pts} نقطة إضافية — ${desc}`,'gold');
}

// ============================================================
//  HABIT COMPLETION
// ============================================================
function completeHabit(habitId,status){
  const today=todayStr();
  if(!state.dailyLogs[today])state.dailyLogs[today]={habits:{},totalPoints:0,notes:'',perfectDay:false};
  const log=state.dailyLogs[today];
  if(log.habits[habitId])return;
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
  if(h.streak===7){addBonusPoints(50,'سلسلة 7 أيام! 🔥');unlockBadge('week7');}
  if(h.streak===30){addBonusPoints(200,'سلسلة 30 يوم! 🏅');unlockBadge('week30');}
  const allDone=state.habits.every(hb=>{const e=state.dailyLogs[today].habits[hb.id];return e&&(e.status==='completed'||e.status==='emergency');});
  if(allDone&&state.habits.length){
    log.perfectDay=true;addBonusPoints(25,'يوم مثالي! 💯');showConfetti();showCompanionMsg('🎉 يوم مثالي! أنت أسطورة!');
  }else showCompanionMsg('🌟 ممتاز! استمر');
  showToast(`⭐ +${pts} نقطة — ${h.name}`,'gold');
}

// دالة إكمال تكرار واحد (Feature 2)
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
  saveState();renderThrottled();closeModal('skip-modal');showToast('⏭️ تم التخطي','info');
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
//  FEATURE 1 — NOTES PER HABIT
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
//  RENDER
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
  renderRewards();
  updateCompanion();
  // لا نُعيد رسم Pomodoro هنا — حالة التايمر مستقلة
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
  document.getElementById('greeting').textContent=`${hh<12?'صباح الخير':hh<17?'مساء الخير':'مساء الخير'}, ${state.user.name} 👋`;
  const d=new Date();
  document.getElementById('date-display').textContent=`${['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'][d.getDay()]}، ${d.getDate()}`;
  const msgs=['كل يوم فرصة جديدة','الاستمرارية أقوى من الكمال','أنت تبني مستقبلك'];
  document.getElementById('daily-msg').textContent=`"${msgs[d.getDate()%msgs.length]}"`;
  const dailyH=state.habits.filter(h=>h.frequency==='daily');
  const completed=dailyH.filter(h=>log.habits[h.id]&&(log.habits[h.id].status==='completed'||log.habits[h.id].status==='emergency')).length;
  const pct=dailyH.length?Math.round(completed/dailyH.length*100):0;
  const circ=175.9;
  document.getElementById('ring-progress').style.strokeDashoffset=circ-(circ*pct/100);
  document.getElementById('ring-pct').textContent=pct+'%';
  const container=document.getElementById('habits-dashboard-list');
  if(!state.habits.length){
    container.innerHTML=`<div class="empty-state"><div class="empty-icon">🌱</div><p>لا توجد عادات</p><button class="btn btn-primary" onclick="showPage('habits');showAddHabitModal()">أضف أول عادة</button></div>`;
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
    const priorityBadge=priority==='high'?'<span class="priority-badge" title="أولوية عالية">🔴</span>':priority==='low'?'<span class="priority-badge" title="أولوية منخفضة" style="opacity:.6">🟢</span>':'';

    // منطق الأزرار
    let actions='';
    let repSection='';
    if(isDone){
      actions=`<button class="habit-btn done-state" disabled title="مكتملة">✅ مكتملة</button>`;
    }else if(isSkipped){
      actions=`<button class="habit-btn done-state" disabled title="تخطي">⏭️ تخطي</button>`;
    }else if(reps>1){
      // صناديق التكرار
      const boxesHtml=reps<=10
        ? Array.from({length:reps},(_,i)=>`<div class="rep-box ${i<repsCompleted?'filled':''}" onclick="${i>=repsCompleted?`completeOneRep('${h.id}')`:''}" title="${i<repsCompleted?'مكتمل':'انقر للتسجيل'}">${i<repsCompleted?'✓':''}</div>`).join('')
        : `<span style="font-size:.85rem;font-weight:700">${reps} ×</span>`;
      repSection=`<div style="margin-bottom:8px"><div class="rep-boxes">${boxesHtml}</div><div class="rep-progress-label">${repsCompleted}/${reps} مكتمل</div></div>`;
      actions=`<button class="habit-btn skip" onclick="openSkipModal('${h.id}')" title="تخطي">⏭️ تخطي</button>`;
    }else{
      actions=`<button class="habit-btn complete" onclick="completeHabit('${h.id}','completed')" title="إكمال العادة">✅ مكتملة</button>${em?`<button class="habit-btn emergency-action" onclick="completeHabit('${h.id}','emergency')" title="طوارئ">⚡ طوارئ</button>`:''}<button class="habit-btn skip" onclick="openSkipModal('${h.id}')" title="تخطي">⏭️ تخطي</button>`;
    }

    const hasNotes=(h.notes||'').trim().length>0;

    return `<div class="habit-card ${isDone?'completed':''}" style="--habit-color:${h.color}">
      <div class="habit-header">
        <div class="habit-emoji">${h.emoji}</div>
        <div class="habit-info">
          <div class="habit-name">${priorityBadge}${h.name}</div>
          <div class="habit-meta">
            <span>${em?h.miniTarget.value:h.target.value} ${(em?h.miniTarget.unit:h.target.unit)==='minutes'?'دقيقة':'مرة'}</span>
            ${h.streak>0?`<span class="streak-badge">🔥 ${h.streak}</span>`:''}
          </div>
        </div>
      </div>
      <div class="habit-progress-bar"><div class="habit-progress-fill" style="width:${isDone?100:reps>1?Math.round(repsCompleted/reps*100):0}%"></div></div>
      ${repSection}
      <div class="habit-actions">${actions}</div>
      <div class="habit-footer-row">
        <button class="notes-toggle-btn ${hasNotes?'has-notes':''}" id="notes-toggle-${h.id}" onclick="toggleNotesPanel('${h.id}')" title="ملاحظات العادة" aria-label="ملاحظات">📝</button>
        <span class="save-indicator" id="save-indicator-${h.id}">تم الحفظ ✓</span>
      </div>
      <div class="notes-panel" id="notes-panel-${h.id}">
        <textarea class="form-input" rows="3" placeholder="أضف ملاحظاتك هنا..." dir="rtl"
          style="font-size:.85rem;resize:none" aria-label="ملاحظات العادة"
          oninput="saveHabitNotes('${h.id}',this.value)">${h.notes||''}</textarea>
      </div>
    </div>`;
  }).join('');
}

function renderManageHabits(){
  const container=document.getElementById('habits-manage-list');
  if(!state.habits.length){container.innerHTML='<div class="empty-state"><div class="empty-icon">📋</div><p>أضف عاداتك</p></div>';return;}
  container.innerHTML=state.habits.map(h=>`
    <div class="habits-list-item">
      <span style="font-size:1.3rem">${h.emoji}</span>
      <div style="flex:1">
        <div style="font-weight:700">${h.name}</div>
        <div style="font-size:.72rem;color:var(--text3)">${h.type==='bad'?'🚫 تقليل':'✅ بناء'} · 🔥 ${h.streak} · ${h.repetitions>1?`${h.repetitions}× `:''} ${h.priority==='high'?'🔴':h.priority==='low'?'🟢':''}</div>
      </div>
      <div class="habits-list-actions">
        <button class="small-action-btn" onclick="editHabit('${h.id}')" title="تعديل" aria-label="تعديل">✏️</button>
        <button class="small-action-btn delete" onclick="deleteHabit('${h.id}')" title="حذف" aria-label="حذف">🗑️</button>
      </div>
    </div>`).join('');
}

function renderRewards(){
  document.getElementById('reward-pts-display').textContent=state.user.totalPoints;
  document.getElementById('reward-level').textContent=state.user.level;
  const lvlPct=Math.min(100,(state.user.totalPoints%(state.user.level*100))/(state.user.level*100)*100);
  document.getElementById('level-bar-fill').style.width=lvlPct+'%';
  document.getElementById('badges-grid').innerHTML=state.badges.map(b=>`<div class="badge-item ${b.unlockedAt?'':'locked'}"><div class="badge-emoji">${b.emoji}</div><div class="badge-name">${b.name}</div><div class="badge-desc">${b.desc}</div>${b.unlockedAt?`<div style="font-size:.6rem;color:var(--text3)">${b.unlockedAt.slice(0,10)}</div>`:''}</div>`).join('');
  const rl=document.getElementById('rewards-list');
  if(!state.rewards.length)rl.innerHTML='<div class="empty-state"><div class="empty-icon">🎁</div><p>أضف مكافآت</p></div>';
  else rl.innerHTML=state.rewards.map(r=>`<div class="reward-card"><div class="reward-emoji-big">${r.emoji}</div><div class="reward-info"><div style="font-weight:700">${r.name}</div><div class="reward-cost">⭐ ${r.cost}</div></div><button class="btn btn-primary" style="padding:6px 12px" onclick="redeemReward('${r.id}')">استبدل</button><button class="small-action-btn delete" onclick="deleteReward('${r.id}')" title="حذف">🗑️</button></div>`).join('');
  const ph=document.getElementById('points-history-list');
  if(!state.pointsHistory.length)ph.innerHTML='<div class="empty-state"><p>لا يوجد سجل</p></div>';
  else ph.innerHTML=state.pointsHistory.slice(0,20).map(h=>`<div class="history-item"><div class="history-icon">${h.type==='bonus'?'🎉':'✅'}</div><div><div style="font-weight:600">${h.desc}</div><div style="font-size:.7rem;color:var(--text3)">${h.date}</div></div><div class="history-pts">+${h.pts}</div></div>`).join('');
}

function renderAnalytics(){
  const allStreaks=state.habits.map(h=>h.longestStreak);
  const perfectDays=Object.values(state.dailyLogs).filter(l=>l.perfectDay).length;
  let bestHabit='-';
  if(state.habits.length){let bestStreak=0;state.habits.forEach(h=>{if(h.streak>bestStreak){bestStreak=h.streak;bestHabit=h.name;}});}
  document.getElementById('analytics-stats').innerHTML=`<div class="stat-card"><div class="stat-value">${allStreaks.length?Math.max(...allStreaks):0}</div><div class="stat-label">أطول سلسلة</div></div><div class="stat-card"><div class="stat-value">${perfectDays}</div><div class="stat-label">أيام مثالية</div></div><div class="stat-card"><div class="stat-value">${state.user.totalPoints}</div><div class="stat-label">إجمالي النقاط</div></div><div class="stat-card"><div class="stat-value">${state.user.level}</div><div class="stat-label">المستوى</div></div><div class="stat-card"><div class="stat-value">${Math.round((Object.values(state.dailyLogs).filter(l=>Object.values(l.habits||{}).some(e=>e.status==='completed')).length/(Object.keys(state.dailyLogs).length||1))*100)}%</div><div class="stat-label">نسبة النجاح</div></div><div class="stat-card"><div class="stat-value" style="font-size:1rem">${bestHabit}</div><div class="stat-label">العادة الأقوى</div></div>`;
  const wb=document.getElementById('week-bars');
  const days=['ح','ن','ث','ر','خ','ج','س'];
  const weekData=[];
  for(let i=6;i>=0;i--){const d=getDay(-i);const log=state.dailyLogs[d];const dailyH=state.habits.length||1;let done=0;if(log&&log.habits)done=Object.values(log.habits).filter(e=>e.status==='completed'||e.status==='emergency').length;weekData.push({day:days[new Date(d).getDay()],pct:Math.round(done/dailyH*100)});}
  const maxPct=Math.max(...weekData.map(d=>d.pct),1);
  wb.innerHTML=weekData.map(d=>`<div style="flex:1;text-align:center"><div style="font-size:.65rem">${d.pct}%</div><div class="week-bar ${d.pct===maxPct&&d.pct>0?'best':''}" style="height:${Math.max(4,d.pct/maxPct*80)}px"><span class="week-bar-label">${d.day}</span></div></div>`).join('');
  drawHeatmap();drawPointsChart();renderInsights();
}

function drawHeatmap(){
  const container=document.getElementById('heatmap-container');
  const days=[];
  for(let i=89;i>=0;i--){const date=getDay(-i);const log=state.dailyLogs[date];let intensity=0;if(log){const habits=state.habits.length||1;const done=Object.values(log.habits||{}).filter(e=>e.status==='completed'||e.status==='emergency').length;intensity=Math.floor((done/habits)*4);}days.push({date,intensity});}
  container.innerHTML=days.map(d=>`<div class="heatmap-day" data-intensity="${d.intensity}" title="${d.date}"></div>`).join('');
}

function drawPointsChart(){
  const canvas=document.getElementById('points-chart');
  const ctx=canvas.getContext('2d');
  canvas.width=canvas.offsetWidth||320;canvas.height=120;
  const logs=Object.entries(state.dailyLogs).sort((a,b)=>a[0].localeCompare(b[0])).slice(-14);
  if(!logs.length)return;
  const pts=logs.map(([,l])=>l.totalPoints||0);
  const maxP=Math.max(...pts,1);const w=canvas.width,h=canvas.height,pad=20;
  ctx.clearRect(0,0,w,h);
  const step=(w-pad*2)/(pts.length-1||1);
  const green=getComputedStyle(document.documentElement).getPropertyValue('--green').trim()||'#2D6A4F';
  ctx.beginPath();ctx.strokeStyle=green;ctx.lineWidth=2.5;
  pts.forEach((p,i)=>{const x=pad+i*step;const y=h-pad-(p/maxP)*(h-pad*2);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.stroke();
  ctx.fillStyle=green+'33';ctx.beginPath();
  pts.forEach((p,i)=>{const x=pad+i*step;const y=h-pad-(p/maxP)*(h-pad*2);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.lineTo(pad+(pts.length-1)*step,h-pad);ctx.lineTo(pad,h-pad);ctx.fill();
  pts.forEach((p,i)=>{const x=pad+i*step;const y=h-pad-(p/maxP)*(h-pad*2);ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fillStyle=green;ctx.fill();});
}

function renderInsights(){
  document.getElementById('insights-section').innerHTML='<div class="insight-card"><div class="insight-icon">💡</div><div class="insight-text">استمر في تسجيل عاداتك لتحصل على تحليلات أعمق.</div></div>';
}

// ============================================================
//  COMPANION
// ============================================================
function showCompanionMsg(msg){const bubble=document.getElementById('companion-bubble');bubble.textContent=msg;bubble.classList.add('show');setTimeout(()=>bubble.classList.remove('show'),4000);}
function updateCompanion(){document.getElementById('zad-mouth').setAttribute('d','M24 27 Q30 32 36 27');}
function companionClick(){showCompanionMsg('أنت رائع! استمر 🔥');}

// ============================================================
//  FEATURE 3 — HABIT MODAL STEPS
// ============================================================
function goToStep(n){
  if(n===1){
    const name=document.getElementById('habit-name-input').value.trim();
    if(!name){
      const inp=document.getElementById('habit-name-input');
      inp.classList.add('shake');setTimeout(()=>inp.classList.remove('shake'),400);
      inp.style.borderColor='var(--red)';setTimeout(()=>inp.style.borderColor='',800);
      showToast('أدخل اسم العادة أولاً','info');return;
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
    btn.className='priority-pill';
    if(x===p)btn.classList.add(`active-${x}`);
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

// ============================================================
//  HABIT CRUD
// ============================================================
function saveHabit(){
  const name=document.getElementById('habit-name-input').value.trim();
  if(!name){showToast('أدخل الاسم','info');return;}
  const id=document.getElementById('edit-habit-id').value;
  const data={
    name,
    type:document.getElementById('habit-type-input').value,
    emoji:document.getElementById('habit-emoji-input')?.value||'⭐',
    color:document.getElementById('habit-color-input')?.value||'#2D6A4F',
    target:{value:parseInt(document.getElementById('habit-target-input').value)||1,unit:document.getElementById('habit-unit-input').value},
    miniTarget:{value:parseInt(document.getElementById('habit-mini-input').value)||1,unit:document.getElementById('habit-mini-unit-input').value},
    frequency:'daily',
    repetitions:Math.min(50,Math.max(1,parseInt(document.getElementById('habit-reps-input').value)||1)),
    priority:document.getElementById('habit-priority-input').value||'medium',
    notes:''
  };
  if(id){
    const idx=state.habits.findIndex(x=>x.id===id);
    if(idx>-1){
      // حفظ الملاحظات الموجودة عند التعديل
      data.notes=state.habits[idx].notes||'';
      state.habits[idx]={...state.habits[idx],...data};
    }
  }else{
    state.habits.push({...data,id:generateId(),createdAt:todayStr(),streak:0,longestStreak:0});
  }
  saveState();renderThrottled();closeModal('habit-modal');
  showToast(`${id?'تم التعديل':'تمت الإضافة'}`,'success');
}

function deleteHabit(id){
  if(confirm('حذف العادة نهائياً؟')){
    state.habits=state.habits.filter(x=>x.id!==id);
    saveState();renderThrottled();showToast('تم الحذف','info');
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
  document.getElementById('habit-type-input').value=h.type;
  document.getElementById('habit-target-input').value=h.target.value;
  document.getElementById('habit-unit-input').value=h.target.unit;
  document.getElementById('habit-mini-input').value=h.miniTarget.value;
  document.getElementById('habit-mini-unit-input').value=h.miniTarget.unit;
  document.getElementById('habit-reps-input').value=h.repetitions??1;
  document.getElementById('habit-emoji-input').value=h.emoji;
  document.getElementById('habit-color-input').value=h.color;
  selectPriority(h.priority||'medium');
  buildEmojiPicker();buildColorPicker();
  openModal('habit-modal');
}

function showAddHabitModal(){
  currentModalStep=0;
  document.querySelectorAll('.modal-step').forEach((s,i)=>{s.classList.toggle('active',i===0);});
  document.querySelectorAll('[id^=sdot-]').forEach((d,i)=>{d.classList.toggle('active',i===0);});
  document.getElementById('edit-habit-id').value='';
  document.getElementById('habit-name-input').value='';
  updateCharCounter(0);
  document.getElementById('habit-type-input').value='good';
  document.getElementById('habit-target-input').value='1';
  document.getElementById('habit-unit-input').value='times';
  document.getElementById('habit-mini-input').value='1';
  document.getElementById('habit-mini-unit-input').value='times';
  document.getElementById('habit-reps-input').value='1';
  document.getElementById('habit-emoji-input').value='📚';
  document.getElementById('habit-color-input').value='#2D6A4F';
  selectPriority('medium');
  buildEmojiPicker();buildColorPicker();
  openModal('habit-modal');
}

function buildEmojiPicker(){
  const container=document.getElementById('habit-emoji-picker');
  if(!container)return;
  const current=document.getElementById('habit-emoji-input').value;
  container.innerHTML='';
  EMOJIS.forEach(e=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='emoji-opt'+(e===current?' selected':'');
    btn.textContent=e;
    btn.onclick=()=>{
      container.querySelectorAll('.emoji-opt').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('habit-emoji-input').value=e;
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

// ============================================================
//  REWARDS
// ============================================================
function saveReward(){
  const name=document.getElementById('reward-name-input').value.trim();
  if(!name)return;
  state.rewards.push({id:generateId(),name,emoji:document.getElementById('reward-emoji-input').value||'🎁',cost:parseInt(document.getElementById('reward-cost-input').value)||100,redeemedCount:0});
  saveState();renderThrottled();closeModal('reward-modal');
}

function deleteReward(id){
  if(confirm('حذف المكافأة؟')){state.rewards=state.rewards.filter(x=>x.id!==id);saveState();renderThrottled();}
}

function redeemReward(id){
  const r=state.rewards.find(x=>x.id===id);
  if(!r)return;
  if(state.user.totalPoints<r.cost){showToast('نقاط غير كافية','info');return;}
  if(confirm(`استبدال "${r.name}" بـ ${r.cost} نقطة؟`)){
    state.user.totalPoints-=r.cost;r.redeemedCount++;
    state.pointsHistory.unshift({date:todayStr(),desc:`استبدل: ${r.name}`,pts:-r.cost,type:'redeem'});
    saveState();renderThrottled();showConfetti();showToast(`🎉 استمتع بـ ${r.name}!`,'gold');
  }
}

function showConfetti(){
  const wrap=document.getElementById('confetti-wrap');
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
//  DATA IMPORT / EXPORT
// ============================================================
function exportData(){
  const dataStr=JSON.stringify(state,null,2);
  const blob=new Blob([dataStr],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`habit-tracker-backup-${todayStr()}.json`;a.click();URL.revokeObjectURL(url);
  showToast('تم تصدير البيانات','success');
}

function importData(file){
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const imported=JSON.parse(e.target.result);
      if(imported.habits&&imported.user){state=migrateState(imported);saveState();renderThrottled();showToast('تم استيراد البيانات بنجاح','success');}
      else throw new Error();
    }catch(err){showToast('ملف غير صالح','error');}
  };
  reader.readAsText(file);
}

function resetApp(){
  if(confirm('⚠️ سيتم مسح كل البيانات نهائياً. هل أنت متأكد؟')){localStorage.removeItem(KEY);location.reload();}
}

// ============================================================
//  UI HELPERS
// ============================================================
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}

let toastTimer=null;
function showToast(msg,type='info'){
  const t=document.getElementById('toast');
  t.textContent=msg;t.className=`toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),3000);
}

function showPage(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.getElementById(`nav-${page}`).classList.add('active');
  if(page==='analytics')renderAnalytics();
  if(page==='pomodoro'){
    // تهيئة عرض الداشبورد داخل pomodoro
    updatePomodoroDisplay();updatePomodoroUI();
  }
  if(page==='ai'&&!localStorage.getItem('massar_gemini_key')){
    setTimeout(()=>showGeminiKeyPrompt(),300);
  }
}

function toggleTheme(){
  if(!state)return;
  state.settings.theme=state.settings.theme==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',state.settings.theme);
  document.getElementById('theme-btn').textContent=state.settings.theme==='dark'?'☀️':'🌙';
  saveState();
}

function toggleEmergency(){
  state.settings.emergencyModeActive=!state.settings.emergencyModeActive;
  saveState();renderThrottled();
  showToast(state.settings.emergencyModeActive?'🆘 وضع الطوارئ مفعل':'✅ وضع الطوارئ معطل','info');
}

function applyTheme(){
  const t=state?.settings?.theme||'light';
  document.documentElement.setAttribute('data-theme',t);
  document.getElementById('theme-btn').textContent=t==='dark'?'☀️':'🌙';
}

// ============================================================
//  FEATURE 4 — POMODORO TIMER
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
  pomodoroPlaySound();
  if(pomodoroTimer.mode==='work'){
    pomodoroTimer.sessionCount++;
    pomodoroTimer.mode=(pomodoroTimer.sessionCount%state.settings.pomodoroSettings.sessionsBeforeLongBreak===0)?'longBreak':'break';
  }else{
    pomodoroTimer.mode='work';
  }
  pomodoroTimer.secondsLeft=getPomodoroSeconds(pomodoroTimer.mode);
  updatePomodoroDisplay();updatePomodoroUI();
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
  document.title=pomodoroTimer.isRunning?`${m}:${s} — مسار`:'مسار';
}

function pomodoroPlaySound(){
  try{
    if(!state.settings.pomodoroSettings.soundEnabled)return;
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.frequency.value=880;
    gain.gain.setValueAtTime(0.3,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.8);
    osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.8);
  }catch(e){}
}

function pomodoroToggle(){
  pomodoroTimer.isRunning?pomodoroPause():pomodoroStart();
}

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

function updatePomodoroUI(){
  const btn=document.getElementById('pomodoro-main-btn');
  if(!btn)return;
  btn.textContent=pomodoroTimer.isRunning?'⏸️ إيقاف مؤقت':'▶️ ابدأ';
  const modeLabel=document.getElementById('pomodoro-mode-label');
  if(modeLabel){
    const modeMap={work:{text:'⚡ وقت التركيز',cls:''},break:{text:'☕ وقت الراحة',cls:'break'},longBreak:{text:'🛌 راحة طويلة',cls:'longBreak'}};
    modeLabel.textContent=modeMap[pomodoroTimer.mode].text;
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

// إيقاف التايمر عند إخفاء التبويب
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&pomodoroTimer.isRunning){
    // نحتفظ بالوقت دون إيقاف التايمر
  }
});

// ============================================================
//  FEATURE 5 — GEMINI AI ASSISTANT
// ============================================================


// --- إعدادات النظام والذكاء الاصطناعي ---
const aiState = {
    messages: [],
    isLoading: false,
    sendLock: false,
    // المعلومات الخاصة بمشروعك من جوجل
    apiKey: "AIzaSyAcu9AvcNsL2vQRIYy-DaDDRHHl--SCnBA",
    projectNumber: "532269150823",
    modelName: "gemini-2.5-flash" 
};

// --- وظائف الواجهة (UI) ---

function renderAiMessages() {
    const container = document.getElementById('ai-messages-list');
    if (!container) return;

    if (aiState.messages.length === 0 && !aiState.isLoading) {
        container.innerHTML = `
            <div class="ai-welcome">
                <div style="font-size:2.5rem;margin-bottom:10px">🤖</div>
                <div style="font-weight:800;font-size:1.2rem;color:var(--primary)">مرحباً! أنا زاد</div>
                <p style="color:var(--text3);font-size:0.9rem">كيف يمكنني مساعدتك في تنظيم يومك اليوم؟</p>
                <div class="ai-suggestions">
                    ${['جدول دراسي مقترح', 'كيف أتخلص من التسويف؟', 'نصيحة لزيادة التركيز'].map(s => 
                        `<button class="ai-suggestion-chip" onclick="aiQuickSend('${s}')">${s}</button>`
                    ).join('')}
                </div>
            </div>`;
        return;
    }

    let html = aiState.messages.map(m => `
        <div class="ai-msg ai-msg--${m.role === 'user' ? 'user' : 'assistant'}">
            ${m.role !== 'user' ? '<div class="ai-avatar">🤖</div>' : ''}
            <div class="ai-bubble">${formatText(m.text)}</div>
            ${m.role === 'user' ? '<div class="ai-avatar ai-avatar--user">👤</div>' : ''}
        </div>`).join('');

    if (aiState.isLoading) {
        html += `<div class="ai-msg ai-msg--assistant"><div class="ai-avatar">🤖</div><div class="ai-bubble ai-typing"><span></span><span></span><span></span></div></div>`;
    }

    container.innerHTML = html;
    scrollAiToBottom();
}

function formatText(text) {
    return text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // تحويل النص العريض
        .replace(/^\s*[\-\*]\s+(.*)$/gm, '• $1'); // تحويل القوائم النقطية
}

function scrollAiToBottom() {
    const container = document.getElementById('ai-messages-list');
    if (container) container.scrollTop = container.scrollHeight;
}

// --- وظائف الاتصال بـ API ---

async function sendToGemini(userMessage) {
    if (!aiState.apiKey) {
        console.error("API Key is missing!");
        return;
    }

    aiState.isLoading = true;
    renderAiMessages();

    // تجهيز تاريخ المحادثة ليرسله للـ API (Context)
    const contents = [
        { role: 'user', parts: [{ text: `تعليمات النظام: ${GEMINI_SYSTEM_PROMPT}` }] },
        { role: 'model', parts: [{ text: "فهمت، أنا زاد جاهز لمساعدتك." }] }
    ];

    // إضافة الرسائل السابقة (بحد أقصى آخر 6 رسائل لتوفير الاستهلاك)
    aiState.messages.slice(-6).forEach(m => {
        contents.push({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
        });
    });

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiState.modelName}:generateContent?key=${aiState.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "خطأ في الاتصال بالسيرفر");
        }

        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "عذراً، لم أستطع توليد رد حالياً.";
        
        aiState.messages.push({ role: 'model', text: replyText });

        // حفظ السجل إذا كان لديك نظام حفظ محلي
        if (typeof saveState === 'function') saveState();

    } catch (err) {
        aiState.messages.push({ 
            role: 'model', 
            text: `❌ خطأ تقني: ${err.message}. يرجى التحقق من اتصالك بالإنترنت.` 
        });
    } finally {
        aiState.isLoading = false;
        aiState.sendLock = false;
        renderAiMessages();
    }
}

// --- وظائف التحكم في الإرسال ---

function aiSubmit() {
    if (aiState.sendLock) return;
    
    const input = document.getElementById('ai-input');
    const text = (input.value || '').trim();
    
    if (!text) return;

    aiState.sendLock = true;
    aiState.messages.push({ role: 'user', text: text });
    
    input.value = '';
    input.style.height = 'auto';
    
    renderAiMessages();
    sendToGemini(text);
}

function aiQuickSend(text) {
    if (aiState.sendLock) return;
    
    aiState.sendLock = true;
    aiState.messages.push({ role: 'user', text: text });
    
    renderAiMessages();
    sendToGemini(text);
}

// تفريغ الشات
function clearAiHistory() {
    aiState.messages = [];
    renderAiMessages();
}



// ============================================================
//  INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded',()=>{
  state=loadState();
  if(!state){state=initDefaultState('');saveState();}
  else{
    // ترقية حقول المستخدم القديمة
    if(!state.user.notificationTime)state.user.notificationTime='09:00';
    if(!state.badges.some(b=>b.id==='weekChallenge'))state.badges.push({id:'weekChallenge',name:'بطل الأسبوع',emoji:'🏆',desc:'5 أيام مثالية',unlockedAt:null});
    saveState();
  }

  applyTheme();
  ensureToday();
  checkMissedHabits();
  renderThrottled();
  setInterval(()=>renderThrottled(),60000);

  // أزرار الإعدادات
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

  buildEmojiPicker();buildColorPicker();

  if('Notification' in window&&Notification.permission==='default'){
    setTimeout(()=>requestNotificationPermission(),5000);
  }

  // === تهيئة Pomodoro ===
  if(!state.settings.pomodoroSettings){
    state.settings.pomodoroSettings={workDuration:25,breakDuration:5,longBreakDuration:15,sessionsBeforeLongBreak:4,soundEnabled:true};
    saveState();
  }
  const circ=2*Math.PI*54;
  const ring=document.getElementById('pomodoro-ring');
  if(ring){ring.style.strokeDasharray=circ;ring.style.strokeDashoffset=0;}
  updatePomodoroDisplay();updatePomodoroUI();

  // مزامنة إعدادات Pomodoro مع الحقول
  document.getElementById('pomo-work-input').value=state.settings.pomodoroSettings.workDuration;
  document.getElementById('pomo-break-input').value=state.settings.pomodoroSettings.breakDuration;
  document.getElementById('pomo-sound-toggle').checked=state.settings.pomodoroSettings.soundEnabled;

  // === تهيئة AI ===
  if(state.aiHistory&&state.aiHistory.length){
    aiState.messages=[...state.aiHistory];
  }
  renderAiMessages();
});

// ============================================================
//  WINDOW EXPORTS
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
window.showAddRewardModal=()=>openModal('reward-modal');
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
window.clearAiHistory=clearAiHistory;
window.showGeminiKeyPrompt=showGeminiKeyPrompt;
window.goToStep=goToStep;
window.selectPriority=selectPriority;
window.updateCharCounter=updateCharCounter;
window.toggleOptionalNotes=toggleOptionalNotes;
