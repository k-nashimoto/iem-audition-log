/* エントリポイント：UI（副作用でビュー初期化）を読み込み、Service Worker を登録 */
import './ui.js';

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("./sw.js").catch(()=>{}); /* 失敗しても本体は動く */
  });
}
