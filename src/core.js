import { OLD_ID_MAP, CATALOG_IDS, CODECS } from './data.js';

const KEY="audition-log-v1";

let store={sessions:[],activeId:null};

function loadStore(){
  try{ const raw=localStorage.getItem(KEY); if(raw) store=JSON.parse(raw); }catch(e){}
  if(!store.sessions) store.sessions=[];
  if(!Array.isArray(store.compareIds)) store.compareIds=[];
  /* compareMakers は未定義のまま（初回は全メーカー選択）。配列なら尊重 */
  if(store.cmpMode!=="maker") store.cmpMode="session";
  store.sessions.forEach(migrateSession); /* 旧・位置ベースID → v2.2安定ID */
}
/* 旧IDキー（"01-0"等）を持つ ratings/notes/openMemo を安定IDへ移し替える（冪等） */
function migrateSession(s){
  ["ratings","notes","openMemo"].forEach(f=>{
    const src=s[f]; if(!src||typeof src!=="object") return;
    let changed=false; const out={};
    for(const k in src){
      if(k in OLD_ID_MAP){ changed=true; const nk=OLD_ID_MAP[k]; if(nk!=null) out[nk]=src[k]; } // null=除外曲は破棄
      else out[k]=src[k];
    }
    if(changed) s[f]=out;
  });
}
let saveTimer=null;
function persist(flash){
  if(saveTimer)clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    try{ localStorage.setItem(KEY,JSON.stringify(store)); }catch(e){}
    if(flash) showFlash();
  },200);
}
function showFlash(msg){
  const f=document.getElementById("flash"); if(msg)f.textContent=msg;
  f.classList.add("show"); clearTimeout(f._t); f._t=setTimeout(()=>f.classList.remove("show"),900);
}
function active(){ return store.sessions.find(s=>s.id===store.activeId); }
function today(){ return new Date().toISOString().slice(0,10); }
/* 現行カタログに含まれる評価だけを対象にする（孤児=旧リストの曲は集計から除外・保持はする） */
function catalogRatingValues(s){ const r=s.ratings||{}; return Object.keys(r).filter(k=>CATALOG_IDS.has(k)).map(k=>r[k]); }
function orphanCount(s){ return Object.keys(s.ratings||{}).filter(k=>!CATALOG_IDS.has(k)).length; }
function progress(s){ return catalogRatingValues(s).length; }
function goldCount(s){ return catalogRatingValues(s).filter(r=>r==="◎").length; }
/* 接続方式の表示テキスト（無線=コーデック / 有線=ケーブル） */
function connText(s){
  if(s.conn==="wireless") return s.codec?("無線 · "+s.codec):"無線";
  if(s.conn==="wired") return s.cable?("有線 · "+s.cable):"有線";
  return "";
}
/* コーデックselectを生成 */
function fillCodec(sel,val){
  sel.innerHTML='<option value="">— 選択 —</option>'+CODECS.map(c=>`<option value="${c}">${c}</option>`).join("");
  sel.value=val||"";
}
/* 接続セグメント＋条件付きフィールドの表示切替（prefix: "m" or "f"） */
function setConn(prefix,conn){
  const seg=document.getElementById(prefix+"ConnSeg");
  seg.querySelectorAll(".seg-btn").forEach(b=>b.classList.toggle("on",b.dataset.conn===conn));
  document.getElementById(prefix+"CodecField").style.display = conn==="wireless"?"flex":"none";
  document.getElementById(prefix+"CableField").style.display = conn==="wired"?"flex":"none";
}
function getConn(prefix){
  const on=document.getElementById(prefix+"ConnSeg").querySelector(".seg-btn.on");
  return on?on.dataset.conn:"";
}


export { KEY, store, loadStore, migrateSession, persist, showFlash, active, today, catalogRatingValues, orphanCount, progress, goldCount, connText, fillCodec, setConn, getConn };
