<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/347d8afa-1eaf-45a9-a469-17e721cf7481

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## One-Click Local + Phone Access (Windows)

Use these scripts in the project root:

- `start_local_and_tunnel.bat`
  - Starts local dev server
  - Starts Cloudflare Tunnel
  - Opens `http://localhost:3000` in your browser
  - Auto-copies the generated `https://*.trycloudflare.com` URL to clipboard
- `stop_local_and_tunnel.bat`
  - Stops the local server and tunnel quickly

## Deploy to GitHub Pages

This repo includes a workflow at `.github/workflows/deploy-pages.yml`.

1. Push to the `main` branch.
2. In GitHub, open `Settings -> Pages`, and set Source to `GitHub Actions`.
3. Add repository variables/secrets:
   - Variable: `VITE_API_BASE_URL` (your backend URL, e.g. `https://api.example.com`)
   - Secret: `VITE_GEMINI_API_KEY` (optional fallback for Gemini in browser)

Important:
- GitHub Pages only serves static frontend files.
- `/api/classify` is not hosted by GitHub Pages. You must deploy backend API separately and set `VITE_API_BASE_URL`.

## Deploy Backend on Render

This repo includes `Dockerfile` and `render.yaml` for Render web service deployment.

1. Create a new Render Web Service from this repository (Docker runtime).
2. Keep default service from `render.yaml`.
3. Upload model/data to Render disk path:
   - `/var/data/best_leather_model_val.pth`
   - `/var/data/dataset_train/`
4. Set frontend repo variable:
   - `VITE_API_BASE_URL=https://<your-render-domain>`
