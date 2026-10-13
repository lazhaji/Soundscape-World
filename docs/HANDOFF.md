# Soundscape Railway — Session 交接

> **2026-10-14 M3 当前交付**：M3 播放器、设备曲库/本地导入、白/粉红噪音、规则推荐与定时器已实施，等待用户验收。先读 [M3_REPORT.md](M3_REPORT.md) 和本文第 12 节；[M3_HANDOFF.md](M3_HANDOFF.md) 是本轮开工交接。M0/M1/M2 已验收；不自动推进 M4–M7。下方“M3待实施/尚未实现”为历史记录。

> **2026-10-14 当前交接**：用户明确确认“M2完成”，并授权新Session开始M3。M0/M1/M2已验收；M3待在新会话实施，M4–M7未授权。先读 [M3_HANDOFF.md](M3_HANDOFF.md)，再核查Git与实际源码。第2–11节为历史实施证据，其中“等待M2验收/不启动M3”已被本次授权取代；真机、听感和长期性能未测的事实不变。

> 历史更新：2026-10-11（Asia/Shanghai）｜本轮：GrillMe 方案收口后，用户要求「60B 先做 demo」。
> 历史结论：新增独立 `#/demo/train` 运镜 Demo；正式入口仍是 10-10 面板，最终胶囊和新存储尚未整合。最新增量见第 9 节；历史验证保留。M1 已验收，M2 新 Demo 等待用户体验验收；M3–M7 未开始。

## 1. 新 Session 从这里开始

1. 先读本文件，再读 AGENTS 与 PRD / DECISIONS / ARCHITECTURE / DESIGN_SYSTEM / TASKS / TEST_PLAN；检查实际 Git、源码和测试，不只依赖文档。
2. 保留现有工程、lockfile 和用户资源；一次只推进一个获授权里程碑。旧 HANDOFF 的「等待 M1 收尾确认」已被本轮用户明确授权取代。
3. 当前只授权M3，完成验收后停止；不扩展M4–M7。用户已验收M2，不代表真机/听感/锁屏/GPU测试已经执行。
4. 每阶段更新 HANDOFF 和 TASKS；保存已验证工作，不自动推送或发布。

## 2. 当前实际功能

- **主入口**：全屏程序化新干线车厢，门、座椅、暖灯、移动窗景与轻晃；首次无声。「启程」在手势调用栈解锁音频并打开模式弹窗，也可静音启程。
- **模式**：focus / sleep / relax / free；心情 calm / happy / tired / anxious / lonely 独立；DND 独立。10-10 重设计为雨夜车票式磨砂面板、四段模式选择和原创 SVG 插画、心情选择、局部折射勿扰开关。可关闭/取消；每次启程均显示。只保存确认后的设置。
- **真实策略**：唯一原创器乐《雨灯》适用于 focus/relax/free，sleep 无候选时仅雨声；疲惫/焦虑将音乐模式增益降至 0.65，不覆盖用户音量。勿扰不改变音乐。统一社交权限函数要求放松/自由、勿扰关闭、用户主动开启三者同时成立；雷达/聊天本轮仍未实现。
- **到站**：约 5 秒前台帧驱动过场，减速 -> 开门 -> 第一人称穿门 -> 微缩角色从底座右侧自动走下车 -> 相机上摇到原固定约 45° 正交视角。可跳过、可取消返回车厢。减少动态效果省略大幅运镜/晃动/窗景流动。
- **便利店**：完整复用 M1 地面点选、碰撞寻路、坐标判区、自动门与屋顶剖面。过场结束才接受点选。店内音乐渐入、店外精确静音，曲目时间继续；sleep 策略始终不播放旋律。
- **返回与调试**：「返回列车」可再次选模式。`#/debug/m1` 保留 M1 验证页；Hash 切换不刷新，保留位置/音频，只保留当前页面的一个 Canvas。
- **声音**：全局单一引擎与 AudioContext，music/rain/train 三条持续循环源；只有一个主音乐源，effects 仍是预留增益。新增原创 4 秒列车低频底噪。模式/空间/用户三层 Gain 串联；切场景不重启音源。暂停冻结整个 Context，后台主动暂停、回前台手势继续。
- **设置**：原生 IndexedDB `soundscape-db` version 1，只有 `settings` store，key `mode` 为 mode/mood/doNotDisturb 白名单。没有 localStorage 镜像。读写 2.5 秒超时、blocked/安全拒绝提示后继续旅程，迟到读取不覆盖用户已经开始的选择。
- **加载/错误**：真实阶段文字，无假百分比。3D 初始化 12 秒超时，WebGL 丢失可重试；模块加载失败可整页重载。所有状态均保留可操作的声音/启程或跳过/返回入口。

尚未实现：M3 完整曲库/推荐/导入/下一首/喜欢/定时，M4 会话有效时长与档案/备份，M5 雷达，M6 聊天，M7 PWA 离线/正式美术/发布。无真实在线用户、后端、账户、AI 或云同步。

## 3. 重要文件

| 文件 | 职责 |
|---|---|
| `src/app/App.tsx`、`DebugPage.tsx` | 全屏主体验、Hash 页面分流、M1 验证页 |
| `src/app/JourneyController.ts` | 纯旅程状态与分阶段帧推进、取消/跳过/乱序保护 |
| `src/app/runtime.ts` | 模块级 journey/station/audio 协调、设置恢复和串行保存、后台暂停 |
| `src/features/modes.ts` | 模式/心情类型、白名单校验、musicPolicy、canUseSocial |
| `src/db/settings.ts` | 最小 IndexedDB 设置仓库、事务完成语义及超时/拒绝回退 |
| `src/world/WorldViewport.tsx`、`WorldScene.tsx` | lazy 模块、真实 Loading/失败、共用 Canvas、渲染/旅程生命周期 |
| `src/world/TrainModel.tsx`、`sceneHooks.ts` | 原创车厢、窗景、门/相机动画、可见性/减少动态效果 |
| `src/world/StationScene.tsx`、`StationSimulation.ts` | 共享 StationContents、固定相机/到站运镜、落地行走与离散世界状态 |
| `src/world/stationLayout.ts`、`navigation.ts`、`zones.ts`、`StoreModel.tsx`、`Player.tsx` | 沿用 M1 布局、碰撞、判区、外观/步态 |
| `src/audio/AudioEngine.ts`、`mixer.ts`、`generatedAudio.ts`、`engine.ts` | 单例与三源生命周期、模式/区域增益、原创音景合成 |
| `src/ui/ModeDialog.tsx`、`GlassDialog.tsx`、`AudioControls.tsx` | 玻璃选择、键盘首尾循环/Escape/焦点恢复、声音控制 |
| `src/ui/mode-dialog.css`、`LiquidSwitch.tsx`、`src/vendor/liquid-glass/` | 模式专用材质/响应式/无障碍降级；原生 checkbox 的小范围折射与弹簧；MIT 原样引擎和类型边界 |
| `src/styles.css`、`index.html` | 全屏横竖屏、安全区、玻璃动效与入口信息 |
| `tests/unit`、`tests/integration` | 11 文件 / 54 测试；包括原 M1 与新增旅程/策略/存储/音频回归 |

## 4. 技术决策与边界

- 无新依赖、无版本升级；不因为 M2 重新初始化工程或替换 M1 音频/寻路。
- 一次只挂载完整活动视觉子树；train/station 在 WorldScene 内切换共享 renderer，R3F 卸载几何与材质。进入调试页才替换整个 Canvas。音频与世界状态独立存在。
- 过场只在前台帧推进，delta 上限 100ms，无脱离页面的 timer；完成固定镜头，不提供旋转/摇杆/开放世界。减速 0–1.6s，开门 1.6–2.4s，穿门 2.4–3.2s，上摇 3.2–5s。
- train 空间 music/rain/train=(0,0,1)，原 outside=(0,1,0)、doorway=(0.45,0.65,0)、inside=(1,0.25,0)。musicMode 单独控制适用性，空间判区仍由实际角色坐标决定。
- 新 Settings 数据库已真实存在。M4 接 Dexie 时必须迁移或兼容 version 1/settings，不清库。播放统计、偏好档案、导入音乐、聊天等当前没有持久化。
- TrainModel / 4 秒滚动低频合成均登记为原创 Demo；参考 PNG/MP4 保留原文件，未进入发布包。

## 5. 本轮实际验证

Windows，Node.js 24.12.0 / npm 11.6.2；现有依赖；Vitest 5.0.3。浏览器为 Edge/Chromium headless、内置 Chromium；包括尺寸与触控模拟，不是真实手机。

| 检查 | 结果 |
|---|---|
| `npm run lint` | 通过，0 警告 |
| `npm run typecheck` | 通过，strict；build 内也执行 |
| `npm run test` | 通过，11 files / 54 tests |
| `npm run build` | 通过；index JS 256.50 KB / gzip 81.42 KB；WorldScene 6.57 KB；共享 StationScene 920.14 KB / gzip 244.45 KB，保留体积警告 |
| 正常旅程 | 列车首次无声 -> 手势 -> 玻璃选择 -> 普通过场逐阶段 -> 店内；静音选择与 reduced-motion 也能完成 |
| 原生音频/模式 | 首次 Context 0；启声后 1 Context / 3 sources / 3 starts；列车 music/rain 为 0、train 为 1；店内音乐区域增益为 1，sleep 的模式增益为 0；改模式及往返不重建源 |
| 设置/取消 | 实际 IndexedDB 保存 sleep/tired/DND，刷新后预选恢复但不自动发声；取消草稿不保存；静音启程 Context 仍 0 |
| 10 次列车往返 | 暂停时间恒为 6.341333333s；1 Context / 3 sources / 3 starts / 1 Canvas / 1 WebGL；每次便利店场景 GPU buffers 恒 227 |
| WebGL 重试/调试页 | 主动 loseContext -> 提示 -> 重试；旧 Context 确认失效，声音仍 running 且源不增加；调试页进店返回主体验位置与声音保留 |
| 320×740 / 390×844 / 844×390 | client/scroll 宽高分别相等，无主页面横向溢出或额外滚动；横竖屏 HUD 可操作 |
| 键盘 | 连续 18 次 Tab 留在模态内，Escape 关闭并恢复启程按钮焦点 |
| 异常回退 | IndexedDB 属性安全拒绝、音频 resume 拒绝、场景 chunk 中断均提供提示且不阻塞旅程；取消拦截后整页重载恢复 |
| 触控与加载超时 | hasTouch 的移动 Chromium 直接 tap 地面进店/出店；320×740 / 844×390 弹窗可滚动确认；延迟 chunk 达 12 秒出现失败，重试并释放请求后恢复画面 |

本轮修正了模态 Tab 到边界时焦点交给浏览器工具栏的问题；补充 IDB 属性访问本身抛 SecurityError 的回退。全部相关测试复测通过。

浏览器脚本/截图位于被忽略的 `output/playwright/m2-*`，探针不进入发布代码；不是已接入 npm 的正式 E2E 套件。完整步骤与补充验证见 TEST_PLAN 的 M2 节。

环境工具限制及处理：沙箱本地服务浏览器连接超时、沙箱 npx offline 缓存不可见；改用宿主环境的仅本机 4176 预览与已缓存 Playwright CLI 后完成。未下载新依赖。脚本首次直接 check 视觉隐藏 radio 被 label 拦截，改为实际点按标签；重复注入探针和遗留 reduced-motion 仿真导致的脚本错误已隔离并重跑，不归因于应用。

## 6. 已知限制与真机验收

- 未连接真实 iOS Safari / Android Chrome；耳机听感、循环接缝、后台/锁屏、真机触摸/GPU/连续帧率未测。
- 长期 JS 堆、低端机性能仍无结论；10 次同场景 buffer 稳定只证明本次短程计数，没有宣称完全无泄漏。
- R3F 仍出现 THREE.Clock 弃用 warning。主动 WebGL 丢失测试会产生 Context Lost / extension warning；正常流程无应用错误。未屏蔽警告。
- 仍有 920 KB 共享 Three 分块；按真实手机表现再决定拆分，不提前升级依赖掩盖问题。
- 单曲 Demo 策略只证明模式硬过滤，不代表 M3 完整推荐/曲库完成；sleep 纯雨声是明确回退。

手工验收：`npm run dev -- --host 0.0.0.0`，真机同网段打开；先低设备音量，检查首次静音、启程/静音选项、四种模式与五种心情、勿扰、正常到站与跳过/取消、只点地面进出店、返回列车 10 次、暂停/后台恢复、刷新预选和横竖屏。记录机型/系统/浏览器/听感/帧率。具体分项见 TEST_PLAN。

## 7. Git 与下一步

- 仓库 `D:\Soundscape World`，main；本轮基线 `28edf31`（docs: record M1 audit and session handoff），开工工作区干净；M1 代码在 `a11b3c9`。
- 本轮只修改 M2 源码、测试与相关文档；AGENTS、PRD、设计规范、依赖/lockfile、参考素材未修改。dist、output、CLI 产物均被忽略。
- 本轮以 M2 提交保存验证结果；不把提交自身 SHA 嵌入文件。实际提交 SHA/清洁状态以 `git log -1`、`git status --short` 和最终回复为准。未推送或部署。
- 验收预览：`http://127.0.0.1:4176/`；重启后运行 `npm run preview -- --strictPort --port 4176`（需先 build）。调试页为 `http://127.0.0.1:4176/#/debug/m1`。

**下一步仅为 M2 用户验收。完成后停止，M3 等用户另行授权。**

## 8. M2 模式弹窗重设计（2026-10-10，当前增量）

- 用户先要求只读分析，随后明确要求使用两个 Liquid Glass 技能重新设计模式弹窗，已授权本轮修改；本轮不扩展 M3 播放器。
- 设计为冷蓝磨砂、暖金高光的「雨夜车票」：宋体/衬线标题、四段模式选择与移动高光、单一当前模式预览和原创线条 SVG、五种心情、独立勿扰、真实到站声音说明与确认按钮。模式/心情/DND 的策略和存储代码未修改。
- 模式面板保留 22px blur + saturate(145%)，移除旧模式态全场景 blur，模式专用 backdrop 只暗化。内部 inset 不叠加背景模糊；声音弹窗继续使用原样式与语义。
- `LiquidSwitch.tsx` 以原生 checkbox 接受鼠标/触控/键盘；装饰副本 aria-hidden 且不接收指针。按住才显示小范围 SVG 折射，松开恢复实色手柄。视觉弹簧直接更新 DOM，不逐帧更新 React 状态。
- 动态加载用户指定技能附带的 `liquid-glass.js` v1.0.0 原样核心（MIT / gentpan）；不使用组件全集、WebGL 玻璃层、CDN、外部字体或演示壁纸。类型声明在相邻 `.d.ts`，许可在源码与 `public/licenses/liquid-glass.txt`（随构建发布），来源/哈希见 vendor README。npm 依赖/lockfile 不变。
- 关闭面板或切换到 reduced-motion / reduced-transparency / 高对比 / forced-colors 时清理活动滤镜、ResizeObserver、弹簧与监听。引擎加载失败维持原生/CSS 控件；有界位移图缓存和一个空 SVG defs 容器可复用，不是活动滤镜。
- 本轮验证：lint、strict typecheck、11 文件 / 54 现有测试通过；生产 build 通过，保留既有 920 KB Three 分块警告。折射核心单独懒加载块 8.76 KB / gzip 3.91 KB；主 JS 261.60 KB / gzip 82.94 KB；CSS 27.26 KB / gzip 6.67 KB，发布目录已核实包含 MIT notice。
- Chromium 浏览器：四模式/五心情选择、方向键、Space、18 次 Tab 焦点约束、Escape/遮罩关闭和焦点恢复；取消草稿不保存，确认→到站→返回和刷新恢复 sleep/tired/DND，刷新不自动启声；全部通过。
- 尺寸 320×740 / 390×844 / 844×390 / 1280×900：面板在视口内、无横向溢出；低高度内部滚动，确认按钮可达。检查静止/按住折射截图与 forced-colors 截图；reduced-motion 实际禁用形变/活动滤镜。
- 连续 10 次开合：关闭后活动滤镜 0，始终 1 AudioContext / 3 sources / 3 starts。触控模拟和主动拦截折射 chunk：原生开关、提交到站和声音弹窗仍可用，无应用 pageerror。故意中断 chunk 的网络失败日志为预期。
- 证据在被忽略的 `output/playwright/m2-glass-check.js`、`m2-glass-fallback.js` 和 `m2-glass-*.png`。不是正式 npm E2E 套件。测试初次命令过长改为 CLI `--filename`；减少动态效果检查初次早于浏览器媒体事件，补充条件等待后通过。
- 未连接真实 iOS Safari / Android；不把上游跨浏览器声明当成本项目实测。需真机核查玻璃明暗、触控/滚动、持续帧率和听感，具体步骤见 TEST_PLAN 最新节。
- Git：本轮基线 main / `6b173bb`，开始工作区干净；仅本轮 UI、vendored 核心/许可、lint 浏览器全局配置和文档变更。提交 SHA 与清洁状态以最终 Git 输出为准，不推送。当前本机预览 `http://127.0.0.1:4176/`，重启可运行 `npm run dev -- --strictPort --port 4176`。
- 下一步：仅验收本次 M2 模式弹窗，M3 未获授权。

## 9. 靠窗往返运镜 Demo（2026-10-11，当前增量）

### 授权与范围

- 用户用 GrillMe 逐项确认新胶囊、镜头、天气和广播；最后选择 58C/59A/60B「先做 demo」/61A。完整确认项及本轮实现边界见 `docs/M2_REDESIGN_SPEC.md`。
- 本轮先实现 `#/demo/train` 的往返演出。正式 `#/`、M1 调试页与旧 IndexedDB 契约保留；主入口增加 Demo 链接。
- 已实现：靠窗近景、减速后穿侧窗、升高时人物走车门下车、8 秒固定 45°、之后列车驶离；自动走站台、下一班停稳等人、正常登车、相机下降穿窗回座位。两段均无跳过。
- 天气与时段独立随机：晴/多云/小雨 × 白天/黄昏/夜晚。同一趟稳定；返程保留本站天气，在发车后窗外隔音屏遮挡下换下一趟并重置相对坐标。
- 复用寻路和商店剖面。地面点选只在站内自由阶段生效；过场按前台 delta 推进并限幅。减少动态效果保留时序，改固定视角/短叠化；后台冻结，回前台画面继续，声音手动恢复。
- 音频复用全局 AudioEngine，新增原创风纹理和短机械门声，距离/速度控制列车声。天气切换交叉淡化并释放旧天气源，音乐时间不重置；短音效在暂停/后台丢弃。
- 七选一是明确的临时原生 Demo 控件，不持久化；确认后真实映射睡眠无旋律、焦虑 0.65 等策略。**最终液态玻璃胶囊、七选一设置类型/迁移未实现**。
- **日文广播音频尚未接入**。已记录通用文案、30–45 秒调度与 VOICEVOX/Nemo 官方制作途径，未安装工具、未下载声音、未打包未经登记素材。页面常驻标注待接入；不显示字幕冒充广播。

### 重要文件

| 文件 | 内容 |
|---|---|
| `src/demo/train/TrainDemoController.ts` | 纯时序、列车/车门状态、人物候车同步、天气和广播事件调度 |
| `src/demo/train/cinematography.ts` | 同一相机连续路径、严格 45°、响应式构图和减少动态替代 |
| `src/demo/train/TrainDemoScene.tsx`、`DemoTrainModel.tsx` | 程序化内外车厢、站台/森林/云雨、人物、复用商店、单 Canvas |
| `src/demo/train/TrainDemoPage.tsx`、`train-demo.css`、`runtime.ts` | 临时操作、真实加载/失败、Demo 标记、应用级模型与声音协调 |
| `src/audio/AudioEngine.ts`、`generatedAudio.ts` | 天气音源交叉淡化和清理、距离混音、一次性门声、风声；原单例保持 |
| `src/world/StoreModel.tsx` | 可选 simulation 注入，原主流程默认实例保持 |
| `tests/unit/TrainDemoController.test.ts`、`cinematicAudio.test.ts` | 时序/停车后穿窗/先下车再离站/候车/天气遮挡/广播间隔/声音生命周期 |
| `docs/M2_REDESIGN_SPEC.md` | 用户确认项、Demo 状态、后续胶囊整合、日文文案与制作来源 |

### 验证与限制

- 本轮检查与浏览器结果见 `TEST_PLAN.md` 最新节；真机 iOS/Android、人工耳机听感、锁屏和手机 GPU 性能尚未验证。
- 这是程序化运镜占位，不是正式 GLB 或写实资产。固定镜头为 36° FOV 的低畸变透视，视线俯角 45°，没有假称为正交相机。
- 日文人声、广播压低底噪仍待音频素材接入；素材候选条款核查不等于已有录音。网页不接入语音服务。
- 既有 R3F THREE.Clock 弃用提示、约 914 KB 共享 Three 分块警告仍保留。未宣称长期资源稳定或正式移动端性能通过。

### Git 与下一步

- 本轮基线 `main / c7f5d1f`，开工工作区干净。修改限于 M2 Demo、共用音频/商店的必要接口、测试与文档；不改依赖/lockfile、用户参考素材、数据库内容。最终提交/状态见 Git 与交付回复；不推送或部署。
- 当前预览 `http://127.0.0.1:4180/#/demo/train`；重启命令：`npm run dev -- --strictPort --port 4180`。
- 下一步先由用户观看并确认镜头/节奏，再接广播素材、整合胶囊与新设置。当前停在 M2，不自动开始 M3。


## 10. M2 驳回返工（2026-10-13，当前实际状态）

- 先只读审计八项问题，再做独立官方镜片证明页，再集成和浏览器测试。完整审计、文件列表、源码哈希、截图/录屏、复跑命令见 `docs/M2_REWORK_REPORT.md`。
- 主入口与 `#/demo/train` 共用现有列车页面；正常选择阶段只显示行驶背景 + 当前状态符号/标题；长按 600ms 同一镜片向上展开七状态，选择后左滑 40% 并松手确认。无旧品牌、说明、下拉框和独立确认按钮。站内仍可点击地面、使用声音面板并返回列车，Demo 说明留在站内。
- `LiquidStatus.tsx` / `StatusGesture.ts` / `StatusSymbol.tsx` / `liquid-status.css` 为当前控件。`ModeDialog.tsx`、`LiquidSwitch.tsx`、`mode-dialog.css` 已移除，不要重新恢复。`features/status.ts` 负责七状态与原 ModeSettings 的适配。
- 官方 `liquid-glass.js` 原文件保留，新增原样 `glass-webgl.js`。Three 每帧渲染后同步裁取局部，官方 renderer 折射；展开使用原生 Canvas2D 2px 输入磨砂。选择阶段 2 个 canvas，离开后 1 个，不再适用历史单 Canvas 的选择界面描述。销毁弹簧、监听器、observer、GL 对象与玻璃 context。
- 只在确认时写原 IndexedDB schema/key；兼容旧设置，无清库或新镜像。临时草稿不改音频，图形重试保留草稿。睡眠无旋律、焦虑 .65、专注/睡眠/勿扰社交禁用均保留；AudioEngine 和 M1 算法未改。
- 工程：lint/typecheck/build 通过；14 files / 67 tests。Three 913.99KB 分块警告与 Clock 弃用提示保留。无新项目依赖/lockfile 改动。
- 实际 Playwright Chromium 154：桌面与 390×844 触摸模拟、七状态、Pressing、长按、短滑/拖回/touchCancel/纵向/外部/Escape 取消、有效左滑、完整到站与返程、刷新恢复、未确认不保存；正常 pageerror=0。320×740/844×390/1280×800、键盘焦点循环、减少动态与高对比通过。
- 音频：睡眠 policyGain=0；往返 sourceBuilds=1；实际触控地面进店 musicGain≈1、出店=0，时间继续。玻璃/场景 context loss 均可重试，M1 调试页实际加载并返回通过。
- 实际视频：`output/playwright/m2-touch-journey.webm`（原生触控取消+往返）；`m2-liquid-journey.webm`（鼠标回弹+到站）。截图见报告。录屏无音轨；听感未验证。临时验证页面/脚本留在忽略的 output 目录，不进发布包。
- Git：基线 main/e784290，开工干净；工作分支 codex/m2-liquid-status，返工工作保存为本地提交，具体分支/SHA/最终状态以 `git log -1` 和 `git status --short` 为准。未推送、未部署。预览开发 4181、生产 4182，仅本机。
- 未验证：真实 Safari/iOS、Android、Firefox/WebKit；系统返回手势、锁屏、听感、10 分钟持续帧率/功耗与长期内存。DPR=1 小玻璃与官方高 DPI 示例、SVG 与 WebGL 边缘采样仍有差异，不能称逐像素复现。

下一步仅为用户 M2 视觉验收和真机测试。不得把工程通过写成用户已验收，不启动 M3–M7。

## 11. 圆形右拖确认与动态预览（当前）

- 用户明确同意：外层玻璃固定，仅左侧 56px 圆形图标可向右拖动，达到有效行程 85% 后松手确认；标题/其他区域只能长按展开，不能拖动确认。默认 260px 宽控件行程 172px，阈值 146.2px；窄屏按实际宽度计算。
- `StatusGesture.ts` 记录起点是否在手柄，处理右向阈值/反向/短滑/拖回/纵向/touchCancel/重复触发。`LiquidStatus.tsx` 继续原样官方 renderer，在同一个画布增加圆形镜片；外框与标题位置固定，手柄经过标题时标题淡出避让，回弹后恢复。键盘改为按住右方向键600ms后松开；读屏文案同步。
- 窗景静止原因已在 Codex 内置浏览器实测：`prefers-reduced-motion: reduce` 为 true，旧代码因此冻结窗景并用固定镜头替代连续运镜；不是缺少场景代码。录屏浏览器此前偏好不同，不能据此说用户入口显示相同。
- `http://127.0.0.1:4182/?motion=full` 为明确选择完整场景动态的预览；根入口继续遵循系统偏好，玻璃弹簧也继续遵循减少动态。没有改系统设置、添加常驻文字/按钮或变更业务存储。移除参数即可恢复默认场景行为。
- 已验证 lint / strict typecheck / 68 tests / build；Playwright 在实际4182生产包验证桌面与390×844触摸、七状态、标题不可拖、固定外框、短滑/拖回/反向/系统取消/纵向/外部取消、右拖到站和返程。320×740、844×390、1280×800、键盘/Escape、焦点循环、forced-colors通过；正常 pageerror=0。
- 完整动态入口在 reduce=true 下两次窗景截帧不同；普通入口同条件窗景截帧相同。证据和最新录屏为 `output/playwright/m2-right-*`，旧 `m2-touch-journey.webm` 是左滑历史材料。录屏没有音轨。
- 基线 `813458e`、工作分支 `codex/m2-liquid-status`；仅改M2控件/场景动态预览开关、对应测试和文档，未改官方引擎/依赖/M1/音频/数据库。不推送部署；最终提交与工作区见Git。
- 未验证真机Safari/Android、长期性能和听感；M2仍待用户验收，不继续M3。

## 12. M3 实际交付（2026-10-14，当前）

- M3 已实施，等待用户验收；完整文件表、数据契约、规则、范围与限制见 [M3_REPORT.md](M3_REPORT.md)。M0/M1/M2 保持已验收状态，停止于 M3，不扩展 M4–M7。
- 站内原「声音」入口打开真实玻璃播放器：当前曲目/进度、暂停/下一曲/喜欢/跳过、音乐与环境音量、折叠曲库、本地导入/删除、绝对截止定时器。M2 状态选择画面与圆形右拖逻辑未修改。
- 内置《雨灯》与白/粉红噪音均为原创本地合成 Demo；没有新第三方歌曲或外部音乐服务。睡眠只选噪音，专注只选器乐，硬过滤 + 心情/偏好/新鲜度加权，保留近期去重与无候选环境声回退。
- IndexedDB 升级为 version 2：保留原 `settings/mode`，新增 `tracks`（Blob/元数据，内容哈希稳定 ID）和 `feedback`（UUID 喜欢/取消/跳过事件）。不清库，不写档案/时长/聊天，不使用 localStorage 镜像。M4 必须兼容现有 v2。
- 本地导入单首 10 MiB/5 分钟、解码后 64 MiB、单/双声道，库上限 20 首/100 MiB。先查媒体时长，再解码；临时 URL、媒体引用、旧主音源均清理。容量/解码/事务失败不覆盖旧数据；刷新保留导入，浏览器清站点数据可能丢失。
- 默认专注 25 分钟关闭音乐、睡眠 30 分钟淡出全部；可改预设/自定义 1–180 分钟。应用级 `expiresAt`、前台恢复校正、到期幂等；面板和场景不拥有定时器。刷新取消本次定时且不自动发声。系统锁屏瞬时执行未承诺。
- 工程：lint、strict typecheck、19 文件/89 测试、build 均通过。保留 Three 913.99 KB 分块和 Clock 弃用提示；未改 npm 依赖、lockfile、官方玻璃核心或用户参考资源。
- 实际 Chromium：迁移哨兵保留、损坏文件拒绝、WAV 导入/重复/刷新/删除边界、喜欢/跳过保存、暂停切歌、两种到期与继续、移动/横屏布局；最大一个主音乐源、一个 AudioContext。M1 十次进出店增益 1↔0、时间继续、单三源通过；M2 桌面/触摸右拖与往返、取消路径通过；播放器 35 次 Tab 焦点、Escape 恢复、十次开关 Canvas 2↔1 通过，正常 pageerror=0。
- 测试入口：生产 `http://127.0.0.1:4182/?motion=full`；M3 核心触摸模拟 reduce=true，完整场景参数只覆盖场景。普通根入口继续尊重系统偏好。M1 回归用 `#/debug/m1`，见 TEST_PLAN。截图、探针和结果保存在忽略目录 `output/playwright/m3-*`，不是正式 npm E2E 套件。
- 本轮 Git 基线 `cb33a25`，沿用 `codex/m2-liquid-status`；开工干净，已验证工作保存为本地 M3 提交，最终 SHA/状态以 Git 和最终回复为准。没有推送/部署。
- 尚未验证：真实 Safari/iOS、Android、Firefox/WebKit、耳机听感/接缝、真实锁屏、长期内存/GPU/功耗。下一步仅用户验收 M3，并按 TEST_PLAN 执行这些手工检查；日文广播、正式美术与后续里程碑仍未做。
