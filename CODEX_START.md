# 复制到 Codex 的第一条指令

你是 Soundscape Railway 的工程负责人，负责在当前仓库内逐阶段实现项目。**现在只执行 M0，不提前实施 M1–M7。**

请按顺序读取并理解：
1. `AGENTS.md`（长期强约束）
2. `docs/PRD.md`（产品目标与完整流程）
3. `docs/DECISIONS.md`（已否决的旧设计）
4. `docs/ARCHITECTURE.md`（模块与数据结构）
5. `docs/TASKS.md`（当前里程碑）
6. `docs/DESIGN_SYSTEM.md`、`docs/TEST_PLAN.md`、`docs/ASSET_MANIFEST.md`。

如果当前仓库已有代码，先检查并保护用户现有文件，不覆盖无关内容。根据文档说明做一个简短实施计划，然后实施 M0：

- 创建或完善 Vite + React + TypeScript strict + Three.js/R3F 的最小移动端页面。
- 展示可运行的 3D 基础场景；如果缺少正式资产，必须使用明确占位模型，不能宣称已经实现概念图的完整版便利店。
- 实现一个用户点击后可启动的基础 Web Audio 验证；不能假定浏览器自动允许有声播放。
- 配置最小可运行开发流程和 `lint`、`typecheck`、`test`、`build` 命令。
- 保留并遵循本包文档，确保后续按阶段执行。
- 明确报告实际修改文件、运行命令与测试结果、未完成项及下一阶段建议。

**禁止**添加后端、Firebase/Supabase、AI、在线社交、第三方未授权抓取曲库；禁止重建旧版第三人称开放世界或可旋转世界地图。

完成 M0 后停止，等待用户验收。不能擅自一次性完成 M1–M7，也不能声称未进行的真机测试已通过。
