# SYS.RBT ポートフォリオ — 現状レポート & メンテナンスガイド

最終更新: 2026-07-02 / 対象コミット: `a4a990e`
本番URL: https://portfolio-weld-three-44.vercel.app/

---

## 1. サイトの現状

ビルド不要の静的サイト(HTML + CSS + JavaScript)。フレームワークは使っておらず、3D描画は同梱の Three.js r128 のみで動作。GitHub の `main` ブランチに push すると Vercel が自動で再デプロイする。

| ページ | 内容 | 3D演出 |
|---|---|---|
| index.html | ホーム | コックピット視点の月接近シーン。目的地ホロパネル4枚をレティクルでロックオン巡回。クリックでワープ発進→遷移 |
| works.html | 作品(ミーミルの手 / 自動運転ミニカー) | 全画面背景にISS。スクロールで奥行きドリー |
| profile.html | プロフィール・開発思想・技術スタック | 月着陸船(LEM)が月面へ降下ループ |
| activities.html | 活動実績タイムライン+モーダル | ブラックホール(降着円盤)+周回リング船 |
| learning.html | 学習リソース | 火星ローバー走行シーン |

### ファイル構成

```
index.html / works.html / profile.html / activities.html / learning.html
assets/
  css/style.css      … 全ページ共通スタイル(テーマ変数・コックピットUI含む)
  js/three.min.js    … Three.js r128 本体(ライブラリ。編集禁止)
  js/main.js         … ナビ・フェードイン・HUD時計(全ページ共通)
  js/dock-scene.js   … ホームの3Dシーン(月・パネル・レティクル・ワープ)
  js/vehicles.js     … サブページの3D乗り物(data-vehicle属性で切替)
  js/space-bg.js     … 旧・星空背景(現在未使用。消しても可)
  images/ videos/ pdf/ … メディア素材(動画はGit LFS管理)
```

---

## 2. 安全に編集できる場所(文字・作品の追加/修正)

### 2-1. テキスト修正
各HTMLの日本語テキストは自由に書き換えてOK(タグを消さない限り動きに影響なし)。
プロフィール文 → `profile.html`、作品説明 → `works.html` のモーダル内、実績 → `activities.html`。

### 2-2. 作品を追加する(3ステップ)

1. **カード追加**: `works.html` の `<section class="works-grid">` 内にある `<div class="card fade-in works-card" data-modal="modal-mimir">` ブロックを丸ごとコピーし、`data-modal` を新しいID(例 `modal-newrobot`)に変更。画像パスとタイトルを差し替え。
2. **モーダル追加**: 同ファイル下部の `<div class="modal-overlay" id="modal-mimir">` ブロックをコピーし、`id` をカードの `data-modal` と同じ値に。中身(概要/使用技術/課題と工夫/展望)を書く。
3. **(任意)ホームのパネルに載せる**: `assets/js/dock-scene.js` の `PROJECTS` 配列に1行追加:
   ```js
   { title: '新作の名前', sub: 'ENGLISH SUBTITLE', tag: 'WORK 05', href: 'works.html#modal-newrobot' },
   ```
   併せて `PANEL_POS` 配列にも位置 `[x, y, z]` を1つ追加する(**PROJECTSとPANEL_POSの要素数は必ず一致させる**)。ボタンとパネルは自動生成される。

### 2-3. 活動実績を追加する
`activities.html` の `<div class="timeline-item" data-modal="modal-1">` ブロックと、対応する `<div class="modal-overlay" id="modal-1">` をコピーして番号を変える(手順は作品と同じ)。日付順に並べるだけでタイムライン線は自動でつながる。

### 2-4. 学習リソースを追加する
`learning.html` の `<div class="card learning-card fade-in">` をコピーして書き換えるだけ。

### 2-5. 画像・動画の追加
`assets/images/` `assets/videos/` に置いてHTMLから参照。**ファイル名は半角小文字英数字とハイフン推奨**(Vercelは大文字小文字を区別する。スペース入りファイル名は `%20` エンコードが必要になるので避ける)。

### 2-6. 演出の調整OKな数値(壊れない範囲)

| ファイル | 変数/箇所 | 意味 | 現在値 |
|---|---|---|---|
| dock-scene.js | `CYCLE` | パネル巡回の間隔(秒) | 5.0 |
| dock-scene.js | `flying.p + dt / 1.5` | ワープ発進の所要秒数 | 1.5 |
| dock-scene.js | `BASE_FOV + accel * 24` | 発進時の視野の開き | +24 |
| dock-scene.js | `Math.min(t * 0.22, 16)` | 月の接近速度/上限 | 0.22 / 16 |
| dock-scene.js | `FOCUS` | ロックオン中パネルの寄り位置 | (1.6, 2.8, 5.5) |
| vehicles.js | `scrollY * 0.012` | スクロール時の奥行きドリー速度 | 0.012 |
| vehicles.js | `root.position.set(3.4, -0.2, -3)` | 乗り物の画面内位置 | 右寄り |
| style.css | `:root` のCSS変数 | 配色・フォント | シアン系 |

---

## 3. 触ってはいけない/変更時に注意が必要な場所

### 3-1. 編集禁止
- `assets/js/three.min.js` — ライブラリ本体。1文字でも変えると全3Dが死ぬ。
- `.gitattributes` — 動画のLFS管理設定。消すと巨大ファイルがpushできなくなる。

### 3-2. JSが参照するID/クラス(改名・削除するとその演出が止まる)

| HTML側 | 参照元 | 壊れるもの |
|---|---|---|
| `id="dock-canvas"` (index) | dock-scene.js | ホームの3D全部 |
| `id="dock-nav-btns"` (index) | dock-scene.js | 行き先ボタン生成 |
| `id="target-tag"` / `id="target-dist"` (index) | dock-scene.js | ロックオンタグ/距離表示 |
| `id="vehicle-canvas"` と `data-vehicle="iss|lem|blackhole|rover"` (サブ4ページ) | vehicles.js | 各ページの3D乗り物 |
| `class="fade-in"` / `class="hamburger"` / `id="year"` / `data-hud="…"` | main.js | フェードイン/メニュー/年号/HUD数値 |
| `class="works-card"` と `data-modal` / `modal-overlay` の `id` | 各ページ内スクリプト | モーダル開閉 |
| モーダルID `modal-mimir` `modal-minicar` | dock-scene.js の `href` | ホームからの直接遷移(`works.html#modal-mimir`) |

### 3-3. スクリプトの読み込み順(各HTML末尾)
`three.min.js → main.js → dock-scene.js(または vehicles.js)` の順を崩さない。three.min.jsより先に3D系を読むと `THREE is not defined` で止まる。

### 3-4. CSSで動きに直結している箇所
- `:root` の `--z-bg` などz-index変数 … レイヤー順が崩れると3Dが見えなくなる
- `#dock-canvas` `#vehicle-canvas` の `position` / `z-index` / `pointer-events`
- `.cockpit-overlay` 一式と `.dock-nav` … コックピットUI。`pointer-events` を変えるとパネルがクリックできなくなる
- `.fade-in` / `.appear` … スクロール出現アニメの仕組み

### 3-5. 仕様として知っておくこと
- OSの「視覚効果を減らす(prefers-reduced-motion)」がONの環境では、意図的にアニメーションを止める作りになっている(不具合ではない)。
- スマホ(幅768px未満)ではコックピットの左右パネル・モニター・CAUTIONを省略した軽量表示になる。
- WebGL非対応環境では3Dを描画せず静的背景にフォールバックする。

---

## 4. 運用ルール(Git / デプロイ)

1. **公開手順**: 編集 → `git add .` → `git commit -m "..."` → `git push origin main` → Vercelが自動デプロイ(1〜2分)。
2. **動画(.mp4)はGit LFS管理**。動画を追加/変更するpushの前に `git lfs install` が済んでいること。Vercel側は Settings → Git → **Git LFS を ON** にしないと動画が再生されない(現状の要確認ポイント)。
3. **CSSを変えたのに反映されない時**: 各HTMLの `style.css?v=10` の数字を上げる(`?v=11`)とキャッシュが無効化される。確認は Ctrl+F5。
4. **`.git/index.lock` エラーが出た時**: gitが動いていないことを確認して `C:\2026\portfolio\portfolio\.git\index.lock` を削除(2026-07-02に一度発生・解消済み)。
5. 大きな変更の前はブランチを切るか、少なくとも直前コミットを確認(`git log --oneline`)。戻すときは `git checkout -- <ファイル>`。

---

## 5. 既知の未対応・今後の候補

- Vercel の Git LFS 設定が未確認 → 作品ページの動画が再生されない可能性(§4-2)。
- `assets/js/space-bg.js` は未使用ファイル(削除してよい)。
- 作品モーダル内の「GitHub(後日公開)」リンクがプレースホルダのまま。
- 画像 `3_robot_arm _main.jpg` などスペース入りファイル名が残っている(動作はするがリネーム推奨。リネーム時はHTML内の参照も一括置換)。
