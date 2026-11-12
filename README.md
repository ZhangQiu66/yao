# 姚天生 · 琴与画 —— 个人网站

钢琴与艺术主题的个人网站，纯静态，不需要构建，也不需要后端。

设计者：姚天生（山东理工大学 · 音乐教育 · 音教 2503）

## 一、如何打开

- **本地预览**：直接双击 `index.html`，用 Chrome、Edge、Safari 或 Firefox 打开即可。
- **本地服务器（可选）**：在项目目录运行 `python3 -m http.server 8000`，再访问 http://localhost:8000 。

> 网页钢琴使用浏览器的 Web Audio API 实时合成声音。浏览器规定**首次点击页面后才能发声**，这属于正常现象。

## 二、如何部署

把整个文件夹上传到任意静态托管平台即可，例如：

- **GitHub Pages**：新建仓库上传全部文件，在 Settings → Pages 中选择分支。
- **Netlify / Vercel / Cloudflare Pages**：把文件夹拖进控制台即可。
- **学校服务器或云服务器**：放到 Nginx / Apache 的网站根目录。

## 三、目录结构

```
yao-site/
├── index.html      # 页面结构与全部文字内容
├── css/style.css   # 全部样式（配色、字体、排版、动画、响应式）
├── js/piano.js     # 音频引擎 + 网页钢琴键盘（Web Audio 合成）
├── js/main.js      # 导航、滚动动画、首屏声波、试弹曲目、AI 乐思生成器
└── README.md
```

## 四、在哪里修改内容

| 想改的内容 | 位置 |
|---|---|
| 姓名、首屏标语 | `index.html` 中的 “首屏” 部分（`<section class="hero">`） |
| 题记、信息栏 | `index.html` 中的 “题记” 部分（`id="about"`） |
| 年表 | `index.html` 中的 `<ol class="timeline">`，每个 `<li>` 是一个节点 |
| 曲目卡片 | `index.html` 中的 `<div class="cards">`，每个 `<article class="card">` 是一首曲目 |
| 札记 | `index.html` 中的 `id="essays"` 部分 |
| 联系邮箱、学校班级（页脚） | `index.html` 中的 `mailto:yaotiansheng@example.com`（**这是占位邮箱，请改成真实邮箱**） |
| 配色 | `css/style.css` 顶部的 `:root` 变量（`--ink` 墨黑、`--ivory` 象牙白、`--gold` 暗金） |
| 试弹曲目 | `js/main.js` 中的 `SONGS`，格式为 `[MIDI 音高, 拍数]`，60 = 中央 C |
| AI 乐思的心境、调式、诗句 | `js/main.js` 中的 `MOODS` |

## 五、功能说明

- **网页钢琴**：支持鼠标、触屏多指和电脑键盘（A S D F G H J K L 为白键，W E T Y U O P 为黑键，Z / X 切换八度，空格切换延音踏板）。提供“大钢琴、毛毡钢琴、玻璃琴”三种合成音色，带混响、音量控制和实时频谱。
- **AI 乐思**：完全在本地运行的生成式作曲小程序。选一种心境后，程序根据该心境的调式、和弦进行和速度，用带权重的随机音程（马尔可夫式步进，强拍倾向和弦音，结尾回到主音）写出 4 小节旋律，画在五线谱上并配伴奏播放，同时组合出一句小诗。不调用任何外部 AI 接口，也不需要 API Key。
- **视觉**：首屏的声波线条画布、SVG 琴键剪影、五线谱抽象肖像、曲目卡片的线描动画，全部由代码绘制，没有使用图片文件。
- **无障碍**：系统开启“减少动态效果”（prefers-reduced-motion）时，所有动画自动关闭。

## 六、字体

页面通过 Google Fonts 加载 **Noto Serif SC**（中文宋体）和 **Cormorant Garamond**（西文衬线体）。如果所在网络无法访问 Google Fonts，会自动回退到系统宋体（如思源宋体、华文宋体、宋体），页面仍能正常显示。如需完全离线，可把字体文件下载到本地并改为 `@font-face` 引用。

## 七、说明

网站中的年表、札记和曲目短评都是示例文字（年表中除 2025 入学外的时间点为占位），请按真实情况修改。网站没有虚构任何奖项或比赛成绩。
