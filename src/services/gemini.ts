import { GoogleGenAI, Type } from "@google/genai";

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const classifyEndpoint = apiBaseUrl ? `${apiBaseUrl}/api/classify` : "/api/classify";

export async function classifyLeather(base64Image: string) {
  try {
    const response = await fetch(classifyEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Inference failed");
    }

    const result = await response.json();
    return result.matches;
  } catch (err) {
    console.error("Local inference failed, falling back to Gemini:", err);
    // Fallback to Gemini if local model is not ready
    return classifyWithGemini(base64Image);
  }
}

async function classifyWithGemini(base64Image: string) {
  const { GoogleGenAI, Type } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
  
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `Identify the leather texture in this image. 
            Choose from common leather types (e.g., Full Grain Cowhide, Aniline Suede, Top Grain Pebbled, Nubuck, Nappa, Patent, Saffiano, etc.). 
            Return the top 3 matches with confidence scores.
            Be precise and professional.`,
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1],
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matches: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                description: { type: Type.STRING }
              },
              required: ["label", "confidence"]
            }
          }
        },
        required: ["matches"]
      }
    }
  });

  const response = await model;
  const result = JSON.parse(response.text || '{"matches": []}');
  return result.matches;
}
