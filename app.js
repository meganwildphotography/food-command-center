/* Food Command Center: UI */
(function(){
'use strict';
var KEY='fcc-megan-v1';
var F=window.FCC;
var S, UI={view:'home',invTab:'fridge',feed:{energy:50,time:30,sources:['pantry','fridge','freezer']},feedResult:null,feedExclude:[],tonightExclude:[],make:null,leftover:null,markPlan:null,markDays:3,markTpl:null,lunchKid:'kaden',lunch:{},editInv:null,checkItem:null,checkPrice:'',welcome:false,routineMsgs:[],deferredInstall:null};
var PCOL={mark:'orange',kaden:'pink',winter:'pink',megan:'gold'};
var PEMO={mark:'👨',kaden:'🧒',winter:'👧',megan:'👩'};
function h(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function money(n){return '$'+Number(n||0).toFixed(2);}
function load(){
  try{var raw=localStorage.getItem(KEY);if(raw){var s=JSON.parse(raw);if(s&&s.inventory)return s;}}catch(e){}
  return F.seed();
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){toast('Couldn’t save on this device (storage full or private mode).');}}
var undoSnap=null,toastTimer=null;
function snap(){undoSnap=JSON.stringify(S);}
function toast(msg,withUndo){
  var t=document.getElementById('toast');
  t.innerHTML='<span class="msg">'+h(msg)+'</span>'+(withUndo&&undoSnap?'<button class="btn sm yellow" data-act="undo">Undo</button>':'');
  t.classList.remove('hide');clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.add('hide');},withUndo?6500:3800);
}
function go(v){UI.view=v;if(location.hash!=='#'+v)history.replaceState(null,'','#'+v);render();window.scrollTo(0,0);}
function today(){return new Date();}

/* ---------- shared bits ---------- */
function tellBox(id,ph){
  return '<form class="tell" data-form="tell" data-ctx="'+id+'"><input id="tell-'+id+'" autocomplete="off" placeholder="'+h(ph)+'" aria-label="Tell me">'+
    '<button type="button" class="mic" data-act="mic" data-target="tell-'+id+'" aria-label="Speak">🎤</button><button class="go" type="submit">Go</button></form>';
}
function platesHTML(plates,mealId,showWont){
  return '<div class="plates">'+F.PEOPLE_ORDER.map(function(p){var pl=plates[p];
    return '<div class="plate-row" style="--c:var(--'+PCOL[p]+')"><span class="nm">'+PEMO[p]+' '+h(S.people[p].name)+'</span><span class="tx">'+h(pl.text)+(pl.backup?' <span class="small muted">(backup plate, since they skip this one)</span>':'')+'</span>'+
      (showWont&&!pl.backup?'<button class="wont" data-act="reject" data-p="'+p+'" data-m="'+mealId+'">Won’t eat that'+(pl.count?' ('+pl.count+')':'')+'</button>':'')+'</div>';}).join('')+'</div>';
}
function stepsHTML(steps){return '<ol class="steps">'+steps.map(function(s){return '<li>'+h(s)+'</li>';}).join('')+'</ol>';}
function missHTML(miss){if(!miss||!miss.length)return '';return '<div class="row" style="margin:6px 0"><span class="miss">Missing: '+miss.map(function(k){return h(F.KEY_NAME[k]||k);}).join(', ')+'</span><button class="btn sm blue" data-act="addmiss" data-keys="'+miss.join(',')+'">+ Add to list</button></div>';}
function qtyClass(q){if(typeof q==='number')return 'q-num';if(q==='Lots')return 'q-Lots';if(q==='Some')return 'q-Some';if(q==='Almost out')return 'q-Almost';return 'q-1';}

function tonight(){
  var d=today();
  if(S.tonight&&S.tonight.date===F.ymd(d)&&F.MEAL_BY_ID[S.tonight.mealId]){var m=F.MEAL_BY_ID[S.tonight.mealId];return {meal:m,plates:F.platesFor(S,m),steps:m.steps,missing:F.missingFor(m,F.haveFn(S)),why:[],locked:true};}
  return F.recommend(S,{energy:50,time:60,date:d,exclude:UI.tonightExclude});
}

/* ---------- HOME ---------- */
function vHome(){
  var d=today(),t=tonight(),out='';
  out+='<div class="top"><div><h1>🍽️ Food Command Center</h1><div class="hi">'+F.DAYS[d.getDay()]+', '+d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' · I’ve got you, Megan 💛</div></div></div>';
  if(UI.welcome){out+='<div class="welcome"><h2>Welcome back. Here’s what needs attention.</h2>'+F.attention(S,d).map(function(a){return '<div class="att"><span class="dot" style="--c:var(--'+a.color+')"></span>'+h(a.text)+'</div>';}).join('')+'<button class="btn sm ghost" style="margin-top:8px" data-act="dismisswelcome">Got it 👍</button></div>';}
  out+='<button class="giant g-feed" data-go="feed">🍽️ FEED EVERYBODY<span class="sub">Tap energy + time and I’ll give you ONE answer</span></button>';
  out+='<div class="grid2" style="margin-bottom:12px"><button class="giant g-need" data-go="shop">🛒 WHAT DO I NEED?<span class="sub">'+S.shopping.filter(function(s){return !s.checked;}).length+' on the list</span></button><button class="giant g-mark" data-go="mark">💪 FEED MARK<span class="sub">'+(F.markToday(S,d).off?'Day off today':'Work day')+'</span></button></div>';
  out+='<div class="card tonight"><span class="badge on-dark" style="--c:var(--purple)">Tonight’s dinner'+(t.locked?' · locked in ✅':'')+'</span>';
  if(t.meal){out+='<div class="big-title">'+t.meal.emoji+' '+h(t.meal.name)+'</div><div class="muted">'+t.meal.time+' min'+(t.why&&t.why.length?' · '+h(t.why.join(' · ')):'')+'</div>'+missHTML(t.missing)+
    '<div class="row" style="margin-top:10px"><button class="btn purple" data-act="showtonight">📋 Show me the steps</button>'+(t.locked?'<button class="btn ghost" data-act="unlock">Change</button>':'<button class="btn green" data-act="lock" data-m="'+t.meal.id+'">✅ Doing this</button><button class="btn ghost" data-act="tonightelse">🔄 Something else</button>')+'</div>';}
  else out+='<div style="font-weight:700">'+h(t.message)+'</div>';
  out+='</div>';
  if(t.meal){out+='<div class="people">'+F.PEOPLE_ORDER.map(function(p){var pl=t.plates[p];var meta='';
    if(p==='mark')meta=F.markToday(S,d).off?'Off today (Tue & Wed off)':'Work day · off Tue & Wed';
    if(p==='kaden')meta='Protein + carb + ketchup';
    if(p==='winter')meta='Corn + apples are her favorites';
    if(p==='megan')meta='Ideal: steak + potato';
    return '<div class="person" style="--c:var(--'+PCOL[p]+')"><div class="who">'+PEMO[p]+' '+h(S.people[p].name)+'</div><div class="plate">'+h(pl.text)+'</div><div class="meta">'+h(meta)+'</div>'+
      (p==='megan'&&S.settings.showHealthNote?'<details><summary class="small">💧 optional note</summary><div class="small muted">'+h(S.people.megan.healthNote)+'</div></details>':'')+
      (pl.backup?'<div class="meta">Backup plate 👍</div>':'<button class="wont" data-act="reject" data-p="'+p+'" data-m="'+t.meal.id+'">Won’t eat that'+(pl.count?' ('+pl.count+')':'')+'</button>')+'</div>';}).join('')+'</div>';}
  var soon=S.inventory.filter(function(i){return i.useSoon&&!F.isOut(i);});
  var lab=S.inventory.filter(function(i){return i.labelMe;});
  out+='<div class="card c-yellow"><span class="badge">🟨 Use first</span>'+lab.map(function(i){return '<div class="item"><span class="nm">🏷️ '+h(i.name)+'<span class="why">'+h(i.loc)+' · what is it?</span></span><button class="btn sm icy" data-act="invrename" data-id="'+i.id+'">Label it</button></div>';}).join('')+(soon.length?soon.map(function(i){return '<div class="item"><span class="nm">'+h(i.name)+'<span class="why">'+h(i.loc)+'</span></span><button class="btn sm" data-act="usedlast" data-id="'+i.id+'">Used it up</button></div>';}).join(''):'<div class="empty">Nothing urgent. Nice. ✨</div>')+'</div>';
  var open=S.shopping.filter(function(s){return !s.checked;});
  out+='<div class="card c-blue"><div class="between"><span class="badge">🛒 Shopping</span><span class="muted small">'+open.length+' items</span></div>'+(UI.routineMsgs.length?'<div class="small" style="color:#fde68a;font-weight:700;margin-bottom:4px">'+UI.routineMsgs.map(h).join('<br>')+'</div>':'')+(open.length?open.slice(0,6).map(function(s){return '<div class="item"><span class="nm">'+h(s.name)+'<span class="why">'+h(s.store)+(s.why?' · '+h(s.why):'')+'</span></span></div>';}).join(''):'<div class="empty">List is empty 🎉</div>')+'<button class="btn full blue" style="margin-top:8px" data-go="shop">Open shopping list</button></div>';
  out+='<div class="grid3" style="margin-bottom:12px"><button class="tile t-teal" data-go="inv"><span class="e">🥫</span>Pantry · Fridge · Freezer</button><button class="tile t-pink" data-go="kids"><span class="e">🧒👧</span>Kids</button><button class="tile t-green" data-go="budget"><span class="e">💵</span>Budget</button>'+
    '<button class="tile t-purple" data-go="make"><span class="e">💡</span>What can I make?</button><button class="tile t-gold" data-go="deals"><span class="e">🏷️</span>Deals</button><button class="tile t-slate" data-go="more"><span class="e">💾</span>Backup</button></div>';
  out+=tellBox('home','Tell me: “we’re out of eggs”, “add milk”…');
  out+='<div class="card c-orange"><span class="badge">Coming up</span>'+F.ROUTINES.map(function(r){var c=F.routineCheck(S,r);var nd=F.nextDate(d,r.day);
    return '<div style="margin:6px 0"><b>'+h(r.name)+'</b> <span class="muted small">('+nd.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+')</span><div class="row" style="margin-top:4px">'+c.map(function(x){return '<span class="qty '+(x.have?'q-Lots':x.onList?'q-num':'q-1')+'">'+(x.have?'✅ ':x.onList?'🛒 ':'❗ ')+h(x.name)+'</span>';}).join('')+'</div>'+
      (c.some(function(x){return !x.have&&!x.onList;})?'<button class="btn sm blue" style="margin-top:6px" data-act="routineadd" data-r="'+r.id+'">+ Add missing to list</button>':'')+'</div>';}).join('')+'<div class="muted small">✅ have · 🛒 on the list</div></div>';
  return out;
}

/* ---------- FEED ---------- */
function vFeed(){
  var f=UI.feed,out='<div class="top"><h1>🍽️ Feed Everybody</h1><button class="btn sm ghost" data-go="home">← Home</button></div>';
  out+='<div class="card c-purple"><h3>⚡ How much energy do you have?</h3><div class="chips" style="margin-top:8px">'+[[5,'🪫 5%'],[25,'😮‍💨 25%'],[50,'🙂 50%'],[75,'💪 75%'],[100,'⚡ 100%']].map(function(x){return '<button class="chip'+(f.energy===x[0]?' on':'')+'" style="--c:var(--purple)" data-act="feedset" data-k="energy" data-v="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>'+
    '<h3 style="margin-top:14px">⏱️ How much time?</h3><div class="chips" style="margin-top:8px">'+[5,15,30,60].map(function(x){return '<button class="chip'+(f.time===x?' on':'')+'" style="--c:var(--blue)" data-act="feedset" data-k="time" data-v="'+x+'">'+x+' min</button>';}).join('')+'</div>'+
    '<h3 style="margin-top:14px">📦 Use food from…</h3><div class="chips" style="margin-top:8px">'+[['pantry','🥫 Pantry','teal'],['fridge','🧊 Fridge','green'],['freezer','❄️ Freezer','icy'],['buy','🛒 Willing to buy','blue']].map(function(x){return '<button class="chip'+(f.sources.indexOf(x[0])>=0?' on':'')+'" style="--c:var(--'+x[2]+')" data-act="feedsrc" data-v="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>'+
    '<button class="giant g-feed" style="margin-top:16px;font-size:1.25rem;min-height:72px" data-act="feedgo">SHOW ME DINNER →</button></div>';
  var r=UI.feedResult;
  if(r){
    if(!r.meal){out+='<div class="card c-yellow" id="feed-result"><div style="font-weight:800">'+h(r.message)+'</div><button class="btn" style="margin-top:8px" data-act="feedreset">Start over</button></div>';}
    else{
      out+='<div class="card tonight" id="feed-result"><span class="badge on-dark" style="--c:var(--purple)">Do this one 👇</span><div class="big-title" id="feed-meal-name">'+r.meal.emoji+' '+h(r.meal.name)+'</div><div class="muted">'+r.meal.time+' min'+(r.why&&r.why.length?' · '+h(r.why.join(' · ')):'')+'</div>'+
        (r.relaxed?'<div class="small" style="color:#fde68a;margin-top:4px">Nothing fit perfectly, so this is the easiest thing you’ve got. Mostly hands-off. 💛</div>':'')+missHTML(r.missing)+
        platesHTML(r.plates,r.meal.id,true)+'<h3>Next steps</h3>'+stepsHTML(r.steps)+
        '<div class="grid2" style="margin-top:10px"><button class="btn green" data-act="lock" data-m="'+r.meal.id+'">✅ Doing this</button><button class="btn" data-act="feedelse">🔄 Something else</button></div></div>';
    }
  }
  return out;
}

/* ---------- INVENTORY ---------- */
function vInv(){
  var tab=UI.invTab,cols={pantry:'teal',fridge:'green',freezer:'icy'};
  var out='<div class="top"><h1>🥫 What we have</h1><button class="btn sm ghost" data-go="home">← Home</button></div>';
  out+='<div class="tabs">'+[['pantry','🥫 Pantry'],['fridge','🧊 Fridge'],['freezer','❄️ Freezer']].map(function(x){var n=S.inventory.filter(function(i){return i.loc===x[0];}).length;return '<button class="tab'+(tab===x[0]?' on':'')+'" style="--c:var(--'+cols[x[0]]+')" data-act="invtab" data-v="'+x[0]+'">'+x[1]+' <span class="small">('+n+')</span></button>';}).join('')+'</div>';
  out+=tellBox('inv','Add to '+tab+': “milk”, “out of eggs”, “remove chicken”');
  var items=S.inventory.filter(function(i){return i.loc===tab;});
  out+='<div class="card c-'+cols[tab]+'">'+(items.length?items.map(function(i){
    var ed=UI.editInv===i.id;
    var q=typeof i.qty==='number'?'<span class="stepper"><button data-act="invnum" data-id="'+i.id+'" data-d="-1">−</button><span>'+i.qty+'</span><button data-act="invnum" data-id="'+i.id+'" data-d="1">+</button></span>':'<button class="qty '+qtyClass(i.qty)+'" data-act="invqty" data-id="'+i.id+'">'+h(i.qty)+'</button>';
    var row='<div class="item" data-inv="'+h(i.name)+'"><span class="nm">'+(i.useSoon?'🟨 ':'')+h(i.name)+(i.price||i.note?'<span class="why">'+h([i.price,i.note].filter(Boolean).join(' · '))+'</span>':'')+(i.labelMe?'<button class="btn sm icy" style="margin-top:4px" data-act="invrename" data-id="'+i.id+'">🏷️ Label me</button>':'')+'</span>'+q+'<button class="btn sm ghost" data-act="invedit" data-id="'+i.id+'" aria-label="More">⋯</button></div>'+
      '<div class="row" style="margin:-2px 0 8px"><button class="btn sm red" data-act="usedlast" data-id="'+i.id+'">Used the last one</button><button class="btn sm green" data-act="boughtinv" data-id="'+i.id+'">Bought it</button><button class="btn sm '+(i.useSoon?'yellow':'ghost')+'" data-act="usesoon" data-id="'+i.id+'">Use soon</button></div>';
    if(ed)row+='<div class="mealcard" style="margin:0 0 10px"><div class="small muted">Move to:</div><div class="row" style="margin:6px 0">'+['pantry','fridge','freezer'].map(function(l){return '<button class="btn sm '+(i.loc===l?cols[l]:'ghost')+'" data-act="invmove" data-id="'+i.id+'" data-v="'+l+'">'+l+'</button>';}).join('')+'</div>'+
      '<div class="row"><button class="btn sm" data-act="invmode" data-id="'+i.id+'">'+(typeof i.qty==='number'?'Use words (Lots/Some…)':'Use a number')+'</button><button class="btn sm" data-act="invrename" data-id="'+i.id+'">Rename</button><button class="btn sm red" data-act="invdel" data-id="'+i.id+'">Delete</button></div></div>';
    return row;}).join(''):'<div class="empty">Nothing here yet. Type or say what you have above. 🎤</div>')+'</div>';
  out+='<div class="muted small">Tap the amount to cycle: Lots → Some → Almost out → 1 left. “Used the last one” moves it to shopping.</div>';
  return out;
}

/* ---------- SHOPPING ---------- */
function vShop(){
  var b=F.budgetSummary(S,today());
  var out='<div class="top"><h1>🛒 What do I need?</h1><button class="btn sm ghost" data-go="home">← Home</button></div>';
  out+='<div class="card c-green"><div class="between"><div><div class="muted small">Left this week</div><div class="money" style="font-size:1.5rem">'+money(b.remaining)+'</div></div><button class="btn green" data-go="budget">💵 Log a trip</button></div></div>';
  out+=tellBox('shop','Add: “milk, eggs and bread” or “bought everything except bananas”');
  var stores=S.settings.stores.concat(['Any store']);
  var open=S.shopping.filter(function(s){return !s.checked;});
  stores.forEach(function(st){
    var its=open.filter(function(s){return (stores.indexOf(s.store)>=0?s.store:'Any store')===st;});
    if(!its.length)return;
    out+='<div class="card c-blue"><div class="store-h">🏪 '+h(st)+' <span class="muted small">('+its.length+')</span></div>';
    var depts={};its.forEach(function(s){(depts[s.dept||'Other']=depts[s.dept||'Other']||[]).push(s);});
    Object.keys(depts).sort().forEach(function(dp){
      out+='<div class="dept-h">'+h(dp)+'</div>'+depts[dp].map(function(s){
        return '<div class="item" data-shop="'+h(s.name)+'"><button class="check" data-act="check" data-id="'+s.id+'" aria-label="Check off"></button><span class="nm">'+h(s.name)+(s.why?'<span class="why">'+h(s.why)+'</span>':'')+'</span>'+
          '<span class="stepper"><button data-act="shopqty" data-id="'+s.id+'" data-d="-1">−</button><span>'+h(s.qty)+'</span><button data-act="shopqty" data-id="'+s.id+'" data-d="1">+</button></span>'+
          '<button class="btn sm ghost" data-act="shopstore" data-id="'+s.id+'" title="Change store">🏪</button><button class="btn sm ghost" data-act="shopdel" data-id="'+s.id+'" aria-label="Remove">✕</button></div>';}).join('');
    });
    out+='</div>';
  });
  if(!open.length)out+='<div class="card c-green"><div class="empty">Nothing on the list. You’re all set 🎉</div></div>';
  var done=S.shopping.filter(function(s){return s.checked;});
  if(done.length)out+='<div class="card c-green"><div class="between"><span class="badge">✅ Got it</span><button class="btn sm" data-act="clearchecked">Clear</button></div>'+done.map(function(s){return '<div class="item"><button class="check on" data-act="check" data-id="'+s.id+'">✓</button><span class="nm" style="text-decoration:line-through;opacity:.7">'+h(s.name)+'</span></div>';}).join('')+'</div>';
  out+='<div class="grid2"><button class="btn" data-act="copylist">📋 Copy list</button><button class="btn" data-act="addroutines">🔁 Check Sun/Tue</button></div>';
  out+='<p class="muted small" style="margin-top:8px">Tap 🏪 to switch store. Checking something off puts it in the house automatically.</p>';
  return out;
}

/* ---------- MAKE ---------- */
function mealCard(e,opts){
  opts=opts||{};
  return '<div class="mealcard" data-meal="'+e.meal.id+'"><div class="between"><h3>'+e.meal.emoji+' '+h(e.meal.name)+'</h3><span class="muted small">'+(e.meal.time?e.meal.time+' min':'')+'</span></div>'+missHTML(e.missing)+
    '<details'+(opts.open?' open':'')+'><summary>Plates + steps</summary>'+platesHTML(e.plates,e.meal.id,true)+stepsHTML(e.steps||e.meal.steps)+(F.MEAL_BY_ID[e.meal.id]?'<button class="btn sm green" data-act="lock" data-m="'+e.meal.id+'">✅ Make this tonight</button>':'')+'</details></div>';
}
function vMake(){
  var out='<div class="top"><h1>💡 What can I make?</h1><button class="btn sm ghost" data-go="home">← Home</button></div>';
  out+=tellBox('make','“I have chicken, rice, cheese and tortillas”');
  out+='<div class="card c-yellow"><h3>Leftovers? Tap one:</h3><div class="chips" style="margin-top:8px">'+[['chicken','🍗 Leftover chicken'],['steak','🥩 Steak'],['porktenderloin','🍖 Pork'],['carnitas','🌮 Carnitas'],['burger','🍔 Burgers']].map(function(x){return '<button class="chip'+(UI.leftover===x[0]?' on':'')+'" style="--c:var(--yellow)" data-act="leftover" data-v="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';
  if(UI.leftover){out+='<div id="leftover-ideas"><div class="muted small" style="margin-top:8px">Already cooked, so these are fast (~10 min):</div>'+F.leftoverIdeas(S,UI.leftover).map(function(e){return mealCard(e);}).join('')+'</div>';}
  out+='</div>';
  var ing=UI.make&&UI.make.ingredients&&UI.make.ingredients.length?UI.make.ingredients:null;
  var w=F.whatCanIMake(S,{ingredients:ing,date:today()});
  if(ing)out+='<div class="card c-purple"><div class="between"><div><b>Using:</b> '+ing.map(function(k){return h(F.KEY_NAME[k]||k);}).join(', ')+' <span class="muted small">(+ salt, pepper, oil)</span></div><button class="btn sm" data-act="clearmake">Use my inventory</button></div></div>';
  out+='<div class="card c-green" id="make-now"><span class="badge">🟢 Can make now</span>'+(w.now.length?w.now.map(function(e,i){return mealCard(e,{open:i===0&&!!ing});}).join(''):'<div class="empty">Nothing complete right now. Check “Missing 1–2” below.</div>')+'</div>';
  out+='<div class="card c-red"><span class="badge on-dark" style="--c:var(--red)">🔴 Missing 1–2 things</span>'+(w.missing.length?w.missing.slice(0,8).map(function(e){return mealCard(e);}).join(''):'<div class="empty">None.</div>')+'</div>';
  out+='<div class="card c-icy"><span class="badge">❄️ Freezer-friendly</span>'+(w.freezer.length?w.freezer.map(function(e){return mealCard(e);}).join(''):'<div class="empty">No freezer meals right now.</div>')+'</div>';
  return out;
}

/* ---------- MARK ---------- */
function vMark(){
  var d=today(),mt=F.markToday(S,d),t=tonight();
  var out='<div class="top"><h1>💪 Feed Mark</h1><button class="btn sm ghost" data-go="home">← Home</button></div>';
  out+='<div class="card c-orange"><span class="badge">Today · '+F.DAYS[d.getDay()]+'</span><div style="font-weight:800;font-size:1.05rem">'+h(mt.text)+'</div>'+(t.meal?'<div class="muted" style="margin-top:6px">Dinner plate: '+h(t.plates.mark.text)+'</div>':'')+'<div class="muted small" style="margin-top:6px">Mark is off Tuesdays & Wednesdays.</div></div>';
  out+='<div class="card c-orange"><h3>🧳 Work meals</h3><button class="btn full orange" style="margin:10px 0" data-act="marktomorrow">Mark works tomorrow → 1 meal</button>'+
    '<div class="between"><b>Mark works</b><span class="stepper"><button data-act="markdays" data-d="-1">−</button><span style="font-size:1.3rem" id="mark-days">'+UI.markDays+'</span><button data-act="markdays" data-d="1">+</button></span><b>days this week</b></div>'+
    '<div class="chips" style="margin:10px 0">'+[['','✨ Best fit'],['A','🍗 A Chicken'],['B','🥩 B Ground Beef'],['C','🧊 C Freezer']].map(function(x){return '<button class="chip'+((UI.markTpl||'')===x[0]?' on':'')+'" style="--c:var(--orange)" data-act="marktpl" data-v="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>'+
    '<button class="btn full orange" data-act="markgen">Make the plan</button>';
  var p=UI.markPlan;
  if(p){out+='<div class="mealcard" id="mark-plan"><h3>'+p.emoji+' '+h(p.templateName)+'</h3>'+p.meals.map(function(m,i){return '<div class="item mark-meal"><span class="nm">'+(i+1)+'. '+h(m.day)+': '+h(m.name)+'<span class="why">+ '+h(m.sweet)+' 🥧</span></span><span class="qty q-num">'+m.protein+'g</span><span class="qty q-Lots">~'+money(m.cost)+'</span></div>';}).join('')+
    '<div style="margin-top:8px;font-weight:800">Protein: ~'+p.proteinPerServing+'g per serving · Est. cost: ~'+money(p.totalCost)+' total</div><div class="muted small">Estimates, not exact.</div>'+
    '<h3 style="margin-top:10px">Prep list</h3>'+stepsHTML(p.prep)+missHTML(p.missing)+'</div>';}
  out+='</div>';
  var pr=F.markProteins(S);
  out+='<div class="card c-orange"><h3>🥩 Protein on hand</h3>'+(pr.length?pr.map(function(x){return '<div class="item"><span class="nm">'+h(x.name)+'<span class="why">'+h(x.loc)+'</span></span><span class="small muted">'+h(x.est)+'</span></div>';}).join(''):'<div class="empty">No protein in the house. Add some to the list?</div>')+'</div>';
  out+='<div class="card c-orange"><h3>🎒 Grab-and-go</h3><div class="muted small">Good to keep around (tap to add to the list):</div><div class="chips" style="margin-top:8px">'+F.GRAB_IDEAS.map(function(g){var have=F.findIn(S.inventory,g).length;return '<button class="chip'+(have?' on':'')+'" style="--c:var(--green)" data-act="'+(have?'noop':'addname')+'" data-v="'+h(g)+'">'+(have?'✅ ':'+ ')+h(g)+'</button>';}).join('')+'</div></div>';
  out+='<div class="card c-red"><h3>🚨 5-minute emergency meals</h3>'+F.markEmergency(S).map(function(e){return '<div class="item"><span class="nm">'+h(e.name)+'</span><span class="qty '+(e.ready?'q-Lots':'q-1')+'">'+(e.ready?'Ready':'Need stuff')+'</span></div>';}).join('')+'</div>';
  return out;
}

/* ---------- KIDS ---------- */
function vKids(){
  var t=tonight();
  var out='<div class="top"><h1>🧒👧 Kids</h1><button class="btn sm ghost" data-go="home">← Home</button></div>';
  ['kaden','winter'].forEach(function(k){
    var p=S.people[k],sug=F.kidSuggestions(S,k,5);
    var skips=Object.keys((S.rejections||{})[k]||{}).filter(function(m){return F.isRejected(S,k,m);});
    out+='<div class="card c-pink" id="kid-'+k+'"><div class="between"><h2 style="margin:0">'+PEMO[k]+' '+h(p.name)+' <span class="muted small">age '+h(p.age)+'</span></h2></div><div class="muted small">'+h(p.rule||'')+'</div>'+
      (t.meal?'<div class="plate-row" style="--c:var(--pink);margin-top:10px"><span class="nm">Tonight</span><span class="tx">'+h(t.plates[k].text)+'</span>'+(t.plates[k].backup?'':'<button class="wont" data-act="reject" data-p="'+k+'" data-m="'+t.meal.id+'">Won’t eat that</button>')+'</div>':'')+
      '<h3 style="margin-top:12px">Go-to meals</h3><div class="kid-sugs">'+(sug.length?sug.map(function(s){return '<div class="item" data-meal="'+s.meal.id+'"><span class="nm">'+s.meal.emoji+' '+h(s.meal.name)+'<span class="why">'+h(s.plate)+(s.missing.length?' · need '+h(F.KEY_NAME[s.missing[0]]):'')+'</span></span><button class="wont" data-act="reject" data-p="'+k+'" data-m="'+s.meal.id+'">Won’t eat that'+(s.count?' ('+s.count+')':'')+'</button></div>';}).join(''):'<div class="empty">Restock some favorites and ideas will show up here.</div>')+'</div>'+
      (skips.length?'<details><summary>Learned: '+h(p.name)+' skips '+skips.length+' meal'+(skips.length>1?'s':'')+'</summary>'+skips.map(function(m){return '<div class="item"><span class="nm">'+h((F.MEAL_BY_ID[m]||{name:m}).name)+'</span><button class="btn sm" data-act="unreject" data-p="'+k+'" data-m="'+m+'">Bring it back</button></div>';}).join('')+'</details>':'')+
      '<details><summary>Loves / skips</summary><div class="small"><b>Loves:</b> '+h(p.loves.join(', '))+'</div><div class="small" style="margin-top:4px"><b>Skips:</b> '+h(p.wontEat.join(', '))+'</div></details></div>';
  });
  var kid=UI.lunchKid;UI.lunch[kid]=UI.lunch[kid]||{main:0,fruit:0,snack:0,treat:0,drink:0};var L=UI.lunch[kid];
  out+='<div class="card c-pink"><h2>🍱 Lunchbox builder</h2><div class="chips" style="margin-bottom:10px">'+['kaden','winter'].map(function(k){return '<button class="chip'+(kid===k?' on':'')+'" style="--c:var(--pink)" data-act="lunchkid" data-v="'+k+'">'+PEMO[k]+' '+h(S.people[k].name)+'</button>';}).join('')+'</div>'+
    ['main','fruit','snack','treat','drink'].map(function(sl){var o=F.lunchOptions(kid,sl);return '<button class="lunch-slot" data-act="lunchcycle" data-v="'+sl+'"><b>'+sl+'</b><span>'+h(o[L[sl]%o.length])+'</span>🔄</button>';}).join('')+
    '<div class="grid2"><button class="btn pink" data-act="lunchshuffle">🎲 Shuffle</button><button class="btn" data-act="lunchcopy">📋 Copy</button></div><div class="muted small" style="margin-top:6px">Tap any line to swap it.</div></div>';
  return out;
}

/* ---------- BUDGET ---------- */
function vBudget(){
  var b=F.budgetSummary(S,today());var pct=b.budget?Math.min(100,Math.max(0,b.spent/b.budget*100)):0;
  var out='<div class="top"><h1>💵 Food budget</h1><button class="btn sm ghost" data-go="home">← Home</button></div>';
  out+='<div class="card c-green"><div class="muted small">This week (since Sunday)</div><div class="grid3" style="margin-top:6px;text-align:center"><div><div class="muted small">Budget</div><div class="money" style="font-size:1.3rem">'+money(b.budget)+'</div></div><div><div class="muted small">Spent</div><div class="money" style="font-size:1.3rem" id="budget-spent">'+money(b.spent)+'</div></div><div><div class="muted small">Left</div><div class="money" style="font-size:1.3rem;color:'+(b.remaining<0?'#fca5a5':'#86efac')+'" id="budget-left">'+money(b.remaining)+'</div></div></div><div class="bar"><div style="width:'+pct+'%"></div></div>'+
    '<div class="small" style="font-weight:700">'+(b.remaining<0?'A little over this week. Totally okay. It resets Sunday. 💛':b.spent===0?'Fresh week. You’ve got this.':'You’re doing great.')+'</div></div>';
  out+='<div class="card c-green"><h3>Log a trip</h3><div class="chips" style="margin:8px 0">'+[10,25,50,100].map(function(a){return '<button class="chip" style="--c:var(--green)" data-act="spendquick" data-v="'+a+'">$'+a+'</button>';}).join('')+'</div>'+
    '<form data-form="spend" class="row"><input id="spend-amt" inputmode="decimal" placeholder="$ amount" style="flex:1"><select id="spend-store" style="flex:1">'+S.settings.stores.concat(['Other']).map(function(s){return '<option>'+h(s)+'</option>';}).join('')+'</select><button class="btn green full" type="submit">Log it</button></form></div>';
  var ws=b.weekStart;var log=(S.budget.log||[]).filter(function(e){return e.date>=ws;}).slice().reverse();
  out+='<div class="card c-green"><h3>This week</h3>'+(log.length?log.map(function(e){return '<div class="item"><span class="nm">'+money(e.amount)+'<span class="why">'+h(e.note)+' · '+h(e.date)+'</span></span><button class="btn sm ghost" data-act="spenddel" data-id="'+e.id+'">✕</button></div>';}).join(''):'<div class="empty">Nothing logged yet.</div>')+'</div>';
  out+='<div class="card c-green"><h3>Weekly budget</h3><form data-form="budget" class="row" style="margin-top:8px"><input id="budget-amt" inputmode="decimal" value="'+h(S.settings.weeklyBudget)+'" style="flex:1"><button class="btn green" type="submit">Save</button></form></div>';
  return out;
}

/* ---------- DEALS ---------- */
function vDeals(){
  var out='<div class="top"><h1>🏷️ Deals & price book</h1><button class="btn sm ghost" data-go="home">← Home</button></div>';
  var sel=UI.checkItem||S.pricebook[0].id;var item=S.pricebook.filter(function(p){return p.id===sel;})[0]||S.pricebook[0];
  out+='<div class="card c-gold"><h3>Is this a good price?</h3><select id="pb-item" data-change="pbitem" style="margin-top:8px">'+S.pricebook.map(function(p){return '<option value="'+p.id+'"'+(p.id===item.id?' selected':'')+'>'+h(p.name)+' ('+h(p.unit)+')</option>';}).join('')+'</select>'+
    '<div class="small muted" style="margin-top:6px">Normal '+money(item.normal)+' · Good '+money(item.good)+' · Stock-up '+money(item.stockup)+(item.placeholder?' <span class="ph">PLACEHOLDER</span>':' <span class="rec">RECORDED</span>')+'</div>'+
    '<form data-form="verdict" class="row" style="margin-top:8px"><input id="pb-price" inputmode="decimal" placeholder="Price you see, e.g. 2.49" value="'+h(UI.checkPrice)+'" style="flex:1"><button class="btn gold" type="submit">Check</button></form>';
  if(UI.checkPrice){var v=F.verdict(item,UI.checkPrice);if(v)out+='<div class="verdict v-'+v.color+'" id="verdict">'+h(v.verdict)+(v.verdict==='Stock up'?' 🛒🛒':v.verdict==='Good deal'?' 👍':' ⏳')+'</div><div style="font-weight:700;margin-top:8px">'+h(v.say)+'</div>'+(v.placeholder?'<div class="small" style="color:#fde68a;margin-top:4px">Based on PLACEHOLDER prices. Edit them below to make this smarter.</div>':'');}
  out+='</div>';
  out+='<div class="card c-gold"><div class="small" style="font-weight:700;color:#fde68a">⚠️ Prices marked PLACEHOLDER are made-up starting points, not real store prices. Change them as you see real ones.</div></div>';
  out+='<div class="card c-gold">'+S.pricebook.map(function(p){return '<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07)"><div class="between"><b>'+h(p.name)+'</b>'+(p.placeholder?'<span class="ph">PLACEHOLDER</span>':'<span class="rec">RECORDED</span>')+'</div><div class="muted small">'+h(p.unit)+(p.store?' · '+h(p.store):'')+(p.note?' · '+h(p.note):'')+'</div>'+
    '<div class="pbrow">'+[['normal','Normal'],['good','Good'],['stockup','Stock-up']].map(function(f){return '<div><label>'+f[1]+'</label><input inputmode="decimal" data-pb="'+p.id+'" data-f="'+f[0]+'" value="'+h(p[f[0]])+'"></div>';}).join('')+'</div></div>';}).join('')+
    '<form data-form="pbadd" class="row" style="margin-top:10px"><input id="pb-new" placeholder="Add an item (e.g. Hatfield bacon)" style="flex:1"><button class="btn gold" type="submit">Add</button></form></div>';
  return out;
}

/* ---------- MORE ---------- */
function vMore(){
  var out='<div class="top"><h1>⚙️ More</h1><button class="btn sm ghost" data-go="home">← Home</button></div>';
  out+='<div class="grid3" style="margin-bottom:12px"><button class="tile t-pink" data-go="kids"><span class="e">🧒👧</span>Kids</button><button class="tile t-green" data-go="budget"><span class="e">💵</span>Budget</button><button class="tile t-gold" data-go="deals"><span class="e">🏷️</span>Deals</button></div>';
  out+='<div class="card c-purple"><h3>📲 Put it on your home screen</h3><div class="small" style="margin-top:6px">Chrome: tap ⋮ → <b>Add to Home screen</b> (or <b>Install app</b>). Samsung Internet: tap ≡ → <b>Add page to</b> → <b>Home screen</b>.</div>'+(UI.deferredInstall?'<button class="btn purple full" style="margin-top:8px" data-act="install">Install now</button>':'')+'</div>';
  out+='<div class="card c-pink"><h3>👨‍👩‍👧‍👦 Family</h3>'+F.PEOPLE_ORDER.map(function(k){var p=S.people[k];return '<details><summary>'+PEMO[k]+' '+h(p.name)+' ('+h(p.role)+')</summary><label class="small muted">Loves (comma separated)</label><textarea rows="2" data-person="'+k+'" data-f="loves">'+h(p.loves.join(', '))+'</textarea><label class="small muted">Won’t eat</label><textarea rows="2" data-person="'+k+'" data-f="wontEat">'+h(p.wontEat.join(', '))+'</textarea>'+(k==='megan'?'<label class="small muted">Optional note (only you see it)</label><textarea rows="2" data-note="megan">'+h(p.healthNote||'')+'</textarea><label class="row small" style="margin-top:8px"><input type="checkbox" style="width:auto" data-act="healthtoggle" '+(S.settings.showHealthNote?'checked':'')+'> Show my gentle optional health note</label>':'')+(k==='mark'?'<div class="small muted" style="margin-top:6px">'+h(p.job)+' · off '+h(p.offDays)+'</div>':'')+'</details>';}).join('')+'</div>';
  out+='<div class="card c-blue"><h3>🏪 Stores</h3><form data-form="stores" class="row" style="margin-top:8px"><input id="stores" value="'+h(S.settings.stores.join(', '))+'" style="flex:1"><button class="btn blue" type="submit">Save</button></form></div>';
  out+='<div class="card c-teal"><h3>💾 Backup</h3><div class="muted small">Everything lives on this phone. Export a backup now and then.</div><div class="grid2" style="margin-top:8px"><button class="btn teal" data-act="export">⬇️ Export</button><button class="btn" data-act="importpick">⬆️ Import</button></div><input type="file" id="importfile" accept="application/json,.json" class="hide"><details><summary>Paste backup text instead</summary><textarea id="importtext" rows="4" placeholder="Paste JSON here"></textarea><button class="btn sm" style="margin-top:6px" data-act="importtext">Import pasted</button></details>'+
    '<hr><button class="btn sm red" data-act="reset">Reset to starter data</button></div>';
  out+='<p class="muted small" style="text-align:center">Food Command Center V1 · works offline · no account needed</p>';
  return out;
}

var VIEWS={home:vHome,feed:vFeed,inv:vInv,shop:vShop,make:vMake,mark:vMark,kids:vKids,budget:vBudget,deals:vDeals,more:vMore};
function render(){
  var v=VIEWS[UI.view]?UI.view:'home';
  document.getElementById('app').innerHTML=VIEWS[v]();
  var navMap={home:'home',feed:'home',mark:'home',shop:'shop',budget:'more',inv:'inv',make:'make',more:'more',kids:'more',deals:'more'};
  Array.prototype.forEach.call(document.querySelectorAll('.nav button'),function(b){b.classList.toggle('on',b.dataset.go===navMap[v]);});
}

/* ---------- parser glue ---------- */
var VERB=/^(we|i|i'm|add|put|need|buy|get|grab|remove|delete|take|cross|scratch|toss|bought|got|picked|out|ran|no more|low|almost|running|leftover|mark|kaden|winter|megan|what|have|there|please|used|finished|throw)/i;
function runTell(ctx,text){
  text=String(text||'').trim();if(!text)return;
  if(ctx==='inv'&&!VERB.test(text))text='we have '+text+' in the '+UI.invTab;
  if(ctx==='make'&&!/what can/i.test(text)&&!/leftover/i.test(text))text=text.replace(/[?.!]+$/,'')+', what can I make?';
  snap();
  var r=F.parse(S,text,today());
  save();
  var a=r.action||{};
  if(a.type==='make'){UI.make={ingredients:a.ingredients};UI.leftover=null;go('make');}
  else if(a.type==='leftover'){UI.leftover=a.key;go('make');}
  else if(a.type==='mark'){UI.markPlan=a.plan;UI.markDays=a.days;go('mark');}
  else render();
  toast(r.messages.join(' '),['make','mark'].indexOf(a.type)<0);
}

/* ---------- actions ---------- */
function findInv(id){return S.inventory.filter(function(i){return i.id===id;})[0];}
function findShop(id){return S.shopping.filter(function(i){return i.id===id;})[0];}
var A={
  undo:function(){if(undoSnap){S=JSON.parse(undoSnap);undoSnap=null;save();render();toast('Undone 👍');}},
  dismisswelcome:function(){UI.welcome=false;render();},
  lock:function(d){S.tonight={date:F.ymd(today()),mealId:d.m};save();toast('Locked in for tonight ✅ You’ve got this.');go('home');},
  unlock:function(){S.tonight=null;save();render();},
  tonightelse:function(){var t=tonight();if(t.meal)UI.tonightExclude.push(t.meal.id);var n=tonight();if(!n.meal){UI.tonightExclude=[];toast('That’s every idea, so starting over 🔄');}render();},
  showtonight:function(){UI.feedResult=tonight();go('feed');scrollRes();},
  reject:function(d){var n=F.reject(S,d.p,d.m);save();
    if(UI.feedResult&&UI.feedResult.meal)UI.feedResult.plates=F.platesFor(S,UI.feedResult.meal);
    render();toast(n>=2?'Got it. That’s a pattern, so I’ll stop suggesting it for '+S.people[d.p].name+'. 👍':'Noted once for '+S.people[d.p].name+'. If it happens again, I’ll stop suggesting it.');},
  unreject:function(d){F.unreject(S,d.p,d.m);save();render();toast('Back on the menu for '+S.people[d.p].name+'.');},
  feedset:function(d){UI.feed[d.k]=+d.v;if(UI.feedResult)A.feedgo();else render();},
  feedsrc:function(d){var s=UI.feed.sources,i=s.indexOf(d.v);if(i>=0)s.splice(i,1);else s.push(d.v);if(UI.feedResult)A.feedgo();else render();},
  feedgo:function(){UI.feedExclude=[];UI.feedResult=F.recommend(S,{energy:UI.feed.energy,time:UI.feed.time,sources:UI.feed.sources,date:today()});render();scrollRes();},
  feedelse:function(){if(UI.feedResult&&UI.feedResult.meal)UI.feedExclude.push(UI.feedResult.meal.id);var r=F.recommend(S,{energy:UI.feed.energy,time:UI.feed.time,sources:UI.feed.sources,date:today(),exclude:UI.feedExclude});
    if(!r.meal){UI.feedExclude=[];r=F.recommend(S,{energy:UI.feed.energy,time:UI.feed.time,sources:UI.feed.sources,date:today()});toast('That was every idea that fits, so here’s the first one again 🔄');}UI.feedResult=r;render();scrollRes();},
  feedreset:function(){UI.feedResult=null;render();},
  addmiss:function(d){snap();d.keys.split(',').forEach(function(k){F.addToShopping(S,F.KEY_NAME[k]||k,{why:'For a meal idea'});});save();render();toast('Added to shopping 🛒',true);},
  addname:function(d){snap();F.addToShopping(S,d.v);save();render();toast('Added '+d.v+' 🛒',true);},
  noop:function(){},
  routineadd:function(d){snap();var r=F.ROUTINES.filter(function(x){return x.id===d.r;})[0];var added=[];F.routineCheck(S,r).forEach(function(c){if(!c.have&&!c.onList){F.addToShopping(S,c.name,{why:F.routineWhy(r,c.key)});added.push(c.name);}});save();render();toast(added.length?'Added '+added.join(', '):'All set already ✅',true);},
  addroutines:function(){snap();S.routinesAdded={};var m=F.runRoutines(S,today(),6);save();render();toast(m.join(' ')||'All set ✅',true);},
  invtab:function(d){UI.invTab=d.v;UI.editInv=null;render();},
  invqty:function(d){var i=findInv(d.id);var idx=F.QTY_STEPS.indexOf(i.qty);i.qty=F.QTY_STEPS[(idx+1)%F.QTY_STEPS.length];save();render();},
  invnum:function(d){var i=findInv(d.id);i.qty=Math.max(0,i.qty+(+d.d));if(i.qty===0){snap();i.qty=1;F.usedLast(S,i.id);save();render();toast('That was the last one, so I added it to shopping 🛒',true);return;}save();render();},
  invedit:function(d){UI.editInv=UI.editInv===d.id?null:d.id;render();},
  invmove:function(d){findInv(d.id).loc=d.v;UI.editInv=null;save();render();toast('Moved to '+d.v);},
  invmode:function(d){var i=findInv(d.id);i.qty=typeof i.qty==='number'?'Some':1;save();render();},
  invrename:function(d){var i=findInv(d.id);var n=prompt(i.labelMe?'What is it? (e.g. ground beef, pork chops)':'New name',i.labelMe?'':i.name);if(n&&n.trim()){i.name=n.trim();delete i.key;if(i.labelMe){i.labelMe=false;i.note='';}save();render();toast('Saved: '+i.name+' 👍');}},
  invdel:function(d){snap();S.inventory=S.inventory.filter(function(i){return i.id!==d.id;});UI.editInv=null;save();render();toast('Deleted',true);},
  usedlast:function(d){snap();var it=F.usedLast(S,d.id);save();render();if(it)toast(it.name+' moved to shopping 🛒',true);},
  boughtinv:function(d){var it=F.boughtInv(S,d.id);save();render();if(it)toast('Stocked: '+it.name+' 🟢');},
  usesoon:function(d){var i=findInv(d.id);i.useSoon=!i.useSoon;save();render();},
  check:function(d){snap();var s=F.checkOff(S,d.id);save();render();if(s&&s.checked)toast('Got it! '+s.name+' is in the house now ✅',true);},
  shopqty:function(d){var s=findShop(d.id);s.qty=Math.max(1,(+s.qty||1)+(+d.d));save();render();},
  shopstore:function(d){var s=findShop(d.id);var st=S.settings.stores.concat(['Any store']);s.store=st[(st.indexOf(s.store)+1)%st.length];F.rememberStore(S,s);save();render();},
  shopdel:function(d){snap();S.shopping=S.shopping.filter(function(s){return s.id!==d.id;});save();render();toast('Removed',true);},
  clearchecked:function(){snap();S.shopping=S.shopping.filter(function(s){return !s.checked;});save();render();toast('Cleared',true);},
  copylist:function(){var open=S.shopping.filter(function(s){return !s.checked;});var st=S.settings.stores.concat(['Any store']);var txt=st.map(function(name){var its=open.filter(function(s){return (st.indexOf(s.store)>=0?s.store:'Any store')===name;});return its.length?name+':\n'+its.map(function(s){return '- '+s.name+(s.qty>1?' x'+s.qty:'');}).join('\n'):'';}).filter(Boolean).join('\n\n');copy(txt||'List is empty');},
  leftover:function(d){UI.leftover=UI.leftover===d.v?null:d.v;render();},
  clearmake:function(){UI.make=null;render();},
  marktomorrow:function(){UI.markPlan=F.markWorkMeals(S,{days:1,start:F.addDays(today(),1),template:UI.markTpl||undefined});render();scrollToId('mark-plan');},
  markdays:function(d){UI.markDays=Math.max(1,Math.min(5,UI.markDays+(+d.d)));render();},
  marktpl:function(d){UI.markTpl=d.v||null;render();},
  markgen:function(){UI.markPlan=F.markWorkMeals(S,{days:UI.markDays,start:today(),template:UI.markTpl||undefined});render();scrollToId('mark-plan');},
  lunchkid:function(d){UI.lunchKid=d.v;render();},
  lunchcycle:function(d){UI.lunch[UI.lunchKid][d.v]++;render();},
  lunchshuffle:function(){var L=UI.lunch[UI.lunchKid];Object.keys(L).forEach(function(k){L[k]=Math.floor(Math.random()*8);});render();},
  lunchcopy:function(){var L=UI.lunch[UI.lunchKid];copy(S.people[UI.lunchKid].name+'’s lunch: '+['main','fruit','snack','treat','drink'].map(function(s){var o=F.lunchOptions(UI.lunchKid,s);return o[L[s]%o.length];}).join(', '));},
  spendquick:function(d){snap();F.logSpend(S,d.v,'Quick log');save();render();toast('Logged $'+d.v+' 👍',true);},
  spenddel:function(d){snap();S.budget.log=S.budget.log.filter(function(e){return e.id!==d.id;});save();render();toast('Removed',true);},
  healthtoggle:function(d,el){S.settings.showHealthNote=el.checked;save();},
  install:function(){if(UI.deferredInstall){UI.deferredInstall.prompt();UI.deferredInstall=null;}},
  export:function(){var data=JSON.stringify(S,null,2);var blob=new Blob([data],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='food-command-center-backup-'+F.ymd(today())+'.json';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);toast('Backup downloaded 💾');},
  importpick:function(){document.getElementById('importfile').click();},
  importtext:function(){doImport(document.getElementById('importtext').value);},
  reset:function(){if(confirm('Reset everything to the starter data? (Export a backup first if you want to keep your changes.)')){snap();S=F.seed();S.lastOpened=new Date().toISOString();save();render();toast('Fresh start ✨',true);}},
  mic:function(d,el){startMic(d.target,el);}
};
function scrollRes(){setTimeout(function(){var el=document.getElementById('feed-result');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},40);}
function scrollToId(id){setTimeout(function(){var el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},40);}
function copy(txt){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){toast('Copied 📋 Paste it anywhere.');},function(){prompt('Copy this:',txt);});}else prompt('Copy this:',txt);}
function doImport(txt){try{var s=JSON.parse(txt);if(!s||!s.inventory||!s.shopping)throw new Error('bad');snap();S=s;save();render();toast('Backup restored ✅',true);}catch(e){toast('That didn’t look like a Food Command Center backup. Nothing changed.');}}

/* ---------- voice (Web Speech API) ---------- */
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function startMic(targetId,btn){
  if(!SR){toast('Voice isn’t supported in this browser. Try Chrome, or just type. 💬');return;}
  var rec=new SR();rec.lang='en-US';rec.interimResults=false;rec.maxAlternatives=1;
  btn.classList.add('listening');
  rec.onresult=function(e){var txt=e.results[0][0].transcript;var inp=document.getElementById(targetId);if(inp)inp.value=txt;var form=inp&&inp.closest('form');runTell(form?form.dataset.ctx:'home',txt);};
  rec.onerror=function(e){toast(e.error==='not-allowed'?'Mic permission is off. You can allow it in browser settings.':'Didn’t catch that. Try again? 🎤');};
  rec.onend=function(){btn.classList.remove('listening');};
  try{rec.start();toast('Listening… 🎤');}catch(e){btn.classList.remove('listening');}
}

/* ---------- events ---------- */
document.addEventListener('click',function(e){
  var g=e.target.closest('[data-go]');if(g){e.preventDefault();go(g.dataset.go);return;}
  var b=e.target.closest('[data-act]');if(!b)return;
  if(b.type==='checkbox'){if(A[b.dataset.act])A[b.dataset.act](b.dataset,b);return;}
  e.preventDefault();var fn=A[b.dataset.act];if(fn)fn(b.dataset,b);
});
document.addEventListener('submit',function(e){
  var f=e.target;e.preventDefault();var kind=f.dataset.form;
  if(kind==='tell'){var inp=f.querySelector('input');var v=inp.value;inp.value='';runTell(f.dataset.ctx,v);}
  else if(kind==='spend'){var a=document.getElementById('spend-amt').value,st=document.getElementById('spend-store').value;snap();if(F.logSpend(S,a,st)){save();render();toast('Logged 👍',true);}else toast('Type an amount like 42.50');}
  else if(kind==='budget'){var v2=Number(String(document.getElementById('budget-amt').value).replace(/[^0-9.]/g,''));if(v2>0){S.settings.weeklyBudget=v2;save();render();toast('Weekly budget set to '+money(v2));}}
  else if(kind==='verdict'){UI.checkItem=document.getElementById('pb-item').value;UI.checkPrice=document.getElementById('pb-price').value;render();}
  else if(kind==='pbadd'){var n=document.getElementById('pb-new').value.trim();if(n){S.pricebook.push({id:F.uid(),name:n,unit:'each',normal:0,good:0,stockup:0,placeholder:true,store:'',note:''});save();render();}}
  else if(kind==='stores'){var list=document.getElementById('stores').value.split(',').map(function(s){return s.trim();}).filter(Boolean);if(list.length){S.settings.stores=list;save();render();toast('Stores saved');}}
});
document.addEventListener('change',function(e){
  var t=e.target;
  if(t.dataset.change==='pbitem'){UI.checkItem=t.value;UI.checkPrice='';render();}
  if(t.dataset.pb){var p=S.pricebook.filter(function(x){return x.id===t.dataset.pb;})[0];var v=Number(String(t.value).replace(/[^0-9.]/g,''));if(p&&isFinite(v)){p[t.dataset.f]=v;save();toast('Saved price');}}
  if(t.dataset.note){S.people[t.dataset.note].healthNote=t.value.trim();save();toast('Saved 👍');}
  if(t.dataset.person){S.people[t.dataset.person][t.dataset.f]=t.value.split(',').map(function(s){return s.trim();}).filter(Boolean);save();toast('Saved 👍');}
  if(t.id==='importfile'&&t.files&&t.files[0]){var r=new FileReader();r.onload=function(){doImport(r.result);};r.readAsText(t.files[0]);}
});
window.addEventListener('hashchange',function(){var v=location.hash.slice(1);if(VIEWS[v]&&v!==UI.view){UI.view=v;render();}});
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();UI.deferredInstall=e;if(UI.view==='more')render();});

/* ---------- boot ---------- */
S=load();
var now=today();
if(S.lastOpened&&F.daysSince(S.lastOpened,now)>=2)UI.welcome=true;
UI.routineMsgs=F.runRoutines(S,now);
S.lastOpened=now.toISOString();
save();
var hv=location.hash.slice(1);if(VIEWS[hv])UI.view=hv;
render();
window.FCCApp={get state(){return S;},UI:UI,render:render,runTell:runTell,go:go,A:A};
if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0){navigator.serviceWorker.register('sw.js').catch(function(){});}
})();
