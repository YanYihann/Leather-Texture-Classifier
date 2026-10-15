# Deployment guide

[English README](../README.md) · [中文 README](../README.zh-CN.md) · [Model notes](model/README.md)

The default application is a static Vite build with on-device ONNX inference. The configured production address is [leather.yanyihan.top](https://leather.yanyihan.top/). The optional Express server is a separate operating mode.

## Static browser application

Use Node.js 22+:

```bash
npm ci
npm run lint
npm run build
npm run preview
```

Serve `dist/` over HTTPS. Preserve `models/`, `runtime/`, `materials/` and `material-thumbnails/` alongside the generated JS/CSS. Do not rewrite missing model/runtime requests to HTML. Model download failures cannot be repaired by returning the app shell.

The first classification downloads a 95,614,159-byte ONNX model plus a 14,239,897-byte WASM runtime. CacheStorage retains the model when available; this is not a fully offline PWA. Browser histories, notes and favorites remain device-local. Modern WebAssembly, Web Workers and OffscreenCanvas support are required. Camera access requires HTTPS or localhost.

`npm run dev` starts Vite at port 3000 and needs no Python installation. Existing local `.env.local` settings can override `.env`; review them when switching modes.

### Vercel

Import the GitHub repository into Vercel. The checked-in `vercel.json` specifies Vite, the install/build commands and `dist/`. Configure:

```env
VITE_INFERENCE_MODE=browser
VITE_BASE_PATH=/
```

Leave `VITE_API_BASE_URL` empty for browser mode. The ignored `.vercel/` directory contains local project linkage and is not needed by a new clone. A custom domain is configured in the hosting provider; uploading to GitHub does not itself change domain settings.

### GitHub Pages

In repository **Settings → Pages**, select **GitHub Actions** as the build source. `.github/workflows/deploy-pages.yml` builds browser mode on `main` using `/Leather-Texture-Classifier/` as the base path. No API key or external inference server is needed. The app and its worker resolve model, runtime and specimen assets from that base path.

For a Pages custom domain serving at `/`, adjust the workflow's `VITE_BASE_PATH` to `/` and configure the domain in Pages. The included workflow targets the default repository path.

## Optional Express / PyTorch server

The browser model does not replace the original `.pth` checkpoint for Python inference. Provision the original `best_leather_model_val.pth` separately; it and `dataset_train/` are excluded from Git. `classes.json` matches the ordered browser manifest and is used when the dataset is unavailable. If providing a dataset directory, its sorted class directories must match that mapping. Reference images from Python inference require the dataset files.

Install optional Python dependencies:

```bash
python -m pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set, for example:

```env
VITE_INFERENCE_MODE=server
VITE_API_BASE_URL=
VITE_BASE_PATH=/
PYTHON_EXECUTABLE=python
MODEL_PATH=best_leather_model_val.pth
DATASET_DIR=dataset_train
HISTORY_FILE=shared_history.json
HISTORY_LIMIT=1000
PORT=3000
# Optional cloud fallback, server-side only:
# GEMINI_API_KEY=your-key
# GEMINI_MODEL=gemini-2.5-flash
```

Use a Python executable/path appropriate for your environment. Start development with `npm run dev:server`. For production:

```bash
npm run build
npm start
```

`npm start` sets production mode through a Node launcher, so it works in Windows PowerShell and POSIX shells. The same server serves `dist/` and `/api/*`. Frontend `VITE_*` settings are baked in during the build; changing them at runtime does not change an already built frontend.

Keep API keys server-side. If a different origin hosts the frontend, add a reverse proxy or appropriate CORS handling; the included Express app does not enable CORS. Shared-history APIs have no user authentication. Use a trusted environment or add access control before exposing shared records publicly. Default browser mode does not use these shared APIs.

### API overview

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Report available inference provider. |
| POST | `/api/classify` | Classify `{ "image": "data:image/jpeg;base64,..." }`. |
| GET | `/api/history` | Read `{ "history": [...] }`. |
| POST | `/api/history` | Save `{ "scan": { ... } }`. |
| PATCH | `/api/history/:id` | Update `{ "note": "..." }`. |
| DELETE | `/api/history/:id` | Delete one record. |
| DELETE | `/api/history` | Clear shared history. |

Classification returns `matches` and `source` (`local` or `cloud`). Python matches use dataset identifiers and can have reference URLs; Gemini returns general material descriptions without claiming dataset identifiers. Gemini is attempted only when local inference fails and a server key is configured.

### Docker

The Dockerfile builds server mode by default. The context excludes secrets, user history and original model inputs through `.dockerignore`. Build and mount the original checkpoint and dataset explicitly:

```bash
docker build -t leathermind .
docker run --rm -p 3000:3000 \
  --mount type=bind,source=/absolute/path/to/model.pth,target=/data/model.pth,readonly \
  --mount type=bind,source=/absolute/path/to/dataset_train,target=/data/dataset_train,readonly \
  --mount type=volume,source=leathermind-history,target=/history \
  -e MODEL_PATH=/data/model.pth \
  -e DATASET_DIR=/data/dataset_train \
  -e HISTORY_FILE=/history/shared_history.json \
  leathermind
```

This example uses POSIX line continuations. In PowerShell use a single line or PowerShell backticks and replace mount sources with absolute Windows paths. To build a browser-mode frontend in the same container, use `docker build --build-arg VITE_INFERENCE_MODE=browser -t leathermind-browser .`; a static host is simpler for browser-only use.

### Render

`render.yaml` retains a Docker service definition with `/var/data` model/dataset paths. Provision a persistent disk and upload the original weights/dataset separately; the file does not currently provision a disk. Set `HISTORY_FILE=/var/data/shared_history.json` for persistence. Resource sizing depends on inference workload. A deployment without weights requires a server-side Gemini key to classify in server mode.

### Legacy tunnel helpers

Root-level `.bat` and PowerShell tunnel scripts are retained for existing local workflows. The named tunnel/domain in the batch helper is owner-specific. Review those settings before using it; the default browser deployment needs no inference tunnel. The stop helper terminates processes on its configured development ports.

## Verification

The existing Pages workflow runs `npm ci` and `npm run build` on pushes to `main` or manual dispatch. The build command includes TypeScript checking. These checks do not measure classifier accuracy. The retained model report documents earlier export equivalence; see [model notes](model/README.md). README screenshots are retained project screenshots rather than newly captured deployment evidence.
