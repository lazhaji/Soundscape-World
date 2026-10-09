# Soundscape Railway — 技术架构

## 1. 选型与原则

- **Vite + React + TypeScript（strict）**；React Three Fiber + Three.js + Drei；Zustand 统一 UI 与世界状态。
- **Web Audio API + HTMLAudioElement**：单个应用级音频引擎，通道为 master/music/rain/train/effects；独立于 React 页面寿命。
- Motion 用于玻璃 UI 动画，复杂列车镜头导演轨迹再考虑 GSAP，避免重复依赖。
- IndexedDB + Dexie 存档；SVG/CSS Grid 统计；Service Worker 做 PWA 静态资源缓存。
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

- React 19 + R3F 9 + Three.js + Drei；严格 TypeScript。源码只建立 `app/world/audio/ui`，没有提前建立后续业务状态、数据库或假界面。
- `App -> ScenePreview -> lazy PlaceholderScene`：3D 模块延迟加载，DOM 音频面板独立可用。固定正交相机随容器尺寸调整缩放，点击底座只记录触点。无角色、开门、ZoneDetector 或相机旋转。
- Canvas 使用 `frameloop="demand"`、DPR 1–1.5、低功耗偏好。几何和材质由 R3F 声明式创建/卸载，事件监听在 effect 清理；重试以新场景实例替换旧实例。无外部 GLB/贴图。
- `audio/engine.ts` 持有应用级单实例，通过 `useSyncExternalStore` 订阅；创建服务和 UI 订阅都不创建 AudioContext。点击直接调用 `startFromGesture`，在手势调用栈内创建/恢复 Context；启声成功后建立一个白噪音 source 和 gain。停止释放音源节点，Context 保留供重试；HMR 销毁旧引擎。
- M0 仅有低音量白噪音验证链路。master/music/rain/train/effects、空间混音、定时器与 HTMLAudioElement 将在对应里程碑实现。
- Web Audio 不支持/拒绝/等待超时/中断，以及 WebGL 初始化超时/上下文丢失/渲染错误都有可见反馈。加载提示仅反映阶段，不显示虚构进度百分比。
- M0 没有共享复杂状态，暂不直接接入 Zustand、Motion、Dexie 或 Service Worker；Drei/R3F 的内部依赖不代表业务状态已经实现。
- 工具选型依据：[Vite 安装要求](https://vite.dev/guide/)、[R3F 与 React 版本匹配](https://r3f.docs.pmnd.rs/getting-started/installation)、[Web Audio 手势启动实践](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)。具体版本以 package.json / package-lock.json 为准。
