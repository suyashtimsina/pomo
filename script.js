const $=id=>document.getElementById(id);
const def={focus:25,short:5,long:15,every:4,auto:false};
let cfg={...def};
try{const s=JSON.parse(localStorage.getItem('pomo-cfg')||'null');if(s)cfg={...def,...s};}catch(e){}
const msgs={focus:'time to focus ✿',short:'snack break ♡',long:'long rest, you earned it ☁'};
let mode='focus',left=cfg.focus*60,running=false,endAt=0,done=0,timer=null;

const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
function render(){
  $('time').textContent=fmt(left);
  $('msg').textContent=running?msgs[mode]:(left===cfg[mode]*60?msgs[mode]:'paused ☾');
  $('go').textContent=running?'pause':'start';
  $('timer').classList.toggle('running',running);
  const pr=(1-left/(cfg[mode]*60))*100;$('arc').style.strokeDasharray=pr+' 100';$('arc').style.opacity=pr>0.3?1:0;
  document.querySelectorAll('#modes button').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));
  document.title=(running?fmt(left)+' · ':'')+'Pomodoro ✿';
}
function setMode(m){pause();mode=m;left=cfg[m]*60;render();}
function start(){if(running)return;running=true;endAt=Date.now()+left*1000;timer=setInterval(tick,250);render();}
function pause(){running=false;clearInterval(timer);render();}
function tick(){
  left=Math.max(0,Math.round((endAt-Date.now())/1000));
  if(left<=0){beep();next(true);}else render();
}
function next(auto){
  pause();
  if(mode==='focus'){done++;mode=done%cfg.every===0?'long':'short';}else mode='focus';
  left=cfg[mode]*60;render();
  if(auto&&cfg.auto)start();
}
function beep(){
  try{
    const c=new (window.AudioContext||window.webkitAudioContext)();
    [660,880,1100].forEach((f,i)=>{
      const o=c.createOscillator(),g=c.createGain();
      o.type='sine';o.frequency.value=f;o.connect(g);g.connect(c.destination);
      const t=c.currentTime+i*.22;
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.25,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+.2);
      o.start(t);o.stop(t+.22);
    });
  }catch(e){}
}
$('go').onclick=()=>running?pause():start();
$('reset').onclick=()=>{pause();left=cfg[mode]*60;render();};
$('skip').onclick=()=>next(false);
document.querySelectorAll('#modes button').forEach(b=>b.onclick=()=>setMode(b.dataset.m));

// settings
const ids={focus:'sFocus',short:'sShort',long:'sLong',every:'sEvery'};
$('setBtn').onclick=()=>{
  for(const k in ids)$(ids[k]).value=cfg[k];
  $('sAuto').checked=cfg.auto;$('modal').classList.add('open');
};
$('cancel').onclick=()=>$('modal').classList.remove('open');
$('modal').onclick=e=>{if(e.target.id==='modal')$('modal').classList.remove('open');};
$('save').onclick=()=>{
  for(const k in ids){const v=parseInt($(ids[k]).value,10);if(v>0)cfg[k]=v;}
  cfg.auto=$('sAuto').checked;
  try{localStorage.setItem('pomo-cfg',JSON.stringify(cfg));}catch(e){}
  $('modal').classList.remove('open');
  if(!running){left=cfg[mode]*60;}
  render();
};

// full screen
const fsIcons={
  enter:'M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3',
  exit:'M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3'
};
$('fsBtn').onclick=async()=>{
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }catch(e){}
};
document.addEventListener('fullscreenchange',()=>{
  $('fsIcon').firstElementChild.setAttribute('d',document.fullscreenElement?fsIcons.exit:fsIcons.enter);
});

// camera
async function startCam(){
  $('camHint').textContent='asking your browser for the camera… allow it if a pop-up appears.';
  $('camTab').style.display='inline-block';
  $('camMsg').style.display='grid';
  try{
    const p=navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1920},height:{ideal:1080}},audio:false});
    p.then(st=>{$('cam').srcObject=st;$('camMsg').style.display='none';}).catch(()=>{});
    const s=await Promise.race([p,new Promise((_,r)=>setTimeout(()=>r({name:'Timeout'}),4000))]);
    $('cam').srcObject=s;$('camMsg').style.display='none';
  }catch(e){
    const n=e&&e.name;
    $('camHint').textContent=(n==='NotFoundError'||n==='OverconstrainedError')?'no camera was found on this device.':n==='NotReadableError'?'another app or tab is using your camera.':'the browser blocked the camera. Allow it in the address bar, or open this page in its own tab.';
    $('camTab').style.display=(n==='NotFoundError'||n==='NotReadableError')?'none':'inline-block';
    $('camHint').textContent+=' ['+(n||'unknown')+']';
    $('camMsg').style.display='grid';
  }
}
$('camBtn').onclick=startCam;
$('camTab').onclick=()=>window.open(location.href,'_blank');
startCam();
render();

// to-do list
let todos=[];
try{todos=JSON.parse(localStorage.getItem('pomo-todo')||'[]')||[];}catch(e){todos=[];}
const tsave=()=>{try{localStorage.setItem('pomo-todo',JSON.stringify(todos));}catch(e){}};
function trender(){
  const ul=$('tlist');ul.innerHTML='';
  todos.forEach((t,i)=>{
    const li=document.createElement('li');if(t.d)li.className='done';
    const cb=document.createElement('input');cb.type='checkbox';cb.checked=t.d;cb.onchange=()=>{t.d=cb.checked;tsave();trender();};
    const sp=document.createElement('span');sp.textContent=t.t;
    const x=document.createElement('button');x.textContent='×';x.setAttribute('aria-label','Delete task');x.onclick=()=>{todos.splice(i,1);tsave();trender();};
    li.append(cb,sp,x);ul.append(li);
  });
  const left2=todos.filter(t=>!t.d).length;
  $('tn').textContent=todos.length?'· '+left2:'';
  $('tempty').style.display=todos.length?'none':'block';
  $('tclear').style.display=todos.some(t=>t.d)?'inline-block':'none';
}
function tadd(){const v=$('tin').value.trim();if(!v)return;todos.push({t:v,d:false});$('tin').value='';tsave();trender();}
$('tadd').onclick=tadd;
$('tin').onkeydown=e=>{if(e.key==='Enter')tadd();};
$('tclear').onclick=()=>{todos=todos.filter(t=>!t.d);tsave();trender();};
$('ttog').onclick=()=>{const o=$('todo').classList.toggle('open');$('tarrow').textContent=o?'▾':'▴';if(o)setTimeout(()=>$('tin').focus(),250);};
trender();
