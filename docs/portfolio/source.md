# LeatherMind — Portfolio Source

基于当前代码与引用聊天「重建设计网页交互与动效」的最终修改整理（2026-10-04）。这是项目素材与人工截图指南；以默认浏览器推理版本为准。

# 1. Project Overview

| Field | Source |
| --- | --- |
| **Project name** | LeatherMind / 革识 |
| **One-line description** | 一个在浏览器内对皮革纹理图像进行分类，并支持 Top-3 候选与真实参考样本比对的 Web 工具。 |
| **Problem / Goal** | 将图像采集、模型分类、参考图核对和结果记录连接成可直接操作的流程。 |
| **My role** | Unknown / needs manual input：个人负责的设计、前端、模型训练与部署范围不能仅凭代码确认。 |
| **Type** | Computer Vision · AI Tool · Web App |
| **Main stack** | React + TypeScript、Vite、Motion、ONNX Runtime Web / WebAssembly、ResNet50 |
| **Status** | Deployed working prototype（部署记录见 `docs/deployment.md`，本次未重新验收线上状态）。 |
| **Links** | [Live site](https://leather.yanyihan.top/) · [GitHub](https://github.com/YanYihann/Leather-Texture-Classifier) |

# 2. The Idea

### 为什么会有这个项目？

从当前功能可以确认，项目面对的是皮革纹理图像的分类与核对：输入一张照片后，用户既需要模型给出候选，也需要看到候选对应的参考纹理。个人立项动机、具体使用人群与用户研究：Unknown / needs manual input。

### 核心 idea 是什么？

把 ResNet50 分类模型、203 个数据集类别的参考档案和人工比对放进同一个界面。用户上传或拍摄样本，在本机运行推理，再逐一查看 Top-3 候选的参考图；默认版本不需要外部推理 API。

### 最重要的一点是什么？

它将“图像 → 排名候选 → 参考图核对 → 备注记录”连接起来，让用户能检查模型输出，而不是只得到一个类别编号。界面明确说明置信度的含义；用户可以切换候选和补充观察，但不能修改预测或重新标注模型。

# 3. How It Works

### 01 — Acquire a specimen

上传、拖入 JPG / PNG / WebP，或用相机取景、缩放并拍摄单一皮革纹理。

### 02 — Run classification

确认输入预览后点击 **Run classification**。首次加载模型会显示下载字节进度，随后初始化并在浏览器内推理；等待时可以取消。

### 03 — Compare candidates

查看 Top-3 类别和置信度，点击不同候选切换参考图，并放大输入或参考图检查细节。

### 04 — Document findings

默认自动保存结果；在 **Scan history** 添加研究备注、重开结果，或导出 JSON 留存。

# 4. Key Features & Decisions

## Feature 01 — 浏览器内真实模型推理

**What it does** — 使用已导出的 ResNet50 ONNX 模型分类输入照片，返回三个排名候选。

**Why it matters** — 默认部署可以作为静态网站运行，输入照片在访客设备处理。引用聊天确认，这一选择用于解决原推理通道无法连接的问题；代价是首次下载较大的模型。

**How it works** — 独立 Web Worker 中使用 ONNX Runtime Web 的 WASM 后端；首次按需加载模型，允许时缓存，后续复用推理会话。取消会终止 Worker。

**Relevant files** — `src/services/browser.worker.ts`、`src/services/browser.ts`、`scripts/export_browser_model.py`

## Feature 02 — 可检查的 Top-3 参考比对

**What it does** — 同屏显示输入图、候选排名和当前候选参考图；候选可切换，图片可放大。

**Why it matters** — 类别编号本身不解释纹理差异，参考图让用户有机会人工核对。界面将模型置信度与材质成分、准确率区分开，避免把预测当成材料鉴定。

**How it works** — 选中候选驱动参考图切换；类别映射连接模型输出与本地样本档案，原生 dialog 提供放大查看。

**Relevant files** — `src/App.tsx`、`src/data/materials.json`

## Feature 03 — 真实样本组成的材质档案

**What it does** — 浏览 203 个纹理类别，按编号搜索、收藏样本并放大查看。

**Why it matters** — 参考集合可以独立浏览，也与分类结果共用同一套编号。`Leather_24` 等标签代表数据集类别，没有被包装成未经确认的皮革品种名称。

**How it works** — 从本地数据集导出参考图与缩略图，以 manifest 记录来源和类别；档案每页展示 12 类，图片按需加载。

**Relevant files** — `scripts/prepare_materials.py`、`src/data/materials.json`、`src/App.tsx`

## Feature 04 — 结果与观察一起留存

**What it does** — 分类后默认自动保存，可添加研究备注、按类别 / 备注 / 日期搜索，并重新打开结果或导出 JSON。

**Why it matters** — 让模型结果可以伴随人工观察形成后续核对资料。备注补充人的判断，预测排名保持原样。

**How it works** — 默认使用 localStorage，最多保留 30 条记录；记录图片缩至最长边 512px。备注失焦或按 Enter 保存，存储不足时提示并缩减旧记录。

**Relevant files** — `src/App.tsx`、`src/services/images.ts`、`src/types.ts`

## Feature 05 — 材质影像与工作台的视觉分工

**What it does** — 深紫底、黄绿色强调色、左侧导航；首页以大字号直接标题和皮革微距影像建立视觉重点，分类页采用输入与结果并列布局。默认英文，可切换中文与浅色主题。

**Why it matters** — 首页突出纹理细节，工作台则支持反复比对。首页默认影像标为 **Illustrative material study**，切换真实样本后标为 **Dataset reference**，避免展示图与识别证据混淆。

**How it works** — 主视觉用弹簧驱动的小幅指针跟随与淡入淡出；轮播由用户主动开启，尊重减少动态效果设置。窄屏改为纵向布局与抽屉导航。

**Relevant files** — `src/App.tsx`（`MaterialVisual`）、`src/index.css`

# 5. Technical Notes & Limitations

## Worth mentioning

- **保留模型预处理逻辑。** Worker 复现 Resize(256)、CenterCrop(224)、ImageNet 归一化与抗锯齿双线性采样。现有 `output/browser-model/validation.json` 记录了 203 张样本的 ONNX / PyTorch Top-1 与 Top-3 排序一致；这是转换一致性检查，不是识别准确率。
- **反馈实际状态。** 下载阶段显示接收字节数，初始化与推理阶段显示状态及等待时间，没有伪造推理百分比。计算放在 Worker，取消后可重建并重试。
- **取景与拍摄保持一致。** 相机预览为 4:3，1–3× 数字缩放对应 Canvas 中心裁切；拍摄、退出工作台时释放视频轨道。手机端取景框与控件按卡片宽度收缩。

## Current limitations

- 首次需要下载约 95.6 MB 模型及 WASM 运行时；速度和缓存受设备、网络与存储配额影响，需要支持 Worker、WebAssembly 和 OffscreenCanvas 的浏览器。
- 仅在现有 203 类中排名；当前流程没有“非皮革 / 未知类别”拒识机制。置信度不是经验证的准确率，也不能证明材质成分。
- 默认历史仅在当前浏览器保存，最多 30 条且仅保存缩略图；清除站点数据会丢失记录，没有默认跨设备同步。
- 现有交付记录只确认模拟相机流程与布局检查，真实相机硬件尚未验证；现场采集效果需要人工补充验证。

# 6. Screenshot List

统一准备：无需登录；桌面建议使用 **1440 × 1000–1100、100% 缩放、英文、深色主题**，保持同一组演示样本贯穿流程。这些尺寸是取景建议，截图时可少量调整滚动位置以完整显示关键区域。

优先使用自然散射光下、清晰对焦、纹理填满画面的皮革近摄照片，避开接缝、文字与杂物。需要可复现的界面演示时，可用项目内 `dataset_train/Leather_24/train_Leather_24_002.png`；缺少本地数据集时用 `public/materials/Leather_24.webp`。使用参考 / 训练样本必须标明来源，不作为泛化能力证明，也不要预先编写置信度。

## Screenshot 01 — 代表性的首页

**Page / Route** — `/#overview`

**What to show** — 左侧导航、完整的 **Leather Texture Classification.** 标题、上传 / 相机入口、大幅微距影像与样本切换控件。

**How to prepare**

1. 切换英文与深色主题，打开首页并回到顶部。
2. 在新页面加载后的默认展示影像状态截图，保持 **Illustrative material study** 标签可见。
3. 等图片加载完整，将指针移出主视觉，避免停在悬浮按钮上。

**Recommended content** — 默认皮革微距展示影像；它是视觉素材，不是分类结果。

**Why this screenshot matters** — 用一屏说明产品主题、视觉方向和主要操作入口。

**Better as video / GIF** — 录制 6–10 秒：缓慢移动指针，再点击真实样本缩略图，展示轻微跟随、交叉淡入和来源标签切换。

## Screenshot 02 — 输入已就绪的工作台

**Page / Route** — `/#classify`

**What to show** — 左侧完整输入图、文件名与 **Run classification**；右侧尚未分析状态及采集建议。

**How to prepare**

1. 打开 **Classification**，点击 **Choose image** 或拖入准备好的照片。
2. 等待输入预览完成，暂不点击分类。
3. 保持左右面板和主要操作同时可见，移开鼠标后截图。

**Recommended content** — 一张自然光下的皮革近摄照片；后续 Screenshot 03、04 使用同一张。

**Why this screenshot matters** — 展示输入与分析分开的明确步骤，以及采集质量提示。

## Screenshot 03 — 首次模型加载状态

**Page / Route** — `/#classify`

**What to show** — 输入图、**Loading classification model**、实际 MB 进度和 **Cancel analysis**。

**How to prepare**

1. 使用新的浏览器配置或无历史记录的独立环境，避免清除自己的正常站点数据；部分隐私模式可能不支持缓存。
2. 上传 Screenshot 02 的照片，点击 **Run classification**。
3. 在下载进度尚未完成时截图，保留本地推理状态和取消操作。

**Recommended content** — 同一张皮革样本；进度由真实下载产生。

**Why this screenshot matters** — 展示大模型首次使用时的状态反馈和用户控制。

**Better as video / GIF** — 录制加载 → 初始化 → 推理 → 结果的转换；等待较长时剪辑缩短并注明，保留真实进度。已缓存的环境可录制推理到结果，无需强求下载画面。

## Screenshot 04 — 核心 Top-3 比对结果

**Page / Route** — `/#classify`

**What to show** — 输入图、最高排名类别、三个候选及真实置信度、输入 / 参考图并排区域和置信度说明。

**How to prepare**

1. 沿用 Screenshot 02 的照片，运行分类并等待完成。
2. 保持第一个候选选中，让参考图完整加载。
3. 调整窗口高度，使三条候选和参考图同时可见；保留输入面板及说明文字。

**Recommended content** — 清晰的真实皮革照片；若用 `Leather_24` 参考图演示，标注“数据集样本演示”，只记录当次真实输出。

**Why this screenshot matters** — 这是最值得优先展示的画面，呈现“照片 → 候选 → 视觉核对”的核心价值。

**Better as video / GIF** — 录制依次点击三个候选，观察参考图与选中状态变化，再放大一张参考图；顶部最高排名摘要保持 Top-1，不随候选切换。

## Screenshot 05 — 可浏览的真实材质集合

**Page / Route** — `/#archive`

**What to show** — 标题、编号搜索、全部 / 收藏切换、203 类计数，以及第一屏具有不同纹理的样本网格。

**How to prepare**

1. 打开 **Material archive**，清空搜索并选择 **All materials**。
2. 收藏一个实际想后续核对的样本，保留星标状态。
3. 回到顶部，等待图片加载，截取前两排样本即可，不必展示全部 12 张或所有分页。

**Recommended content** — 使用内置真实参考图和原始类别编号，不添加未经确认的品种名称。

**Why this screenshot matters** — 说明分类器背后有可以直接检查的参考集合。

## Screenshot 06 — 带人工观察的识别记录

**Page / Route** — `/#history`

**What to show** — 2–3 条真实识别记录、输入缩略图、类别与置信度、研究备注，以及 **Stored in this browser** 和导出入口。

**How to prepare**

1. 保持默认自动保存开启，分别分类 2–3 张不同纹理的照片。
2. 打开 **Scan history**，给每条添加简短观察，按 Enter 或点击输入框外保存。
3. 清空搜索，保持 **Most recent** 排序，截图上方控制区与前几条记录。

**Recommended content** — 备注可写 “Diffuse daylight; grain fills frame; no seam visible.”；仅在实际观察符合时填写。用数据集图时写明 “Dataset reference demonstration — Leather_24.”，不要虚构采购、实验或鉴定结论。

**Why this screenshot matters** — 展示预测如何与人工观察一起保存，支持后续回顾。

## Screenshot 07 — 手机相机采集细节

**Page / Route** — 手机上的 `/#classify`，建议 393 × 852 视口。

**What to show** — 4:3 实时皮革取景、构图框、缩放滑条与倍率、**Capture sample** 和 **Close camera**；完整控件应处于卡片内。

**How to prepare**

1. 在支持相机的真实手机上打开 HTTPS 网站，保持英文与深色主题。
2. 打开 **Classification → Capture with camera**，允许相机访问。
3. 对准单一皮革表面，调整距离及轻微数字缩放，等待对焦清晰。
4. 滚动到取景与拍摄控件同时可见的位置，在拍摄前截图；不必包含下方空结果面板。

**Recommended content** — 一块均匀照明的皮革样片；不要用桌面、手部或混合材质填满画面。

**Why this screenshot matters** — 展示从手机采集到工作台输入的入口，以及窄屏控件与取景比例设计。

**Better as video / GIF** — 录制打开相机 → 1× 到约 2× 缩放 → 拍摄 → 输入预览就绪，约 8–12 秒。录制前先确认真实硬件可用；相机截图与操作录屏本身不能证明识别可靠性。
