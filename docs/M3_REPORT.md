# M3 — 播放器、设备曲库、规则推荐与定时器

2026-10-14（Asia/Shanghai）。范围仅 M3；用户已验收 M2，本轮不推进 M4–M7。实际入口仍是 `App -> TrainDemoPage`，站内点击「声音」打开播放器；列车状态选择页不加控件。

## 实际交付

- 当前曲目、真实音频时钟进度、暂停/继续、下一曲、喜欢/取消喜欢、跳过、音乐/环境音量。环境音量同时控制天气、列车和门声。面板关闭不重启音频。
- 内置《雨灯》原创器乐 Demo、白噪音和粉红噪音 Demo；均在本地生成，没有新增第三方音乐下载或外部音源请求。曲库明确区分原创 Demo 和本地导入；可主动选择「只听环境声」。
- 推荐先按模式硬过滤：专注要求器乐，睡眠仅白/粉红噪音；其余保留符合模式的候选。`0.45 × 心情 + 0.30 × 偏好 + 0.25 × 新鲜度` 后带权采样，随机源可注入。无偏好用中性 0.5；喜欢曲目/相同标签提升偏好，跳过每次降低 0.2、最低为 0。最近五个不同 ID 存于本次运行内存；耗尽候选时放宽最旧历史，不放宽模式规则。无候选或读取失败返回环境声。
- 喜欢/取消/跳过用稳定 UUID 记录于 IndexedDB，只在事务提交后更新界面。下一曲不写跳过；跳过会降低后续推荐权重。尚无播放时长统计或声音档案。
- 导入支持浏览器可解码的 MP3/WAV/M4A/AAC/OGG/FLAC，单首 10 MiB / 5 分钟以内、单/双声道、解码后最多 64 MiB；最多 20 首 / 100 MiB。先检查文件后缀/MIME/大小，再读取媒体时长，再分配 PCM；解码输出统一 22,050 Hz。元数据读取 10 秒、解码 30 秒、曲库事务 10 秒超时。
- SHA-256 内容 ID 避免同一文件重复导入；完整 Blob 和白名单元数据保存在此浏览器，刷新后仍在。浏览器容量预检与事务失败均保留旧数据。清理站点数据可能丢失曲库，不声称有备份或云同步。
- 内容哈希与反馈 UUID 使用浏览器安全 API，导入/偏好保存需 HTTPS 或本机 localhost。普通手机 HTTP 局域网地址会明确提示，结束处理中状态，原有数据不变；此降级有单元测试。
- 导入前用户选择氛围标签、明确是否为舒缓器乐。未勾选时只用于放松/自由；导入旋律不用于睡眠。没有自动听音分析或 AI。删除有面板内确认，只删选中副本及其偏好；原磁盘文件、其他曲目和旧模式设置不受影响。
- 定时支持 15/25/30/45/60 分钟和 1–180 分钟自定义；关闭音乐（保留环境）或 1.5 秒淡出全部声音后暂停。专注确认时默认 25 分钟关闭音乐，睡眠确认时默认 30 分钟淡出全部；可改/取消。其他状态不自动覆盖已有计时。
- 绝对 `expiresAt`、应用级调度、visibility/pageshow 恢复校正、清空截止状态后才执行结束动作。关播放器与切场景不停止定时。刷新停止声音并取消本次定时；不承诺锁屏瞬时执行。
- 定时关闭音乐使用独立关闭状态，不改用户音量；切歌、自动下一首、空间变化不会自行恢复已关闭音乐。用户可显式重新开启。全部声音到期后的旧延迟暂停不会覆盖后来的恢复操作。
- 播放器使用既有 GlassDialog 和官方原样 WebGL renderer，复用场景当帧裁片；增加的小玻璃 Canvas 仅在面板打开时存在。可内部滚动、关闭按钮固定可达、Tab 约束/Escape/焦点恢复、减少动态与高对比保留。渲染失败可降级为可读的实色面板。

## 文件与数据契约

| 文件 | 职责 |
|---|---|
| `src/audio/catalog.ts`、`recommendation.ts` | 稳定音源目录、适用性边界、偏好与加权推荐 |
| `src/audio/importAudio.ts` | 格式/大小/容量/时长/PCM 校验；媒体探测的临时 URL 释放 |
| `src/audio/SleepTimer.ts` | 纯绝对截止计时器、取消/替换/到期幂等 |
| `src/audio/PlayerController.ts`、`player.ts` | 应用级曲库/选择/反馈/定时协调；过期异步选择不能覆盖新曲 |
| `src/audio/AudioEngine.ts` | 仍为唯一 AudioContext；替换主音源、自然结束、定时关闭/淡出；沿用空间/模式/用户增益 |
| `src/audio/noise.ts`、`generatedAudio.ts` | 原创白/粉红噪音与接缝处理，复用《雨灯》生成器 |
| `src/db/database.ts`、`settings.ts`、`library.ts` | 原生 IndexedDB v2、新增 stores、事务完成/回滚/超时 |
| `src/ui/AudioControls.tsx`、`player.css`、`PlayerGlass.tsx`、`GlassDialog.tsx` | 克制播放器与折叠曲库/计时、可访问弹窗与玻璃清理 |
| `src/demo/train/runtime.ts`、`TrainDemoPage.tsx`、`src/app/runtime.ts` | 站内入口、确认状态时默认计时、主体验与 M1 共用生命周期 |
| `tests/unit/{recommendation,SleepTimer,importAudio,playerAudio,PlayerController}.test.ts` | 推荐/容量/资源释放/异步选择/定时/音频边界回归 |

数据库仍名 `soundscape-db`，从 version 1 原地升级到 2。`settings` 保留原 key `mode` 及其他已有行；只增加 `tracks`、`feedback`。`tracks` 以 `local-<sha256>` 为 key，值为 `{track, blob}`；`feedback` 以 UUID 为 key，值为 `{id, trackId, kind, at}`。读取校验不合格则显示错误，绝不清库。M4 如引入 Dexie，必须接管/迁移 v2 全部三个 store，不能回到 v1 或新建替代数据库。

音频图：主音乐 → 空间 → 模式/定时关闭 → 用户音乐音量 → master；天气、列车、门声 → 各自场景增益 → 用户环境音量 → master。切歌先停并断开旧主源、释放 buffer 引用，再启动唯一新源并短渐入；天气与列车源不重建。暂停仍 suspend Context，室外音乐增益仍精确为零且时间继续。导入解码用离线 Context，不创建第二个可播放 AudioContext；临时媒体元素只读取信息、不调用 play。

## 验证证据与范围

工程检查和浏览器结果见 `TEST_PLAN.md` 的 M3 节。可重复的实际浏览器脚本保存在被忽略的 `output/playwright/m3-browser.js`、`m3-regression.js`；M2 使用原 `m2-right-check.js`、`m2-right-accessibility.js`。它们不是新增的 npm E2E 套件。

- `m3-browser.js` 使用隔离浏览器环境先创建 v1 数据库与哨兵行，再访问 **4182 生产包**。检查初次/刷新无自动启声、迁移保留设置、暂停时切歌时钟不动、喜欢/跳过持久化、损坏文件拒绝、WAV 实际解码/保存、内容去重、刷新恢复、删除取消与边界。
- 通过原生 AudioContext/Gain/BufferSource 探针验证单 Context、最大一个主音乐源、音乐定时后 policy gain=0 且环境 Context running、全部定时淡出后 suspended、点击后恢复。时间跨越用测试时钟偏移与页面可见事件模拟，**不等同于真实锁屏**。
- 390×844 触摸模拟、320×740 / 844×390 / 1280×800 布局；M3 核心脚本使用 `reduce=true` + `?motion=full`，场景完整动态而玻璃尊重减少动态。普通根入口仍遵循系统偏好。
- 截图：`m3-mobile-player.png`、`m3-mobile-library.png`、`m3-layout-*.png`、`m3-scroll-close.png`、`m3-forced-colors.png`；M2 回归结果 `m3-m2-regression.txt`。截图/探针只在忽略目录，不进入发布包。

## 仍未验证与停止点

- 真实 iPhone Safari / Android、Firefox/WebKit、人工耳机听感、切歌瞬态/循环接缝、系统锁屏、长期内存/GPU/功耗未测试。短程源数和 Canvas 计数稳定不等于长期无泄漏。
- 媒体元数据先验和解码后容量上限降低风险，但浏览器原生解码过程的峰值内存与超时后底层取消无法由网页完全控制；低端手机仍需验证。本轮没有添加流式解码依赖。
- 仍保留约 914 KB Three 分块与 THREE.Clock 弃用警告。现有程序化场景、合成噪音仍是 Demo，不是新美术/正式录音曲库；日文广播未接入。
- 无新 npm 依赖或 lockfile 变更；不推送、不部署。基线 `cb33a25`、工作分支 `codex/m2-liquid-status`；本地交付提交 SHA 以最终 Git 输出为准。
- **完成 M3 后停在用户验收。M4 档案统计/备份、雷达、聊天、云同步与 PWA 均未实施，也未获本轮授权。**
