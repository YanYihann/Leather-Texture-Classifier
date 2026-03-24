import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const pythonCommand = process.env.PYTHON_EXECUTABLE || (process.platform === "win32" ? "python" : "python3");

  app.use(express.json({ limit: '50mb' }));

  // API Route for Model Inference
  app.post("/api/classify", async (req, res) => {
    const { image } = req.body; // base64 image
    
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    // Check if the model file exists
    if (!fs.existsSync(path.join(__dirname, "best_leather_model_val.pth"))) {
      return res.status(503).json({ error: "Model weights not found on server. Please upload best_leather_model_val.pth" });
    }

    // Call Python inference script and pass payload via stdin to avoid Windows argv length limits.
    let pythonProcess;
    try {
      pythonProcess = spawn(pythonCommand, [path.join(__dirname, 'inference.py')]);
    } catch (err: any) {
      console.error(`Failed to spawn Python process with "${pythonCommand}":`, err?.message);
      return res.status(500).json({
        error: "Inference process failed to start",
        details: `Cannot execute "${pythonCommand}". Set PYTHON_EXECUTABLE or install Python and dependencies (torch, torchvision, pillow).`
      });
    }
    
    let resultData = "";
    let errorData = "";
    let hasResponded = false;

    pythonProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.stdin.write(image);
    pythonProcess.stdin.end();

    pythonProcess.on("error", (err) => {
      if (hasResponded) return;
      hasResponded = true;
      console.error(`Failed to start Python process with "${pythonCommand}":`, err.message);
      return res.status(500).json({
        error: "Inference process failed to start",
        details: `Cannot execute "${pythonCommand}". Set PYTHON_EXECUTABLE or install Python and dependencies (torch, torchvision, pillow).`
      });
    });

    pythonProcess.on('close', (code) => {
      if (hasResponded) return;
      hasResponded = true;
      if (code !== 0) {
        console.error(`Python process exited with code ${code}: ${errorData}`);
        return res.status(500).json({ error: "Inference failed", details: errorData });
      }
      try {
        const result = JSON.parse(resultData);
        // Add full URL to reference images if they exist
        if (result.matches) {
          result.matches = result.matches.map((m: any) => ({
            ...m,
            referenceUrl: m.referencePath ? `/dataset_train/${m.referencePath}` : null
          }));
        }
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: "Failed to parse model output" });
      }
    });
  });

  // Serve reference images
  app.use('/dataset_train', express.static(path.join(__dirname, 'dataset_train')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
