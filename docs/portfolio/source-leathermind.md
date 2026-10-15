# LeatherMind / 革识 — Portfolio Source

项目素材与人工截图指南，非最终作品集文案。依据当前主界面、推理服务、材质数据与样式代码整理（2026-10-06）；以默认浏览器推理版本为准，未运行应用或重新验收线上状态。

# 1. Project Overview

| Field | Source |
| --- | --- |
| **Project name** | LeatherMind / 革识（目录名为 digital-artisan） |
| **One-line description** | 在浏览器内对皮革纹理照片分类，并通过 Top-3 候选和真实参考样本帮助用户核对结果的 Web 工具。 |
| **Problem / Goal** | 将拍摄或上传、纹理分类、参考图比对与观察记录连接成完整流程。 |
| **My role** | Unknown / needs manual input：无法仅凭代码确认个人负责的设计、前端、模型训练与部署范围。 |
| **Type** | Computer Vision · AI Tool · Web App |
| **Main stack** | React + TypeScript、Vite、Motion、ONNX Runtime Web / WebAssembly、PyTorch / ResNet50 |
| **Status** | Working prototype；`docs/deployment.md` 记录了 Vercel 生产部署，本次未验证线上可用性。 |
| **Links** | [Live site](https://leather.yanyihan.top/)（部署文档记录） · [GitHub](https://github.com/YanYihann/Leather-Texture-Classifier)（代码链接与 Git remote 一致） |

# 2. The Idea

### 为什么会有这个项目？

当前功能针对皮革纹理图像的分类与核对：单独得到类别编号不足以观察纹理差异，因此系统同时提供候选参考图与记录入口。个人立项动机、具体目标人群与用户研究：Unknown / needs manual input。

### 核心 idea 是什么？

把 ResNet50 模型、203 个数据集类别的参考样本与人工比对放进一个工作台。照片默认在访客设备上处理，用户可以切换三个候选、放大图片检查细节，并记录自己的观察。

### 最重要的一点是什么？

值得记住的是“照片 → 排名候选 → 参考图核对 → 观察记录”这条流程。AI 提供候选，界面提供检查依据；用户能选择查看哪个候选、添加备注，但当前不能修改预测或给模型重新标注。

# 3. How It Works

### 01 — Acquire a specimen

上传或拖入 JPG / PNG / WebP，或用相机取景、缩放并拍摄单一皮革纹理。

### 02 — Run classification

确认输入预览后点击 **Run classification / 开始分类**。首次下载模型会显示实际字节进度，随后初始化并运行推理；等待时可取消。

### 03 — Compare candidates

查看 Top-3 类别与置信度，点击候选切换参考样本，放大输入或参考图核对纹理。

### 04 — Document findings

默认自动保存成功结果；到 **Scan history / 识别历史** 添加备注、重开比对或导出 JSON。

# 4. Key Features & Decisions

## Feature 01 — 浏览器内模型推理

**What it does** — 使用真实 ResNet50 ONNX 模型对照片分类，返回三个排名候选。

**Why it matters** — 默认版本能以静态网站提供识别功能，照片在访客设备处理，无需外部推理服务。代价是首次加载较大的模型。

**How it works** — Web Worker 内运行 ONNX Runtime Web 的 WASM 后端；按需下载、允许时缓存模型并复用会话。下载、初始化与推理分别显示状态，取消会终止 Worker。

**Relevant files** — `src/services/browser.worker.ts`、`src/services/browser.ts`、`scripts/export_browser_model.py`

## Feature 02 — 可切换的 Top-3 参考比对

**What it does** — 输入、候选排名与参考图同屏呈现；点击第二或第三候选即可查看对应参考图，图片可放大。

**Why it matters** — 让用户检查模型候选对应的视觉样本。最高排名摘要保持不变，当前比对候选单独高亮；界面明确区分模型置信度与准确率、材质成分。

**How it works** — 选中候选驱动参考图切换；类别编号映射到参考档案，原生 modal dialog 展示大图。

**Relevant files** — `src/App.tsx`、`src/data/materials.json`、`src/index.css`

## Feature 03 — 以真实纹理为中心的材质档案

**What it does** — 浏览 203 个类别的参考图，按编号搜索、收藏与筛选，并放大观察。

**Why it matters** — 模型参考样本成为可独立探索的视觉集合。首页明确区分“材质展示影像”和“数据集参考样本”，避免将展示图误当分类依据。

**How it works** — 从本地数据集提取参考图并保留来源路径，配套缩略图；档案每页 12 类。首页微距影像支持指针轻微平移、样本淡入切换与可选轮播，并尊重减少动态效果偏好。

**Relevant files** — `src/data/materials.json`、`src/App.tsx`、`scripts/prepare_materials.py`

## Feature 04 — 可回看的样本观察记录

**What it does** — 成功分类自动形成含图片、候选、时间和设备的记录；用户可加研究备注、搜索备注、重开比对并导出结果。

**Why it matters** — 把一次识别延伸为可复查的样本记录。备注保存人的观察，预测仍保留模型原始输出；适合展示 AI 结果与人工判断如何共存。

**How it works** — 默认在 localStorage 保留最多 30 条记录，图像缩至最长边 512 px；备注失焦保存，JSON 导出提供备份，存储不足时提示。

**Relevant files** — `src/App.tsx`、`src/types.ts`、`src/services/images.ts`

# 5. Technical Notes & Limitations

## Worth mentioning

- **模型迁移与输入一致性**：导出脚本保留 float32 权重并逐类比较 ONNX 与 PyTorch 输出。浏览器预处理对应 Resize(256)、CenterCrop(224) 与 ImageNet 归一化；转换一致性检查不能当作识别准确率证明。
- **采集与响应式工作台**：相机优先请求后置镜头，提供 1–3× 数字缩放，按 4:3 中心区域截取照片。桌面输入与结果并排，窄屏堆叠；捕获或离开工作台时停止相机轨道。
- **照片处理与推理通道边界**：上传图像缩至最长边 1536 px，历史另存压缩图。默认走设备内推理；只有构建时选择 server 模式才走 Express / PyTorch，并在本地推理失败时使用 Gemini 回退，后者返回通用材质候选，可能没有参考图。

## Current limitations

- 首次需下载约 95.6 MB 模型及 WASM 运行时；缓存受浏览器配额限制，需支持 Worker、WebAssembly 与 OffscreenCanvas。
- 输出为 203 个数据集类别编号，不能独立确定商业材质名称、成分或质量等级；当前没有拒识未知材质的阈值流程。
- 默认记录仅当前浏览器可用，最多 30 条；清除站点数据会丢失，重开历史使用压缩图而非原始照片。
- 模型对真实使用场景的识别准确率、用户验证与个人贡献范围：Unknown / needs manual input。仓库部署记录中的相机验证使用模拟视频，未验证实体相机硬件。

# 6. Screenshot List

**统一准备**：无需登录。建议桌面视口 1440 × 1100、缩放 100%，英文与深色主题统一拍摄；移动端约 390 px 宽。页面使用 hash 路由，结果与加载态都在 `/#classify`，没有独立结果 URL。准备一组真实、光线均匀、对焦清晰的皮革近摄图，排除接缝与标签；示例文件可命名 `specimen-A-diffuse-light.jpg`。

**复用数据**：实际使用照片优先。需要稳定复现时，可使用仓库 `dataset_train/Leather_24/train_Leather_24_002.png`，辅以 `dataset_train/Leather_06/train_Leather_06_002.png`、`dataset_train/Leather_172/train_Leather_172_002.png`。若使用这些图，注明“数据集样本演示”，不能据此宣称真实场景准确率；所有标签和百分比以实际输出为准。

## Screenshot 01 — 完整分类工作台（主图）

**Page / Route** — `/#classify`，分类完成状态。

**What to show** — 左侧完整输入图与操作，右侧最高排名、Top-3 列表、输入／参考图对照和置信度说明。

**How to prepare**

1. 上传一张清晰的单一皮革纹理照片，点击 **Run classification**。
2. 等待真实结果与参考图加载完成，保持第一候选选中。
3. 调整窗口高度使两列及参考图完整可见；若仍过长，可截此页的完整工作台区域。

**Recommended content** — 同一组演示中的样本 A；可用 Leather_24 数据集样本。选择纹理细节清晰、参考图正常加载的真实结果，不改写置信度。

**Why this screenshot matters** — 一张图解释最核心的“照片 → 候选 → 参考核对”体验。

**Better as video / GIF** — 录制点击第一、第二、第三候选，再放大参考图并关闭的 8–12 秒操作；可见参考图随候选切换，最高排名摘要保持不变。

## Screenshot 02 — 首页与材质视觉

**Page / Route** — `/#overview`。

**What to show** — 左侧导航、分类标题、上传／相机入口，以及右侧微距图、影像说明和样本选择器。

**How to prepare**

1. 打开首页，使用英文深色主题，回到页面顶部。
2. 保留默认微距展示图，轮播保持暂停；若已切换样本，刷新页面恢复首页初始影像。
3. 等待字体和图片加载完，截取首屏主体，保留“材质展示影像”对应说明。

**Recommended content** — 默认微距展示图；不要把它用作分类效果证明。下方参考材质可作为画面延伸。

**Why this screenshot matters** — 建立产品身份，展示围绕材质摄影、凝练排版与明确任务入口的视觉设计。

**Better as video / GIF** — 录制鼠标在图片内移动、点击参考缩略图的 5–8 秒片段，呈现轻微平移和淡入切换。

## Screenshot 03 — 已上传、尚未分析的输入状态

**Page / Route** — `/#classify`，输入已就绪。

**What to show** — 左侧样本预览、文件名、更换图片与开始分类；右侧等待结果及图像采集建议。

**How to prepare**

1. 进入工作台，上传与 Screenshot 01 相同的样本 A。
2. 等待图像准备完成，先不点击 **Run classification**。
3. 让输入与右侧采集建议同屏，避免只截普通上传空框。

**Recommended content** — 有明显纹理、均匀散射光、单一材质填满画面的照片；使用有意义的文件名。

**Why this screenshot matters** — 与最终结果成对展示，让人看懂用户提供什么输入、系统随后增加什么信息。

## Screenshot 04 — 首次模型加载与可取消分析

**Page / Route** — `/#classify`，首次分类加载状态。

**What to show** — 输入仍可见，右侧模型加载阶段、实际 MB 进度与等待时间，左侧 **Cancel analysis**。

**How to prepare**

1. 使用新的浏览器配置或尚未运行分类的浏览器，避免为此清除已有样本记录。
2. 上传样本 A，点击 **Run classification**；需要网络可达以获取模型。
3. 在真实下载过程中截取进度，后续等待初始化与推理完成；不要制作假进度。

**Recommended content** — 与输入、结果截图保持同一张照片；未捕捉到加载态时优先录屏。

**Why this screenshot matters** — 展示设备内 AI 的首次加载成本如何被真实、可控制的状态反馈解释。

**Better as video / GIF** — 录制下载进度到初始化、推理、结果出现的过程，可剪辑等待并注明加速；补充取消后返回可操作状态的短片段。

## Screenshot 05 — 真实参考材质档案

**Page / Route** — `/#archive`。

**What to show** — 档案标题、编号搜索、全部／收藏切换、类别总数，以及至少两行不同纹理的参考图和编号。

**How to prepare**

1. 打开档案，清空搜索，选择 **All materials**，回到第一页。
2. 等待缩略图加载，收藏两三张实际想对照的样本，使星标状态可见。
3. 截取标题、工具栏和前两行样本；若另补细节图，点击一张纹理清晰的样本打开大图弹窗。

**Recommended content** — 使用内置真实参考样本，保留 `Leather_XX` 编号；不要添加未经确认的商业名称。

**Why this screenshot matters** — 展示模型输出背后的可浏览视觉依据，以及以样本摄影为中心的档案设计。

## Screenshot 06 — 有观察备注的识别历史

**Page / Route** — `/#history`。

**What to show** — 3–4 条真实分类记录、样本缩略图、类别、置信度、时间、研究备注和导出入口。

**How to prepare**

1. 保持自动保存开启，实际完成 3–4 次分类，覆盖不同样本或同一样本的不同采集条件。
2. 打开历史，为每条填写观察备注，按 Enter 或点击输入框外保存。
3. 保持搜索为空，按最近时间排序；截取已保存备注与对应记录，避免删除确认弹窗。

**Recommended content** — 同一皮样的均匀光／侧光照片，或不同纹理样本。备注只写真实观察，如“样本 A，散射光近摄；待与侧光图比对”“样本 B，颗粒纹理清晰”；数据集图则注明来源与“数据集样本演示”。

**Why this screenshot matters** — 证明识别结果可以进入人工观察、复查和备份的后续流程。

## Screenshot 07 — 移动端相机采集

**Page / Route** — 手机浏览器 `/#classify`，相机预览状态。

**What to show** — 4:3 实时皮革预览、取景框、缩放滑杆与倍率、拍摄按钮；导航抽屉保持关闭。

**How to prepare**

1. 用支持相机的手机浏览器访问 HTTPS 站点，打开 **Use camera** 并允许权限。
2. 对准一块真实皮革，让单一材质填满画面，使用均匀光线并保持对焦。
3. 将缩放调到约 1.5–2×，滚动到相机预览与控件同时可见，再手动截图。

**Recommended content** — 实际皮革样本的表面近摄；不要把桌面、标签或其他物品混入取景。硬件若不支持此流程，应跳过而非模拟成真实手机拍摄。

**Why this screenshot matters** — 展示项目从现场采样开始的使用方式，以及手机上的采集布局。

**Better as video / GIF** — 录制取景 → 调整缩放 → 拍摄 → 生成输入预览的 8–12 秒操作，比单张相机截图更容易解释交互。
