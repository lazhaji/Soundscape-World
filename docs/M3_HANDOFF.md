# M3 新 Session 交接

更新：2026-10-14（Asia/Shanghai）。用户原话：“m2完成,开一个新session进行m3,注意交接”。这既是M2验收确认，也是M3实施授权；不要重新询问是否允许开始M3。

## 起点与边界

- 仓库 `D:\Soundscape World`，分支 `codex/m2-liquid-status`。M2最终代码提交 `d47e9d3`；交接前工作区干净，本次只修改交接/验收文档。交接提交以`git log -1`为准。未推送、未部署。
- 先读 `docs/HANDOFF.md`、本文件、适用AGENTS、PRD、DECISIONS、ARCHITECTURE、DESIGN_SYSTEM、TASKS、TEST_PLAN，再检查Git/实际源码/可用素材。旧文档很多是历史，不可据旧方案恢复M2界面。
- 仅实施M3。保留M0/M1/M2和用户资源；不重新开发列车/便利店、不做M4档案统计、M5雷达、M6聊天、M7 PWA或云同步。客户端本地计算，无后端/账户/AI；音乐只能用有许可素材、原创合成或用户本地导入。
- 本会话完成交接后停止修改代码，新会话接手同一本地工作目录，无需另建替代应用或复制整个项目。

## 已验收且须保留的M2

- 主入口 `App -> TrainDemoPage -> TrainDemoScene + LiquidStatus`；`#/demo/train`共用同一实现，`#/debug/m1`保留M1调试。不要把旧`WorldScene/JourneyController`误当作当前主入口。
- 状态选择阶段仅动态列车背景与一个玻璃矩形；七状态固定为专注/睡眠/勿扰/平静/愉悦/焦虑/孤独。禁止加品牌、说明、导航栏、普通下拉框或独立确认按钮。
- 长按矩形600ms展开；选择后仅左侧56px圆形图标可向右拖动，达到可用行程85%并松手确认。外框固定，标题位置固定且在圆形经过时淡出避让。取消/拖回/反向/系统中断正确恢复；键盘按住右方向键确认。旧整体左滑方案已废弃。
- `src/ui/LiquidStatus.tsx`、`StatusGesture.ts`、`StatusSymbol.tsx`、`liquid-status.css`；官方 `src/vendor/liquid-glass/` 原样WebGL引擎/MIT许可保留，同画布双镜片。实际动态canvas折射，不得退回普通CSS模糊。UI涉及玻璃时继续使用已安装liquid-glass-web Skill和Playwright验证。
- `src/demo/train/TrainDemoController.ts`、`cinematography.ts`、`TrainDemoScene.tsx`沿用当前减速、穿侧窗、人物走车门、固定45°、返程编排；不要另建场景或回归自由镜头。
- `features/status.ts`将七状态适配到既有ModeSettings；原`features/modes.ts`含模式/社交策略。UI不得重新分成心情/模式两组；不要简单改名破坏硬过滤和勿扰权限。

## 当前音频与数据实际状态

- `src/audio/engine.ts`持有全局单例；`AudioEngine.ts`、`generatedAudio.ts`、`noise.ts`、`mixer.ts`是现有引擎/原创合成/混音。主音乐目前是单首原创器乐Demo《雨灯》，不是已实现曲库。
- `src/demo/train/runtime.ts`负责当前场景声音、七状态确认与保存；`src/app/runtime.ts`还有页面生命周期/M1调试兼容逻辑，变更共享音频接口时两边调用者都要查。
- `src/ui/AudioControls.tsx`是现有站内声音面板，已接暂停/音乐与雨声音量/进度。下一曲、喜欢/跳过、曲库导入、完整推荐和定时器尚未实现。
- 进店主音乐渐入、出店精确静音但时间继续；以角色坐标判区。用户音量、模式策略、空间增益分层，场景/弹窗切换不能重建音源。现有睡眠对这首不适用Demo回退环境声、焦虑增益0.65；M3必须按候选资格硬过滤，不得以UI改名绕过策略。
- `src/db/settings.ts`是原生IndexedDB `soundscape-db` version 1，仅`settings` store的`mode` key，保存已确认的mode/mood/doNotDisturb。非Dexie、无localStorage镜像。扩充M3必需数据时要兼容迁移、保留既有设置和稳定ID，不能清库/全量覆盖。别提前实现M4统计与备份。
- `docs/ASSET_MANIFEST.md`记录素材来源。程序化列车/场景和原创合成音景仍为Demo资产；日文广播音频尚未接入，勿将此冒称已完成或在M3自动扩展广播制作。

## M3授权范围与验收

以TASKS的“M3 — 完整播放器、推荐与定时器”和PRD第3节为准：

1. 合规曲目目录、本地音频导入、白/粉红噪音；校验格式/大小、解码失败/存储容量、资源释放和删除边界。无合法候选时明确环境声回退，禁止抓取未经授权曲库或伪造资源。
2. 推荐纯函数：按mode硬过滤，再按心情/偏好/新鲜度评分、可注入随机源的带权采样、近期去重。PRD初始权重0.45/0.30/0.25；检验无候选、重复、无偏好等边界。
3. 克制的浮层播放器：当前曲目、播放/暂停、下一曲、喜欢/跳过、音乐/环境独立音量。复用当前站内声音入口，不破坏M2状态阶段的极简约束。M4声音档案未实现时不要添加假入口。
4. 定时15/25/30/45/60分钟及自定义；到期可关闭音乐或淡出全部声音。应用级逻辑使用绝对`expiresAt`，前台恢复校正、到期幂等，不依赖React挂载寿命或承诺锁屏瞬时执行。
5. 切歌、暂停、空间增益解耦，切歌无重复叠音；导入/清理不损坏既有数据。只做到M3，完成验收后停止。

先给出简短M3实施计划、影响文件和验证方式，再修改；无需重做M2或再问是否启动。遇到无法从现有决策判断的实质设计问题再精准询问，其他工作继续。

## 预览、验证与尚未测试

- 开发：`npm run dev -- --strictPort --port 4181`。生产：`npm run build`后`npm run preview -- --strictPort --port 4182`。现有进程可能仍在，先检查再启动，避免误开旧端口版本。
- 完整动态生产预览：`http://127.0.0.1:4182/?motion=full`。普通`http://127.0.0.1:4182/`尊重系统减少动态偏好。实际Codex内置浏览器此前`reduce=true`，所以根入口窗景静止、固定镜头；不要把它当作动画失效。`motion=full`仅覆盖场景动态，玻璃仍遵循减少动态；没有改系统设置。
- M2最后通过：`npm run lint`、`npm run typecheck`（build内执行）、`npm run test`（14文件68项）、`npm run build`。Three约914KB分块与Clock弃用提示仍存在。交接本身仅改文档，不重复声称运行了一遍测试。
- 实际Playwright Chromium鼠标/触摸/键盘、七状态、各取消路径、到站/返程、320/390/844/1280视口、减少动态/高对比已验证。最新证据为忽略目录`output/playwright/m2-right-*`，最新录屏`m2-right-touch-journey.webm`；旧左滑录屏不再代表当前交互。
- 可复用的回归：`tests/unit/AudioEngine.test.ts`、`cinematicAudio.test.ts`、`TrainDemoController.test.ts`、`status.test.ts`、`modes.test.ts`、`settings.test.ts`与`tests/integration/journeyAudio.test.ts`、`spatialAudio.test.ts`。新非平凡逻辑补真实边界测试；必须启动实际浏览器验证M3，不只build。
- 真实iPhone/Safari、Android、Firefox/WebKit、耳机听感、锁屏和长期性能尚未验证。用户确认M2完成不代表这些已通过。
- M3阶段结束更新HANDOFF/TASKS及必要技术文档，保存已验证的本地Git提交，报告实际检查和限制，不自动推送/部署或继续M4。
