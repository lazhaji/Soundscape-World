# Codex 开发任务与逐阶段验收（M0–M7）

> **当前状态**：M2 最新为固定外框、左侧圆形图标右拖85%行程后松手确认，证据见 [M2_REWORK_REPORT.md](M2_REWORK_REPORT.md) 第8节。完整动态预览使用 `?motion=full`；普通入口尊重系统减少动态偏好。仍待用户视觉/真机验收，下方旧整体左滑与早期UI记录为历史。

> 2026-10-11 历史增量：按用户「先做 demo」新增 `#/demo/train` 靠窗往返运镜预览，详见本文末节与 HANDOFF 第 9 节。最终胶囊、新设置迁移和日文人声尚未整合；M3 未开始。

> **执行纪律**：一次只实现一个里程碑；先计划，后实现、测试、提交；完成后停止并报告。不要把所有里程碑混成一次代码生成。

## M0 — 仓库脚手架和技术验证（Codex 首轮任务）

**要做**
- 检查仓库，不覆盖现有文件；选定稳定依赖并锁定版本。
- 建立 Vite + React + TypeScript strict + Three.js/R3F，按需接入 Zustand、基本测试配置。
- 先做一个最小 3D 场景（例如底座 + 建筑盒体）以验证手机触控和相机。
- 实现一次「用户点击后才能启动音频」验证，允许生成白噪音，不依赖授权未明确的音源。
- 建立基本错误处理、项目 README、`lint/typecheck/test/build` 脚本；保留本包的 `docs/` 与 `AGENTS.md`。

**验收**：页面可打开并显示 3D，占位模型能正确渲染，用户点击后可以有声播放；构建和现有测试通过，移动布局无明显溢出。**本轮完成后停止。**

## M1 — 最重要的垂直切片：便利店空间音景

**要做**
- 方形底座、基础便利店外观和有内部空间的剖面占位。
- 固定 45° 镜头、点击移动的角色、门开合、室内外 ZoneDetector。
- 单一 AudioEngine + music/rain/effects 通道；区域变化驱动平滑音乐、雨声混音；保留音乐播放进度。

**验收**：连续进店/出店 10 次，音乐渐入/出到静音，音乐时间轴不从头重启；没有重复主音轨；屋顶遮挡淡出后可见内部；退出/刷新后没有多个音频实例。

## M2 — 新干线 Loading、模式弹窗与列车到站

**要做**
- 车厢近景、可见列车门、窗外移动场景与底噪、真实 Loading/重试。
- 苹果风格近似液态玻璃模式/心情弹窗、勿扰开关及设置复用。
- 列车减速、开门、自动下车和上摇到固定 45° 的运镜；手机音频手势解锁。

**验收**：从打开网页到进店可无刷新完成；首次未点击不自动发声；任意时刻不会卡在无退出的 Loading；模式能真实影响音乐策略与社交权限。

## M3 — 完整播放器、推荐与定时器

**要做**
- 合规曲目目录、本地导入、白/粉红噪音、推荐评分 + 可重复测试的带权随机、去重。
- 浮层播放器、音量、暂停/下一曲/喜欢/跳过、定时选择与结束行为。
- 把 UI 的暂停、切歌与音频空间增益彻底解耦。

**验收**：每个模式能按规则选择曲目；无曲库时给环境声回退；切歌不重复叠音；前后台恢复后计时器基于 expiresAt 校正；导入/清理不损坏数据。

## M4 — 声音档案与 IndexedDB

**要做**
- Dexie schema 与迁移、可靠的会话有效时长/事件统计。
- 周/月/年 GitHub 式热力图 + 日期详情 + 偏好标签、空数据状态。
- 声音档案版本化 JSON 导入、导出与独立清空流程，校验版本/结构/大小，提供合并与冲突预览，提示本地存储可能丢失。
- 为所有可同步业务记录/事件分配稳定唯一 ID；导入、迁移和重试保留 ID，以原始记录去重合并后重建统计。制定旧备份 ID 迁移、会话修订及冲突处理规则；不安装云 SDK、不实现云同步。

**验收**：刷新后记录正确保留，闰年/跨月边界测试通过；有效时间不重复；在空库中能恢复备份，结构无效时拒绝导入且不破坏原库。两设备各有历史时导入合并保留双方记录；重复导入、相反导入顺序和同一会话修订不重复计数；同 ID 异内容可识别并处理，取消导入保持原库；导出不含本地音乐文件、聊天消息、授权令牌或连接凭据。

### 后续可选 — 跨设备云同步（未排期，需单独授权）

- [ ] 定义 `SyncProvider` 契约与 Provider 无关的校验、合并、去重、冲突和删除语义；IndexedDB 始终为唯一的本地业务数据源。
- [ ] 优先评估 Dropbox 官方 JavaScript SDK、OAuth 2.0 PKCE、App Folder 最小权限及静态托管兼容性。
- [ ] 评估 WebDAV 高级选项的 HTTPS、身份验证、CORS 与条件写入兼容性。
- [ ] 设计远端版本校验、并发合并、重试和可见冲突处理，禁止最后上传文件覆盖全部历史。
- [ ] 默认关闭；设计主动开启、第三方隐私说明、断开/撤销及远端文件删除流程；禁止同步本地音乐、临时聊天与令牌。
- [ ] 评估 Web Crypto API 客户端加密、跨设备密钥管理及恢复边界，不提前宣称已加密。
- [ ] 明确只在网页运行期间适时同步，不承诺浏览器关闭后的持续后台同步。

**未来验收要求**：离线新增后重新连接保留双方历史；两设备并发写入、网络中断重试、授权过期、冲突及删除均有明确结果，无重复计数或静默历史丢失；默认关闭时无云请求；验证导出白名单和断开后的调度停止。以上尚未实现或验证，不纳入本轮交付。

## M5 — 雷达与可访问的模拟旅人车站

**要做**
- 列车内雷达入口和 `canUseSocial` 强约束。
- 本地模拟旅人数据（例如雨夜 Rin、海边 Haru、雪夜 Yuki），规则相似度评分及说明。
- 列车过场装载旅人便利店的不同音景和美术主题；提供返回列车/原站入口。

**验收**：可从家乡店乘车访问旅人店并返回；专注/睡眠/勿扰无法通过任何入口打开雷达；匹配结果明确标记为 Demo；场景切换不持续泄漏资源。

## M6 — 液态玻璃身份卡与临时脚本聊天

**要做**
- 旅人互动点、玻璃身份卡、胶囊展开的短时聊天面板；模拟分支回复。
- 3分钟绝对到期时间、用户提前结束/离站/模式禁用时清空消息。
- 手机键盘、焦点恢复、安全区、 reduced-motion 适配。

**验收**：结束聊天后内存状态为空，持久化数据库和日志无消息正文；到期后无法继续发消息；禁用模式时不能聊天；不误称在线真实用户。

## M7 — 美术精修、性能、离线与发布

**要做**
- 用正式可用 GLB/贴图逐步替换占位，完成窗雨痕、涟漪、屋檐滴水、灯箱微闪、室内陈设。
- PWA Service Worker、画质档、资源和音源许可清单、实机兼容与静态部署。
- 完整 README、演示视频、架构亮点说明与已知限制。

**验收**：移动实机核心流程可用；重复车站切换无明显资源累积；离线只声称缓存过的功能；公开演示可访问；仓库内文档准确。

## 每阶段 Codex 输出格式

1. 实施目标与影响模块。
2. 已修改文件列表及理由。
3. 功能演示方法和运行命令。
4. 实际执行的 lint/typecheck/test/build 结果，失败不可隐瞒。
5. 未完成项、兼容性限制和风险。
6. 下一阶段建议。完成当前里程碑后停止。

## 当前进度

> 2026-10-09：用户明确确认「M1 验收成功，开始 M2」。本轮完成 M2 列车开场、真实 Loading/重试、模式/心情/勿扰、IndexedDB 设置复用、到站过场、全屏主入口及 M1 调试页分离。工程检查与桌面浏览器验证通过，M2 等待用户体验验收。
>
> 最新现状以 [HANDOFF.md](HANDOFF.md) 为准。下方 M0/M1 执行记录是历史证据，原有「待确认 M1 / 不开始 M2」措辞已被本轮授权取代。真机听感/锁屏/GPU 与长期堆验证仍未执行，不能用用户验收推断这些测试已跑过。

- [x] M0 工程基础
- [x] M1 核心便利店音景（用户已确认验收成功）
- [ ] M2 新干线与状态控件（旧交付被驳回，返工已实现并完成所列验证，等待用户视觉/真机验收）
- [ ] M3 播放器与推荐
- [ ] M4 声音档案、JSON 备份
- [ ] M5 雷达旅行
- [ ] M6 临时聊天
- [ ] M7 精修与发布

云同步未排期，仍需单独授权。当前完成 M2 后停止，不自动推进 M3。

## M0 执行记录（2026-10-09）

**已完成**
- 原目录仅含规范与参考素材，无源码、package.json 或 `.git`；未覆盖已有资源，未创建提交。
- Vite + React + TypeScript strict + R3F/Three.js/Drei 最小工程；精确依赖版本与 lockfile。
- 固定约 45° 正交视角、方形底座和建筑盒体；明确标注 Demo 占位模型，点击/触控只显示触点反馈。
- 应用级单实例 AudioEngine，首次无声，用户点击才创建/恢复 Context；本地生成白噪音、停止、重试、中断与失败提示。
- 3D 阶段加载、错误边界、WebGL 丢失/不支持回退与场景重试；按需渲染、DPR 上限、响应式布局和 reduced-motion。
- README、架构落地说明、资产登记、16 项单元测试和浏览器实测记录。

**实际检查**
- `npm run lint`：通过，0 警告。
- `npm run typecheck`：通过。
- `npm run test`：2 个文件、16 项测试通过。首次默认进程池在 Windows 沙箱读取临时模块失败，已改用 threads 并重跑标准命令通过。
- `npm run build`：通过；有 3D 分块体积警告，见下方。
- Edge/Chromium 桌面与移动设备模拟：3D 渲染、触控、点击启停音频、10 次场景重载不中断音频、WebGL 丢失后重试均通过；320/390/844 px 无横向溢出。
- 音频探针：初始 Context 0；启声后 Context 1 / running / 输出 RMS 约 0.020；停止后 RMS 0。该结果证明浏览器处理音频，不替代扬声器/耳机人工听感。

**未完成问题与限制**
- 没有连接 iOS/Android 真机：Safari/Chrome 实机触控、听感、后台恢复、手机 GPU 稳定性和帧率尚未验收。
- 按需 3D 模块 minified 914.26 KB / gzip 242.82 KB，超过 Vite 500 KB 提示阈值；后续按实际手机加载表现决定进一步拆分/裁减，未隐藏警告。
- R3F 9.8.1 内部 `THREE.Clock` 触发 Three.js 0.186.1 弃用警告；正常页面无应用错误。跟进上游兼容版本，不修改 node_modules 或屏蔽控制台。
- 没有正式模型/音乐，也没有 M1 区域音景与移动角色。PWA、存储、列车、推荐、雷达和聊天均未实现。

**验收与下一步**
按 README 启动并完成 `TEST_PLAN.md` 的 M0 手工步骤。用户验收后，下一轮可单独授权 M1；本轮不继续实施。

**实际文件清单**（21 个新增源码/配置/测试文件，5 个更新文档）

| 操作 | 文件 | 用途 |
|---|---|---|
| 新增 | `.gitignore`、`.npmrc`、`package.json`、`package-lock.json` | 忽略构建与测试产物、精确依赖、开发脚本 |
| 新增 | `tsconfig.json`、`vite.config.ts`、`eslint.config.js` | strict、构建、Vitest threads、代码检查 |
| 新增 | `index.html`、`public/favicon.svg` | 中文移动页面入口、原创占位图标 |
| 新增 | `src/main.tsx`、`src/styles.css`、`src/app/App.tsx` | React 入口、响应式布局、M0 页面 |
| 新增 | `src/world/ScenePreview.tsx`、`src/world/PlaceholderScene.tsx` | 3D 加载/重试、相机、占位模型与触控 |
| 新增 | `src/audio/AudioEngine.ts`、`src/audio/engine.ts`、`src/audio/noise.ts` | 独立音频引擎、单实例所有权与噪声合成 |
| 新增 | `src/ui/AudioCheck.tsx`、`src/ui/ErrorBoundary.tsx` | 点击启声面板与错误边界 |
| 新增 | `tests/unit/AudioEngine.test.ts`、`tests/unit/noise.test.ts` | 16 项音频生命周期与 PCM 单元测试 |
| 更新 | `README.md`、`docs/ARCHITECTURE.md` | 运行方式、范围限制与实际模块分层 |
| 更新 | `docs/TASKS.md`、`docs/TEST_PLAN.md`、`docs/ASSET_MANIFEST.md` | 进度、实测结果、手工验收与原创资源登记 |

`AGENTS.md`、`CODEX_START.md`、PRD、决策、设计规范和两份参考素材未修改；参考素材 SHA-256 前后完全一致。`dist/`、`node_modules/`、`output/playwright/` 是被忽略的本地产物。

## M1 执行记录（2026-10-09）

开工前重新检查 M0 实码及 lint/typecheck/test/build，全部通过（16 个 M0 测试）。本轮复用原依赖与 lockfile，没有添加后端、外部素材或新依赖。

**交付内容**
- 可进入的方形底座便利店：真实 3D 墙体、门、屋顶、货架、冰柜、收银台与微缩角色。
- 固定 45° 正交相机；点击地面寻路，避开墙和家具，支持移动中改目的地及无障碍快捷目的地。拒绝底座外或障碍物目标。
- 玩家位置驱动 outside/doorway/inside；门槛滞回、门自动开合、屋顶与前/右遮挡墙淡出。
- 单实例音频引擎：原创《雨灯》旋律与合成雨声；空间音量 800ms 平滑变化、音乐出店最终为 0、音乐时间继续，用户音量独立。
- 暂停/恢复复用原音源和 Context；隐藏页面主动暂停，回前台由点击恢复。重载场景保留位置/音频，刷新开启新的静音会话。
- 场景模型、寻路、移动、区域检测、音频合成与混音模块分离，方便替换 GLB；保留错误提示和重试。

**实际检查**
- lint、TypeScript strict、测试、构建通过；测试为 7 个文件 / 30 项，包括真实移动模型驱动音频的 10 次往返集成测试。
- Playwright 驱动桌面 Edge/Chromium：10 次完整进店/出店，始终 1 Context / 1 music source / 1 rain source；每条 source 只 start 一次。后五次严格读取原生增益：店内 music=1 / rain=0.25，店外 music=0 / rain=1；音频时钟持续增长到 95.28 秒。
- 暂停后从外面走到店内，Context 时间两次读取均为 116.272 秒；模拟隐藏后处于 suspended，前台显示点击继续，恢复复用原音源。
- 重载场景 10 次后仍 1 Canvas、1 Context、2 sources；10 个旧 WebGL Context 已失效，旧几何 buffer 数均为 0；活动场景 buffer 数稳定在含目的地圆环的 227 个。未做长期堆内存分析。
- 移动模拟使用实际 touchscreen tap 点按地面，完成进店和出店；320×740、390×844、844×390 均无横向溢出，reduced-motion 下仍可行走。
- 刷新后回店外，进度 0，AudioContext/source 均为 0，等待新手势。

**实际文件变动**

| 操作 | 文件 | 作用 |
|---|---|---|
| 新增 | `src/world/stationLayout.ts`、`navigation.ts`、`zones.ts`、`StationSimulation.ts` | 共享布局、带角色半径的寻路、滞回检测、移动状态 |
| 新增 | `src/world/StationScene.tsx`、`StoreModel.tsx`、`Player.tsx` | 场景、可剖面商店、门和角色动画 |
| 替换 | 删除 `src/world/PlaceholderScene.tsx`；修改 `ScenePreview.tsx` | 用可交互场景替代 M0 盒体，保留重载与降级 |
| 新增 | `src/app/runtime.ts` | 全局世界模型与页面隐藏/退出事件 |
| 修改 | `src/audio/AudioEngine.ts` | 持续双音源、独立音量、暂停/恢复、诊断与销毁 |
| 新增 | `src/audio/mixer.ts`、`generatedAudio.ts` | 可重定向增益包络、原创测试音景 |
| 替换 | 删除 `src/ui/AudioCheck.tsx`，新增 `src/ui/AudioControls.tsx` | 启声、暂停、音量与真实进度 |
| 修改 | `src/app/App.tsx`、`src/styles.css`、`index.html` | M1 页面、移动布局、状态说明 |
| 新增/修改 | `tests/helpers/audio.ts`；`tests/unit/AudioEngine.test.ts`、`navigation.test.ts`、`zones.test.ts`、`mixer.test.ts`、`generatedAudio.test.ts`；`tests/integration/spatialAudio.test.ts` | 测试音频生命周期、碰撞、阈值、混音与往返；保留原 noise.test.ts |
| 修改 | `README.md`、`docs/ARCHITECTURE.md`、`docs/ASSET_MANIFEST.md`、`docs/TEST_PLAN.md`、`docs/TASKS.md` | 当前运行方式、结构、原创资产与实际验收记录 |

**待验收与已知限制**
- iOS Safari / Android Chrome 真机听感、后台/锁屏中断、GPU 性能尚未验证；移动模拟不替代真机。
- 原生 Web Audio 增益、时钟和源数量已验证；人工耳机听感、长期内存稳定性仍需实际使用验收。
- 3D 模块约 919.57 KB / gzip 244.27 KB，仍有 Vite 500 KB 体积警告；保留 R3F 内部 THREE.Clock 弃用警告。测试过的正常流程无应用错误。
- 音景为明确标注的原创合成测试内容；正式美术、录音、雨夜 Shader、随机过车与 M2 新干线均未实现。

以上为 M1 阶段历史记录。用户于本轮确认 M1 验收成功并授权 M2，最新实施结果见下节；真机限制继续保留。

## M2 执行记录（2026-10-09）

**交付**：原创程序化新干线车厢、移动窗景和柔和底噪；原生可关闭玻璃模式/心情弹窗与独立勿扰；IndexedDB 复用已确认设置；约 5 秒减速/开门/穿门/自动下车/镜头上摇；真实加载阶段、错误重试、跳过和返回；全屏入口与 `#/debug/m1` 分离。

模式真实驱动 musicMode Gain：sleep 过滤唯一 Demo 器乐后回退雨声，tired/anxious 降低旋律强度，DND 不改变音乐。社交权限纯函数强制 mode + DND + 主动开启条件；本轮不实现雷达、聊天或 M3 完整推荐。音频新增 train 通道但只有一个主音乐源，始终复用全局引擎。

| 模块 / 文件 | 变更目的 |
|---|---|
| `src/app/App.tsx`、`DebugPage.tsx`、`JourneyController.ts`、`runtime.ts` | 全屏入口、调试路由、可取消/跳过的状态流转、设置与空间音频协调 |
| `src/world/TrainModel.tsx`、`WorldScene.tsx`、`WorldViewport.tsx`、`sceneHooks.ts` | 列车画面、运镜、单 Canvas 场景切换、真实加载/失败和视觉生命周期 |
| `src/world/StationScene.tsx`、`StationSimulation.ts` | 复用 M1 内容、上摇后固定相机、到站自动行走 |
| `src/features/modes.ts`、`src/db/settings.ts` | 模式策略/权限纯函数、唯一 IndexedDB 设置源及结构/错误边界 |
| `src/ui/ModeDialog.tsx`、`GlassDialog.tsx`、`AudioControls.tsx`、`src/styles.css` | 玻璃弹窗、首尾焦点循环、全屏响应式、实际模式声音说明 |
| `src/audio/AudioEngine.ts`、`mixer.ts`、`generatedAudio.ts` | 列车底噪、模式串联增益、原音轨时间线与暂停语义保持 |
| `tests/unit`、`tests/integration` | 新增旅程/权限/存储/音频集成回归；M1 测试适配新增列车源 |
| `index.html`、README、HANDOFF、TASKS、TEST_PLAN、ARCHITECTURE、DECISIONS、ASSET_MANIFEST | 入口信息、真实现状、验收记录、决策与原创资产登记 |

**验证**：lint 零警告、typecheck strict、11 files / 54 tests、build 全部通过。Edge/Chromium 完成普通动画与减少动态效果流程、设置刷新复用/静音开场、十次往返、WebGL 丢失/重试、调试路由、键盘焦点循环、320/390/844px 全屏布局及存储/音频/模块加载失败回退。实际结果与限制详见 TEST_PLAN 的 M2 节。

**Git 与范围**：基线 `28edf31`，分支 main，开始时工作区干净；本轮未改依赖/lockfile、AGENTS、PRD、参考素材。工作以 M2 提交保存，最终 SHA/工作区状态见 `git log -1` / `git status --short` 与交付回复。不推送或部署。

**剩余**：M2 用户体验验收、真实 iOS/Android 触控/听感/后台与性能；保留 920.14 KB 3D 分块及 THREE.Clock 警告。完整曲库、计时、档案、雷达、聊天、PWA 均未提前实现。本轮停止，M3 需下一次授权。

## M2 模式弹窗重设计（2026-10-10）

用户在只读分析后明确授权使用 liquid-glass-frontend / liquid-glass-web 重新设计模式弹窗。

- [x] 雨夜车票式单层磨砂面板、四段选择、原创模式 SVG、心情和真实声音说明。
- [x] 原生勿扰开关 + 按住时的小范围 SVG 折射；动态加载 MIT 核心并保留许可，无新 npm 依赖。
- [x] 保留原生模态关闭/焦点/单选语义和现有模式、音频、IndexedDB 逻辑。
- [x] 取消场景与遮罩重复模糊；移动横竖屏滚动和减少动态/高对比降级。
- [x] lint、strict typecheck、54 测试、build；Chromium 四尺寸、键盘/触控、十次开合与音频/滤镜清理、保存/取消/刷新、折射 chunk 失败回退。
- [ ] 用户视觉验收与真实 iOS/Android 性能/兼容性。

关键文件：`src/ui/ModeDialog.tsx`、`LiquidSwitch.tsx`、`mode-dialog.css`、`src/styles.css`、`src/vendor/liquid-glass/`、`public/licenses/liquid-glass.txt`；eslint 为浏览器 vendor 文件补充 globals，未屏蔽 lint。Git 基线 main / `6b173bb`，最终提交见 Git。M3 未开始。

## M2 靠窗与完整往返 Demo（2026-10-11）

- [x] 整理用户确认的胶囊、往返、随机天气、日文广播方案，区分目标与已实现。
- [x] 独立 `#/demo/train`、真实加载/错误恢复、明确临时控件和广播待接入标记。
- [x] 靠窗车厢、停车后侧窗穿出、人物从车门下车、固定 45°、关门驶离。
- [x] 自动走站台、下一班进站等待、人物登车、镜头下降穿窗返回；去返均无跳过。
- [x] 晴/多云/小雨 × 白天/黄昏/夜晚，每趟稳定；返程遮挡后换天气；减少动态与后台冻结。
- [x] 复用商店/寻路/全局音频；原创风纹理、门声、远近列车混音；天气源交叉淡化和清理。
- [x] 新增 10 项有行为意义的纯逻辑与声音生命周期回归（合计 64 项）。
- [ ] 用户观看镜头/布局/节奏验收；真实 iOS/Android 触摸、听感、GPU 与锁屏验证。
- [ ] 取得日文音频、试听并登记许可，接入可听广播和压低底噪。
- [ ] 将已确认液态玻璃胶囊与七选一设置迁移整合进正式入口。

基线 `main / c7f5d1f`；本轮为 M2 内部 Demo，不是 M2 全部新目标已完成。最终工程检查和浏览器证据见 TEST_PLAN 最新节；完成本轮后等待用户验收。


## M2 驳回返工（2026-10-13）

- [x] 完成八项只读审计，记录基线文件和行号。
- [x] 用官方 Skill 原样 WebGL renderer 先验证单镜片，再接实际动态 Three 背景。
- [x] 主入口移除旧展示页面、原生下拉框和独立确认按钮；仅一个连续玻璃主体、七种符号与中文标题。
- [x] 长按 / 选择 / 左滑确认 / 取消 / 键鼠触控 / 减少动态；只确认时保存且沿用原权限/音频契约。
- [x] lint、strict typecheck、14 文件 67 测试、build 与所列 Playwright 检查；提供截图、原版/同背景对照及真实录屏。
- [ ] 用户视觉验收；真实 iPhone Safari / Android Chrome、Firefox/WebKit、持续性能与听感。
- [ ] M3–M7，仍未授权。

完整文件表、精确测试结果、剩余差异和复跑命令见 [M2_REWORK_REPORT.md](M2_REWORK_REPORT.md)。本轮停止在 M2 验收，不将旧“已实现”记录解释为当前验收通过。

## M2 追加：圆形手柄向右确认

- [x] 仅圆形图标起拖有效；外框固定、标题原位避让，右拖85%有效行程松手确认。
- [x] 原长按七状态保留；短滑/拖回/反向/touchCancel/键盘与焦点回归；原样官方引擎同画布双镜片。
- [x] 实测定位内置浏览器减少动态偏好与录屏不一致；提供完整动态预览参数，默认保留无障碍偏好。
- [x] lint、strict typecheck、68测试、build，以及4182实际生产包鼠标/触摸/往返验证。
- [ ] 用户视觉验收与真实手机测试；M3–M7不开始。
