/* ===== カタログ（曲リスト定義）と評価データを分離 =====
   ・CATEGORIES … カテゴリ定義（メタ）
   ・TRACKS     … 曲リスト（source of truth）。cat で所属カテゴリを参照。id は安定slug。
   ・CATS       … 上2つを結合した描画用ビュー（既存の描画/集計コードはこれを使う）
   評価データ（session.ratings 等）は TRACKS の id を参照するだけなので、
   曲の追加・削除・並べ替え・サブ観点付け替えをしても過去の評価は壊れない。
   曲リストを改訂したら CATALOG_VERSION を上げる（session に採点時の版を記録）。 */
const APP_VERSION="1.3.7"; /* アプリのバージョン（リリースごとに更新・一覧左下に表示） */
const CATALOG_VERSION="3.3";
/* 複数試聴リスト（タグ方式）。各リストは TRACKS の lists 配列（1:N タグ）で所属を表現。
   標準(std)＝マルチリスト導入前の厳選リストがベース（以後 SUN→ルパン'78/シュガーソング等の調整あり）。ジャンル別リストと曲を共有するが、標準では
   一部の曲のカテゴリ/サブ観点/コア/備考を ov[listId] で導入前の定義に上書きして再現する。 */
const LISTS=[
  {id:"std",name:"標準",all:false},
  {id:"vocal",name:"声モノ（J-POP/K-POP）"},
  {id:"inst",name:"インスト（サントラ/OST）"},
  {id:"classic",name:"クラシック"},
];
const DEFAULT_LIST="std";
const CATEGORIES=[
  {no:"00",title:"装着・シールの確認",pri:["最初に","seal"],
   point:"深いシール確保／左右の低域量の一致／遮音／ノイズフロア。備考に使用イヤピース（サイズ・型番）を記録。"},
  {no:"01",title:"ボーカルの艶・生々しさ",short:"艶・生々しさ",pri:["最重視","top"],
   point:"声に体温・色気・口の動きの生々しさがあり、薄く冷たくならないか。",
   subs:[{code:"01a",label:"女性ボーカル",desc:"艶・湿度・ブレスの生々しさ"},
         {code:"01b",label:"男性ボーカル",desc:"声の温度・胸の共鳴・中低域の厚み。VE10との補完性判定に使用"}]},
  {no:"02",title:"キラキラ vs 刺さり",short:"きらめき",pri:["重要・感度","sens"],
   point:"きらめき・空気感がありつつ刺さらないか。大音量の刺さり（踊）と小音量ウィスパーの「静かな刺さり」（EASY）の両方を確認。刺さり（サ行・8〜10kHzピーク）が出たら即減点、以降の評価を打ち切ってよい。"},
  {no:"03",title:"締まったグルーヴ低域",short:"低域",pri:null,
   point:"キックの締まり／ベースラインの音程追従性／boomyなら✕。量より質。"},
  {no:"04",title:"包まれる没入・空間スケール",short:"没入・空間",pri:["決定軸","axis"],
   point:"音が前方だけでなく頭の周囲・上下・後方に回り込み、ホールにいる没入が出るか。",
   subs:[{code:"04a",label:"ホール残響型",desc:"残響が後方・上方へ回り込むか"},
         {code:"04b",label:"音壁型",desc:"積層する音に包囲されるか、サブベースの床の沈み"},
         {code:"04c",label:"コーラス包囲型",desc:"声が360°を取り囲むか"}],
   hint:"◎は ホール残響型／音壁型／コーラス包囲型 の3タイプすべて○以上が条件。"},
  {no:"05",title:"生音感（実在感・空気・余韻）",short:"生音感",pri:null,
   point:"楽器がその空間で鳴り、倍音と余韻が自然に減衰していく実在感。VE10=(A)型、2台目候補は(B)型の強さを重点確認。",
   subs:[{code:"05a",label:"温度・実体型(A)",desc:"打鍵の芯・木質感・金管の温度"},
         {code:"05b",label:"空気・余韻型(B)",desc:"余韻の消え際・倍音のきらめき・部屋鳴り"}]},
  {no:"06",title:"ダイナミクス・強奏",short:"強奏",pri:null,
   point:"強奏で圧縮されず physical に伸びるか、混雑しても崩れず分離を保つか。",
   subs:[{code:"06a",label:"立ち上がり",desc:"ファンファーレの瞬発力"},
         {code:"06b",label:"飽和耐性",desc:"強奏でうるさくならないか"},
         {code:"06c",label:"漸強クレッシェンド",desc:"音量上昇中に音場が広がり続けるか、天井に張り付かないか"}]},
  {no:"07",title:"解像・分離・一体感",short:"解像・分離",pri:null,
   point:"情報過多ミックスの混濁チェック／合唱の「分離しつつ一体」。"},
  {no:"EX",title:"番外（愛着枠）",pri:null,
   point:"評価軸ではなく愛着枠。Apple Musicのみ。"},
];
/* 曲リスト（source of truth）。改訂はこの配列を編集するだけ。
   lists: 所属リストのタグ（1:N）。標準(std)も含めタグで表現し、リスト別の差異は ov[listId] で上書きする。 */
const TRACKS=[
  // 共通(装着)
  {id:"bad-guy",cat:"00",core:true,lists:["vocal","inst","classic","std"],t:"bad guy — ビリー・アイリッシュ",a:"冒頭ベースの沈み・左右差・遮音。シールが甘いと真っ先に低域が痩せる"},
  // === 声モノ vocal ===
  {id:"first-love",cat:"01",sub:"01a",core:true,lists:["vocal","std"],ov:{std:{core:false}},t:"First Love (Remastered 2014) — 宇多田ヒカル",a:"女性ボーカルの艶／録音由来のサ行を増幅するか"},
  {id:"sore-wo-ai",cat:"01",sub:"01a",lists:["vocal","std"],t:"それを愛と呼ぶなら — Uru",a:"透明な声の質感・低めの声の温度"},
  {id:"love-wins-all",cat:"01",sub:"01a",lists:["vocal","std"],t:"Love wins all — IU",a:"クリーンで情感的、刺さらず艶"},
  {id:"bansanka",cat:"01",sub:"01a",lists:["vocal"],t:"晩餐歌 [Live at NIPPON BUDOKAN] — tuki.",a:"ライブ音源の生々しさ・会場の空気"},
  {id:"junrenai-ingot",cat:"01",sub:"01a",lists:["vocal"],t:"純恋愛のインゴット [Live at NIPPON BUDOKAN] — tuki.",a:"ライブの声の実体・余韻"},
  {id:"kataomoi",cat:"01",sub:"01a→05b",core:true,lists:["vocal","std"],t:"カタオモイ - From THE FIRST TAKE — Aimer",a:"部屋鳴り・ブレス・リップノイズ（一発録りの生声・余韻の基準曲）"},
  {id:"melody",cat:"01",sub:"01b",lists:["vocal","std"],t:"メロディー — 玉置浩二",a:"男性ボーカルの艶。ア・カペラ序盤の温度、サビの艶維持"},
  {id:"i-am",cat:"02",core:true,lists:["vocal","std"],ov:{std:{core:false}},t:"I AM — IVE",a:"明るく硬めのマスタリング＝刺さり負荷"},
  {id:"odo",cat:"02",core:true,lists:["vocal","std"],t:"踊 — Ado",a:"叫び・エッジ・サ行で痛みが出たら即減点"},
  {id:"easy",cat:"02",lists:["vocal","std"],t:"EASY — LE SSERAFIM",a:"シャープなハイハットとサ行（静かな刺さり）"},
  {id:"ditto",cat:"03",core:true,lists:["vocal","std"],ov:{std:{core:false}},t:"Ditto — NewJeans",a:"控えめで締まったベースのグルーヴ"},
  {id:"kimi-wa-tennenshoku",cat:"03",lists:["vocal"],t:"君は天然色 — 川崎鷹也",a:"大滝詠一カバー(松本隆トリビュート)／シティポップの締まった低域"},
  {id:"bara-no-hana",cat:"03",lists:["vocal"],t:"ばらの花 — くるり",a:"締まったバンド低域と余白・空気感"},
  {id:"find-the-way",cat:"04",core:true,lists:["vocal"],t:"FIND THE WAY — 中島美嘉",a:"壮大な残響と厚い音の層に包まれる没入"},
  {id:"himawari-no-yakusoku",cat:"05",lists:["vocal"],t:"ひまわりの約束 — 秦基博",a:"アコギと声の胴鳴り・実体感"},
  {id:"homura",cat:"06",lists:["vocal"],t:"炎 — LiSA",a:"静→強唱の伸び、圧縮されないか"},
  {id:"kick-back",cat:"07",core:true,lists:["vocal"],t:"KICK BACK — 米津玄師",a:"高密度・多帯域のまとまり（混濁したら✕）"},
  {id:"gunjo",cat:"07",lists:["vocal","std"],t:"群青 — YOASOBI",a:"緻密なレイヤリングの分離"},
  {id:"ao-to-natsu",cat:"07",lists:["vocal"],t:"青と夏 — Mrs. GREEN APPLE",a:"疾走バンドの各パート分離"},
  // === インスト inst ===（01は独奏楽器の艶に読み替え・subは付けない）
  {id:"chairmans-waltz",cat:"01",lists:["inst"],t:"The Chairman's Waltz（SAYURI） — ジョン・ウィリアムズ",a:"ヴァイオリン独奏(Itzhak Perlman)の艶"},
  {id:"time",cat:"01",core:true,lists:["inst","std"],ov:{std:{cat:"04",sub:"04b",a:"音壁の包囲・サブベースの床"}},t:"Time — Hans Zimmer",a:"チェロ/弦の旋律の艶と余韻（インセプション）"},
  {id:"majo-town",cat:"02",lists:["inst"],t:"A Town with an Ocean View（魔女の宅急便） — 久石譲",a:"チェレスタ/木管のきらめきと刺さり"},
  {id:"the-battle",cat:"03",core:true,lists:["inst"],t:"The Battle（グラディエーター） — Hans Zimmer",a:"太鼓と低弦の締まった推進力"},
  {id:"ashitaka",cat:"04",sub:"04a",core:true,lists:["inst","std"],ov:{std:{core:false}},t:"アシタカとサン — 久石譲",a:"雄大な管弦の包まれ感・残響"},
  {id:"merry-go-round",cat:"04",sub:"04a",lists:["inst","std"],t:"Merry-Go-Round of Life（ハウル） — 久石譲",a:"ワルツの残響の後方回り込み"},
  {id:"hedwig",cat:"04",lists:["inst","std"],t:"ヘドウィグのテーマ（ハリー・ポッター） — ジョン・ウィリアムズ",a:"チェレスタのきらめき＋奥行き"},
  {id:"inisie-no-uta",cat:"04",sub:"04c",lists:["inst","std"],t:"イニシエノウタ — NieR:Automata",a:"コーラスの360°包囲"},
  {id:"one-summers-day",cat:"05",sub:"05a+05b",core:true,lists:["inst","std"],ov:{std:{core:false}},t:"One Summer's Day（千と千尋） — 久石譲 & ロイヤル・フィル",a:"ピアノの余韻・ホールの空気"},
  {id:"schindlers-list",cat:"05",sub:"05b",lists:["inst"],t:"Theme from Schindler's List — ジョン・ウィリアムズ",a:"独奏Vn(Perlman)の松脂感・弓の擦れ"},
  {id:"mcml",cat:"05",sub:"05a/05b",lists:["inst","std"],t:"Merry Christmas Mr. Lawrence — 坂本龍一",a:"ピアノの芯と消え際"},
  {id:"kaizoku",cat:"06",sub:"06b",core:true,lists:["inst","std"],ov:{std:{core:false}},t:"彼こそが海賊（パイレーツ・オブ・カリビアン） — クラウス・バデルト",a:"疾走する強奏の畳みかけ・飽和耐性"},
  {id:"one-winged-angel",cat:"06",sub:"06b",lists:["inst"],t:"One-Winged Angel（FFVII） — 植松伸夫",a:"合唱＋管弦の爆発（実演盤があればLive）"},
  {id:"olympic-fanfare",cat:"06",sub:"06a",core:true,lists:["inst","std"],t:"Olympic Fanfare — ジョン・ウィリアムズ",a:"金管ファンファーレの立ち上がり速度・静→強"},
  {id:"imperial-march",cat:"07",lists:["inst"],t:"The Imperial March（スター・ウォーズ） — ジョン・ウィリアムズ",a:"大編成の定位と分離"},
  {id:"jurassic-park",cat:"07",lists:["inst","std"],ov:{std:{cat:"06",sub:"06c",a:"漸強・ホルンの温度と艶（温度・実体型(A)も兼ねる）"}},t:"Theme from Jurassic Park — ジョン・ウィリアムズ",a:"伸びやかな主題での分離・一体感"},
  // === クラシック classic ===（01は独奏楽器の艶・subなし）
  {id:"thais-meditation",cat:"01",core:true,lists:["classic"],t:"タイスの瞑想曲 — マスネ",a:"Vn独奏の艶と弓の質感、刺さらず伸びるか"},
  {id:"chopin-nocturne",cat:"01",lists:["classic"],t:"ノクターン第2番 変ホ長調 Op.9-2 — ショパン",a:"ピアノの歌う艶と余韻"},
  {id:"marcello-oboe",cat:"01",lists:["classic"],t:"オーボエ協奏曲 ハ長調 第2楽章 — マルチェッロ",a:"オーボエの温度感・実体"},
  {id:"ravel-pavane",cat:"01",lists:["classic"],t:"亡き王女のためのパヴァーヌ — ラヴェル",a:"ホルン/木管の柔らかな艶"},
  {id:"vivaldi-spring",cat:"02",core:true,lists:["classic"],t:"「四季」より春 第1楽章 — ヴィヴァルディ",a:"高音Vnの輝きと刺さり"},
  {id:"tchaikovsky-pizzicato",cat:"03",lists:["classic"],t:"交響曲第4番 第3楽章「ピチカート」 — チャイコフスキー",a:"弦ピチカートの締まりと分離"},
  {id:"heroic-polonaise",cat:"03",core:true,lists:["classic"],t:"英雄ポロネーズ Op.53 — ショパン",a:"ピアノ左手の力強い打鍵と推進力"},
  {id:"ode-to-joy",cat:"04",sub:"04c",core:true,lists:["classic"],t:"交響曲第9番「歓喜の歌」第4楽章 — ベートーヴェン",a:"Live推奨。合唱と大編成の没入（例：フルトヴェングラー/バイロイト1951）"},
  {id:"new-world-largo",cat:"04",sub:"04a",lists:["classic"],t:"新世界より 第2楽章「家路」 — ドヴォルザーク",a:"弦と木管のホール残響・広がり"},
  {id:"bach-cello-prelude",cat:"05",sub:"05a",core:true,lists:["classic"],t:"無伴奏チェロ組曲第1番 プレリュード — バッハ",a:"チェロの胴鳴り・松脂感（ヨーヨー・マ 等）"},
  {id:"clair-de-lune",cat:"05",sub:"05b",lists:["classic"],t:"月の光 — ドビュッシー",a:"ピアノの余韻と減衰"},
  {id:"zarathustra",cat:"06",sub:"06a",core:true,lists:["classic"],t:"「ツァラトゥストラはかく語りき」冒頭 — R.シュトラウス",a:"静寂→金管・オルガン・ティンパニ"},
  {id:"overture-1812",cat:"06",sub:"06b",lists:["classic"],t:"「1812年」序曲 終結部 — チャイコフスキー",a:"大砲・鐘・金管の飽和耐性"},
  {id:"bolero",cat:"07",core:true,lists:["classic"],t:"ボレロ — ラヴェル",a:"各楽器が順に重なる分離・定位"},
  // === 標準リスト専用（std のみ） ===
  {id:"idol",cat:"02",lists:["std"],t:"アイドル — YOASOBI",a:"高密度＋高音の抜け"},
  {id:"get-lucky",cat:"03",lists:["std"],t:"Get Lucky — ダフト・パンク, Pharrell & ナイル・ロジャース",a:"キックの締まり・体がノるか"},
  {id:"lupin-theme-78",cat:"03",core:true,lists:["std"],t:"ルパン三世のテーマ '78 — 大野雄二",a:"ウォーキングベースの推進力・音程追従性と締まったノリ"},
  {id:"orange",cat:"07",lists:["std"],t:"オレンジ — SPYAIR",a:"ギター左右・シンバルの質"},
  {id:"sugar-song-bitter-step",cat:"07",core:true,lists:["std"],t:"シュガーソングとビターステップ — UNISON SQUARE GARDEN",a:"高密度・疾走バンドの各パート分離（よく動くベースと手数）"},
  {id:"jokyoku-march",cat:"EX",lists:["std"],t:"序曲のマーチ (V)（ドラクエV） — すぎやまこういち",a:"金管ファンファーレと弦の堂々たる強奏"},
];
/* 描画・集計用ビュー（カテゴリ定義＋所属トラックを結合）。標準（全件）のエイリアスとして残す */
const CATS=CATEGORIES.map(c=>({...c,tracks:TRACKS.filter(t=>t.cat===c.no)}));
/* 現行カタログに存在する track id の集合（孤児評価の判定に使用）。標準（全件）のエイリアス */
const CATALOG_IDS=new Set(TRACKS.map(t=>t.id));
/* ---- 複数試聴リスト（タグ方式）ヘルパー ---- */
function listById(id){ return LISTS.find(l=>l.id===id)||LISTS.find(l=>l.id===DEFAULT_LIST); }
/* トラックのリスト別メタ上書き ov[listId] を適用（標準で導入前の cat/sub/core/a を再現）。id は不変。 */
function resolveTrack(t,id){ const o=t.ov&&t.ov[id]; return o?{...t,...o}:t; }
function tracksForList(id){ const l=listById(id); const base=l.all?TRACKS:TRACKS.filter(t=>(t.lists||[]).includes(id)); return base.map(t=>resolveTrack(t,id)); }
function catsForList(id){ const tr=tracksForList(id); return CATEGORIES.map(c=>({...c,tracks:tr.filter(t=>t.cat===c.no)})); }
function totalForList(id){ return tracksForList(id).length; }
function listIdSet(id){ return new Set(tracksForList(id).map(t=>t.id)); }
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

export { APP_VERSION, CATALOG_VERSION, LISTS, DEFAULT_LIST, CATEGORIES, TRACKS, CATS, CATALOG_IDS, SUB_LABELS, subLabel, OLD_ID_MAP, RATES, SCORE, CODECS, APPS, MAKERS, TOTAL, listById, tracksForList, catsForList, totalForList, listIdSet };
