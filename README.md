# LeatherMind (革识)

LeatherMind 是一个面向皮革纹理识别的 Web 应用，支持拍照/相册上传、AI 分类、可视化比对、历史记录管理，以及手机端访问。

## 1. 功能总览

### Home 首页
- 一键进入扫描工作台（Scan Leather）
- 相册上传图片（Upload from Gallery）
- 最近识别记录预览（带置信度黄色标签）
- 主题切换（深色/浅色）
- 语言切换（中文/英文）

### Scan 扫描页
- 先进入扫描工作台，而不是直接分析
- 支持 `Take Photo`（相机）和 `Gallery`（相册）
- 支持闪光灯开关（设备支持时）
- 取景框大小可调，且裁切与取景框严格一致
- 拍照后可 `Retake` 或 `Start Analysis`

### 分析中界面（伪加载）
- 科技感加载画面（进度环、进度条、阶段任务）
- 最短加载时长，避免“秒出结果”突兀
- 文案已改为本地数据库语义：
  - `Cross-referencing local leather database for precise classification.`

### 结果页
- 顶部 Best Match 卡片（类别 + AI Confidence）
- Visual Verification（Your Scan vs Reference）
- Top 3 Similar Matches
- 图片点击可放大高清预览

### History 历史页
- 搜索（按材质、日期、时间、备注等）
- 单条删除、备注编辑、多选删除、全清空
- 置信度右上角黄色标签（仅数字 + `%`）
- 底部统计：Total Scans / Accuracy

## 2. 工作流程

1. 用户在扫描页拍照或上传图片。
2. 前端将 Base64 图片发送到 `/api/classify`。
3. 后端优先调用本地 Python 推理（`inference.py` + PyTorch 模型）。
4. 若本地推理失败，前端回退到 Gemini API（需 `VITE_GEMINI_API_KEY`）。
5. 返回 Top-N 分类结果后，前端渲染结果页并写入历史。
6. 历史可走两种模式：
   - `server`：读写 `/api/history`（多人共享）
   - `local`：后端不可用时自动退回浏览器本地存储

## 3. 快速开始（本地开发）

### 环境要求
- Node.js 22+
- Python 3.10+（建议）
-（可选，本地模型推理）PyTorch / torchvision / pillow

### 安装

```bash
npm ci
```

### 环境变量（可参考 `.env.example`）

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_GEMINI_API_KEY=your_key_if_needed
```

### 启动

```bash
npm run dev
```

默认访问：`http://localhost:3000`

## 4. 手机访问

## 方案 A：一键脚本（Windows）
仓库已提供：
- `start_local_and_tunnel.bat`
- `stop_local_and_tunnel.bat`

启动后会自动：
- 启动本地服务
- 启动 Cloudflare Tunnel（命名 tunnel）
- 打开本地与公网地址

## 方案 B：手动运行 Cloudflare Tunnel

```powershell
cloudflared tunnel run leathermind
```

确保 DNS 与 tunnel 已配置到你的域名（例如 `app.yanyihan.top`）。

## 5. 部署

### 5.1 GitHub Pages（仅前端静态）
仓库已包含 `.github/workflows/deploy-pages.yml`。

你需要在 GitHub 仓库设置中配置：
- `Actions Variables`：`VITE_API_BASE_URL`
- `Actions Secrets`（可选回退）：`VITE_GEMINI_API_KEY`

注意：GitHub Pages 不提供 `/api/classify`，必须单独部署后端 API。

### 5.2 Render（Docker，全栈）
仓库已包含 `Dockerfile` 与 `render.yaml`。

关键点：
- 挂载模型与数据目录（建议持久化）
  - `MODEL_PATH=/var/data/best_leather_model_val.pth`
  - `DATASET_DIR=/var/data/dataset_train`
- 前端环境中设置：
  - `VITE_API_BASE_URL=https://<your-backend-domain>`

## 6. 数据与同步说明

应用会自动选择历史模式：
- 后端 `/api/history` 可用 -> `server` 模式（共享历史）
- 后端不可用 -> `local` 模式（仅本机历史，不再报“删除失败”）

如果你希望“公司所有人共享历史”，请确保手机访问的地址能连到同一个后端 API。

## 7. 常见问题

### Q1：手机上删除历史提示失败
- 现在已支持自动降级本地模式。
- 若要多人共享删除结果，请检查 `/api/history` 在手机网络下是否可达。

### Q2：首页图片在无 VPN 下不显示
- 已改为本地静态资源（`public/images`），不依赖 `googleusercontent.com`。

### Q3：我替换了 `hero.png`，手机还是旧图
- 通常是缓存问题。建议改文件名（如 `hero-v2.png`）并更新引用，或清浏览器缓存后重开。

---

如需继续扩展（Profile 页、账号体系、权限管理、报表导出、企业审计日志），建议下一步先定义“共享历史的后端存储”（如 PostgreSQL）再做多人协同。
