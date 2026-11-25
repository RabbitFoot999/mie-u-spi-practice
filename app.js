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
  geometrySummary();
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
  showFigure(q,app);
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
  if(set.id.startsWith('geometry-diagnostic-')) geometrySummary();
  node('h2','解答を振り返る');
  set.questions.forEach((q,i)=>{
    const box=node('details','','panel');
    node('summary','問'+(i+1)+'　'+q.topic+'　'+(attempt.answers[i].correct?'正解':'不正解'),'',box);
    node('p',q.prompt,'',box);
    showFigure(q,box);
    node('p','あなたの解答　'+attempt.answers[i].choice+'\n正解　'+q.answer+'　'+q.choices[letters.indexOf(q.answer)],'',box);
    node('p',q.explanation,'',box);
  });
}

function showFigure(q,parent){if(!q.figure)return;const img=node('img','','',parent);img.alt=q.alt;img.style.cssText='display:block;width:100%;max-width:360px;height:auto;margin:12px auto 20px;background:#fff;border-radius:8px';img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 160">'+q.figure+'</svg>')}
function geometrySummary(){const diagnostics=sets.filter(s=>s.id.startsWith('geometry-diagnostic-'));const first=new Map();for(const r of allAttempts().reverse()){const s=diagnostics.find(v=>v.id===r.setId);if(!s)continue;r.answers.forEach((a,i)=>{const id=s.id+'/'+i;if(s.questions[i]&&!first.has(id))first.set(id,{topic:s.questions[i].topic,correct:a.correct})})}if(!first.size)return;const box=node('details','','panel');box.open=true;node('summary','図形診断　初回の成績（'+first.size+' / 50問）','',box);const rows=diagnostics[0].questions.map(q=>{const a=[...first.values()].filter(v=>v.topic===q.topic);return {topic:q.topic,n:a.length,k:a.filter(v=>v.correct).length}});rows.sort((a,b)=>(a.n?a.k/a.n:2)-(b.n?b.k/b.n:2));for(const r of rows)node('p',r.topic+'　'+(r.n?r.k+' / '+r.n+'問正解（'+Math.round(100*r.k/r.n)+'%）':'未回答'),'',box)}

// 第4章の診断セット。各設問の初回回答を分野別に集計する。
sets.push(...[
  {
    "id": "geometry-diagnostic-1",
    "title": "非言語 第16回　図形診断 1",
    "category": "非言語",
    "questions": [
      {
        "topic": "図形の展開図",
        "prompt": "展開図を立方体に組み立てる。面Aの向かい側はどれか。",
        "figure": "<rect x=\"46\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"66\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">A</text><rect x=\"86\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"106\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">B</text><rect x=\"126\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"146\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">C</text><rect x=\"166\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"186\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">D</text><rect x=\"46\" y=\"20\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"66\" y=\"40\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">E</text><rect x=\"86\" y=\"100\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"106\" y=\"120\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">F</text>",
        "alt": "横一列はABCD。Eは左から1番目の上、Fは2番目の下。",
        "choices": [
          "C",
          "B",
          "D",
          "E",
          "F"
        ],
        "answer": "A",
        "explanation": "横一列の4面は側面を一周するので、二つ離れた面どうしが向かい合う。上下についたEとFはふたと底になる。よってAの反対はC。"
      },
      {
        "topic": "サイコロ",
        "prompt": "向かい合う目の和は7。図の姿勢から東→北の順に、毎回1面ずつ転がす。最後の上面は？",
        "figure": "<polygon points=\"78,46 127,24 174,46 125,70\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><polygon points=\"78,46 125,70 125,120 78,96\" fill=\"#f1f7fa\" stroke=\"#28506b\" stroke-width=\"2\"/><polygon points=\"125,70 174,46 174,96 125,120\" fill=\"#a9cddb\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"126\" y=\"47\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><text x=\"101\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">5</text><text x=\"150\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3</text><text x=\"130\" y=\"144\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">左の面＝南　右の面＝東</text>",
        "alt": "上面1、南面5、東面3。",
        "choices": [
          "1",
          "2",
          "5",
          "3",
          "4"
        ],
        "answer": "C",
        "explanation": "東へ転がせば直前の西面が上に、北へ転がせば南面が上になる。各回、進行方向と反対の面を上にすると、上面は1→4→5となる。"
      },
      {
        "topic": "空間図形",
        "prompt": "図は積み木を真上から見た配置で、数字は各マスの段数。各段に隙間はない。立方体は全部で何個か。",
        "figure": "<rect x=\"56\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"78\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><rect x=\"100\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"122\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3</text><rect x=\"144\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"166\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><rect x=\"56\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"78\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">0</text><rect x=\"100\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"122\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><rect x=\"144\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"166\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><text x=\"122\" y=\"136\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">手前 ↑</text>",
        "alt": "奥の列1,3,2、手前の列0,2,1。",
        "choices": [
          "9",
          "7",
          "8",
          "10",
          "11"
        ],
        "answer": "A",
        "explanation": "各マスを一つの柱として数える。1＋3＋2＋0＋2＋1＝9個。"
      },
      {
        "topic": "軌道と回転",
        "prompt": "線分の一端を固定し、もう一端を反時計回りに回す。図の緑の弧に沿って先端が動く距離は？",
        "figure": "<line x1=\"120\" y1=\"85\" x2=\"175\" y2=\"85\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"120\" y1=\"85\" x2=\"120\" y2=\"30\" stroke=\"#28506b\" stroke-width=\"2\"/><path d=\"M175 85 A55 55 0 0 0 120 30\" fill=\"none\" stroke=\"#258078\" stroke-width=\"4\"/><circle cx=\"120\" cy=\"85\" r=\"3\" fill=\"#28506b\" stroke=\"#28506b\"/><text x=\"145\" y=\"102\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">4 cm</text><text x=\"126\" y=\"147\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">中心角 90°</text>",
        "alt": "半径4 cm、回転角90度。",
        "choices": [
          "1π cm",
          "3π cm",
          "2π cm",
          "4π cm",
          "6π cm"
        ],
        "answer": "C",
        "explanation": "1周の長さは2π×4 cm。回転角は1周の90/360なので、移動距離は2π cm。"
      },
      {
        "topic": "その他の図形問題",
        "prompt": "長方形の右上から長方形を切り取った。残ったL字形の面積は？ 図は模式図。",
        "figure": "<polygon points=\"47,34 150,34 150,70 196,70 196,123 47,123\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"120\" y=\"140\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">8 cm</text><text x=\"24\" y=\"79\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">6 cm</text><text x=\"178\" y=\"57\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2 cm</text><text x=\"215\" y=\"51\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2 cm</text>",
        "alt": "外側が横8、縦6、切り取りが横2、縦2（cm）。",
        "choices": [
          "44 cm²",
          "42 cm²",
          "43 cm²",
          "45 cm²",
          "46 cm²"
        ],
        "answer": "A",
        "explanation": "元の長方形から切り取った長方形を引く。8×6－2×2＝44 cm²。"
      },
      {
        "topic": "グラフの領域（一次関数）",
        "prompt": "直線と両座標軸で囲まれた色付き領域の面積は？",
        "figure": "<polygon points=\"50,115 50,32 196,115\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"30\" y1=\"115\" x2=\"220\" y2=\"115\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"130\" x2=\"50\" y2=\"15\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"34\" y=\"32\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><text x=\"197\" y=\"131\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">4</text><text x=\"38\" y=\"130\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">O</text><text x=\"229\" y=\"115\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x</text><text x=\"51\" y=\"10\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">y</text>",
        "alt": "直線の切片はx軸で4、y軸で2。",
        "choices": [
          "2",
          "3",
          "4",
          "5",
          "6"
        ],
        "answer": "C",
        "explanation": "底辺4、高さ2の直角三角形なので、面積は4×2÷2＝4。"
      },
      {
        "topic": "グラフの領域（二次関数）",
        "prompt": "放物線 y＝x² と直線 y＝4 に挟まれた部分を考える。x＝1 の位置で、境界を含む領域にある整数の y はいくつか。",
        "figure": "<path d=\"M55 32 Q120 222 185 32 Z\" fill=\"#c4e2ee\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"37\" y1=\"127\" x2=\"204\" y2=\"127\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"120\" y1=\"138\" x2=\"120\" y2=\"16\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"212\" y=\"127\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x</text><text x=\"132\" y=\"12\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">y</text><text x=\"125\" y=\"148\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">模式図：上辺は水平</text>",
        "alt": "上が水平線、下が放物線の領域。",
        "choices": [
          "4",
          "2",
          "3",
          "5",
          "6"
        ],
        "answer": "A",
        "explanation": "x＝1で下端は1、上端は4。両端を含むので差に1を足すと4個。"
      },
      {
        "topic": "条件と領域",
        "prompt": "図の3条件を同時に満たす整数の組 (x, y) は何組あるか。境界上の点も含める。",
        "figure": "<polygon points=\"65,117 65,47 172,117\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"38\" y1=\"129\" x2=\"200\" y2=\"129\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"142\" x2=\"50\" y2=\"23\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"118\" y=\"35\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x＋y ≦ 4</text><text x=\"143\" y=\"148\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x ≧ 1　 y ≧ 1</text>",
        "alt": "x≧1、y≧1、x＋y≦4。",
        "choices": [
          "4",
          "5",
          "6",
          "7",
          "8"
        ],
        "answer": "C",
        "explanation": "整数なので x＋y≦4 として数える。xを1から順に固定すると、選べるyの個数は3、2、1。合計6組。"
      },
      {
        "topic": "ブラックボックス",
        "prompt": "箱は入力に一定の数を掛け、一定の数を足す。左が入力、右が出力のとき、？はいくつか。",
        "figure": "<text x=\"41\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><line x1=\"55\" y1=\"31\" x2=\"195\" y2=\"31\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"16\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">7</text><text x=\"41\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">4</text><line x1=\"55\" y1=\"75\" x2=\"195\" y2=\"75\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"60\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">11</text><text x=\"41\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">7</text><line x1=\"55\" y1=\"119\" x2=\"195\" y2=\"119\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"104\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">?</text>",
        "alt": "2 → 7、4 → 11、7 → ?",
        "choices": [
          "17",
          "15",
          "16",
          "18",
          "19"
        ],
        "answer": "A",
        "explanation": "入力が2から4に増えると出力は4増えるため、倍率は2。入力2の例から加える数は3。入力7では2×7＋(3)＝17。"
      },
      {
        "topic": "物の流れと比率",
        "prompt": "入口で荷物をA・Bに分け、Aに届いた荷物をさらにC・Dに分ける。割合は各分岐に入った量を基準とする。入口に200個ある。Cに届くのは何個か。",
        "figure": "<line x1=\"50\" y1=\"77\" x2=\"125\" y2=\"38\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"77\" x2=\"125\" y2=\"117\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"125\" y1=\"38\" x2=\"216\" y2=\"25\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"125\" y1=\"38\" x2=\"216\" y2=\"77\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"31\" y=\"77\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">入口</text><text x=\"81\" y=\"44\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">40%</text><text x=\"128\" y=\"19\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">A</text><text x=\"130\" y=\"129\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">B</text><text x=\"170\" y=\"18\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">25%</text><text x=\"230\" y=\"26\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">C</text><text x=\"231\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">D</text>",
        "alt": "入口→Aが40%、A→Cが25%。",
        "choices": [
          "18",
          "19",
          "20",
          "21",
          "22"
        ],
        "answer": "C",
        "explanation": "入口からCに届く割合は40/100×25/100＝10%。200×(1000/10000)＝20個。"
      }
    ]
  },
  {
    "id": "geometry-diagnostic-2",
    "title": "非言語 第17回　図形診断 2",
    "category": "非言語",
    "questions": [
      {
        "topic": "図形の展開図",
        "prompt": "展開図を立方体に組み立てる。面Eの向かい側はどれか。",
        "figure": "<rect x=\"46\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"66\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">B</text><rect x=\"86\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"106\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">C</text><rect x=\"126\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"146\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">D</text><rect x=\"166\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"186\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">A</text><rect x=\"86\" y=\"20\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"106\" y=\"40\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">E</text><rect x=\"126\" y=\"100\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"146\" y=\"120\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">F</text>",
        "alt": "横一列はBCDA。Eは左から2番目の上、Fは3番目の下。",
        "choices": [
          "A",
          "B",
          "C",
          "F",
          "D"
        ],
        "answer": "D",
        "explanation": "横一列の4面は側面を一周するので、二つ離れた面どうしが向かい合う。上下についたEとFはふたと底になる。よってEの反対はF。"
      },
      {
        "topic": "サイコロ",
        "prompt": "向かい合う目の和は7。図の姿勢から北→東→南の順に、毎回1面ずつ転がす。最後の上面は？",
        "figure": "<polygon points=\"78,46 127,24 174,46 125,70\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><polygon points=\"78,46 125,70 125,120 78,96\" fill=\"#f1f7fa\" stroke=\"#28506b\" stroke-width=\"2\"/><polygon points=\"125,70 174,46 174,96 125,120\" fill=\"#a9cddb\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"126\" y=\"47\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><text x=\"101\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">5</text><text x=\"150\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3</text><text x=\"130\" y=\"144\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">左の面＝南　右の面＝東</text>",
        "alt": "上面1、南面5、東面3。",
        "choices": [
          "1",
          "2",
          "3",
          "4",
          "5"
        ],
        "answer": "A",
        "explanation": "東へ転がせば直前の西面が上に、北へ転がせば南面が上になる。各回、進行方向と反対の面を上にすると、上面は1→5→4→1となる。"
      },
      {
        "topic": "空間図形",
        "prompt": "図は積み木を真上から見た配置で、数字は各マスの段数。各段に隙間はない。手前から水平に見えるシルエットの面積は単位正方形何枚分か。",
        "figure": "<rect x=\"56\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"78\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><rect x=\"100\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"122\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><rect x=\"144\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"166\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><rect x=\"56\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"78\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><rect x=\"100\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"122\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3</text><rect x=\"144\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"166\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><text x=\"122\" y=\"136\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">手前 ↑</text>",
        "alt": "奥の列2,2,1、手前の列1,3,2。",
        "choices": [
          "5",
          "6",
          "8",
          "7",
          "9"
        ],
        "answer": "D",
        "explanation": "奥と手前が重なるため、各列の高い方だけが輪郭を決める。左から2、3、2段で、計7枚分。"
      },
      {
        "topic": "軌道と回転",
        "prompt": "線分の一端を固定し、もう一端を反時計回りに回す。図の緑の弧に沿って先端が動く距離は？",
        "figure": "<line x1=\"120\" y1=\"85\" x2=\"175\" y2=\"85\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"120\" y1=\"85\" x2=\"92.50000000000001\" y2=\"37.36860279185587\" stroke=\"#28506b\" stroke-width=\"2\"/><path d=\"M175 85 A55 55 0 0 0 92.50000000000001 37.36860279185587\" fill=\"none\" stroke=\"#258078\" stroke-width=\"4\"/><circle cx=\"120\" cy=\"85\" r=\"3\" fill=\"#28506b\" stroke=\"#28506b\"/><text x=\"145\" y=\"102\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">6 cm</text><text x=\"126\" y=\"147\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">中心角 120°</text>",
        "alt": "半径6 cm、回転角120度。",
        "choices": [
          "4π cm",
          "2π cm",
          "6π cm",
          "8π cm",
          "12π cm"
        ],
        "answer": "A",
        "explanation": "1周の長さは2π×6 cm。回転角は1周の120/360なので、移動距離は4π cm。"
      },
      {
        "topic": "その他の図形問題",
        "prompt": "長方形の右上から長方形を切り取った。残ったL字形の周の長さは？ 図は模式図。",
        "figure": "<polygon points=\"47,34 150,34 150,70 196,70 196,123 47,123\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"120\" y=\"140\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">10 cm</text><text x=\"24\" y=\"79\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">7 cm</text><text x=\"178\" y=\"57\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3 cm</text><text x=\"215\" y=\"51\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3 cm</text>",
        "alt": "外側が横10、縦7、切り取りが横3、縦3（cm）。",
        "choices": [
          "32 cm",
          "33 cm",
          "35 cm",
          "34 cm",
          "36 cm"
        ],
        "answer": "D",
        "explanation": "切り取った上辺・右辺の長さは、くぼみに現れる横辺・縦辺と等しい。元の長方形と同じ周長で、2×(10＋7)＝34 cm。"
      },
      {
        "topic": "グラフの領域（一次関数）",
        "prompt": "直線と両座標軸で囲まれた色付き領域の境界線（斜辺）の傾きは？",
        "figure": "<polygon points=\"50,115 50,32 196,115\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"30\" y1=\"115\" x2=\"220\" y2=\"115\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"130\" x2=\"50\" y2=\"15\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"34\" y=\"32\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">4</text><text x=\"197\" y=\"131\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">5</text><text x=\"38\" y=\"130\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">O</text><text x=\"229\" y=\"115\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x</text><text x=\"51\" y=\"10\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">y</text>",
        "alt": "直線の切片はx軸で5、y軸で4。",
        "choices": [
          "−4/5",
          "4/5",
          "−5/4",
          "5/4",
          "−9"
        ],
        "answer": "A",
        "explanation": "(0, 4)から(5, 0)へ移ると、xは5増え、yは4減る。傾きはyの変化量÷xの変化量で−4/5。"
      },
      {
        "topic": "グラフの領域（二次関数）",
        "prompt": "放物線 y＝x² と直線 y＝9 に挟まれた部分を考える。x＝2 の位置で、上下の境界を除く領域にある整数の y はいくつか。",
        "figure": "<path d=\"M55 32 Q120 222 185 32 Z\" fill=\"#c4e2ee\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"37\" y1=\"127\" x2=\"204\" y2=\"127\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"120\" y1=\"138\" x2=\"120\" y2=\"16\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"212\" y=\"127\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x</text><text x=\"132\" y=\"12\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">y</text><text x=\"125\" y=\"148\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">模式図：上辺は水平</text>",
        "alt": "上が水平線、下が放物線の領域。",
        "choices": [
          "2",
          "3",
          "5",
          "4",
          "6"
        ],
        "answer": "D",
        "explanation": "x＝2で下端は4、上端は9。両端を除くので差から1を引くと4個。"
      },
      {
        "topic": "条件と領域",
        "prompt": "図の3条件を同時に満たす整数の組 (x, y) は何組あるか。境界上の点も含める。",
        "figure": "<polygon points=\"65,117 65,47 172,117\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"38\" y1=\"129\" x2=\"200\" y2=\"129\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"142\" x2=\"50\" y2=\"23\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"118\" y=\"35\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x＋y ≦ 5</text><text x=\"143\" y=\"148\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x ≧ 2　 y ≧ 1</text>",
        "alt": "x≧2、y≧1、x＋y≦5。",
        "choices": [
          "6",
          "4",
          "5",
          "7",
          "8"
        ],
        "answer": "A",
        "explanation": "整数なので x＋y≦5 として数える。xを2から順に固定すると、選べるyの個数は3、2、1。合計6組。"
      },
      {
        "topic": "ブラックボックス",
        "prompt": "箱は入力に一定の数を掛け、一定の数を足す。左が入力、右が出力のとき、？はいくつか。",
        "figure": "<text x=\"41\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><line x1=\"55\" y1=\"31\" x2=\"195\" y2=\"31\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"16\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">4</text><text x=\"41\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">4</text><line x1=\"55\" y1=\"75\" x2=\"195\" y2=\"75\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"60\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">10</text><text x=\"41\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">?</text><line x1=\"55\" y1=\"119\" x2=\"195\" y2=\"119\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"104\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">22</text>",
        "alt": "2 → 4、4 → 10、? → 22",
        "choices": [
          "6",
          "7",
          "9",
          "8",
          "10"
        ],
        "answer": "D",
        "explanation": "入力が2から4に増えると出力は6増えるため、倍率は3。入力2の例から加える数は-2。出力22から加えた数を引き、3で割ると入力は8。"
      },
      {
        "topic": "物の流れと比率",
        "prompt": "入口で荷物をA・Bに分け、Aに届いた荷物をさらにC・Dに分ける。割合は各分岐に入った量を基準とする。Cに54個届いた。入口にあった荷物は何個か。",
        "figure": "<line x1=\"50\" y1=\"77\" x2=\"125\" y2=\"38\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"77\" x2=\"125\" y2=\"117\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"125\" y1=\"38\" x2=\"216\" y2=\"25\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"125\" y1=\"38\" x2=\"216\" y2=\"77\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"31\" y=\"77\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">入口</text><text x=\"81\" y=\"44\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">60%</text><text x=\"128\" y=\"19\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">A</text><text x=\"130\" y=\"129\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">B</text><text x=\"170\" y=\"18\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">50%</text><text x=\"230\" y=\"26\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">C</text><text x=\"231\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">D</text>",
        "alt": "入口→Aが60%、A→Cが50%。",
        "choices": [
          "180",
          "178",
          "179",
          "181",
          "182"
        ],
        "answer": "A",
        "explanation": "入口からCに届く割合は60/100×50/100＝30%。54÷(3000/10000)＝180個。"
      }
    ]
  },
  {
    "id": "geometry-diagnostic-3",
    "title": "非言語 第18回　図形診断 3",
    "category": "非言語",
    "questions": [
      {
        "topic": "図形の展開図",
        "prompt": "展開図を立方体に組み立てる。面Cの向かい側はどれか。",
        "figure": "<rect x=\"46\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"66\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">D</text><rect x=\"86\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"106\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">C</text><rect x=\"126\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"146\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">A</text><rect x=\"166\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"186\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">B</text><rect x=\"126\" y=\"20\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"146\" y=\"40\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">E</text><rect x=\"166\" y=\"100\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"186\" y=\"120\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">F</text>",
        "alt": "横一列はDCAB。Eは左から3番目の上、Fは4番目の下。",
        "choices": [
          "A",
          "B",
          "D",
          "E",
          "F"
        ],
        "answer": "B",
        "explanation": "横一列の4面は側面を一周するので、二つ離れた面どうしが向かい合う。上下についたEとFはふたと底になる。よってCの反対はB。"
      },
      {
        "topic": "サイコロ",
        "prompt": "向かい合う目の和は7。図の姿勢から西→南→東の順に、毎回1面ずつ転がす。最後の上面は？",
        "figure": "<polygon points=\"78,46 127,24 174,46 125,70\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><polygon points=\"78,46 125,70 125,120 78,96\" fill=\"#f1f7fa\" stroke=\"#28506b\" stroke-width=\"2\"/><polygon points=\"125,70 174,46 174,96 125,120\" fill=\"#a9cddb\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"126\" y=\"47\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><text x=\"101\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">5</text><text x=\"150\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3</text><text x=\"130\" y=\"144\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">左の面＝南　右の面＝東</text>",
        "alt": "上面1、南面5、東面3。",
        "choices": [
          "2",
          "3",
          "4",
          "1",
          "5"
        ],
        "answer": "D",
        "explanation": "東へ転がせば直前の西面が上に、北へ転がせば南面が上になる。各回、進行方向と反対の面を上にすると、上面は1→3→2→1となる。"
      },
      {
        "topic": "空間図形",
        "prompt": "図は積み木を真上から見た配置で、数字は各マスの段数。各段に隙間はない。立方体は全部で何個か。",
        "figure": "<rect x=\"56\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"78\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3</text><rect x=\"100\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"122\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><rect x=\"144\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"166\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">0</text><rect x=\"56\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"78\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><rect x=\"100\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"122\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><rect x=\"144\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"166\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3</text><text x=\"122\" y=\"136\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">手前 ↑</text>",
        "alt": "奥の列3,1,0、手前の列1,2,3。",
        "choices": [
          "8",
          "10",
          "9",
          "11",
          "12"
        ],
        "answer": "B",
        "explanation": "各マスを一つの柱として数える。3＋1＋0＋1＋2＋3＝10個。"
      },
      {
        "topic": "軌道と回転",
        "prompt": "線分の一端を固定し、もう一端を反時計回りに回す。図の緑の弧に沿って先端が動く距離は？",
        "figure": "<line x1=\"120\" y1=\"85\" x2=\"175\" y2=\"85\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"120\" y1=\"85\" x2=\"65\" y2=\"85\" stroke=\"#28506b\" stroke-width=\"2\"/><path d=\"M175 85 A55 55 0 0 0 65 85\" fill=\"none\" stroke=\"#258078\" stroke-width=\"4\"/><circle cx=\"120\" cy=\"85\" r=\"3\" fill=\"#28506b\" stroke=\"#28506b\"/><text x=\"145\" y=\"102\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3 cm</text><text x=\"126\" y=\"147\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">中心角 180°</text>",
        "alt": "半径3 cm、回転角180度。",
        "choices": [
          "1.5π cm",
          "4.5π cm",
          "6π cm",
          "3π cm",
          "9π cm"
        ],
        "answer": "D",
        "explanation": "1周の長さは2π×3 cm。回転角は1周の180/360なので、移動距離は3π cm。"
      },
      {
        "topic": "その他の図形問題",
        "prompt": "長方形の右上から長方形を切り取った。残ったL字形の面積は？ 図は模式図。",
        "figure": "<polygon points=\"47,34 150,34 150,70 196,70 196,123 47,123\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"120\" y=\"140\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">12 cm</text><text x=\"24\" y=\"79\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">8 cm</text><text x=\"178\" y=\"57\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">4 cm</text><text x=\"215\" y=\"51\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">4 cm</text>",
        "alt": "外側が横12、縦8、切り取りが横4、縦4（cm）。",
        "choices": [
          "78 cm²",
          "80 cm²",
          "79 cm²",
          "81 cm²",
          "82 cm²"
        ],
        "answer": "B",
        "explanation": "元の長方形から切り取った長方形を引く。12×8－4×4＝80 cm²。"
      },
      {
        "topic": "グラフの領域（一次関数）",
        "prompt": "直線と両座標軸で囲まれた色付き領域の面積は？",
        "figure": "<polygon points=\"50,115 50,32 196,115\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"30\" y1=\"115\" x2=\"220\" y2=\"115\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"130\" x2=\"50\" y2=\"15\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"34\" y=\"32\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">6</text><text x=\"197\" y=\"131\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">6</text><text x=\"38\" y=\"130\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">O</text><text x=\"229\" y=\"115\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x</text><text x=\"51\" y=\"10\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">y</text>",
        "alt": "直線の切片はx軸で6、y軸で6。",
        "choices": [
          "16",
          "17",
          "19",
          "18",
          "20"
        ],
        "answer": "D",
        "explanation": "底辺6、高さ6の直角三角形なので、面積は6×6÷2＝18。"
      },
      {
        "topic": "グラフの領域（二次関数）",
        "prompt": "放物線 y＝x² と直線 y＝16 に挟まれた部分を考える。x＝2 の位置で、境界を含む領域にある整数の y はいくつか。",
        "figure": "<path d=\"M55 32 Q120 222 185 32 Z\" fill=\"#c4e2ee\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"37\" y1=\"127\" x2=\"204\" y2=\"127\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"120\" y1=\"138\" x2=\"120\" y2=\"16\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"212\" y=\"127\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x</text><text x=\"132\" y=\"12\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">y</text><text x=\"125\" y=\"148\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">模式図：上辺は水平</text>",
        "alt": "上が水平線、下が放物線の領域。",
        "choices": [
          "11",
          "13",
          "12",
          "14",
          "15"
        ],
        "answer": "B",
        "explanation": "x＝2で下端は4、上端は16。両端を含むので差に1を足すと13個。"
      },
      {
        "topic": "条件と領域",
        "prompt": "図の3条件を同時に満たす整数の組 (x, y) は何組あるか。境界上の点も含める。",
        "figure": "<polygon points=\"65,117 65,47 172,117\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"38\" y1=\"129\" x2=\"200\" y2=\"129\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"142\" x2=\"50\" y2=\"23\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"118\" y=\"35\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x＋y ≦ 6</text><text x=\"143\" y=\"148\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x ≧ 1　 y ≧ 1</text>",
        "alt": "x≧1、y≧1、x＋y≦6。",
        "choices": [
          "13",
          "14",
          "16",
          "15",
          "17"
        ],
        "answer": "D",
        "explanation": "整数なので x＋y≦6 として数える。xを1から順に固定すると、選べるyの個数は5、4、3、2、1。合計15組。"
      },
      {
        "topic": "ブラックボックス",
        "prompt": "箱は入力に一定の数を掛け、一定の数を足す。左が入力、右が出力のとき、？はいくつか。",
        "figure": "<text x=\"41\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><line x1=\"55\" y1=\"31\" x2=\"195\" y2=\"31\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"16\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">9</text><text x=\"41\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">4</text><line x1=\"55\" y1=\"75\" x2=\"195\" y2=\"75\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"60\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">17</text><text x=\"41\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">9</text><line x1=\"55\" y1=\"119\" x2=\"195\" y2=\"119\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"104\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">?</text>",
        "alt": "2 → 9、4 → 17、9 → ?",
        "choices": [
          "35",
          "37",
          "36",
          "38",
          "39"
        ],
        "answer": "B",
        "explanation": "入力が2から4に増えると出力は8増えるため、倍率は4。入力2の例から加える数は1。入力9では4×9＋(1)＝37。"
      },
      {
        "topic": "物の流れと比率",
        "prompt": "入口で荷物をA・Bに分け、Aに届いた荷物をさらにC・Dに分ける。割合は各分岐に入った量を基準とする。入口に250個ある。Cに届くのは何個か。",
        "figure": "<line x1=\"50\" y1=\"77\" x2=\"125\" y2=\"38\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"77\" x2=\"125\" y2=\"117\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"125\" y1=\"38\" x2=\"216\" y2=\"25\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"125\" y1=\"38\" x2=\"216\" y2=\"77\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"31\" y=\"77\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">入口</text><text x=\"81\" y=\"44\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">30%</text><text x=\"128\" y=\"19\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">A</text><text x=\"130\" y=\"129\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">B</text><text x=\"170\" y=\"18\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">40%</text><text x=\"230\" y=\"26\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">C</text><text x=\"231\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">D</text>",
        "alt": "入口→Aが30%、A→Cが40%。",
        "choices": [
          "28",
          "29",
          "31",
          "30",
          "32"
        ],
        "answer": "D",
        "explanation": "入口からCに届く割合は30/100×40/100＝12%。250×(1200/10000)＝30個。"
      }
    ]
  },
  {
    "id": "geometry-diagnostic-4",
    "title": "非言語 第19回　図形診断 4",
    "category": "非言語",
    "questions": [
      {
        "topic": "図形の展開図",
        "prompt": "展開図を立方体に組み立てる。面Fの向かい側はどれか。",
        "figure": "<rect x=\"46\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"66\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">C</text><rect x=\"86\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"106\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">D</text><rect x=\"126\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"146\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">B</text><rect x=\"166\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"186\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">A</text><rect x=\"166\" y=\"20\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"186\" y=\"40\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">E</text><rect x=\"46\" y=\"100\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"66\" y=\"120\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">F</text>",
        "alt": "横一列はCDBA。Eは左から4番目の上、Fは1番目の下。",
        "choices": [
          "A",
          "B",
          "C",
          "D",
          "E"
        ],
        "answer": "E",
        "explanation": "横一列の4面は側面を一周するので、二つ離れた面どうしが向かい合う。上下についたEとFはふたと底になる。よってFの反対はE。"
      },
      {
        "topic": "サイコロ",
        "prompt": "向かい合う目の和は7。図の姿勢から北→北→西の順に、毎回1面ずつ転がす。最後の上面は？",
        "figure": "<polygon points=\"78,46 127,24 174,46 125,70\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><polygon points=\"78,46 125,70 125,120 78,96\" fill=\"#f1f7fa\" stroke=\"#28506b\" stroke-width=\"2\"/><polygon points=\"125,70 174,46 174,96 125,120\" fill=\"#a9cddb\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"126\" y=\"47\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><text x=\"101\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">5</text><text x=\"150\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3</text><text x=\"130\" y=\"144\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">左の面＝南　右の面＝東</text>",
        "alt": "上面1、南面5、東面3。",
        "choices": [
          "1",
          "3",
          "2",
          "4",
          "5"
        ],
        "answer": "B",
        "explanation": "東へ転がせば直前の西面が上に、北へ転がせば南面が上になる。各回、進行方向と反対の面を上にすると、上面は1→5→6→3となる。"
      },
      {
        "topic": "空間図形",
        "prompt": "図は積み木を真上から見た配置で、数字は各マスの段数。各段に隙間はない。手前から水平に見えるシルエットの面積は単位正方形何枚分か。",
        "figure": "<rect x=\"56\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"78\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><rect x=\"100\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"122\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><rect x=\"144\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"166\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3</text><rect x=\"56\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"78\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><rect x=\"100\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"122\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">0</text><rect x=\"144\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"166\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><text x=\"122\" y=\"136\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">手前 ↑</text>",
        "alt": "奥の列1,2,3、手前の列2,0,1。",
        "choices": [
          "5",
          "6",
          "8",
          "9",
          "7"
        ],
        "answer": "E",
        "explanation": "奥と手前が重なるため、各列の高い方だけが輪郭を決める。左から2、2、3段で、計7枚分。"
      },
      {
        "topic": "軌道と回転",
        "prompt": "線分の一端を固定し、もう一端を反時計回りに回す。図の緑の弧に沿って先端が動く距離は？",
        "figure": "<line x1=\"120\" y1=\"85\" x2=\"175\" y2=\"85\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"120\" y1=\"85\" x2=\"81.10912703473988\" y2=\"46.109127034739885\" stroke=\"#28506b\" stroke-width=\"2\"/><path d=\"M175 85 A55 55 0 0 0 81.10912703473988 46.109127034739885\" fill=\"none\" stroke=\"#258078\" stroke-width=\"4\"/><circle cx=\"120\" cy=\"85\" r=\"3\" fill=\"#28506b\" stroke=\"#28506b\"/><text x=\"145\" y=\"102\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">8 cm</text><text x=\"126\" y=\"147\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">中心角 135°</text>",
        "alt": "半径8 cm、回転角135度。",
        "choices": [
          "3π cm",
          "6π cm",
          "9π cm",
          "12π cm",
          "18π cm"
        ],
        "answer": "B",
        "explanation": "1周の長さは2π×8 cm。回転角は1周の135/360なので、移動距離は6π cm。"
      },
      {
        "topic": "その他の図形問題",
        "prompt": "長方形の右上から長方形を切り取った。残ったL字形の周の長さは？ 図は模式図。",
        "figure": "<polygon points=\"47,34 150,34 150,70 196,70 196,123 47,123\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"120\" y=\"140\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">14 cm</text><text x=\"24\" y=\"79\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">9 cm</text><text x=\"178\" y=\"57\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">5 cm</text><text x=\"215\" y=\"51\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2 cm</text>",
        "alt": "外側が横14、縦9、切り取りが横5、縦2（cm）。",
        "choices": [
          "44 cm",
          "45 cm",
          "47 cm",
          "48 cm",
          "46 cm"
        ],
        "answer": "E",
        "explanation": "切り取った上辺・右辺の長さは、くぼみに現れる横辺・縦辺と等しい。元の長方形と同じ周長で、2×(14＋9)＝46 cm。"
      },
      {
        "topic": "グラフの領域（一次関数）",
        "prompt": "直線と両座標軸で囲まれた色付き領域の境界線（斜辺）の傾きは？",
        "figure": "<polygon points=\"50,115 50,32 196,115\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"30\" y1=\"115\" x2=\"220\" y2=\"115\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"130\" x2=\"50\" y2=\"15\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"34\" y=\"32\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">8</text><text x=\"197\" y=\"131\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">7</text><text x=\"38\" y=\"130\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">O</text><text x=\"229\" y=\"115\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x</text><text x=\"51\" y=\"10\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">y</text>",
        "alt": "直線の切片はx軸で7、y軸で8。",
        "choices": [
          "8/7",
          "−8/7",
          "−7/8",
          "7/8",
          "−15"
        ],
        "answer": "B",
        "explanation": "(0, 8)から(7, 0)へ移ると、xは7増え、yは8減る。傾きはyの変化量÷xの変化量で−8/7。"
      },
      {
        "topic": "グラフの領域（二次関数）",
        "prompt": "放物線 y＝x² と直線 y＝25 に挟まれた部分を考える。x＝3 の位置で、上下の境界を除く領域にある整数の y はいくつか。",
        "figure": "<path d=\"M55 32 Q120 222 185 32 Z\" fill=\"#c4e2ee\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"37\" y1=\"127\" x2=\"204\" y2=\"127\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"120\" y1=\"138\" x2=\"120\" y2=\"16\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"212\" y=\"127\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x</text><text x=\"132\" y=\"12\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">y</text><text x=\"125\" y=\"148\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">模式図：上辺は水平</text>",
        "alt": "上が水平線、下が放物線の領域。",
        "choices": [
          "13",
          "14",
          "16",
          "17",
          "15"
        ],
        "answer": "E",
        "explanation": "x＝3で下端は9、上端は25。両端を除くので差から1を引くと15個。"
      },
      {
        "topic": "条件と領域",
        "prompt": "図の3条件を同時に満たす整数の組 (x, y) は何組あるか。境界上の点も含める。",
        "figure": "<polygon points=\"65,117 65,47 172,117\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"38\" y1=\"129\" x2=\"200\" y2=\"129\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"142\" x2=\"50\" y2=\"23\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"118\" y=\"35\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x＋y ≦ 7</text><text x=\"143\" y=\"148\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x ≧ 2　 y ≧ 1</text>",
        "alt": "x≧2、y≧1、x＋y≦7。",
        "choices": [
          "13",
          "15",
          "14",
          "16",
          "17"
        ],
        "answer": "B",
        "explanation": "整数なので x＋y≦7 として数える。xを2から順に固定すると、選べるyの個数は5、4、3、2、1。合計15組。"
      },
      {
        "topic": "ブラックボックス",
        "prompt": "箱は入力に一定の数を掛け、一定の数を足す。左が入力、右が出力のとき、？はいくつか。",
        "figure": "<text x=\"41\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><line x1=\"55\" y1=\"31\" x2=\"195\" y2=\"31\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"16\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><text x=\"41\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">4</text><line x1=\"55\" y1=\"75\" x2=\"195\" y2=\"75\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"60\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">5</text><text x=\"41\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">?</text><line x1=\"55\" y1=\"119\" x2=\"195\" y2=\"119\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"104\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">17</text>",
        "alt": "2 → 1、4 → 5、? → 17",
        "choices": [
          "8",
          "9",
          "11",
          "12",
          "10"
        ],
        "answer": "E",
        "explanation": "入力が2から4に増えると出力は4増えるため、倍率は2。入力2の例から加える数は-3。出力17から加えた数を引き、2で割ると入力は10。"
      },
      {
        "topic": "物の流れと比率",
        "prompt": "入口で荷物をA・Bに分け、Aに届いた荷物をさらにC・Dに分ける。割合は各分岐に入った量を基準とする。Cに32個届いた。入口にあった荷物は何個か。",
        "figure": "<line x1=\"50\" y1=\"77\" x2=\"125\" y2=\"38\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"77\" x2=\"125\" y2=\"117\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"125\" y1=\"38\" x2=\"216\" y2=\"25\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"125\" y1=\"38\" x2=\"216\" y2=\"77\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"31\" y=\"77\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">入口</text><text x=\"81\" y=\"44\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">50%</text><text x=\"128\" y=\"19\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">A</text><text x=\"130\" y=\"129\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">B</text><text x=\"170\" y=\"18\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">20%</text><text x=\"230\" y=\"26\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">C</text><text x=\"231\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">D</text>",
        "alt": "入口→Aが50%、A→Cが20%。",
        "choices": [
          "318",
          "320",
          "319",
          "321",
          "322"
        ],
        "answer": "B",
        "explanation": "入口からCに届く割合は50/100×20/100＝10%。32÷(1000/10000)＝320個。"
      }
    ]
  },
  {
    "id": "geometry-diagnostic-5",
    "title": "非言語 第20回　図形診断 5",
    "category": "非言語",
    "questions": [
      {
        "topic": "図形の展開図",
        "prompt": "展開図を立方体に組み立てる。面Dの向かい側はどれか。",
        "figure": "<rect x=\"46\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"66\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">B</text><rect x=\"86\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"106\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">D</text><rect x=\"126\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"146\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">A</text><rect x=\"166\" y=\"60\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"186\" y=\"80\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">C</text><rect x=\"86\" y=\"20\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"106\" y=\"40\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">E</text><rect x=\"166\" y=\"100\" width=\"40\" height=\"40\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"186\" y=\"120\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">F</text>",
        "alt": "横一列はBDAC。Eは左から2番目の上、Fは4番目の下。",
        "choices": [
          "A",
          "B",
          "C",
          "E",
          "F"
        ],
        "answer": "C",
        "explanation": "横一列の4面は側面を一周するので、二つ離れた面どうしが向かい合う。上下についたEとFはふたと底になる。よってDの反対はC。"
      },
      {
        "topic": "サイコロ",
        "prompt": "向かい合う目の和は7。図の姿勢から東→南→西→北の順に、毎回1面ずつ転がす。最後の上面は？",
        "figure": "<polygon points=\"78,46 127,24 174,46 125,70\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><polygon points=\"78,46 125,70 125,120 78,96\" fill=\"#f1f7fa\" stroke=\"#28506b\" stroke-width=\"2\"/><polygon points=\"125,70 174,46 174,96 125,120\" fill=\"#a9cddb\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"126\" y=\"47\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><text x=\"101\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">5</text><text x=\"150\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3</text><text x=\"130\" y=\"144\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">左の面＝南　右の面＝東</text>",
        "alt": "上面1、南面5、東面3。",
        "choices": [
          "1",
          "2",
          "3",
          "5",
          "4"
        ],
        "answer": "E",
        "explanation": "東へ転がせば直前の西面が上に、北へ転がせば南面が上になる。各回、進行方向と反対の面を上にすると、上面は1→4→2→1→4となる。"
      },
      {
        "topic": "空間図形",
        "prompt": "図は積み木を真上から見た配置で、数字は各マスの段数。各段に隙間はない。立方体は全部で何個か。",
        "figure": "<rect x=\"56\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"78\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><rect x=\"100\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"122\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3</text><rect x=\"144\" y=\"23\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"166\" y=\"45\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><rect x=\"56\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"78\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><rect x=\"100\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"122\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">1</text><rect x=\"144\" y=\"67\" width=\"44\" height=\"44\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"166\" y=\"89\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><text x=\"122\" y=\"136\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">手前 ↑</text>",
        "alt": "奥の列2,3,1、手前の列1,1,2。",
        "choices": [
          "8",
          "9",
          "10",
          "11",
          "12"
        ],
        "answer": "C",
        "explanation": "各マスを一つの柱として数える。2＋3＋1＋1＋1＋2＝10個。"
      },
      {
        "topic": "軌道と回転",
        "prompt": "線分の一端を固定し、もう一端を反時計回りに回す。図の緑の弧に沿って先端が動く距離は？",
        "figure": "<line x1=\"120\" y1=\"85\" x2=\"175\" y2=\"85\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"120\" y1=\"85\" x2=\"75.50406530937789\" y2=\"117.32818887608602\" stroke=\"#28506b\" stroke-width=\"2\"/><path d=\"M175 85 A55 55 0 1 0 75.50406530937789 117.32818887608602\" fill=\"none\" stroke=\"#258078\" stroke-width=\"4\"/><circle cx=\"120\" cy=\"85\" r=\"3\" fill=\"#28506b\" stroke=\"#28506b\"/><text x=\"145\" y=\"102\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">5 cm</text><text x=\"126\" y=\"147\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">中心角 216°</text>",
        "alt": "半径5 cm、回転角216度。",
        "choices": [
          "3π cm",
          "9π cm",
          "12π cm",
          "18π cm",
          "6π cm"
        ],
        "answer": "E",
        "explanation": "1周の長さは2π×5 cm。回転角は1周の216/360なので、移動距離は6π cm。"
      },
      {
        "topic": "その他の図形問題",
        "prompt": "長方形の右上から長方形を切り取った。残ったL字形の面積は？ 図は模式図。",
        "figure": "<polygon points=\"47,34 150,34 150,70 196,70 196,123 47,123\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"120\" y=\"140\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">16 cm</text><text x=\"24\" y=\"79\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">10 cm</text><text x=\"178\" y=\"57\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">6 cm</text><text x=\"215\" y=\"51\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">3 cm</text>",
        "alt": "外側が横16、縦10、切り取りが横6、縦3（cm）。",
        "choices": [
          "140 cm²",
          "141 cm²",
          "142 cm²",
          "143 cm²",
          "144 cm²"
        ],
        "answer": "C",
        "explanation": "元の長方形から切り取った長方形を引く。16×10－6×3＝142 cm²。"
      },
      {
        "topic": "グラフの領域（一次関数）",
        "prompt": "直線と両座標軸で囲まれた色付き領域の面積は？",
        "figure": "<polygon points=\"50,115 50,32 196,115\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"30\" y1=\"115\" x2=\"220\" y2=\"115\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"130\" x2=\"50\" y2=\"15\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"34\" y=\"32\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">10</text><text x=\"197\" y=\"131\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">8</text><text x=\"38\" y=\"130\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">O</text><text x=\"229\" y=\"115\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x</text><text x=\"51\" y=\"10\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">y</text>",
        "alt": "直線の切片はx軸で8、y軸で10。",
        "choices": [
          "38",
          "39",
          "41",
          "42",
          "40"
        ],
        "answer": "E",
        "explanation": "底辺8、高さ10の直角三角形なので、面積は8×10÷2＝40。"
      },
      {
        "topic": "グラフの領域（二次関数）",
        "prompt": "放物線 y＝x² と直線 y＝36 に挟まれた部分を考える。x＝4 の位置で、境界を含む領域にある整数の y はいくつか。",
        "figure": "<path d=\"M55 32 Q120 222 185 32 Z\" fill=\"#c4e2ee\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"37\" y1=\"127\" x2=\"204\" y2=\"127\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"120\" y1=\"138\" x2=\"120\" y2=\"16\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"212\" y=\"127\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x</text><text x=\"132\" y=\"12\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">y</text><text x=\"125\" y=\"148\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">模式図：上辺は水平</text>",
        "alt": "上が水平線、下が放物線の領域。",
        "choices": [
          "19",
          "20",
          "21",
          "22",
          "23"
        ],
        "answer": "C",
        "explanation": "x＝4で下端は16、上端は36。両端を含むので差に1を足すと21個。"
      },
      {
        "topic": "条件と領域",
        "prompt": "図の3条件を同時に満たす整数の組 (x, y) は何組あるか。斜辺上の点は除く。",
        "figure": "<polygon points=\"65,117 65,47 172,117\" fill=\"#bdddea\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"38\" y1=\"129\" x2=\"200\" y2=\"129\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"142\" x2=\"50\" y2=\"23\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"118\" y=\"35\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x＋y ＜ 8</text><text x=\"143\" y=\"148\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">x ≧ 1　 y ≧ 1</text>",
        "alt": "x≧1、y≧1、x＋y＜8。",
        "choices": [
          "19",
          "20",
          "22",
          "23",
          "21"
        ],
        "answer": "E",
        "explanation": "整数なので x＋y≦7 として数える。xを1から順に固定すると、選べるyの個数は6、5、4、3、2、1。合計21組。"
      },
      {
        "topic": "ブラックボックス",
        "prompt": "箱は入力に一定の数を掛け、一定の数を足す。左が入力、右が出力のとき、？はいくつか。",
        "figure": "<text x=\"41\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">2</text><line x1=\"55\" y1=\"31\" x2=\"195\" y2=\"31\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"16\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"31\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">6</text><text x=\"41\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">4</text><line x1=\"55\" y1=\"75\" x2=\"195\" y2=\"75\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"60\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"75\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">16</text><text x=\"41\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">11</text><line x1=\"55\" y1=\"119\" x2=\"195\" y2=\"119\" stroke=\"#28506b\" stroke-width=\"2\"/><rect x=\"86\" y=\"104\" width=\"76\" height=\"30\" fill=\"#e1eff6\" stroke=\"#28506b\"/><text x=\"124\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">同じ箱</text><text x=\"208\" y=\"119\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">?</text>",
        "alt": "2 → 6、4 → 16、11 → ?",
        "choices": [
          "49",
          "50",
          "51",
          "52",
          "53"
        ],
        "answer": "C",
        "explanation": "入力が2から4に増えると出力は10増えるため、倍率は5。入力2の例から加える数は-4。入力11では5×11＋(-4)＝51。"
      },
      {
        "topic": "物の流れと比率",
        "prompt": "入口で荷物をA・Bに分け、Aに届いた荷物をさらにC・Dに分ける。割合は各分岐に入った量を基準とする。入口に160個ある。Cに届くのは何個か。",
        "figure": "<line x1=\"50\" y1=\"77\" x2=\"125\" y2=\"38\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"50\" y1=\"77\" x2=\"125\" y2=\"117\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"125\" y1=\"38\" x2=\"216\" y2=\"25\" stroke=\"#28506b\" stroke-width=\"2\"/><line x1=\"125\" y1=\"38\" x2=\"216\" y2=\"77\" stroke=\"#28506b\" stroke-width=\"2\"/><text x=\"31\" y=\"77\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">入口</text><text x=\"81\" y=\"44\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">80%</text><text x=\"128\" y=\"19\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">A</text><text x=\"130\" y=\"129\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">B</text><text x=\"170\" y=\"18\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">75%</text><text x=\"230\" y=\"26\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">C</text><text x=\"231\" y=\"83\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#10283a\">D</text>",
        "alt": "入口→Aが80%、A→Cが75%。",
        "choices": [
          "94",
          "95",
          "97",
          "98",
          "96"
        ],
        "answer": "E",
        "explanation": "入口からCに届く割合は80/100×75/100＝60%。160×(6000/10000)＝96個。"
      }
    ]
  }
]);
home();
