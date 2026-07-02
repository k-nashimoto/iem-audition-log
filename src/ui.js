import { CATALOG_VERSION, CATEGORIES, TRACKS, CATS, CATALOG_IDS, SUB_LABELS, subLabel, OLD_ID_MAP, RATES, SCORE, CODECS, APPS, MAKERS, TOTAL } from './data.js';
import { KEY, store, loadStore, migrateSession, persist, showFlash, active, today, catalogRatingValues, orphanCount, progress, goldCount, connText, fillCodec, setConn, getConn } from './core.js';

/* ---------- VIEWS ---------- */
function switchView(v){
  document.getElementById("viewList").classList.toggle("active",v==="list");
  document.getElementById("viewDetail").classList.toggle("active",v==="detail");
  document.getElementById("viewCompare").classList.toggle("active",v==="compare");
  document.getElementById("detailMeter").style.display = v==="detail"?"flex":"none";
  document.getElementById("hActions").style.display = v==="list"?"flex":"none";
  document.getElementById("btnBackHdr").style.display = v==="detail"?"flex":"none";
  const fab=document.getElementById("fabBack");
  fab.classList.toggle("show", v==="detail");
  if(v==="detail"){ fab.style.opacity="1"; fab.style.pointerEvents="auto"; } /* 表示時は既定で表示 */
  const titles={
    list:'<div class="h-title">試聴ログ<span class="sub">AUDITION LOG · PERSONAL REFERENCE</span></div>',
    detail:'<div class="h-title">試聴チェック</div>',
    compare:'<div class="h-title">機種比較<span class="sub">COMPARE · MATRIX</span></div>',
  };
  document.getElementById("hLeft").innerHTML = titles[v]||titles.list;
  document.querySelector("header").classList.toggle("v-detail", v==="detail"); /* タイトル中央寄せ用 */
  window.scrollTo(0,0);
}

function renderList(){
  const wrap=document.getElementById("sessions");
  const list=[...store.sessions].sort((a,b)=>(b.date||"").localeCompare(a.date||"")|| (b.createdAt-a.createdAt));
  if(list.length===0){
    wrap.innerHTML='<div class="empty">まだ記録がありません。<br>「＋ 新規試聴を記録」から始めましょう。</div>';
    return;
  }
  wrap.innerHTML=list.map(s=>{
    const p=progress(s), g=goldCount(s);
    return `<div class="session">
      <div class="session-main" data-open="${s.id}">
        ${s.maker?`<div class="session-maker">${esc(s.maker)}</div>`:""}
        <div class="session-iem">${esc(s.iem||"(機種名なし)")}</div>
        <div class="session-meta">
          <span class="session-date">${s.date||""}</span>
          ${s.source?`<span class="session-src">${esc(s.source)}</span>`:""}
        </div>
        ${(s.app||connText(s))?`<div class="session-meta">
          ${s.app?`<span class="session-src">▶ ${esc(s.app)}</span>`:""}
          ${connText(s)?`<span class="conn-chip ${s.conn}">${esc(connText(s))}</span>`:""}
        </div>`:""}
        <div class="session-stat">
          <div class="mini-bar"><div class="mini-fill" style="width:${p/TOTAL*100}%"></div></div>
          <span class="mini-num">${p}/${TOTAL}${g?` · <span class="g">◎${g}</span>`:""}</span>
        </div>
      </div>
      <button class="session-del" data-del="${s.id}" aria-label="削除">🗑</button>
    </div>`;
  }).join("");
  wrap.querySelectorAll("[data-open]").forEach(el=>el.onclick=()=>openSession(el.dataset.open));
  wrap.querySelectorAll("[data-del]").forEach(el=>el.onclick=()=>{
    const s=store.sessions.find(x=>x.id===el.dataset.del);
    if(confirm(`「${s?s.iem:""}」の記録を削除しますか？`)){
      const did=el.dataset.del;
      store.sessions=store.sessions.filter(x=>x.id!==did);
      store.compareIds=(store.compareIds||[]).filter(x=>x!==did);
      persist(true); renderList();
    }
  });
}

function openSession(id){
  store.activeId=id; persist();
  const s=active(); if(!s)return;
  document.getElementById("fMaker").value=s.maker||"";
  document.getElementById("fIem").value=s.iem||"";
  document.getElementById("fDate").value=s.date||today();
  document.getElementById("fSrc").value=s.source||"";
  document.getElementById("fApp").value=s.app||"";
  fillCodec(document.getElementById("fCodec"),s.codec);
  document.getElementById("fCable").value=s.cable||"";
  setConn("f",s.conn||"");
  renderCats(); updateMeter(); switchView("detail");
  growOpenMemos(); /* 表示確定後に開いているメモを全文高さへ */
}
/* 表示中の開いたメモtextareaを内容の高さに合わせる */
function growOpenMemos(){
  document.querySelectorAll(".memo.open textarea[data-nid]").forEach(ta=>{ if(ta.value) autoGrow(ta); });
}

let coreOnly=false; /* ★店頭コアのみ表示（一次スクリーニング用） */
/* サブ観点の現在の評価サマリー（例: 04a ◎ / 04b △ / 04c —） */
function subLiveSummary(cat,s){
  if(!cat.subs) return "";
  return `<div class="cat-sublive">`+cat.subs.map(sd=>{
    const rs=cat.tracks.filter(t=>t.sub&&t.sub.indexOf(sd.code)>=0).map(t=>(s.ratings||{})[t.id]).filter(Boolean);
    if(rs.length===0) return `<span class="sl"><b>${esc(sd.label)}</b> —</span>`;
    const avg=rs.reduce((a,r)=>a+SCORE[r],0)/rs.length, t=tone(avg);
    return `<span class="sl"><b>${esc(sd.label)}</b> <span class="t-${t}">${avgSym(avg)}</span></span>`;
  }).join("")+`</div>`;
}
function renderCats(){
  const s=active(); if(!s)return;
  s.ratings=s.ratings||{}; s.notes=s.notes||{}; s.openMemo=s.openMemo||{};
  const host=document.getElementById("cats"); host.innerHTML="";
  CATS.forEach(cat=>{
    const tracks = coreOnly ? cat.tracks.filter(t=>t.core) : cat.tracks;
    if(tracks.length===0) return; // コアのみ表示でコア曲が無いカテゴリは省略
    const sec=document.createElement("section"); sec.className="cat"+(cat.pri?" pri-"+cat.pri[1]:"");
    let pri=cat.pri?`<span class="pri ${cat.pri[1]}">${cat.pri[0]}</span>`:"";
    let subsLegend=cat.subs?`<div class="cat-subs">${cat.subs.map(sd=>`<div class="cat-sub-row" title="${esc(sd.code)}"><span class="sl-lbl">${esc(sd.label)}</span><span class="sd">${esc(sd.desc)}</span></div>`).join("")}</div>`:"";
    let hint=cat.hint?`<div class="cat-hint">💡 ${esc(cat.hint)}</div>`:"";
    let live=cat.subs?subLiveSummary(cat,s):"";
    let html=`<div class="cat-h"><div class="cat-no">${cat.no}</div>
      <div class="cat-meta"><div class="cat-title">${cat.title}${pri}</div>
      <div class="point">${cat.point}</div>${subsLegend}${hint}${live}</div></div>`;
    tracks.forEach(trk=>{
      const id=trk.id, rated=s.ratings[id], note=s.notes[id]||"", op=s.openMemo[id]||!!note;
      const star=trk.core?`<span class="core" title="店頭コア7">★</span>`:"";
      const subb=trk.sub?`<span class="subtag" title="${esc(trk.sub)}">${esc(subLabel(trk.sub))}</span>`:"";
      // 曲名とアーティストは全角ダッシュ " — " で連結。曲名=メイン／アーティスト=サブに分割表示
      const dash=trk.t.indexOf(" — ");
      const title=dash<0?trk.t:trk.t.slice(0,dash);
      const artist=dash<0?"":trk.t.slice(dash+3);
      let chips=RATES.map(r=>`<button class="rb ${rated===r?'on':''}" data-r="${r}" data-id="${id}">${r}</button>`).join("");
      html+=`<div class="trk ${rated?'done':''}" id="row-${id}">
        <div class="trk-row"><div class="trk-info"><div class="trk-t">${star}${subb}${esc(title)}</div>${artist?`<div class="trk-artist">${esc(artist)}</div>`:""}<div class="trk-a">${esc(trk.a)}</div></div>
        <div class="rate">${chips}</div></div>
        <button class="memo-toggle" data-mid="${id}">${note?'✎ メモあり':'＋ メモ'}</button>
        <div class="memo ${op?'open':''}" id="memo-${id}"><textarea data-nid="${id}" placeholder="気づいた点（艶・刺さり・空間 など）">${esc(note)}</textarea></div>
      </div>`;
    });
    sec.innerHTML=html; host.appendChild(sec);
  });
  // カタログ版・孤児評価の注記
  let info=`試聴リスト v${esc(CATALOG_VERSION)}`;
  if(s.catalogVersion && s.catalogVersion!==CATALOG_VERSION) info+=`（この記録は v${esc(s.catalogVersion)} で採点）`;
  const oc=orphanCount(s);
  if(oc>0) info+=`<br>⚠ 現行リストにない評価が <b>${oc}件</b> あります（旧バージョンの曲）。集計からは除外していますが、データは保持され書出にも含まれます。`;
  const infoEl=document.createElement("div"); infoEl.className="catalog-info"; infoEl.innerHTML=info;
  host.appendChild(infoEl);
  bindTracks();
}

/* textareaを内容の高さに合わせて自動拡大（全文が見える） */
function autoGrow(ta){ ta.style.height="auto";
  ta.style.height=(ta.scrollHeight + ta.offsetHeight - ta.clientHeight)+"px"; } /* border-box分(枠線)を加味 */

function bindTracks(){
  const s=active();
  document.querySelectorAll(".rb").forEach(b=>b.onclick=()=>{
    const id=b.dataset.id,r=b.dataset.r;
    if(s.ratings[id]===r)delete s.ratings[id]; else s.ratings[id]=r;
    persist(false);
    const row=document.getElementById("row-"+id);
    row.querySelectorAll(".rb").forEach(x=>x.classList.toggle("on",s.ratings[id]===x.dataset.r));
    row.classList.toggle("done",!!s.ratings[id]); updateMeter();
  });
  document.querySelectorAll(".memo-toggle").forEach(t=>t.onclick=()=>{
    const id=t.dataset.mid; s.openMemo[id]=!s.openMemo[id];
    const memo=document.getElementById("memo-"+id);
    memo.classList.toggle("open",s.openMemo[id]); persist(false);
    if(s.openMemo[id]) autoGrow(memo.querySelector("textarea")); /* 開いた時に全文に合わせる */
  });
  document.querySelectorAll("textarea[data-nid]").forEach(ta=>{
    ta.oninput=()=>{ const id=ta.dataset.nid; s.notes[id]=ta.value;
      const tg=document.querySelector('.memo-toggle[data-mid="'+id+'"]'); if(tg)tg.textContent=ta.value?'✎ メモあり':'＋ メモ';
      autoGrow(ta); persist(false); };
    ta.onblur=()=>persist(true);
    if(ta.value && ta.closest(".memo.open")) autoGrow(ta); /* 再表示時、保存済みメモを全文表示 */
  });
}

function updateMeter(){
  const s=active(); if(!s)return;
  const p=progress(s);
  document.getElementById("count").textContent=p+" / "+TOTAL;
  document.getElementById("fill").style.width=(p/TOTAL*100)+"%";
}

/* session header edits */
["fMaker","fIem","fDate","fSrc","fApp","fCable"].forEach(idn=>{
  const map={fMaker:"maker",fIem:"iem",fDate:"date",fSrc:"source",fApp:"app",fCable:"cable"};
  document.getElementById(idn).addEventListener("input",e=>{ const s=active(); if(s){ s[map[idn]]=e.target.value; persist(false);} });
  document.getElementById(idn).addEventListener("blur",()=>persist(true));
});
document.getElementById("btnCoreOnly").onclick=()=>{
  coreOnly=!coreOnly;
  document.getElementById("btnCoreOnly").classList.toggle("on",coreOnly);
  renderCats();
};
document.getElementById("fCodec").addEventListener("change",e=>{ const s=active(); if(s){ s.codec=e.target.value; persist(true);} });
document.getElementById("fConnSeg").addEventListener("click",e=>{
  const b=e.target.closest(".seg-btn"); if(!b)return;
  const s=active(); if(!s)return;
  const conn=b.dataset.conn;
  s.conn=conn;
  if(conn==="wired"){ s.codec=""; document.getElementById("fCodec").value=""; }
  else { s.cable=""; document.getElementById("fCable").value=""; }
  setConn("f",conn); persist(true);
});

/* new session modal */
const modal=document.getElementById("modal");
document.getElementById("btnNew").onclick=()=>{
  document.getElementById("mMaker").value="";
  document.getElementById("mIem").value="";
  document.getElementById("mDate").value=today();
  document.getElementById("mSrc").value="Cayin N7+ / Class A";
  document.getElementById("mApp").value="Apple Music";
  document.getElementById("mCable").value="";
  fillCodec(document.getElementById("mCodec"),"");
  setConn("m","wired"); /* 既定は有線 */
  modal.classList.add("open"); setTimeout(()=>document.getElementById("mMaker").focus(),50);
};
document.getElementById("mConnSeg").addEventListener("click",e=>{
  const b=e.target.closest(".seg-btn"); if(b) setConn("m",b.dataset.conn);
});
document.getElementById("mCancel").onclick=()=>modal.classList.remove("open");
modal.onclick=e=>{ if(e.target===modal) modal.classList.remove("open"); };
document.getElementById("mStart").onclick=()=>{
  const iem=document.getElementById("mIem").value.trim()||"(機種名なし)";
  const conn=getConn("m");
  const s={id:"s"+Date.now(),iem,maker:document.getElementById("mMaker").value.trim(),
    date:document.getElementById("mDate").value||today(),
    source:document.getElementById("mSrc").value.trim(),
    app:document.getElementById("mApp").value.trim(),
    conn,
    codec:conn==="wireless"?document.getElementById("mCodec").value:"",
    cable:conn==="wired"?document.getElementById("mCable").value.trim():"",
    catalogVersion:CATALOG_VERSION, /* 採点時の曲リスト版を記録 */
    createdAt:Date.now(),ratings:{},notes:{},openMemo:{}};
  store.sessions.push(s); persist(true); modal.classList.remove("open"); openSession(s.id);
};

const backToList=()=>{ store.activeId=null; persist(); renderList(); switchView("list"); window.scrollTo(0,0); };
document.getElementById("btnBackHdr").onclick=backToList;
document.getElementById("btnBackBottom").onclick=backToList;
document.getElementById("fabBack").onclick=backToList;

/* 最下部の戻るボタンが見えている間はフローティングを隠す（重複・干渉を防ぐ） */
if("IntersectionObserver" in window){
  const fab=document.getElementById("fabBack");
  const io=new IntersectionObserver(es=>{
    if(!document.getElementById("viewDetail").classList.contains("active"))return;
    fab.style.opacity = es[0].isIntersecting ? "0" : "1";
    fab.style.pointerEvents = es[0].isIntersecting ? "none" : "auto";
  },{root:null,threshold:0});
  io.observe(document.getElementById("btnBackBottom"));
}

/* 右スワイプで一覧へ戻る（詳細画面） */
(function(){
  let sx=0,sy=0,tracking=false;
  const dv=document.getElementById("viewDetail");
  dv.addEventListener("touchstart",e=>{
    if(e.touches.length!==1){ tracking=false; return; }
    sx=e.touches[0].clientX; sy=e.touches[0].clientY; tracking=true;
  },{passive:true});
  dv.addEventListener("touchend",e=>{
    if(!tracking)return; tracking=false;
    const t=e.changedTouches[0], dx=t.clientX-sx, dy=t.clientY-sy;
    if(dx>80 && Math.abs(dy)<50) backToList(); /* 横方向に十分・縦ブレ小 */
  },{passive:true});
})();

/* compare */
function tone(avg){
  if(avg===null) return null;
  if(avg>=3.5) return "gold";
  if(avg>=2.5) return "steel";
  if(avg>=1.5) return "caution";
  return "bad";
}
function avgSym(avg){
  if(avg===null) return null;
  if(avg>=3.5) return "◎";
  if(avg>=2.5) return "○";
  if(avg>=1.5) return "△";
  return "✕";
}
function catStat(s,cat){
  const rs=cat.tracks.map(trk=>(s.ratings||{})[trk.id]).filter(Boolean);
  if(rs.length===0) return {avg:null,gold:0,rated:0,total:cat.tracks.length};
  const sum=rs.reduce((a,r)=>a+SCORE[r],0);
  return {avg:sum/rs.length,gold:rs.filter(r=>r==="◎").length,rated:rs.length,total:cat.tracks.length};
}
function sessStat(s){
  const rs=catalogRatingValues(s); // 孤児評価は除外
  if(rs.length===0) return {avg:null,gold:0,rated:0,total:TOTAL};
  const sum=rs.reduce((a,r)=>a+SCORE[r],0);
  return {avg:sum/rs.length,gold:rs.filter(r=>r==="◎").length,rated:rs.length,total:TOTAL};
}
/* ---- メーカー別 集計 ---- */
const NO_MAKER="(メーカー未設定)";
function makerKey(s){ return (s.maker||"").trim()||NO_MAKER; }
function makerGroups(){
  const g={};
  store.sessions.forEach(s=>{ const k=makerKey(s); (g[k]=g[k]||[]).push(s); });
  return g; // { maker: [sessions] }
}
/* 複数 session をまたいでカテゴリ集計（rated=評価数, total=最大可能数） */
function aggCatStat(sessions,cat){
  let sum=0,n=0,gold=0; const total=cat.tracks.length*sessions.length;
  sessions.forEach(s=>cat.tracks.forEach(trk=>{
    const r=(s.ratings||{})[trk.id];
    if(r){ sum+=SCORE[r]; n++; if(r==="◎")gold++; }
  }));
  return n===0?{avg:null,gold:0,rated:0,total}:{avg:sum/n,gold,rated:n,total};
}
function aggSessStat(sessions){
  let sum=0,n=0,gold=0; const total=TOTAL*sessions.length;
  sessions.forEach(s=>catalogRatingValues(s).forEach(r=>{ sum+=SCORE[r]; n++; if(r==="◎")gold++; }));
  return n===0?{avg:null,gold:0,rated:0,total}:{avg:sum/n,gold,rated:n,total};
}
/* 得意（最高avg）・注意（最低avg）カテゴリを抽出 */
function makerTrend(sessions){
  const stats=CATS.map(c=>({cat:c,st:aggCatStat(sessions,c)})).filter(x=>x.st.avg!==null);
  if(stats.length===0) return null;
  const best=stats.reduce((a,b)=>b.st.avg>a.st.avg?b:a);
  const worst=stats.reduce((a,b)=>b.st.avg<a.st.avg?b:a);
  return {best,worst,multi:stats.length>1};
}
function cellHtml(st){
  if(st.avg===null) return `<div class="cmp-none">—</div>`;
  const t=tone(st.avg), pct=((st.avg-1)/3)*100, sym=avgSym(st.avg);
  return `<div class="cmp-bar"><div class="cmp-bar-fill t-${t}" style="width:${pct}%"></div></div>
    <div class="cmp-sym t-${t}">${sym}</div>
    <div class="cmp-sub">${st.gold?`<b>◎${st.gold}</b> · `:''}${st.rated}/${st.total}</div>`;
}
/* グリッド本体（行ヘッダ＋カテゴリ行＋合計行）を組み立てる共通処理 */
function buildGrid(cols){ // cols: [{label, sub, catStatFn, sumStat}]
  let html=`<div class="cmp-scroll"><div class="cmp-grid" style="--cols:${cols.length}">`;
  html+=`<div class="cmp-cell cmp-head"></div>`;
  cols.forEach(c=>{
    html+=`<div class="cmp-cell cmp-head"><div class="iem">${esc(c.label)}</div><div class="d">${esc(c.sub)}</div></div>`;
  });
  CATS.forEach(cat=>{
    const pri=cat.pri?`<span class="cpri ${cat.pri[1]}">${cat.pri[0]}</span>`:"";
    html+=`<div class="cmp-cell cmp-rowhead"><span class="cno">${cat.no}</span><span class="ct">${esc(cat.title)}</span>${pri}</div>`;
    cols.forEach(c=>{ html+=`<div class="cmp-cell cmp-data">${cellHtml(c.catStatFn(cat))}</div>`; });
  });
  html+=`<div class="cmp-cell cmp-foothead">合計</div>`;
  cols.forEach(c=>{ html+=`<div class="cmp-cell cmp-data cmp-foot">${cellHtml(c.sumStat)}</div>`; });
  html+=`</div></div>`;
  return html;
}

function renderCompare(){
  // モード切替ボタンの状態を反映
  document.querySelectorAll("#cmpMode .seg-btn").forEach(b=>b.classList.toggle("on",b.dataset.mode===store.cmpMode));
  if(store.cmpMode==="maker") renderCompareMaker(); else renderCompareSession();
}

function renderCompareSession(){
  store.compareIds=store.compareIds||[];
  const all=[...store.sessions].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.createdAt-a.createdAt));
  const validIds=new Set(all.map(s=>s.id));
  store.compareIds=store.compareIds.filter(id=>validIds.has(id));
  const sels=store.compareIds;

  document.getElementById("cmpInfo").textContent=`${sels.length} 機種選択中 / 全 ${all.length} 件`;

  const chipsHost=document.getElementById("cmpChips"), host=document.getElementById("cmpMatrix");
  if(all.length===0){
    chipsHost.innerHTML="";
    host.innerHTML=`<div class="cmp-empty">まだ記録がありません。<br>「＋ 新規試聴を記録」から始めましょう。</div>`;
    return;
  }
  chipsHost.innerHTML=all.map(s=>`<div class="cmp-chip ${sels.includes(s.id)?'on':''}" data-cid="${s.id}">
    <span class="iem">${esc(s.iem||"(機種名なし)")}</span><span class="d">${s.date||""}</span>
  </div>`).join("");

  const sessions=sels.map(id=>store.sessions.find(s=>s.id===id)).filter(Boolean);
  if(sessions.length===0){ host.innerHTML=`<div class="cmp-empty">上から比較する機種を選択してください。</div>`; return; }
  const cols=sessions.map(s=>({label:s.iem||"(機種名なし)",sub:s.date||"",catStatFn:cat=>catStat(s,cat),sumStat:sessStat(s)}));
  host.innerHTML=buildGrid(cols);
}

function renderCompareMaker(){
  const groups=makerGroups();
  // メーカーを試聴数の多い順→名前順で並べる
  const names=Object.keys(groups).sort((a,b)=>(groups[b].length-groups[a].length)||a.localeCompare(b,"ja"));
  const validNames=new Set(names);
  if(!Array.isArray(store.compareMakers)) store.compareMakers=names.slice(); // 初回のみ全メーカー
  else store.compareMakers=store.compareMakers.filter(m=>validNames.has(m)); // 既存選択は尊重（空なら空のまま）
  const sels=store.compareMakers;

  document.getElementById("cmpInfo").textContent=`${sels.length} メーカー選択中 / 全 ${names.length} 社`;

  const chipsHost=document.getElementById("cmpChips"), host=document.getElementById("cmpMatrix");
  if(names.length===0){
    chipsHost.innerHTML="";
    host.innerHTML=`<div class="cmp-empty">まだ記録がありません。<br>「＋ 新規試聴を記録」から始めましょう。</div>`;
    return;
  }
  chipsHost.innerHTML=names.map(m=>`<div class="cmp-chip ${sels.includes(m)?'on':''}" data-cmk="${esc(m)}">
    <span class="iem">${esc(m)}</span><span class="d">${groups[m].length}件</span>
  </div>`).join("");

  const picked=names.filter(m=>sels.includes(m));
  if(picked.length===0){ host.innerHTML=`<div class="cmp-empty">上から集計するメーカーを選択してください。</div>`; return; }

  const cols=picked.map(m=>({label:m,sub:`${groups[m].length}件`,catStatFn:cat=>aggCatStat(groups[m],cat),sumStat:aggSessStat(groups[m])}));
  let html=buildGrid(cols);

  // 傾向サマリー（得意／注意カテゴリ）
  html+=`<div class="cmp-trend"><div class="cmp-trend-h">傾向（得意 / 注意カテゴリ）</div>`;
  picked.forEach(m=>{
    const tr=makerTrend(groups[m]), ss=aggSessStat(groups[m]);
    const av=ss.avg!==null?` 平均${ss.avg.toFixed(2)}${ss.gold?` · ◎${ss.gold}`:""}`:" 未評価";
    html+=`<div class="cmp-trend-card"><div class="mk">${esc(m)}<span class="n">${groups[m].length}件</span><span class="av">${av}</span></div>`;
    if(!tr){
      html+=`<div class="cmp-trend-row"><span class="ct" style="color:var(--txt3)">評価データがまだありません。</span></div>`;
    }else{
      const row=(cls,lbl,x)=>{const t=tone(x.st.avg);return `<div class="cmp-trend-row"><span class="lbl ${cls}">${lbl}</span>
        <span class="ct">${esc(x.cat.no)} ${esc(x.cat.title)}</span>
        <span class="sym t-${t}">${avgSym(x.st.avg)} ${x.st.avg.toFixed(2)}</span></div>`;};
      html+=row("good","得意",tr.best);
      if(tr.multi) html+=row("warn","注意",tr.worst); // カテゴリが1つしか評価されていない場合は注意行を省略
    }
    html+=`</div>`;
  });
  html+=`</div>`;
  host.innerHTML=html;
}

document.getElementById("btnCompare").onclick=()=>{ renderCompare(); switchView("compare"); };
document.getElementById("btnBackCmp").onclick=()=>{ renderList(); switchView("list"); };
document.getElementById("cmpMode").onclick=e=>{
  const b=e.target.closest("[data-mode]"); if(!b)return;
  store.cmpMode=b.dataset.mode; persist(false); renderCompare();
};
document.getElementById("cmpChips").onclick=e=>{
  const chip=e.target.closest("[data-cid],[data-cmk]"); if(!chip)return;
  if(store.cmpMode==="maker"){
    const m=chip.dataset.cmk; store.compareMakers=store.compareMakers||[];
    const i=store.compareMakers.indexOf(m);
    if(i>=0) store.compareMakers.splice(i,1); else store.compareMakers.push(m);
  }else{
    const id=chip.dataset.cid; store.compareIds=store.compareIds||[];
    const i=store.compareIds.indexOf(id);
    if(i>=0) store.compareIds.splice(i,1); else store.compareIds.push(id);
  }
  persist(false); renderCompare();
};
document.getElementById("cmpSelAll").onclick=()=>{
  if(store.cmpMode==="maker") store.compareMakers=Object.keys(makerGroups());
  else store.compareIds=store.sessions.map(s=>s.id);
  persist(false); renderCompare();
};
document.getElementById("cmpSelNone").onclick=()=>{
  if(store.cmpMode==="maker") store.compareMakers=[]; else store.compareIds=[];
  persist(false); renderCompare();
};

/* export / import */
document.getElementById("btnExport").onclick=()=>{
  const blob=new Blob([JSON.stringify(store,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download="audition-log-"+today()+".json"; a.click(); URL.revokeObjectURL(a.href);
};
document.getElementById("btnImport").onclick=()=>document.getElementById("fileInput").click();
document.getElementById("fileInput").onchange=e=>{
  const file=e.target.files[0]; if(!file)return;
  const rd=new FileReader();
  rd.onload=()=>{ try{
    const data=JSON.parse(rd.result); const inc=data.sessions||[];
    const map={}; store.sessions.forEach(s=>map[s.id]=s);
    let added=0,overwritten=0,skipped=0;
    inc.forEach(s=>{
      if(map[s.id]){ // 同一idが既存 → 上書き可否を確認（キャンセルで該当ログのマージをスキップ）
        const label=`${s.maker?s.maker+" ":""}${s.iem||"(機種名なし)"}${s.date?" / "+s.date:""}`;
        const ok=confirm(`同じ記録が既に存在します。\n「${label}」\n\n現端末のデータを読込データで上書きしますか？\n\n［OK＝上書き ／ キャンセル＝この記録はスキップ］`);
        if(ok){ map[s.id]=s; overwritten++; } else { skipped++; }
      } else { map[s.id]=s; added++; } // 新規idは追加
    });
    store.sessions=Object.values(map); persist(true); renderList();
    showFlash(`読込：追加${added}・上書き${overwritten}・スキップ${skipped}`);
  }catch(err){ alert("読込に失敗しました（JSON形式を確認してください）"); } };
  rd.readAsText(file); e.target.value="";
};

function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

/* init */
document.getElementById("appList").innerHTML=APPS.map(a=>`<option value="${esc(a)}"></option>`).join("");
document.getElementById("makerList").innerHTML=MAKERS.map(m=>`<option value="${esc(m)}"></option>`).join("");
loadStore(); renderList(); switchView("list");
