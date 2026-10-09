# Soundscape Railway — 技术架构

## 1. 选型与原则

- **Vite + React + TypeScript（strict）**；React Three Fiber + Three.js + Drei；Zustand 统一 UI 与世界状态。
- **Web Audio API + HTMLAudioElement**：单个应用级音频引擎，通道为 master/music/rain/train/effects；独立于 React 页面寿命。
- Motion 用于玻璃 UI 动画，复杂列车镜头导演轨迹再考虑 GSAP，避免重复依赖。
- IndexedDB + Dexie 是唯一的本地业务数据源；SVG/CSS Grid 统计；Service Worker 做 PWA 静态资源缓存。默认无需账户、不连接云服务；后续第三方文件同步不引入自建后端或云数据库。
- Vitest 测业务逻辑；Playwright 测流程；手机 Safari/Chrome **实机**测音频与 GPU。
- 不需要 Next.js SSR、Supabase、Firebase、Prisma、用户身份系统、AI API、后端服务。

## 2. 系统分层

```text
AppShell / WorldState / OverlayState
 ├── 3DWorldDirector
 │    ├── TrainScene
 │    ├── StationScene (home | traveler)
 │    ├── FixedCamera / Character / Door / ZoneDetector
 │    └── Rain / Ripples / WindowDrops / TrainPassBy
 ├── AudioEngine (one instance)
 │    ├── MusicTrackController / LocalTrackLibrary
 │    ├── MusicGain / RainGain / TrainGain / EffectsGain
 │    ├── AudioZoneController / TimerController
 │    └── RecommendationEngine
 ├── UIOverlays
 │    ├── LiquidGlassModeSelector / CompactPlayer
 │    ├── SoundArchive / Radar / TravelerProfile
 │    └── EphemeralChat
 ├── PureDomainLogic (permissions, scoring, grouping)
 ├── Repository (Dexie, migrations, JSON backup)
 └── StaticAssets + ServiceWorker
```

## 3. 建议世界状态与动作

WorldPhase：`loading | train | mode_select | arriving | home_station | traveling | guest_station`。Overlay：`none | mode | player | archive | radar | profile | chat | settings`。不要复制两套相互冲突的模式状态；写一个状态协调器。

动作：`BOOT_READY`、`USER_START_AUDIO`、`CONFIRM_MODE`、`ARRIVAL_COMPLETE`、`ENTER_ZONE(zone)`、`RETURN_TO_TRAIN`、`TRAVEL_TO(stationId)`、`TRAVEL_COMPLETE`、`OPEN_RADAR`、`START_CHAT`、`EXIT_CHAT`、`TIMER_EXPIRED`。

**所有社交入口统一校验：** `(mode === 'relax' || mode === 'free') && !doNotDisturb && radarEnabled`；聊天还必须满足在旅人车站、主动确认、目标为 demo 旅人。状态切换专注/睡眠/勿扰时立即关闭社交 UI 并清除会话。

## 4. 音频事件数据流

`Player.worldPosition -> ZoneDetector -> zoneChanged -> AudioZoneController -> scheduled gain ramps -> master output`。相机固定不影响该流程；门槛检测做阈值滞回，不能每渲染帧 React setState。

`AudioEngine` 单实例对外接口建议：`unlockFromGesture(), play(), pause(), next(), setWorldZone(), setMode(), selectTrack(), setMusicVolume(), setAmbientVolume(), startTimer(), cancelTimer(), dispose()`。

- 不因打开统计或聊天重新建立 AudioContext。
- 进店增益音乐渐入，出店渐出到 **0**，曲目进度继续前进；主动暂停保持暂停。
- Master Gain、音轨用户音量、空间环境增益分别乘算；每个音源有错误回退。
- 页面重新可见时使用 `expiresAt` 确认定时器是否已过期；结束操作幂等。
- 同时只能有一个主音乐播放器；切换车站资源后旧音效与贴图应清理。

## 5. 数据类型（建议起点）

```ts
export type SceneMode = 'focus' | 'sleep' | 'relax' | 'free';
export type Mood = 'calm' | 'happy' | 'tired' | 'anxious' | 'lonely';
export type WorldZone = 'train' | 'outside' | 'doorway' | 'inside';
export type WorldPhase = 'loading' | 'train' | 'mode_select' | 'arriving' | 'home_station' | 'traveling' | 'guest_station';
export type TrackSource = 'bundled' | 'imported' | 'generated';

export interface Track {
  id: string; title: string; artist?: string; source: TrackSource;
  tags: string[]; eligibleModes: SceneMode[]; moodTags: Mood[];
  energy: number; instrumental: boolean; durationSec?: number; assetPath?: string;
}
export interface UserSettings {
  mode: SceneMode; mood: Mood; doNotDisturb: boolean; radarEnabled: boolean;
  musicVolume: number; ambientVolume: number; quality: 'low'|'medium'|'high';
}
export interface ListeningSession {
  id: string; startedAt: number; endedAt?: number; mode: SceneMode; mood: Mood;
  stationId: string; audibleMusicMs: number; ambientAudioMs: number; completed: boolean;
}
export interface StationConfig {
  id: string; name: string; ownerType: 'local'|'demo'|'imported';
  theme: 'rain'|'sunset'|'snow'; musicTags: string[]; assetVariant: string;
}
export interface DemoTraveler {
  id: string; name: string; demo: true; stationId: string;
  musicTags: string[]; scenePreferences: SceneMode[];
  activeHours: number[]; currentMood?: Mood; dialogueTreeId: string;
}
export interface ChatMessage {
  id: string; role: 'visitor'|'traveler'; text: string; createdAt: number;
}
export interface EphemeralChatSession {
  id: string; travelerId: string; expiresAt: number; messages: ChatMessage[];
}
```

上述接口在 M0 不需要全部实现，先建立最小技术切片。

## 6. 数据库（IndexedDB）

数据库 `soundscape-db`，建议 Stores：`settings`, `sessions`, `playEvents`, `trackMetadata`, `preferences`, `stationConfigs`, `visitEvents`。**绝不创建持久化 `chatMessages`。**

所有时间存 Unix 毫秒，显示时按本地日期聚合。备份 JSON 含 schemaVersion；导入时校验版本、体积、类型及文本安全性。播放时长的统计规则应可复算和测试。导入音频文件如果保存在 IndexedDB，必须处理浏览器容量与清理；如果只保留文件指针，则显式告知刷新后可能失效。

### 6.1 本地优先同步契约（规划，尚未实现）

M4 仅实现版本化声音档案 JSON 导入/导出、稳定 ID 和可测试的合并逻辑。后续数据流为：`IndexedDB Repository -> 白名单序列化 -> SyncProvider -> 第三方文件存储`；接收方向为 `下载 -> 校验/迁移 -> 合并预览与冲突处理 -> IndexedDB 事务提交 -> 重建统计`。UI、音频与统计不能直接读取远端文件作为业务数据源。

- 每个可同步业务记录与事件在首次创建时分配全局唯一 ID（拟采用 UUID）；更新、导入、导出及重试保持 ID 不变，不使用设备内自增键或时间戳作为唯一 ID。记录包含来源设备标识、schemaVersion 和修订信息；设备标识不代表用户账户。旧版缺 ID 备份需有可重复的迁移映射，不能每次导入生成新 ID。
- 优先评估不可变事件及按 ID 的集合合并：相同 ID、相同内容只保留一次；相同 ID、不同内容登记冲突，不静默覆盖。会话修订、设置等可变记录需保留修订来源/前序版本，识别并发修改；不能只靠设备时钟决定胜者。冲突规则和用户确认方式实施前明确。
- 有效时长及偏好从去重后的记录复算；同一会话的修订不能当作新会话累计，不能把跨设备统计快照直接相加。合并逻辑独立于 UI 和 Provider，验证幂等性、顺序无关性及并发场景。
- 删除需评估带稳定 ID 的删除事件或 tombstone，避免旧备份恢复已删记录；保留周期和清空档案的跨设备语义尚待决定。未解决冲突保留双方内容及本地历史，不能静默删除。

`SyncProvider` 为后续存储适配器契约，职责包括用户主动连接/断开、读取文件与远端 revision/ETag、按预期版本条件写入，以及统一报告未授权、网络、冲突和服务兼容性错误。合并、统计、迁移和加密层不放入适配器；契约在文档中规划，本轮不新增源码或 SDK 依赖。

同步流程先读取远端并校验，再与本地事件合并；IndexedDB 事务保留合并结果及待上传状态，上传时校验读取到的远端版本。版本变化后重新读取并合并，不能用最后上传文件全量覆盖历史。不支持可靠条件写入的服务须先评估并发保护方案，不能宣称可安全同步。重试以稳定 ID 保持幂等，失败不回滚或删除本地新增记录。

### 6.2 适配器、安全与生命周期（后续评估）

- Dropbox：优先评估官方 JavaScript SDK、OAuth 2.0 PKCE、公有浏览器客户端和 App Folder 最小权限；确认静态托管回调地址、所需 scopes、令牌生命周期与条件写入能力。此处为评估要求，尚未选定版本、注册应用或验证兼容性，不嵌入客户端秘密。
- WebDAV：作为高级选项，必须实测目标服务 HTTPS、身份验证，以及浏览器跨域 CORS（包括预检、所需方法/请求头和 ETag 响应头可见性）。不兼容时明确拒绝连接，不能通过新增自建代理绕过项目边界。
- 默认不创建云连接或远端请求。用户开启前展示字段白名单和第三方服务存储、访问数据的隐私边界；允许断开与撤销授权，并说明远端文件删除是独立操作。
- 采用明确的导出字段白名单，排除音乐 Blob/文件内容、本地文件路径或句柄、临时聊天正文、OAuth 令牌、WebDAV 凭据及密钥。认证状态与业务档案隔离；持有方式、过期和撤销策略后续评估，不进入备份、同步文件或日志。
- 后续评估 Web Crypto API 客户端加密：认证加密、随机 nonce、文件格式版本、跨设备密钥传递、密钥丢失和恢复边界；密钥不能与密文一起上传。未完成前不得声称第三方只能看到密文。
- 仅在网页运行期间适时同步，可在主动同步、恢复前台或本地变更后调度；失败显示待重试，断开停止调度。Service Worker 仅负责资源缓存，不承诺关页后持续后台同步。

## 7. 推荐与雷达纯函数

`recommendTracks(context, catalog, history, seededRandom)`：先硬筛场景，再计分后带权随机，能在测试中复现结果。没有候选就返回明确的空状态。

`rankTravelers(profile, demoTravelers)`：按 PRD 中标签 55%、场景 25%、时段 15%、心情 5% 加权；缺项重分配权重，避免声称性格判断。

`canUseSocial(settings)` 必须被 UI 和业务动作共用。聊天只存在未持久化 store 或组件内存中；主动关闭、过期、离站和禁用模式均立即清空消息。

## 8. 场景生命周期与性能

- 每次通常只保留一个完整的活动 3D 场景；车站切换清理旧的 geometry/material/texture/listeners/tweens。
- 初始画质 DPR 1–1.5，设备分档；低性能关闭复杂反射、减少雨粒和阴影；首先保证听音不被打断。
- 优先程序化几何实现可玩性，GLB 作为可替换美术模块。通过渲染批次、烘焙光照和复用材质优化。
- WebGL 上下文丢失与音频解码失败应有明确降级页；不能让 UI 永久显示 Loading。
- `prefers-reduced-motion` 时减少镜头移动、闪烁和水滴 UI 形变。

## 9. 建议源码目录

```text
src/
  app/          App + world/overlay state coordination
  world/        train, station, camera, player, door, zones, weather
  audio/        global engine, mixer, timer, track library, recommendation
  features/     modes, player, archive, radar, chat, stations
  data/         local demo travelers, music catalog, station configs
  db/           Dexie schema, migration, backup
  ui/           liquid-glass components, HUD, loading
  types/        domain contracts
  utils/        deterministic helpers
public/models, public/audio, public/textures
tests/unit, tests/integration, tests/e2e
```

## 10. 部署

使用 HTTPS 静态托管，Vite `base` 正确适配 GitHub Pages 子路径。Service Worker 必须说明缓存范围与更新版本。iOS 后台播放及 WebGL 真机体验需要实测，模拟器与桌面开发工具不能作为最终证明。

## 11. M0 实际落地（2026-10-09）

> 以下是 M0 历史记录；当前实现以第 13 节 M2 及源码为准。

- React 19 + R3F 9 + Three.js + Drei；严格 TypeScript。源码只建立 `app/world/audio/ui`，没有提前建立后续业务状态、数据库或假界面。
- `App -> ScenePreview -> lazy PlaceholderScene`：3D 模块延迟加载，DOM 音频面板独立可用。固定正交相机随容器尺寸调整缩放，点击底座只记录触点。无角色、开门、ZoneDetector 或相机旋转。
- Canvas 使用 `frameloop="demand"`、DPR 1–1.5、低功耗偏好。几何和材质由 R3F 声明式创建/卸载，事件监听在 effect 清理；重试以新场景实例替换旧实例。无外部 GLB/贴图。
- `audio/engine.ts` 持有应用级单实例，通过 `useSyncExternalStore` 订阅；创建服务和 UI 订阅都不创建 AudioContext。点击直接调用 `startFromGesture`，在手势调用栈内创建/恢复 Context；启声成功后建立一个白噪音 source 和 gain。停止释放音源节点，Context 保留供重试；HMR 销毁旧引擎。
- M0 仅有低音量白噪音验证链路。master/music/rain/train/effects、空间混音、定时器与 HTMLAudioElement 将在对应里程碑实现。
- Web Audio 不支持/拒绝/等待超时/中断，以及 WebGL 初始化超时/上下文丢失/渲染错误都有可见反馈。加载提示仅反映阶段，不显示虚构进度百分比。
- M0 没有共享复杂状态，暂不直接接入 Zustand、Motion、Dexie 或 Service Worker；Drei/R3F 的内部依赖不代表业务状态已经实现。
- 工具选型依据：[Vite 安装要求](https://vite.dev/guide/)、[R3F 与 React 版本匹配](https://r3f.docs.pmnd.rs/getting-started/installation)、[Web Audio 手势启动实践](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)。具体版本以 package.json / package-lock.json 为准。

## 12. M1 实际落地（2026-10-09）

数据流：`地面点击 / 快捷目的地 -> findPath -> StationSimulation.position -> detectZone(previousZone) -> AudioEngine.setWorldZone -> SmoothGain`。固定相机与点击目标均不能直接改变声音区域。

- `stationLayout.ts` 同时定义墙、家具、门洞、底座边界和角色半径。导航先扩张障碍物，再通过矩形角点可视图与最短路找出通行路径；每条线段做碰撞检查。移动中重新点选会从当前位置重新规划；非法目标显示提示。门洞是进出店的唯一通路。
- `StationSimulation` 由 `app/runtime.ts` 持有，位置和路径独立于 Canvas。每帧更新模型和 Three refs，仅目标、区域、到达等离散事件通知 React。重载场景保留角色位置和音频状态。帧 delta 上限 50ms，防止恢复前台后跳跃。
- `zones.ts` 对门口两侧做滞回：外侧进入门口阈值 z=1.0，返回店外 z>1.15；内侧进入店内 z<0.3，退出店内 z>=0.45。还校验 x / 店铺边界；侧墙外不会被判定为室内。门在角色距离足够近时提前打开。
- `StoreModel.tsx` 与 `Player.tsx` 仅负责程序化外观和动画；之后可替换 GLB。角色接近入口时，屋顶/前墙/右墙随实际位置淡出；离开后恢复。相机为固定正交相机，没有 OrbitControls。
- 单个应用级 AudioContext；音乐、雨声各只有一个循环 AudioBufferSource。32 秒原创旋律与 8 秒雨声在首次手势后生成；effects Gain 通道预留、没有发声实例。所有通道接到 master；用户音量与空间音量为串联 Gain，互不覆盖。
- 空间增益：outside `(music 0, rain 1)`；doorway `(0.45, 0.65)`；inside `(1, 0.25)`；800ms 线性渐变。`SmoothGain` 记录包络，重定向时从当时的实际插值开始，不依赖浏览器是否实现 cancelAndHoldAtTime。室外音乐最终精确为 0，source 时间继续。
- 暂停使用 master 静音和 AudioContext.suspend；恢复直接 resume，不重建 source。UI 显示音频时钟得出的循环进度。页面隐藏/pagehide 主动暂停，恢复后由用户点击继续。刷新不持久化位置或音频进度，重新回到初始静音态。
- 前台 Canvas 持续渲染用于行走/门/屋顶动画，隐藏时 `frameloop="never"`。DPR 仍限制 1–1.5。R3F 负责几何/材质销毁，手工事件监听均有清理；旧音频模块 HMR dispose 停止并断开节点。

当前选择暂停整个 Context 以冻结两条音源的播放进度，依据 [AudioContext.suspend 的时间语义](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/suspend)。真实移动浏览器的后台事件调度仍需真机验证。

## 13. M2 实际落地（2026-10-09）

用户本轮明确确认 M1 验收成功并授权 M2。第 11/12 节保留历史，以下为当前运行结构；前半文档的曲库、计时、档案、雷达、聊天和 PWA 仍属后续规划。

- 主入口为 `App -> ImmersivePage -> WorldViewport -> lazy WorldScene`，`#/debug/m1` 为保留的 M1 验证页。Hash 切换不刷新页面；只挂载当前页面的一个 Canvas。音频引擎、JourneyController、StationSimulation 均由模块持有，不依赖弹窗或 Canvas 挂载寿命。
- `JourneyController.ts` 独立可测试：`train -> mode_select -> arriving -> home_station -> train`。过场按有效前台帧推进 5 秒：1.6 秒开始开门、2.4 秒开始穿门、3.2 秒切到便利店并上摇、5 秒锁定 M1 约 45° 正交镜头。只在离散阶段变化时通知 React。拒绝乱序/重复确认；允许关闭弹窗、跳过过场和取消返回车厢。没有游离的过场 setTimeout。
- `TrainModel.tsx` 为原创程序化车厢：门、座椅、灯带、窗框、窗外建筑；速度递减驱动窗外运动和轻晃，车门平移，第一人称相机穿门。进入便利店时 `StationSimulation.arrive()` 让微缩角色从底座右侧自动走到店外落脚点。两场景为独立构图，不声称是连续大世界。
- `WorldScene` 保留一个 WebGL renderer；切换 Three 子树由 R3F 释放材质/几何。进入便利店复用 `StationContents`，过场期间阻止地面点选，过场结束仍是原坐标寻路/判区链路。重试只重建视觉，保留旅程、位置和音频；页面隐藏暂停视觉推进及声音，回前台手势恢复声音。
- `WorldViewport` 显示真实模块加载/3D 初始化阶段，12 秒后显示失败与重试；模块导入错误提供整页重载。启程和静音选择不依赖加载成功；停在过场时仍可跳过或返回车厢。无虚构百分比。
- `ModeDialog` 使用原生 modal dialog，原生焦点约束、Escape 关闭与焦点恢复，radio 选择模式/心情，独立 DND switch。CSS 毛玻璃、内高光、胶囊按钮和短形变；小屏/横屏弹窗可内部滚动，支持 safe-area 和 reduced-motion。减少动态效果关闭列车晃动/景物流动及大幅运镜，仍能自动到站。
- `features/modes.ts` 为唯一模式契约与纯策略：模式与心情分开；现有《雨灯》只适用 focus/relax/free，sleep 无候选而退回雨声；tired/anxious 的模式增益为 0.65，其余为 1。DND 不改变音乐。`canUseSocial(settings, radarEnabled)` 要求 relax/free、DND 明确为 false、主动雷达开关为 true；当前没有雷达/聊天动作或假入口，M5/M6 必须复用此权限。
- 音频现为一个 Context、三个持久循环源（music/rain/train），无重复主音乐。新增 4 秒原创列车低频底噪、trainZone/trainMotor，车内空间值 `(music 0, rain 0, train 1)`，车外 train 为 0；减速时 trainMotor 从 0.5 用 1.6 秒降至 0.08。musicZone -> musicMode -> musicUser -> master；用户音量、模式策略、空间增益彼此独立。改模式、往返和打开 UI 不 start/stop/seek 音源。暂停仍 suspend 整个 Context；不保证系统后台或锁屏持续播放。
- `db/settings.ts` 使用原生 IndexedDB `soundscape-db` version 1，仅创建 `settings` store，`mode` key 只保存已确认的 mode/mood/doNotDisturb。读写以事务完成为准，结构白名单校验，2.5 秒超时/blocked/权限失败可见提示且允许继续；迟到读取不覆盖用户已开始选择的内容。没有 localStorage 镜像、统计或聊天存储。M4 接入 Dexie 时须兼容/迁移这份现有数据库，不可清库重建。
- 仍不新增状态库、Motion、数据库依赖或外部素材；依赖和 lockfile 未修改。M3 完整推荐/播放器/计时、M4 档案、M5–M7 后续功能未开始。
