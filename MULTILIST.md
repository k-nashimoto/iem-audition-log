# MULTILIST.md — 複数試聴リスト（タグ方式）詳細設計

ROADMAP フェーズ1.5「複数試聴リスト」の詳細設計。標準（全部入り）に加え、歌もの／インスト・クラシック等のジャンル別リストを用意し、試聴ログ作成時に選択できるようにする。比較ビューにもリスト軸を追加する。
（前提の影響度調査は ROADMAP 決定ログ 2026-07-03、曲の記載ルールは `CATALOG.md`）

- 本設計は **タグ方式（1:N）**。カテゴリ(00–07/EX)は従来どおり **1曲=1カテゴリ=1評価**（リスト所属とは直交）。
- 評価は曲の**安定id基準**のため、リストをまたいでも同一曲の評価は共有され、**既存データは後方互換**。

---

## 1. データモデル

### 1.1 リスト定義（`LISTS`, data.js）
```js
const LISTS = [
  { id:"std",   name:"標準" },   // タグ方式（導入前の厳選27曲を再現）
  { id:"vocal", name:"歌もの" },
  { id:"inst",  name:"インスト・クラシック" },
  // 将来: { id:"kpop", name:"K-POP" } 等を追加可能
];
const DEFAULT_LIST = "std";
```
- 【実装時に変更】**標準もタグ方式（27曲）**。共有曲のリスト別差異は `ov[listId]` で上書きする（`all:true` の全件特別扱いは不採用。理由：ジャンル別リスト導入前の標準27曲をそのまま再現するため）。
- 追加リストは `id` と `name` のみ。並び順はリスト定義順。

### 1.2 曲のタグ（`TRACKS`, data.js）
各 track に所属リストの配列 `lists` を付与（1:N）。【実装時に変更】標準も含めタグで明示する（`lists` に `"std"` が無ければ標準には出ない）。
```js
{ id:"first-love", cat:"01", sub:"01a", lists:["vocal","std"], t:"…", a:"…" }
{ id:"time",       cat:"04", sub:"04b", lists:["inst","std"], ov:{std:{cat:"04",sub:"04b"}}, t:"…", a:"…" }
{ id:"bad-guy",    cat:"00", core:true, lists:["vocal","inst","std"], … } // 装着確認は全ジャンル共通
```
- `lists` 未指定の曲はどのリストにも出ない（旧版の「未指定＝標準のみ」からは変更）。
- 同じ曲がリストごとに異なる `cat`/`sub`/`core`/`a` を持つ場合は `ov:{listId:{...}}` で上書き（標準リストが導入前の定義を再現するために使用）。
- リスト解決：`tracksForList(id)` = `list.all ? TRACKS : TRACKS.filter(t => (t.lists||[]).includes(id))`（該当曲へ `ov[id]` をマージしてから返す）。

### 1.3 session への記録
```js
session.listId = "std" | "vocal" | "inst" | …   // 採点時に選んだリスト
```
- **未設定（既存記録）＝ "std"（標準）** として扱う（後方互換）。
- `catalogVersion` は現状どおり記録（リスト別バージョンは持たない。リスト構成変更時は `CATALOG_VERSION` を上げる）。

---

## 2. カタログ層の list 相対化（data.js / core.js）

現状グローバル定数 `CATS`/`TOTAL`/`CATALOG_IDS` を **listId 依存の関数**に一般化する。標準用に既存の名前も残し互換を保つ。

```js
// data.js
function listById(id){ return LISTS.find(l=>l.id===id) || LISTS.find(l=>l.id===DEFAULT_LIST); }
function tracksForList(id){ const l=listById(id); return l.all ? TRACKS : TRACKS.filter(t=>(t.lists||[]).includes(id)); }
function catsForList(id){ const tr=tracksForList(id); return CATEGORIES.map(c=>({...c, tracks:tr.filter(t=>t.cat===c.no)})); }
function totalForList(id){ return tracksForList(id).length; }
function listIdSet(id){ return new Set(tracksForList(id).map(t=>t.id)); }
// 既存の CATS/TOTAL/CATALOG_IDS は「標準」のエイリアスとして残す（未改修コードの保険）
```

### core.js（集計を list 相対に）
`catalogRatingValues`/`progress`/`goldCount`/`orphanCount` を **session の listId 基準**に変更（引数 or session から解決）。
```js
function ratedInList(s){ const ids=listIdSet(s.listId||"std"); return Object.keys(s.ratings||{}).filter(k=>ids.has(k)).map(k=>s.ratings[k]); }
function progress(s){ return ratedInList(s).length; }        // 「N / そのリストの総数」
function goldCount(s){ return ratedInList(s).filter(r=>r==="◎").length; }
```
- **孤児評価**の定義が2層になる：
  1. **カタログ外**（現行 `CATALOG_IDS`＝全曲集合に無い＝旧曲）→ 従来どおり集計除外・保持。
  2. **リスト外**（そのセッションのリストには無いが全曲集合にはある）→ そのリストの集計からは除外。ただし**評価データは保持**し、標準リストや該当ジャンルでは有効。
- 表示上は「このリスト外の評価 n 件」を詳細画面に注記（任意）。

---

## 3. UI

### 3.1 新規作成モーダル
- 先頭に**リスト選択**（`<select>` または seg）。既定 `std`。
- 選んだ `listId` を session に保存。以後その session はそのリストの曲で採点。

### 3.2 詳細（試聴チェック）
- `renderCats` は `catsForList(s.listId)` を描画（そのリストの曲のみ）。
- ヘッダ／フォーム付近に**リスト名バッジ**を表示（例：`歌もの`）。
- 進捗メーター `N / totalForList(listId)`。
- **リスト変更の可否**：本設計では**作成時に固定**（変更 UI は出さない）を既定とする（変更可にすると「新リスト外になった評価」の扱いが増えるため）。※将来、変更時に「リスト外評価は保持・非表示」で対応可能。
- 「★店頭コア7」トグル：`core` フラグはリスト横断のまま。表示は**現在リストの core 曲**に限定（歌ものなら歌ものの core だけ）。
- 04 の◎条件ヒント／サブ観点ライブ：**現在リストに含まれるサブ曲**で判定（リストにサブが欠ければその旨自然に反映）。

### 3.3 一覧・ヒーロー
- 一覧カード：進捗・スコアは**そのセッションのリスト基準**。カードにリスト名を小さく表示（任意）。
- ヒーロー統計（機種数/平均/◎）：全セッション横断のため**異なるリストが混在**する。値は出るが母集団が異なる旨、注記または「標準のみ集計」等の方針を検討（既定：全セッション横断のまま。将来リストフィルタ追加可）。

### 3.4 比較ビュー（リスト軸の追加）
現行は カテゴリ(00–07)共通なのでカテゴリ行・レーダーの比較ロジックはそのまま使える。追加する軸は「どのリストで比較するか」。**推奨＝両対応の最小形**：
- **リストフィルタ**：比較対象の選択チップを listId で絞れるようにする（既定：全リスト表示）。混在選択時は「評価済み/全曲」の分母がリストで異なる点を明示。
- **同一機種のリスト別比較**：将来拡張（同じ機種の std/vocal/inst を並べる）。初期は機種別/メーカー別モードにリストフィルタを重ねる形で足りる。
- レーダー：現状の7軸（01–07）で継続。歌もの等で欠けるカテゴリは 0（中心）に落ちる＝そのリストで測っていないことが可視化される。

---

## 4. 初期リスト構成と曲の割当（案）＝①試聴曲リスト見直しの叩き台

現行27曲を **歌もの / インスト・クラシック** に分類（装着確認は共通）。標準は全曲。

| id | cat | 曲 | lists |
|----|-----|----|-------|
| bad-guy | 00 | bad guy（装着確認） | vocal, inst（共通） |
| sore-wo-ai | 01 | それを愛と呼ぶなら | vocal |
| first-love | 01 | First Love | vocal |
| love-wins-all | 01 | Love wins all | vocal |
| melody | 01 | メロディー | vocal |
| kataomoi | 01 | カタオモイ | vocal |
| odo | 02 | 踊 | vocal |
| idol | 02 | アイドル | vocal |
| i-am | 02 | I AM | vocal |
| easy | 02 | EASY | vocal |
| get-lucky | 03 | Get Lucky | vocal |
| sun | 03 | SUN | vocal |
| ditto | 03 | Ditto | vocal |
| merry-go-round | 04 | ハウル | inst |
| time | 04 | Time (Zimmer) | inst |
| inisie-no-uta | 04 | イニシエノウタ | inst |
| hedwig | 04 | ヘドウィグ | inst |
| ashitaka | 04 | アシタカとサン | inst |
| one-summers-day | 05 | 千と千尋 | inst |
| mcml | 05 | Merry Christmas Mr.Lawrence | inst |
| olympic-fanfare | 06 | Olympic Fanfare | inst |
| kaizoku | 06 | 彼こそが海賊 | inst |
| jurassic-park | 06 | Jurassic Park | inst |
| kick-back | 07 | KICK BACK | vocal |
| gunjo | 07 | 群青 | vocal |
| orange | 07 | オレンジ | vocal |
| jokyoku-march | EX | 序曲のマーチ | inst |

- **歌もの**：装着＋01/02/03/07（＋get-lucky）＝ボーカル・高域・低域・解像 中心（14曲）。カテゴリ 04/05/06 はほぼ含まれない。
- **インスト・クラシック**：装着＋04/05/06/EX＝没入・生音感・強奏 中心（13曲）。カテゴリ 01/02/03/07 は含まれない。
- ジャンル別は「その用途で重要な評価軸だけを短時間で回す」意図。標準は全軸を網羅。

---

## 5. 後方互換・移行

- 既存 session（`listId` なし）＝ 標準として全曲基準で従来どおり集計・表示。破壊なし。
- 既存の `ratings`（id基準）はそのまま有効。ジャンルリストで採点した後に標準で見ても、同一曲の評価は共有。
- 書出/読込：`listId` と `LISTS` は store/コードに含まれ、自動的に移行対象。
- `CATS`/`TOTAL`/`CATALOG_IDS` はエイリアス保持で未改修箇所が壊れないようにしてから、段階的に list 相対版へ差し替える。

---

## 6. 段階実装計画（PR分割案）

1. **データ層**：`LISTS`/`DEFAULT_LIST`、`tracksForList`/`catsForList`/`totalForList`/`listIdSet`、`TRACKS` にジャンルタグ付与、`session.listId`。既存エイリアス維持。
2. **集計の list 相対化**：core.js の progress/goldCount/orphan、ui.js の catStat/sessStat/updateMeter/一覧カード/ヒーロー。
3. **新規作成でリスト選択＋詳細でリスト名・リスト限定描画**（renderCats を catsForList に）。
4. **比較にリストフィルタ**（チップ絞り込み）。必要なら同一機種リスト別比較。
5. 文書更新（CATALOG.md にタグ記載ルール、CLAUDE.md §4/§5、ROADMAP 決定ログ）。

各段階でオフライン維持・外部依存なし・後方互換を検証。

---

## 7. 要決定事項（実装前に確認）

1. **リストは作成時固定**でよいか（変更可にするか）。※既定：固定。
2. **比較のリスト軸**：まずは「リストフィルタ（チップ絞り込み）」で足りるか。「同一機種をリスト別に並べる」比較まで初期に含めるか。
3. **初期リスト構成**：標準／歌もの／インスト・クラシック の3つでよいか（K-POP 等さらに分けるか）。§4 の曲割当でよいか。
4. **標準の扱い**：`all:true` の全件特別扱いでよいか。【実装時に変更】不採用。標準もタグ方式（27曲）とし、共有曲のリスト別差異は `ov[listId]` で上書きする方式を採用（マルチリスト導入前の標準リストをそのまま再現するため）。
5. **ヒーロー統計**：リスト混在の全セッション集計のままでよいか（将来リストフィルタを足すか）。

---

## 8. 比較ビューのリスト軸（実装）

段階実装計画 §6-④として実装済み。既存の機種別／メーカー別モードは温存し、以下を追加。

- **`store.cmpMode`**: `"session" | "maker" | "list"`（新規）。
- **`store.cmpList`**: 比較のリストフィルタ。`"all"`（既定）または `LISTS` の id。session/maker モードに適用（list モードでは使わない＝フィルタ行は非表示）。
  - session モード：フィルタ後の session だけがチップ候補になる。
  - maker モード：各メーカーの session 配列をフィルタしてから集計。フィルタ後0件のメーカーは列から除外。
- **`store.cmpIem`**: list モード（リスト別）で選択中の機種キー（`makerKey(s)+"|"+(s.iem||"")`）。単一選択（トグルではない）。未選択/無効なら候補の先頭を既定表示（persist はしない）。
- **リスト別モード**：選択した1機種の session 群を `listId`（未設定=標準）でグループ化し、`LISTS` の順で「その機種が持つリストのみ」を列にする。列＝リストなので、その機種のジャンル別プロファイル（歌もの/インスト/クラシックでの評価傾向）をレーダー＋マトリクスで比較できる。
- **集計ヘルパー**（ui.js）：`aggCatStatList(sessions,cat,listId)` / `aggSessStatList(sessions,listId)` — `aggCatStat`/`aggSessStat` の「全カテゴリ全曲」基準を「指定リストの曲」基準に変えたもの。既存の `catStatFn`/`sumStat` インターフェース（`buildGrid`/`buildRadar`）はそのまま流用。
- 機種一覧・全選択/全解除は list モードでは意味を持たないため、全選択/全解除ボタンは非表示にする。
