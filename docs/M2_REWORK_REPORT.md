# M2 状态控件返工：审计、实现与验收证据

> 最新用户确认已将整体左滑改为圆形图标右拖。当前实现与证据见第8节；第1–7节为本次返工第一版的审计和历史验收记录。

日期：2026-10-13（Asia/Shanghai）。只处理 M2；基线 `main / e784290`，开工工作区干净。用户已驳回旧交付。本报告记录可复核的实现与测试，不替代用户视觉验收或真机验收。

入口：开发预览 http://127.0.0.1:4181/ ，生产预览 http://127.0.0.1:4182/ 。`#/demo/train` 与主入口使用同一 M2 页面；M1 调试入口仍是 `#/debug/m1`。

## 1. 修改前的八项审计

以下行号属于 **Git 基线 e784290**，可用 `git show e784290:<path>` 重现，避免把已删除代码的位置误当成当前实现。

| 问题 | 已核实的依据 |
| --- | --- |
| 1. 谁实现弹窗？ | 正式入口 `src/app/App.tsx:65` → `src/ui/ModeDialog.tsx:26` → `GlassDialog.tsx` / `mode-dialog.css`；另一个列车入口在 `src/demo/train/TrainDemoPage.tsx:36–53` 和 `train-demo.css`。两套 UI 并存。 |
| 2. 是否调用官方能力？ | `LiquidSwitch.tsx:23–27` 动态引入 `createGlass`，只折射勿扰开关的装饰轨道。没有给整个模式面板或列车画面使用官方折射。 |
| 3. 官方源码在哪里？ | `src/vendor/liquid-glass/liquid-glass.js`，与 Skill 原文件字节哈希一致；存在 MIT notice。没有 `glass-webgl.js`。 |
| 4. 什么材质？ | `mode-dialog.css:16–17` 是 `backdrop-filter: blur(22px) saturate(145%)`；开关局部 SVG；`train-demo.css:17` 是 `#233d42e8` 普通底栏。列车本身由 Three WebGL 渲染。 |
| 5. 为什么普通底栏？ | Demo 页面完全没有导入玻璃引擎。HANDOFF 第 9 节、M2_REDESIGN_SPEC 第 3 节明确写着“临时原生选择控件”“最终胶囊未实现”。这证明了代码范围的缺口，不能据此推测此前执行者的动机。 |
| 6. 为什么残留文字？ | Demo 第 36–53 行无条件绘制品牌、DEMO 01、阶段标题和说明；App 第 42 行起也保留展示型页面结构，选择阶段没有移除。 |
| 7. 为什么只有点击？ | Demo 第 45 行 `<select onChange>`，第 46 行按钮 `onClick={confirmDemoChoice}`；正式 ModeDialog 第 35 行 form submit。没有状态控件的长按计时、拖动阈值和取消状态机。 |
| 8. 文档冲突？ | 旧 PRD 第 6 节允许近似玻璃；DESIGN_SYSTEM 第 20–22 行允许先 CSS 模糊；旧方案允许展开按钮/辅助确认按钮。当前用户指令覆盖这些冲突。AGENTS 明确最新要求优先，不是阻碍。 |

先完成以上只读审计并在聊天中给出方案，然后才复制 WebGL 引擎、建立独立证明页，验证后接入 M2。

## 2. 官方源码实际使用

- `src/vendor/liquid-glass/liquid-glass.js`：原样 map 生成与 `createSpring`。
- `src/vendor/liquid-glass/glass-webgl.js`：原样 `createGlassRenderer`、折射 shader、色散与高光。
- `src/ui/LiquidStatus.tsx:25` 建立 renderer；第 44–46 行使用官方 spring；第 114 行起接收当前帧并更新镜片；第 139 行起释放资源。
- `src/demo/train/TrainDemoScene.tsx:210` 的 `FrameOutput` 在所有场景更新后只渲染一次 Three，然后同步传递 canvas。不是异步截屏，也不要求 `preserveDrawingBuffer`。
- 只裁取玻璃附近像素，玻璃画布 DPR=1，常态 260×88，展开最高 260×424。状态阶段有 1 个 Three context + 1 个小玻璃 context；离开选择阶段销毁后者。没有第二个 3D 世界。
- 收起参数对应官方 button：refraction 14 / bezel .8 / curvature 3 / chroma .12 / specular .6 / specularWidth 1.5；展开连续插值至 panel：24 / .3 / 4 / .1 / .5 / 2。
- 官方 WebGL shader 没有 panel blur 参数。本地适配仅在输入裁片加 8px 采样余量，用 Canvas2D 原生 filter 从 blur(0) 连续到 blur(2px)，再交给原样官方折射引擎。不重写折射算法。
- MIT 许可在 vendor/LICENSE 与 `public/licenses/liquid-glass.txt`；已核实生产包有 `dist/licenses/liquid-glass.txt`。源码哈希与官网核对见 vendor/README.md。2026-10-13 下载官网文件后，统一 CRLF/LF，两个文件内容逐字相同。
- 未打包官方示例壁纸、字体、组件全集或远程依赖。没有只用 CSS 模糊冒充折射；实际状态 surface 的 `backdropFilter` 为 `none`。

官方依据：[仓库](https://github.com/gentpan/liquidglass)、[Demo](https://liquidglass.dev/)、[组件](https://liquidglass.dev/lib/components.js)、[WebGL 引擎](https://liquidglass.dev/lib/glass-webgl.js)。

## 3. 交互与业务衔接

`StatusGesture.ts` 独立建模 `Idle → Pressing → Expanded → Selected → Dragging → Confirmed`。长按 600ms；只有选择后明确左拖至控件宽度 40%（260px 时 104px）并松开才确认。短滑、拖回、纵向滑出 44px、向右误触、pointercancel、丢失捕获、Escape、窗口失焦、后台和旋转取消操作。已确认状态不能重复触发。

实际触控曾暴露合成 click 被重新定位到新展开行的问题：现在要求选项自己收到一次新的 pointerdown 才接受指针点击，长按释放不会误选。键盘/读屏 activation 可以展开但不能点击确认。键盘可长按 Space/Enter 展开、方向键/Tab 循环选择，选择后按住左方向键 600ms 再松开确认。减少动态效果时保留手势阈值、关闭弹簧形变；高对比/减少透明度提高实度。

主页面成功加载后只有行驶背景与一个玻璃控件；七个状态是唯一可见 UI 文字。无顶部品牌、Demo 标签、场景描述、旧导航或独立确认按钮。真实加载/错误仍明确显示。Demo 资产说明与“声音 / 返回列车”仅出现在到站之后。

`features/status.ts` 将七状态映射回既有 ModeSettings。睡眠音乐策略为 0；焦虑为 .65；专注/睡眠/勿扰禁止社交，其他状态也需未来主动开启。旧设置读取优先 sleep → focus → DND → 同名心情，tired → calm。不清库、不升级 schema、不新建镜像。只在确认时写入原 `soundscape-db/settings/mode`；草稿变化不写入、不改音频，图形重试保留草稿。读取超时仍沿用既有 2.5 秒上限，声音解锁失败不阻止到站。

沿用 TrainDemoController 的减速、停稳、侧窗运镜、人物从门下车、固定 45°、返程，沿用 M1 商店/寻路/坐标判区及单例 AudioEngine。没有更改音频引擎或 M1 算法。

## 4. 实际验证

Windows，Playwright Chromium 154，Intel D3D11；390×844 移动视口与触控为模拟，绝非真机 iOS/Android。脚本只用真实 mouse/touch/keyboard 事件触发操作；模块读数是只读诊断，没有通过内部函数直接模拟确认成功。

| 检查 | 结果 |
| --- | --- |
| `npm run lint` | 通过，0 warnings |
| `npm run typecheck` | 通过，TypeScript strict |
| `npm run test` | 14 files / 67 tests 通过；新增 3 个测试覆盖七状态映射、阈值/重复触发、取消/不同 pointer |
| `npm run build` | 通过；保留 Three 913.99KB 分块警告；M2 页面块约 28.47KB（gzip 11.20KB） |
| 独立单镜片 | 官方 WebGL 在移动网格上，边缘 RGB 差值之和平均 16.88；平坦中心与镜片外为 0；GL error=0 |
| 同背景光学对照 | 同浏览器、1280×800、DPR=1、同网格/260×88/参数，SVG vs WebGL 镜片内平均每通道绝对差 1.315/255；3.836% 通道差值超过 8，最大局部差 136；不是像素级完全一致 |
| 桌面 / 生产包 | Idle、Pressing、长按展开、七状态逐项选择、普通点击不确认、短滑回弹、过阈值后拖回取消、有效左滑到站全部通过；生产预览复跑通过 |
| 手机原生触摸事件 | CDP touchStart/Move/End/Cancel，短滑、系统取消、纵向滑出、点击外部取消、重新选择、有效左滑均通过 |
| 可见文本 | 收起仅“平静”；展开精确为专注/睡眠/勿扰/平静/愉悦/焦虑/孤独。旧品牌、DEMO、确认并到站等均不在状态阶段可见 DOM 中 |
| 存储 | 未确认草稿读回 null；睡眠确认保存旧 schema；刷新预选睡眠；不自动启声 |
| 声音/往返 | 睡眠 policyGain=0；往返后 sourceBuilds=1，主音乐源=1，播放时间从约 8s 继续到约 23s；选择阶段 2 canvas，到站后 1 canvas |
| M1 空间音频 | 实际触控地面进店，musicGain≈1；点地面出店，musicGain=0；播放时间 10.509→12.371s，sourceBuilds 始终 1 |
| 减少动态 / 键盘 | 按下宽高不变；600ms 展开；16 次 Tab 焦点留在七选项；Home/Enter 选中；短按左键取消，长按左键确认；完整到站 |
| 尺寸 / 高对比 | 320×740、390×844、844×390、1280×800；无横向溢出，展开控件在视口内；最短测试点击高度 46px；forced-colors 可用 |
| WebGL 故障 | 主动丢失玻璃 context、Three context，均可重试；勿扰草稿保留但未落库；M1 调试场景实际就绪并可返回 |
| 连续形变 | 展开 600–1200ms 区间采样到 14 个不同的整数高度；该次展开帧间隔 P95=25ms。该值是桌面运行结果，不是手机性能承诺 |
| 控制台 | 正常应用流程 pageerror=0；已有 THREE.Clock 弃用警告保留。主动 context loss 的诊断日志不算正常流程错误 |

性能原始采样（添加 panel frost 前）：390×844 的桌面 Intel GPU 上，静止镜片约 115.3 rAF/s、展开静止约 111.8 rAF/s，P95 均 16.7ms；这只反映这台机器的短时桌面采样。最终 frost 采样：静止镜片 73.87 rAF/s（P95=20.7ms），展开静止 78.20 rAF/s（P95=16.7ms）。随机背景与采样负载没有固定，这两轮不能作为因果性能基准。没有真实手机持续帧率结论。

验证中修复/更正：触摸合成 click 误选、StrictMode 清理时不应丢失仍挂载 canvas 的 context、场景重试草稿保留；首次进店断言过早读到正在渐入的 0.096，改为等待实际区域和增益条件后通过，没有修改音频策略掩盖结果。初始 CLI 录屏缺 ffmpeg，补齐 Playwright 录屏组件后用 recordVideo 生成真实 WebM 并解码抽帧验证。

## 5. 截图、录屏与复跑

文件在本工作区忽略目录 `output/playwright/`，未打包进应用，未上传或部署。

| 证据 | 文件 |
| --- | --- |
| 初始状态 | [手机](../output/playwright/m2-idle-mobile.png)、[桌面](../output/playwright/m2-idle-desktop.png) |
| Pressing | [按住未展开](../output/playwright/m2-pressing.png) |
| 长按展开 | [手机](../output/playwright/m2-expanded-mobile.png)、[桌面](../output/playwright/m2-expanded-desktop.png) |
| 选中收拢 | [手机](../output/playwright/m2-selected-mobile.png)、[桌面](../output/playwright/m2-selected-desktop.png) |
| 左滑过程 | [手机](../output/playwright/m2-dragging-mobile.png)、[桌面](../output/playwright/m2-dragging-desktop.png) |
| 原版对照 | [官方 Demo](../output/playwright/m2-official-components.png)、[官方按压](../output/playwright/m2-official-pressed.png)、[同背景光学对照](../output/playwright/m2-controlled-optics.png)、[单镜片证明](../output/playwright/m2-proof.png) |
| 实际视频 | [触摸取消、确认与往返](../output/playwright/m2-touch-journey.webm)、[鼠标短滑回弹与到站（2px frost 前的补充）](../output/playwright/m2-liquid-journey.webm) |
| 空间音景 | [实际进店](../output/playwright/m2-inside-final.png) |

录屏是浏览器画面录制，没有录音；不能代替听感验收。鼠标版 18.92 秒、390×844、VP8、25fps，已解码抽帧；触摸版包含取消和完整往返。录制帧率不是应用渲染帧率。

开发：`npm run dev -- --strictPort --port 4181`；生产：`npm run build` 后 `npm run preview -- --strictPort --port 4182`。

Playwright CLI（本机缓存）复跑方式：先 `npx --offline --package @playwright/cli playwright-cli -s=m2-rework open http://127.0.0.1:4181/`，再 `npx --offline --package @playwright/cli playwright-cli -s=m2-rework run-code --filename output/playwright/<脚本名>`。

脚本：`m2-proof-check.js`、`m2-reference-check.js`（官网页面）、`m2-optics-compare.js`、`m2-production-check.js`、`m2-mobile-check.js`、`m2-accessibility-check.js`、`m2-recovery-check.js`、`m2-spatial-check.js`、`m2-performance-check.js`。临时脚本是本地验收材料，不是已接入 npm 的通用 E2E 套件；部分依赖开发模式只读探针。

## 6. 本次修改文件

- 修改：`src/app/App.tsx`；`src/demo/train/TrainDemoPage.tsx`、`train-demo.css`、`TrainDemoScene.tsx`、`TrainDemoController.ts`、`runtime.ts`。
- 新增：`src/features/status.ts`；`src/ui/LiquidStatus.tsx`、`StatusGesture.ts`、`StatusSymbol.tsx`、`liquid-status.css`；`src/vendor/liquid-glass/glass-webgl.js`、`glass-webgl.d.ts`；`tests/unit/status.test.ts`。
- 更新类型/来源说明：`src/vendor/liquid-glass/liquid-glass.d.ts`、`README.md`；原核心 JS 没有修改。
- 删除旧 M2 UI：`src/ui/ModeDialog.tsx`、`LiquidSwitch.tsx`、`mode-dialog.css`。
- 更新文档：HANDOFF、TASKS、PRD、DESIGN_SYSTEM、DECISIONS、ARCHITECTURE、M2_REDESIGN_SPEC、TEST_PLAN，以及本报告。
- 包依赖/lockfile、用户参考资源、M1 实现、AudioEngine、数据库代码均未修改。

## 7. 视觉差异与未验证项

1. 官方 Demo 多为高细节静态照片/SVG，这里是原有程序化动态列车。大块平色上折射不如照片纹理明显；不能把背景差别算成已经逐像素复现官方照片。
2. 同源位移图/光学参数已经核对，但 SVG 和 WebGL 在边缘采样、抗锯齿、色散合成仍有上面的量化差异。这里玻璃 DPR=1，而官方部分演示用 DPR=2；高 DPI 真机边缘锐度需核查。
3. 展开 panel 的 frost 在原生 Canvas2D 完成，官方 DOM panel 使用 SVG Gaussian blur，顺序一致但跨引擎的核函数和采样不保证逐像素相同。白字有适配动态明暗的字缘保护，和官网照片上的排版不同。
4. 未运行真实 iOS Safari、Android Chrome、Firefox 或 Playwright WebKit。Skill 的三引擎脚本要求 macOS/WKWebView，本环境为 Windows；不拿上游声明替代本项目实测。真机触摸、系统返回手势、锁屏/听感、持续 GPU/功耗/发热、长期内存仍待验收。
5. M2 业务与所列 Chromium 检查通过，视觉接受度仍由用户验收；不自称 M2 已验收。没有推进 M3–M7，日文广播录音与正式美术仍未实现。

真机后续：在同网段启动局域网 dev 服务，分别用 iPhone Safari/Android Chrome 开启页面；检查 600ms 长按、七项触控、104px 左滑/拖回、来电或后台取消、横竖屏/安全区、减少动态、高对比、完整往返、店内外耳机听感与 10 分钟温度/帧率。记录设备/系统/浏览器及异常，不以桌面模拟代替。

## 8. 当前追加：圆形右拖与动态预览

用户标注“只有左侧图标可以拖动，图标在小圆形中”，并确认由左向右拖动。现为56px圆形手柄、左右各16px边距；长按矩形600ms展开七状态，选择后仅圆形起拖有效；向右达到实际行程85%且松手确认。260px控件的有效行程172px，阈值146.2px。标题与外框不位移；圆形经过标题时标题淡出避让，回弹恢复。反向/标题起拖不会确认，键盘改为右方向键。

官方源码没有修改。`LiquidStatus.tsx` 在原renderer增加第二片圆形镜片并使用同一source，每帧同步跟随圆形；仍只有一个Three画布和一个局部玻璃画布。业务回调、权限、设置、音频引擎和M1不变。

**网站与旧视频不一致的已核实原因**：在实际Codex内置浏览器读取到根入口 `prefers-reduced-motion: reduce=true`、`document.hidden=false`、phase=cruising，且加载的是当前生产文件。`TrainDemoScene.tsx` 原实现将此偏好传给Landscape，速度置零；sampleShot也改为固定镜头。此前录屏浏览器偏好不同。因此不能用该录屏声称内置浏览器也在动态运行。

当前 [完整动态预览](http://127.0.0.1:4182/?motion=full) 仅通过明确URL参数选择完整场景动态；[普通入口](http://127.0.0.1:4182/) 继续尊重系统偏好。没有改操作系统/浏览器设置，没有新增常驻UI。玻璃弹簧继续遵循系统减少动态偏好。该参数不保存到用户业务设置，移除即恢复默认。

**本次修改**：`src/ui/StatusGesture.ts`、`LiquidStatus.tsx`、`liquid-status.css`、`src/demo/train/TrainDemoScene.tsx`、`tests/unit/status.test.ts`；同步HANDOFF、TASKS、PRD、DESIGN_SYSTEM、DECISIONS、M2_REDESIGN_SPEC、TEST_PLAN和本报告。无依赖/lockfile/官方源码/数据库/M1/AudioEngine修改。

**实际验证**：lint、strict typecheck、build通过；14文件68测试通过。Playwright直接测试4182生产包，桌面1280×800（no-preference）和390×844原生CDP触控（reduce=true + motion=full），七项选择、标题不能拖、外框固定、短拖回位、越阈值后拖回、反向、纵向、touchCancel、外部取消、有效右拖、完整到站和返程通过，正常pageerror=0。减少动态根入口两次窗景截图相同，完整动态入口不同；键盘短右/左键不确认、Escape取消、长右确认、Tab焦点循环，以及320×740/844×390/1280×800尺寸和forced-colors通过。仍保留Three大分块与Clock提示。

| 当前证据 | 文件 |
| --- | --- |
| 初始圆形控件 | [手机](../output/playwright/m2-right-idle-mobile.png)、[桌面](../output/playwright/m2-right-idle-desktop.png) |
| 展开七状态 | [手机](../output/playwright/m2-right-expanded-mobile.png)、[桌面](../output/playwright/m2-right-expanded-desktop.png) |
| 右拖中间位置 | [手机](../output/playwright/m2-right-drag-mobile.png)、[桌面](../output/playwright/m2-right-drag-desktop.png) |
| 运镜与到站 | [穿窗过程](../output/playwright/m2-right-camera-mobile.png)、[到站](../output/playwright/m2-right-station-mobile.png) |
| 实际触摸录屏 | [右拖取消、确认及完整往返](../output/playwright/m2-right-touch-journey.webm) |

脚本`m2-right-check.js`与`m2-right-accessibility.js`沿用第5节CLI复跑方式。最新录屏是reduce=true、motion=full的生产页面，玻璃遵循减少动态，场景完整运镜；无音轨，不能代替听感验收。真实iPhone/Android、跨引擎、长期性能尚未验证；M2仍等待用户验收。
