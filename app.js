'use strict';
const app = document.querySelector('#app');
const categories = ['言語','非言語','模擬試験'];
const letters = 'ABCDE';
const prefix = 'mie-u-spi-practice/attempt/';
const memory = new Map();
let set, attempt, questionIndex;
function node(tag, text, cls, parent = app) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (cls) el.className = cls;
  parent.append(el);
  return el;
}
function button(text, action, cls, parent) {
  const el = node('button', text, cls, parent);
  el.onclick = action;
  return el;
}
function screen() {
  app.replaceChildren();
  app.focus({preventScroll:true});
  window.scrollTo(0,0);
}
function allAttempts() {
  const records = new Map(memory);
  try {
    for (let i=0;i<localStorage.length;i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      try {
        const r = JSON.parse(localStorage.getItem(key));
        if (r && Array.isArray(r.answers) && !records.has(key)) records.set(key,r);
      } catch {}
    }
  } catch {}
  return [...records.values()].sort((a,b)=>b.time-a.time);
}
function score(r) { return r.answers.filter(a=>a.correct).length; }
function home() {
  screen();
  const hero = node('section','','hero');
  node('h1','SPI問題集','',hero);
  node('p','1セット10問。解いたその場で、正解と解説を確認できます。','',hero);
  node('h2','分野を選ぶ');
  const grid=node('div','','grid');
  categories.forEach(c=>{
    const n=sets.filter(s=>s.category===c).length;
    const card=button(c,()=>category(c),'card',grid);
    node('small',n?n+'セット　→':'準備中','',card);
  });
  node('h2','学習履歴');
  const records=allAttempts();
  if (!records.length) return node('p','最初の1問を解くと、このブラウザに学習履歴が記録されます。','muted');
  const count=records.reduce((n,r)=>n+r.answers.length,0);
  const right=records.reduce((n,r)=>n+score(r),0);
  node('p','累計正答率 '+Math.round(100*right/count)+'%　｜　'+count+'問中 '+right+'問正解');
  for (const r of records) {
    const box=node('details','','panel');
    node('summary',r.title+'　'+score(r)+' / '+r.answers.length+'問正解','',box);
    node('p',new Date(r.time).toLocaleString('ja-JP')+'　'+(r.answers.length===10?'完了':'途中まで'),'muted',box);
    node('p',r.answers.map((a,i)=>'問'+(i+1)+'　'+a.choice+'　'+(a.correct?'正解':'不正解')).join('\n'),'',box);
  }
}
function category(c) {
  screen();
  button('← トップ',home);
  node('h1',c);
  const list=sets.filter(s=>s.category===c);
  if (!list.length) node('p','この分野の問題セットは準備中です。');
  for(const s of list) button(s.title+'　10問を解く →',()=>start(s),'primary');
}
function start(s) {
  set=s; questionIndex=0;
  attempt={id:crypto.randomUUID(),title:s.title,setId:s.id,time:Date.now(),answers:[]};
  question();
}
function question() {
  screen();
  button('← 分野選択へ',home);
  node('p',set.title+'　｜　問 '+(questionIndex+1)+' / 10','muted');
  const progress=node('progress','');
  progress.max=10;progress.value=questionIndex;progress.setAttribute('aria-label','回答済み問題数');
  const q=set.questions[questionIndex];
  node('h2',q.topic);
  node('p',q.prompt);
  const group=node('div','','stack');
  q.choices.forEach((choice,i)=>button(letters[i]+'　'+choice,()=>answer(q,letters[i],group,progress),'',group));
}
function answer(q,choice,group,progress) {
  if(attempt.answers.length!==questionIndex) return;
  const correct=q.answer===choice;
  attempt.answers.push({choice,correct});
  progress.value=attempt.answers.length;
  const key=prefix+attempt.id;
  memory.set(key,attempt);
  let saved=true;
  try {localStorage.setItem(key,JSON.stringify(attempt));} catch { saved=false; }
  [...group.children].forEach((el,i)=>{
    el.disabled=true;
    if(letters[i]===q.answer) el.className='ok';
    else if(letters[i]===choice) el.className='wrong';
  });
  const box=node('section','','panel');
  box.tabIndex=-1;
  node('h2',correct?'正解！':'不正解','',box);
  node('b','正解　'+q.answer+'　'+q.choices[letters.indexOf(q.answer)],'',box);
  node('p',q.explanation,'',box);
  if(!saved) node('p','このブラウザには履歴を保存できませんでした。','muted',box);
  const last=questionIndex===9;
  button(last?'結果を見る →':'次の問題へ →',()=>{if(last)result();else {questionIndex++;question();}},'primary',box);
  box.focus();
}
function result(){
  screen();
  const hero=node('section','','hero');
  node('p',set.title,'',hero);
  node('h1',score(attempt)+' / 10 問正解','',hero);
  node('p','正答率 '+score(attempt)*10+'%','',hero);
  const links=node('div','','links');
  button('もう一度解く',()=>start(set),'primary',links);
  button('トップに戻る',home,'',links);
  node('h2','解答を振り返る');
  set.questions.forEach((q,i)=>{
    const box=node('details','','panel');
    node('summary','問'+(i+1)+'　'+q.topic+'　'+(attempt.answers[i].correct?'正解':'不正解'),'',box);
    node('p',q.prompt,'',box);
    node('p','あなたの解答　'+attempt.answers[i].choice+'\n正解　'+q.answer+'　'+q.choices[letters.indexOf(q.answer)],'',box);
    node('p',q.explanation,'',box);
  });
}
home();
