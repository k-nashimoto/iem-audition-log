/* ===== カタログ（曲リスト定義）と評価データを分離 =====
   ・CATEGORIES … カテゴリ定義（メタ）
   ・TRACKS     … 曲リスト（source of truth）。cat で所属カテゴリを参照。id は安定slug。
   ・CATS       … 上2つを結合した描画用ビュー（既存の描画/集計コードはこれを使う）
   評価データ（session.ratings 等）は TRACKS の id を参照するだけなので、
   曲の追加・削除・並べ替え・サブ観点付け替えをしても過去の評価は壊れない。
   曲リストを改訂したら CATALOG_VERSION を上げる（session に採点時の版を記録）。 */
const CATALOG_VERSION="2.3";
const CATEGORIES=[
  {no:"00",title:"装着・シールの確認",pri:["最初に","seal"],
   point:"深いシール確保／左右の低域量の一致／遮音／ノイズフロア。備考に使用イヤピース（サイズ・型番）を記録。"},
  {no:"01",title:"ボーカルの艶・生々しさ",pri:["最重視","top"],
   point:"声に体温・色気・口の動きの生々しさがあり、薄く冷たくならないか。",
   subs:[{code:"01a",label:"女性ボーカル",desc:"艶・湿度・ブレスの生々しさ"},
         {code:"01b",label:"男性ボーカル",desc:"声の温度・胸の共鳴・中低域の厚み。VE10との補完性判定に使用"}]},
  {no:"02",title:"キラキラ vs 刺さり",pri:["重要・感度","sens"],
   point:"きらめき・空気感がありつつ刺さらないか。大音量の刺さり（踊）と小音量ウィスパーの「静かな刺さり」（EASY）の両方を確認。刺さり（サ行・8〜10kHzピーク）が出たら即減点、以降の評価を打ち切ってよい。"},
  {no:"03",title:"締まったグルーヴ低域",pri:null,
   point:"キックの締まり／ベースラインの音程追従性／boomyなら✕。量より質。"},
  {no:"04",title:"包まれる没入・空間スケール",pri:["決定軸","axis"],
   point:"音が前方だけでなく頭の周囲・上下・後方に回り込み、ホールにいる没入が出るか。",
   subs:[{code:"04a",label:"ホール残響型",desc:"残響が後方・上方へ回り込むか"},
         {code:"04b",label:"音壁型",desc:"積層する音に包囲されるか、サブベースの床の沈み"},
         {code:"04c",label:"コーラス包囲型",desc:"声が360°を取り囲むか"}],
   hint:"◎は ホール残響型／音壁型／コーラス包囲型 の3タイプすべて○以上が条件。"},
  {no:"05",title:"生音感（実在感・空気・余韻）",pri:null,
   point:"楽器がその空間で鳴り、倍音と余韻が自然に減衰していく実在感。VE10=(A)型、2台目候補は(B)型の強さを重点確認。",
   subs:[{code:"05a",label:"温度・実体型(A)",desc:"打鍵の芯・木質感・金管の温度"},
         {code:"05b",label:"空気・余韻型(B)",desc:"余韻の消え際・倍音のきらめき・部屋鳴り"}]},
  {no:"06",title:"ダイナミクス・強奏",pri:null,
   point:"強奏で圧縮されず physical に伸びるか、混雑しても崩れず分離を保つか。",
   subs:[{code:"06a",label:"立ち上がり",desc:"ファンファーレの瞬発力"},
         {code:"06b",label:"飽和耐性",desc:"強奏でうるさくならないか"},
         {code:"06c",label:"漸強クレッシェンド",desc:"音量上昇中に音場が広がり続けるか、天井に張り付かないか"}]},
  {no:"07",title:"解像・分離・一体感",pri:null,
   point:"情報過多ミックスの混濁チェック／合唱の「分離しつつ一体」。"},
  {no:"EX",title:"番外（愛着枠）",pri:null,
   point:"評価軸ではなく愛着枠。Apple Musicのみ。"},
];
/* 曲リスト（source of truth）。改訂はこの配列を編集するだけ。 */
const TRACKS=[
  {id:"bad-guy",cat:"00",core:true,t:"bad guy — ビリー・アイリッシュ",a:"冒頭ベースの沈み・左右差・遮音。シールが甘いと真っ先に低域が痩せる"},
  {id:"sore-wo-ai",cat:"01",sub:"01a",t:"それを愛と呼ぶなら — Uru",a:"低めの声の温度・湿度"},
  {id:"first-love",cat:"01",sub:"01a",t:"First Love (Remastered 2014) — 宇多田ヒカル",a:"艶＋録音由来のサ行を増幅するか"},
  {id:"love-wins-all",cat:"01",sub:"01a",t:"Love wins all — IU",a:"繊細な高域の声・ラスサビの伸び"},
  {id:"melody",cat:"01",sub:"01b",t:"メロディー — 玉置浩二",a:"ア・カペラ序盤の温度、サビの艶維持"},
  {id:"kataomoi",cat:"01",sub:"01a→05b",core:true,t:"カタオモイ - From THE FIRST TAKE — Aimer",a:"部屋鳴り・ブレス・リップノイズ（一発録りの生声・余韻の基準曲）"},
  {id:"odo",cat:"02",core:true,t:"踊 — Ado",a:"叫び・エッジで痛みが出たら即減点"},
  {id:"idol",cat:"02",t:"アイドル — YOASOBI",a:"高密度＋高音の抜け"},
  {id:"i-am",cat:"02",t:"I AM — IVE",a:"高音圧マスターで団子にならないか"},
  {id:"easy",cat:"02",t:"EASY — LE SSERAFIM",a:"静かな刺さり（小音量サ行）"},
  {id:"get-lucky",cat:"03",t:"Get Lucky — ダフト・パンク, Pharrell & ナイル・ロジャース",a:"キックの締まり・体がノるか"},
  {id:"sun",cat:"03",core:true,t:"SUN — 星野源",a:"ベースラインの音程追従性"},
  {id:"ditto",cat:"03",t:"Ditto — NewJeans",a:"低域が緩いと曇る（雰囲気チェック）"},
  {id:"merry-go-round",cat:"04",sub:"04a",t:"Merry-Go-Round of Life（ハウル） — 久石譲 & ロイヤル・フィル",a:"残響の後方回り込み"},
  {id:"time",cat:"04",sub:"04b",core:true,t:"Time — Hans Zimmer",a:"音壁の包囲・サブベースの床"},
  {id:"inisie-no-uta",cat:"04",sub:"04c",t:"イニシエノウタ — NieR:Automata",a:"コーラスの360°包囲"},
  {id:"hedwig",cat:"04",t:"ヘドウィグのテーマ（ハリー・ポッター） — ジョン・ウィリアムズ",a:"チェレスタのきらめき＋奥行き"},
  {id:"ashitaka",cat:"04",t:"アシタカとサン — 久石譲",a:"弦のうねり・大編成スケール"},
  {id:"one-summers-day",cat:"05",sub:"05a+05b",t:"One Summer's Day（千と千尋） — 久石譲 & ロイヤル・フィル",a:"打鍵の芯と余韻の両立"},
  {id:"mcml",cat:"05",sub:"05a/05b",t:"Merry Christmas Mr. Lawrence — 坂本龍一",a:"芯と消え際の切り分け"},
  {id:"olympic-fanfare",cat:"06",sub:"06a",core:true,t:"Olympic Fanfare — John Williams (Berlin Concert)",a:"立ち上がり速度・静→強レンジ"},
  {id:"kaizoku",cat:"06",sub:"06b",t:"彼こそが海賊（パイレーツ） — クラウス・バデルト",a:"強奏の飽和・うるささ"},
  {id:"jurassic-park",cat:"06",sub:"06c",t:"Theme from Jurassic Park — John Williams (in Vienna)",a:"漸強・ホルンの温度と艶（温度・実体型(A)も兼ねる）"},
  {id:"kick-back",cat:"07",core:true,t:"KICK BACK — 米津玄師",a:"混濁したら✕"},
  {id:"gunjo",cat:"07",t:"群青 — YOASOBI",a:"合唱の分離と一体感"},
  {id:"orange",cat:"07",t:"オレンジ — SPYAIR",a:"ギター左右・シンバルの質"},
  {id:"jokyoku-march",cat:"EX",t:"序曲のマーチ (V)（ドラクエV） — すぎやまこういち",a:"金管ファンファーレと弦の堂々たる強奏"},
];
/* 描画・集計用ビュー（カテゴリ定義＋所属トラックを結合） */
const CATS=CATEGORIES.map(c=>({...c,tracks:TRACKS.filter(t=>t.cat===c.no)}));
/* 現行カタログに存在する track id の集合（孤児評価の判定に使用） */
const CATALOG_IDS=new Set(TRACKS.map(t=>t.id));
/* サブ観点コード→ラベル（内部IDは 01a のまま、表示は「女性ボーカル」に） */
const SUB_LABELS={};
CATEGORIES.forEach(c=>(c.subs||[]).forEach(sd=>{ SUB_LABELS[sd.code]=sd.label; }));
/* "01b→05b" / "05a+05b" 等のコードをラベルへ（区切り記号→+/は保持） */
function subLabel(sub){ return sub ? sub.replace(/\d{2}[a-z]/g,c=>SUB_LABELS[c]||c) : ""; }
/* 旧・位置ベースID → 新・安定ID の移行表（null=v2.2で除外した曲＝評価破棄） */
const OLD_ID_MAP={
  "00-0":"bad-guy",
  "01-0":"first-love","01-1":"sore-wo-ai","01-2":null,"01-3":"kataomoi","01-4":"love-wins-all",
  "02-0":"i-am","02-1":"odo","02-2":"easy","02-3":"idol",
  "03-0":"get-lucky","03-1":null,"03-2":"ditto",
  "04-0":"ashitaka","04-1":"merry-go-round","04-2":"hedwig",
  "05-0":"one-summers-day",
  "06-0":"kaizoku","06-1":"jokyoku-march",
  "07-0":"kick-back","07-1":"gunjo","07-2":"orange"
};
const RATES=["◎","○","△","✕"];
const SCORE={"◎":4,"○":3,"△":2,"✕":1};
/* 一般的なBluetoothオーディオコーデック（高音質→標準の順） */
const CODECS=["LDAC","LHDC","aptX Lossless","aptX Adaptive","aptX HD","aptX","AAC","SBC","LC3"];
/* 主な音楽再生アプリ（入力候補） */
const APPS=["Apple Music","Qobuz","Amazon Music","TIDAL","Spotify","YouTube Music","mora qualitas","ローカル/DAP内"];
/* 主なハイエンドIEMメーカー（入力候補・表記揺れ防止／メーカー別分析の基盤） */
const MAKERS=["Vision Ears","Noble Audio","64 Audio","Empire Ears","Campfire Audio","Fir Audio",
  "qdc","Unique Melody","Elysian Acoustic Labs","Softears","Oriolus","JH Audio","Subtonic","Aroma Audio",
  "FatFreq","Sony","Final","Astell&Kern","Sennheiser","Shure","Westone"];
const TOTAL=CATS.reduce((s,c)=>s+c.tracks.length,0);

export { CATALOG_VERSION, CATEGORIES, TRACKS, CATS, CATALOG_IDS, SUB_LABELS, subLabel, OLD_ID_MAP, RATES, SCORE, CODECS, APPS, MAKERS, TOTAL };
