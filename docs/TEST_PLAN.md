# 测试与验收计划

## 测试分类

1. **单元（Vitest）**：推荐场景硬过滤/评分/带权随机/候选不足；`canUseSocial`；旅人匹配；时间统计；日期跨月/跨年/闰年；计时器绝对截止；JSON schema 校验。
2. **集成**：ZoneDetector → Gain ramp；UI 弹窗不重启音轨；场景切换资源释放；聊天关闭时业务状态/内存清理。
3. **端到端（Playwright）**：Loading→启程→模式→进店；离店→返回列车→雷达→旅人车站→聊天→退出；禁用模式拒绝雷达；热力图与备份导入导出。
4. **实机手工**：iOS Safari、Android Chrome；触摸、软键盘安全区、WebGL、后台音频恢复、PWA 资源缓存、低端性能。不得用仿真结果冒充真机测试。

## 关键不可回归用例

- [ ] 首次无手势不尝试自动发声；点击「启程」后听到正常音频。
- [ ] 同时只有一个主音乐播放实例。
- [ ] 入店音乐渐入，出店最终音量 0 且再进店不重头播放。
- [ ] 室外雨声循环无明显爆音和突兀接缝；偶发过车不会无限叠加。
- [ ] 店门区域抖动不会反复触发多个 zoneChanged。
- [ ] 45° 固定镜头可以观察屋内陈设，角色可到达店内并能返回。
- [ ] 打开/关闭播放器、统计页、雷达不导致音频实例重建。
- [ ] 倒计时在隐藏/显示页面后按绝对时间纠偏，仅触发一次结束动作。
- [ ] 不存在候选歌曲时明确回退环境音或提示，不能假装加载在线歌单。
- [ ] 每日统计以本地日期正确归档，闰年、跨月、跨年的图没有缺天/重复天。
- [ ] 声音档案刷新保留；导出后清空再导入恢复一致。
- [ ] JSON 导入文件格式无效/过大时拒绝并保持原数据。
- [ ] 专注、睡眠、勿扰从任何入口都无法触发社交，切换进入这些状态时关闭聊天。
- [ ] 旅人卡片明确显示「模拟旅人」，相似度是音乐偏好而非人格结论。
- [ ] 临时会话退出、超时、离站立即清除消息内存；数据库/持久化 state 无聊天正文。
- [ ] 手机屏幕缩放、横竖切换和虚拟键盘不让聊天输入不可达。
- [ ] 重复切换车站至少 10 次，模型/纹理/事件监听不持续累积。
- [ ] PWA 首次在线后可打开声明为可离线的必要资源；未缓存资源应有明确错误。
- [ ] WebGL 不支持、音频解码失败时有明确提示，页面可重试。
- [ ] reduced-motion 环境下降低大幅运镜/模糊闪烁。

## 自动化命令（M0 配置）

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Codex 应如实输出实际运行的命令和结果；如果未配置脚本或没有真机，则记录为未验证，不能声明测试通过。

## M0 实际验证（2026-10-09）

环境：Windows / Node.js 24.12.0 / npm 11.6.2；Vitest 5.0.3；Playwright CLI 驱动已安装的 Edge（Chromium）。移动验证使用 iPhone 13 尺寸和触控模拟，**不是 Safari 或真机测试**。

| 检查 | 实际结果 |
|---|---|
| `npm install --no-fund --fetch-retries=0 --fetch-timeout=30000` | 231 packages；审计 0 vulnerabilities；生成 lockfile |
| `npm run lint` | 退出码 0，0 warnings |
| `npm run typecheck` | 退出码 0，TypeScript strict 通过 |
| `npm run test` | 退出码 0，2 files / 16 tests passed |
| `npm run build` | 退出码 0，生成 dist；3D chunk 体积警告保留 |
| `npm run dev -- --strictPort` / `npm run preview -- --strictPort` | 两种服务器均成功启动；浏览器访问开发页面与生产预览均显示 3D，初始无声 |
| 真实 3D | 桌面与移动模拟显示底座和建筑盒体；截图人工检查通过 |
| 初次静音 | 浏览器探针记录 AudioContext 0、source starts 0 |
| 点击启声 / 停止 | 1 个 running Context，输出 RMS 约 0.020；停止后 starts 1 / stops 1 / RMS 0 |
| 场景生命周期隔离 | 连续重载 10 次后 canvas 1、AudioContext 1、source starts 1 / stops 0，音频保持播放 |
| 触屏输入 | 模拟真实 touchscreen tap，触点返回 X 1.60 / Z 1.60；触摸启声和停止成功 |
| 布局 | 320×740、390×844、844×390 下 document.scrollWidth 分别为 320、390、844，无横向溢出 |
| reduced-motion | 模拟 reduce 后按钮 transitionDuration 为 0s；3D 无持续动画 |
| WebGL 上下文丢失 | 使用 WEBGL_lose_context 触发原生事件；显示降级文字，点击重试后重新显示 3D，canvas 1 |

单元测试覆盖：首次不建立 Context、同步手势 resume、并发/重复开始去重、UI 取消订阅不停止音频、10 次启停释放节点、resume 拒绝与重试、不支持 API、创建失败、未进入 running、10 秒超时、取消等待中的启声、过期异步回调、中断恢复、部分节点失败清理、dispose、PCM 范围。

验证过程中已解决：Windows 沙箱默认 Vitest forks 无法读取共享临时模块（ENOENT），改用 `pool: 'threads'` 后标准测试命令通过；浏览器无法连接隔离网络中的预览端口，改为在主机网络中仅监听 `127.0.0.1` 后验证成功。两项均不是隐藏的测试失败。

保留限制：构建的 3D chunk 超过 500 KB；正常浏览器控制台有上游 `THREE.Clock` 弃用警告，无应用错误。截图与一次性 CLI 验证脚本保存于被忽略的 `output/playwright/`，不计入源码或正式 E2E 套件。

### M0 手工验收步骤（真机待执行）

1. `npm ci` 后运行 `npm run dev`；如需同网段手机，使用 README 的 host 参数。打开页面应无声、显示 Demo 占位模型，不能永久停在加载状态。
2. 在 iOS Safari 和 Android Chrome 真机分别点击建筑前方底座，确认圆环/坐标响应、相机固定；竖屏、横屏和滚动时模型及操作区可见。
3. 调低系统音量，点击「点击启声」，用扬声器/耳机确认低音量白噪音可听；点击「停止试听」确认停止。重复 10 次，检查没有叠音或明显爆音。
4. 播放时点「重新加载场景」10 次，确认音频不中断，旧场景消失后新场景可交互；停止试听后应静音。
5. 切后台、锁屏、恢复前台，记录平台实际表现。若显示中断，点击「重试启声」应恢复；不得据此承诺所有平台后台持续播放。
6. 关闭硬件加速/使用不支持 WebGL 的环境检查提示和重试；音频面板仍能独立操作。拒绝声音权限后检查提示和重新点击恢复。
7. 开启系统减少动态效果，检查控件可读、可操作；测量真机 GPU/帧率/内存后再记录性能结论。

上方全产品不可回归清单仍按原里程碑保留，M0 结果不能用于勾选 M1–M7 功能验收。

## M1 实际验证（2026-10-09）

环境沿用 M0；M0 基线在修改前重新运行四项命令通过。M1 的 Vitest 为 7 个测试文件 / 30 项，覆盖纯函数和 StationSimulation → AudioEngine 集成。浏览器为桌面 Edge/Chromium 与 iPhone 13 尺寸触控模拟，**没有执行真实 iOS Safari / Android Chrome 测试**。

| 检查 | 实际结果与证明范围 |
|---|---|
| `npm run lint` / `npm run typecheck` | 均通过；零 lint 警告，TypeScript strict |
| `npm run test` | 30 passed，包括 10 次真实位置移动驱动混音的集成测试 |
| `npm run build` | 通过；保留 3D chunk 体积提示 |
| 角色通行 | 单元测试从正面及建筑两侧绕墙经门口进出；路径逐段碰撞检查，拒绝家具、墙体、底座外和 NaN 目标 |
| 地面触控 | 实际 touchscreen tap 地面坐标，使角色从 outside 到 inside 再回 outside；观察店内截图，角色、货架、冰柜、收银台可见 |
| 十次往返 | 原生 AudioContext 始终 1 个、BufferSource 始终 2 个、start 总调用 2 次、未 stop；时钟跨过多个 32 秒循环仍持续增长 |
| 增益 | 后五次逐次严格读取原生 AudioParam.value：inside music=1 / rain=0.25；outside music=0 / rain=1。门口混音与快速反向 ramp 连续性有单元测试 |
| 暂停 | 暂停后角色从外走到内，音频时间仍为 116.272s；位置不会覆盖用户暂停状态，恢复时不重建音源 |
| 隐藏/恢复 | 注入 document.hidden 与 visibilitychange 事件，Context suspended、UI 显示点击恢复；返回后点继续为 running，原时间继续。属于事件模拟，不是硬件锁屏实测 |
| 十次场景重载 | 音频源不变；最终 1 canvas；旧 10 个 WebGL context 均丢失，旧 geometry buffer 均为 0。每个记录中 5 个渲染器内部 texture 由 context 丢失统一释放，不据计数声明长期 JS 堆完全无泄漏 |
| 刷新 | 回到店外、elapsed=0、Context/source=0、首次启声按钮可用 |
| 布局与减少动态效果 | 320×740 / 390×844 / 844×390 无水平溢出；reduced-motion 下 CSS transition 为 0，角色仍能完成行走 |
| 美术说明 | 界面标注 Demo 程序化场景与原创音景；没有用参考图代替 3D |

初次接入检查曾发现旧 M0 测试仍调用 stop、门面组件将 refs 放入遍历数组；已迁移为 M1 暂停语义测试并修正 refs 使用，随后检查全部通过。未修改依赖版本来隐藏警告。

一次性 Playwright CLI 观测脚本与截图位于 `output/playwright/m1-*`，被 .gitignore 忽略。其音频和 WebGL 探针仅注入测试浏览器，不属于发布代码。主项目测试不依赖这些临时脚本。

### M1 手工验收（真机待执行）

1. 按 README 启动，刷新应回店外静音。点击「点击启声」后，店外主要听到雨声。
2. 分别点击店内走道、门口、外部空地（或用快捷目的地），观察角色行走、门开合和屋顶剖面；相机不旋转。点墙/家具应提示不可达，点建筑背面空地应绕行。
3. 连续进出 10 次，听音乐渐入/渐出、雨声强弱变化，出店音乐最终静音。观察进度仍走动，返回店内不是同一首曲从头开始。
4. 进店后主动暂停，走到店外再回去，确认没有自行恢复声音；点继续应从原进度恢复。试调音乐与雨声音量，室外音乐应始终静音。
5. 在声音播放时切后台/锁屏再回来，记录真机实际事件行为；正常情况下显示暂停，点继续恢复；不承诺后台不断声。
6. 声音播放时重载场景 10 次，确认位置/进度保留，旧场景释放后仍可行走。浏览器刷新后应重新静音等待手势。
7. 竖屏、横屏、窄屏及减少动态效果模式下操作触控和音量；记录真机帧率、持续使用的内存与耳机听感，作为后续性能依据。

M1 仅验证本节功能。列车、模式、计时器、档案、雷达、聊天与 PWA 全流程仍待其所属里程碑。

## M2 实际验证（2026-10-09）

用户本轮确认 M1 验收成功后实施 M2。以下为本轮实测；上方 M0/M1 记录保留为历史，不将其真机待测内容自动升级为通过。

环境：Windows，Node.js 24.12.0 / npm 11.6.2，现有依赖未升级；Vitest 5.0.3，Edge/Chromium（Playwright CLI 0.1.22），内置 Chromium 辅助视觉检查。生产预览仅本机 127.0.0.1:4176。尺寸/hasTouch/reduced-motion 均为桌面模拟，未执行真实 iOS/Android 测试。

| 检查 | 实际结果与证据边界 |
|---|---|
| `npm run lint` | 退出码 0，0 warnings |
| `npm run typecheck` | 退出码 0，strict；build 也再次执行 |
| `npm run test` | 退出码 0，11 files / 54 tests |
| `npm run build` | 退出码 0；index 256.50 KB / gzip 81.42 KB，WorldScene 6.57 KB，共享 StationScene 920.14 KB / gzip 244.45 KB；Vite 500 KB 警告保留 |
| 初次/静音 | 原生探针记录首次 Context 0 / source 0；静音启程及刷新恢复模式后仍 Context 0 |
| 普通到站 | no-preference 下逐阶段观察 braking / opening / alighting / lifting / home_station，5 秒过场完成；保留门开及上摇截图；可跳过、取消 |
| 声音策略 | 启声后 1 Context、3 sources、3 starts；列车 musicZone=0/rainZone=0/trainZone=1；进店 musicZone=1；sleep 后 musicMode=0；模式及场景切换源不重建，时间继续 |
| 设置保存/复用 | 实际 IDB 保存 sleep/tired/DND=true；刷新后对应 radio/switch 预选，仍须确认；未确认自由模式草稿用 Escape 取消后不保存 |
| 10 次往返 | 暂停后返回列车/静音启程/跳过/自动走到站点，重复 10 次；时间恒 6.341333333s，1 Context / 3 sources / 3 starts / 1 Canvas / 1 WebGL；每次站点 buffers=227，没有持续增加 |
| WebGL 丢失 | 主动 WEBGL_lose_context -> 失败提示 -> 重试 -> 渲染恢复；旧 Context 确认 lost，音频仍 running、Context/source 不增加 |
| 主页面/调试页 | `#/debug/m1` 进店再返回主体验，位置 inside 保留、1 Canvas、1 AudioContext、3 sources |
| 全屏尺寸 | 320×740、390×844、844×390 的 scrollWidth/scrollHeight 均等于视口；HUD 坐标均在屏幕内，无横向溢出或主页面额外滚动 |
| 模态焦点 | 连续 18 次 Tab 留在 dialog 内；Escape 关闭后恢复到「再次启程」；按钮与 radio 可键盘操作 |
| reduced-motion | 禁用大幅运镜、窗景移动和轻晃，仍可完成到站；M1 行走保留 |
| 移动触控 | 单独 hasTouch/isMobile Chromium context：tap 静音启程/专注/确认，tap 实际地面 (214,414) 进店、(138,464) 出店，坐标区域相应改变 |
| 小屏/横屏弹窗 | 320×740 dialog=(16,20,288,700)，844×390 dialog=(178,20,488,350)；内部滚动后确认按钮可 tap，页面无横向溢出 |
| 存储拒绝 | 注入 indexedDB 属性 SecurityError；读/写提示均出现，仍能完整到站，无整个页面崩溃 |
| 音频拒绝 | 注入 resume 拒绝；仍可选择并到站，启声失败提示可见，可打开声音面板 |
| 模块失败 | 拦截 WorldScene chunk；错误边界显示模块失败，仍可选择/跳过/返回；取消拦截后点重载恢复 |
| 加载超时 | 延迟 WorldScene 请求，12 秒后出现初始化失败；过程中可选择/跳过/返回；点重试并恢复请求后 Canvas 就绪 |

测试组成：原有 M1 30 项 + 列车 PCM 1 + 模式策略/权限/结构 11 + JourneyController 6 + settings 4 + journeyAudio 集成 2 = 54。模式矩阵覆盖四种模式与独立 DND、主动开启；sleep 对五种心情均硬过滤音乐。旅程覆盖乱序、取消、跳过、减少动态效果、迟到设置读取；存储覆盖超时迟到关闭、提交完成才成功与安全拒绝。

本轮发现并修复：原生 dialog 连续 Tab 可进入浏览器工具栏，补充显式首尾循环并复测；IndexedDB 属性本身抛安全异常时需要在仓库内部捕获，新增回归并验证页面可继续。

工具与脚本问题：沙箱预览超时、npx offline 找不到宿主缓存，改为宿主的仅本机预览/已缓存 CLI 后完成，无新依赖下载。脚本初次 check 视觉隐藏 radio 被 label 拦截，改为真实点按标签；重复探针注入与残留 reduced-motion 测试状态已隔离/重置后重跑。以上未作为应用成功结果忽略。

证据文件（被忽略的本地产物）：`output/playwright/m2-flow.js`、`m2-lifecycle.js`、`m2-failures.js`、`m2-touch-loading.js`；`m2-train-mobile.png`、`m2-mode-mobile.png`、`m2-opening.png`、`m2-lifting.png`、`m2-inside-mobile.png`、`m2-station-{320,390,844}.png`。浏览器脚本不是 npm test 的正式 E2E 套件；探针未打包发布。

正常流程无应用 error；保留 THREE.Clock 弃用 warning。主动 WebGL 失效测试出现 Context Lost / extension warning 属故障注入过程。GPU buffer 短程稳定不是长期 JS 堆/所有浏览器无泄漏证明。本轮未实听、未测原生音频输出 RMS，也未测真实锁屏行为。

### M2 手工验收（真机待执行）

1. 按 README 启动；真机同网段访问，记录机型/系统/浏览器。首次应出现静音列车，窗外景物流动、车门可见。调低设备音量再点启程。
2. 关闭模式面板回车厢，重新启程；分别试四模式/五心情/DND。睡眠入店应无旋律，疲惫/焦虑更轻；DND 不改变音乐。没有雷达/聊天假入口。
3. 普通过场应减速、开门、穿门、角色走到店前、上摇固定镜头；每阶段试跳过或返回车厢，不能陷入无法退出的状态。
4. **直接触摸地面**进出便利店 10 次，检查门/屋顶、音乐渐入和室外静音、返回不重播；再试快捷按钮与音量面板。
5. 暂停后返回列车、静音启程多次，不能自行恢复。播放时切后台/锁屏再回来记录行为，点击继续；不承诺后台不断声。
6. 确认设置后刷新，应该仍先静音列车，预选上次设置并重新确认。浏览器存储被禁时应提示但可继续。
7. 横竖屏、安全区、减少动态效果、键盘 Tab/Shift+Tab/Escape，检查面板可关闭、按钮可达；观测真机帧率、耳机听感和长期内存。

M2 验收后停止，M3 推荐/播放器/定时与 M4–M7 功能须另行授权。
