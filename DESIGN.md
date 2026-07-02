---
name: iem-audition-log
description: >-
  Dark, immersive audition-logging UI, inspired by Spotify. Near-black "cocoon"
  surfaces, one functional green accent, bold tight headings, artwork-driven
  detail headers. Content and product imagery carry the color; the canvas stays quiet.
version: alpha
colors:
  base: "#121212"          # app background
  surface: "#181818"       # cards, list rows (rest)
  surfaceHover: "#282828"  # cards / rows on hover
  barBlack: "#000000"      # fixed top/bottom bars, footers
  greenPrimary: "#1DB954"  # primary CTA, active/selected, rating fill
  greenBright: "#1ED760"   # green hover / active state
  textPrimary: "#FFFFFF"   # headings, key values
  textSubdued: "#B3B3B3"   # secondary text, metadata, labels
  textDisabled: "#6A6A6A"  # placeholders, disabled
  border: "#2A2A2A"        # hairline dividers, input fields
  danger: "#E22134"        # destructive actions only
typography:
  display: { fontFamily: Circular, fontSize: "3rem",    fontWeight: 900, lineHeight: 1.05 }
  h1:      { fontFamily: Circular, fontSize: "2rem",    fontWeight: 700, lineHeight: 1.15 }
  h2:      { fontFamily: Circular, fontSize: "1.5rem",  fontWeight: 700, lineHeight: 1.2  }
  h3:      { fontFamily: Circular, fontSize: "1.125rem",fontWeight: 700, lineHeight: 1.3  }
  body:    { fontFamily: Circular, fontSize: "1rem",    fontWeight: 400, lineHeight: 1.5  }
  bodySm:  { fontFamily: Circular, fontSize: "0.875rem",fontWeight: 400, lineHeight: 1.5  }
  label:   { fontFamily: Circular, fontSize: "0.75rem", fontWeight: 700, lineHeight: 1.3  }
rounded:
  sm: 4px
  md: 8px
  pill: 500px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
---

# DESIGN.md — iem-audition-log

Spotify-inspired visual language, adapted for logging and comparing IEM auditions.
Tokens above are the normative values; the prose below explains *why* and *how* to apply them.

> **適用上の優先順位（重要）**: 本ファイルは*ビジュアル言語*（色・タイポ・コンポーネントの型）の規範だが、
> このアプリの実体（オフライン維持・外部依存なし・モバイルファースト）と衝突する場合は
> **`CLAUDE.md`（§5 構造・§6 適用方針・§7 制約）が優先**する。アプリ固有の逸脱は末尾
> **「§10. このアプリでの適応」**にまとめてある。§1〜§9 を読む前提知識として先に §10 を確認すること。

## 1. Visual Theme & Atmosphere

Dark, immersive, content-first — a premium late-night listening session. The canvas is a
near-black **cocoon** (`base #121212`) that recedes so product photos and data stand out.
One confident green (`greenPrimary`) marks anything **active or affirmative**: play, selected,
primary action, high score. Headings are bold and tight; everything secondary drops to a calm
muted gray (`textSubdued`). Where Spotify is album-art-driven, this app is **artwork-driven**:
each IEM's photo (and its dominant color) tints its detail header.

## 2. Color Palette & Roles

| Token | Hex | Role |
|-------|-----|------|
| Base | `#121212` | App background |
| Surface | `#181818` | Cards, list rows (rest) |
| Surface Hover | `#282828` | Cards / rows on hover |
| Bar Black | `#000000` | Fixed top/bottom bars, footers |
| Green Primary | `#1DB954` | Primary CTA, active/selected, rating fill |
| Green Bright | `#1ED760` | Green hover / active state |
| Text Primary | `#FFFFFF` | Headings, key values |
| Text Subdued | `#B3B3B3` | Secondary text, metadata, labels |
| Text Disabled | `#6A6A6A` | Placeholders, disabled |
| Border | `#2A2A2A` | Hairline dividers, input fields |
| Accent Dynamic | from artwork | Per-IEM detail-header gradient (dominant color of the product image) |
| Danger | `#E22134` | Destructive actions only |

**Rule:** green is *functional, not decorative*. Reserve it for active/affirmative/primary.
Never let two greens compete on one surface. Hierarchy comes from surface **lightness**, not color.

## 3. Typography Rules

Font: **Circular** (Spotify's proprietary face) with a practical stack —
`"Circular", "Montserrat", system-ui, -apple-system, sans-serif`.
Circular is licensed, so ship **Montserrat** (or another geometric sans) as the real font in production.

| Level | Size | Weight | Line-height | Tracking | Use |
|-------|------|--------|-------------|----------|-----|
| Display | 48px | 900 | 1.05 | -0.02em | IEM detail hero, page titles |
| H1 | 32px | 700 | 1.15 | -0.01em | Section titles |
| H2 | 24px | 700 | 1.2 | normal | Subsections |
| H3 | 18px | 700 | 1.3 | normal | Card titles |
| Body | 16px | 400 | 1.5 | normal | Default text |
| Body Small | 14px | 400 | 1.5 | normal | Dense rows, notes |
| Label | 12px | 700 | 1.3 | 0.08em | UPPERCASE metadata / section labels |

Headings bold and tight; body regular. All secondary/label text uses `textSubdued`.

## 4. Component Stylings

**Buttons**
- *Primary* (Log audition / Save / Play sample): `greenPrimary` bg, **black** text, `pill` radius,
  weight 700, padding 12px 32px. Hover → `greenBright` + `scale(1.04)`; active → `scale(0.98)`.
- *Secondary*: transparent bg, 1px `textSubdued` border, white text, `pill`. Hover → white border + slight scale.
- *Icon*: circular, transparent; hover → white icon + faint surface bg.

**Cards (IEM card / log entry row)**
- `surface` bg, `md` radius, 16px padding, no border at rest.
  Hover → `surfaceHover` bg + lift shadow. Product image `sm` radius; avatars circular.

**Rating / score**
- Track `border #2A2A2A`, fill `greenPrimary`; numeric score in white 700.
  Fill length = score — the Spotify progress-bar motif reused for evaluation.

**Inputs**
- `border #2A2A2A` bg, no visible border, `sm` radius, white text, `textDisabled` placeholder.
  Focus → 2px `greenPrimary` ring.

**Nav / "now-comparing" bar**
- Fixed on `barBlack`; active item white, inactive `textSubdued`.

**Tags / pills (genre, driver type, tuning)**
- `border #2A2A2A` bg, `textSubdued` text, `pill` radius, 12px/700.
  Selected → green text (or green bg with black text).

## 5. Layout Principles

- Spacing scale: 4 · 8 · 16 · 24 · 48 px (front-matter tokens `xs · sm · md · lg · xl`; these are the normative values).
- Generous vertical rhythm; separate sections by 24–48px (`lg`–`xl`).
- Content max-width ~1150px, centered; persistent left nav rail on desktop.
- Card grid: responsive, min column ~180px, gap 24px.
- Let the dark canvas breathe — whitespace is a feature, not empty space to fill.
- Detail pages open with large artwork + a gradient header (`Accent Dynamic`), then dense structured data below.

## 6. Depth & Elevation

- Flat by default on `base`; elevation comes from surface **lightness steps**
  (`#121212` → `#181818` → `#282828`), not heavy borders.
- Floating elements: soft, large shadow `0 8px 24px rgba(0,0,0,0.5)`.
- The fixed now-comparing bar sits on pure black with a top hairline (`border`) — highest z-layer.
- Hover = lighter surface + shadow. That pairing reads as "interactive."

## 7. Do's and Don'ts

**Do**
- Keep green rare and functional (active / affirmative / primary only).
- Use surface lightness for hierarchy.
- Bold, tight headings; muted gray for all secondary text.
- Let product photos supply the color via the dynamic accent.

**Don't**
- Don't use green for large fills or backgrounds.
- Don't add colored borders; use spacing and surface steps instead.
- Don't mix multiple accent hues — one green, plus the per-item dynamic accent.
- Don't put low-contrast text on pure black; `textSubdued` is the minimum for metadata.

## 8. Responsive Behavior

- Breakpoints: mobile `<640`, tablet `640–1024`, desktop `>1024`.
- Desktop: left nav rail + content; comparison bar fixed to bottom.
- Mobile: left nav collapses to a bottom tab bar; card grid → 1–2 columns; detail hero shrinks but the gradient persists.
- Touch targets ≥44px; pill buttons keep `pill` radius at every size.

## 9. Agent Prompt Guide

**Cheat-sheet:** bg `#121212` · card `#181818` (hover `#282828`) · green `#1DB954` (hover `#1ED760`) ·
text `#FFFFFF` / subdued `#B3B3B3` · input/border `#2A2A2A`.

**Ready-to-use prompts**
- *IEM detail page:* "Build an IEM detail page on `#121212`. Large square artwork with a gradient
  header tinted by the item's dominant color. Title in Display 48/900, tight tracking. Spec table
  with `#B3B3B3` labels and `#FFFFFF` values. A green `#1DB954` pill CTA 'Log audition' with black text."
- *Audition log list:* "Rows on `#181818`, radius 8, hover `#282828`. Each row shows a date
  (uppercase 12px `#B3B3B3` label), the IEM name (white 700), and a green rating bar
  (track `#2A2A2A`, fill `#1DB954`)."
- *Comparison view:* "Two IEMs side by side on `#181818` cards; a green fill bar per scored
  attribute; muted-gray attribute labels; no colored borders."

**Rule for the agent:** use only the tokens defined above. If a value is missing, infer from the
nearest token and keep green functional-only.

## 10. このアプリでの適応（Adaptation for iem-audition-log）

§1〜§9 は汎用テンプレートのため、本アプリの制約・仕様と一部相反する。**相反時はここ／`CLAUDE.md` が優先**。
以下は確定済みの逸脱（決定経緯は `ROADMAP.md` 決定ログ 2026-07-02）。

- **フォント（§3 を上書き）**: Circular / Montserrat は**採用しない**。外部読込は
  `CLAUDE.md §7`（オフライン維持・外部依存なし）に反するため。実体は
  `system-ui + 日本語システムフォント`（`--jp`）、数値・ラベルは等幅 `--mono`（instrument readout）。
  → §3・§9 の「Circular/Montserrat」「ship Montserrat」は本アプリでは無効。
- **レイアウト（§5・§8 を上書き）**: 左 nav レール／下部タブバー／`~1150px` 幅／カードグリッド／
  アートワーク＋動的アクセント（`Accent Dynamic`）ヘッダーは**現行未採用**。本アプリは
  **モバイルファーストの単一カラム・3ビュー**（一覧／詳細／比較）、`body` 幅は
  `680px`（≥768で `860px` / ≥1024で `1000px`＋一部2カラム）。これらデスクトップ・レイアウトは
  将来検討の参考であり、現構造（`CLAUDE.md §5`）が優先。
- **評価配色・色付きボーダー（§2・§4・§7 の一部を上書き）**: 「rating fill = green」「no colored
  borders」は**評価ドメインには適用しない**（判別性優先＝オーナー選択「機能色は保持」）。
  評価記号 ◎=`--gold` / ○=`--steel` / △=`--caution` / ✕=`--bad`、優先度タグ・サブ観点タグ・
  カテゴリ左帯/番号・比較ビューのシンボル/バーは金/鋼/シアン/警告色（色枠含む）を維持。
  **green は主要CTA・アクティブ/選択・進捗フィルに限定**（この点は §7 と一致）。装飾目的の
  steel/cyan はグレースケール化済み。
- **タイポ寸法（§3 のスケールを縮小適用）**: Display 48px / H1 32px 等はデスクトップ級の指針。
  本アプリはモバイル圧縮寸法で運用（ウェイト・字間・階層の考え方は踏襲、絶対値は縮小）。
