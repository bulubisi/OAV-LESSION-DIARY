import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let currentDirname = "";
try {
  currentDirname = __dirname;
} catch (e) {
  currentDirname = path.dirname(fileURLToPath(import.meta.url));
}

// Prepare data storage directory
const DATA_DIR = path.join(process.cwd(), "data_store");
const DIARIES_FILE = path.join(DATA_DIR, "diaries.json");
const SYLLABUS_FILE = path.join(DATA_DIR, "syllabus.json");

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware with custom limits (for large syllabus/diaries)
  app.use(express.json({ limit: "50mb" }));

  // API Endpoint: Get saved diaries from server
  app.get("/api/diaries", (req, res) => {
    try {
      if (fs.existsSync(DIARIES_FILE)) {
        const data = fs.readFileSync(DIARIES_FILE, "utf-8");
        return res.json(JSON.parse(data));
      }
      return res.json([]);
    } catch (error: any) {
      console.error("Error reading diaries file:", error);
      return res.status(500).json({ error: "Failed to read diaries from server: " + error.message });
    }
  });

  // API Endpoint: Save diaries to server
  app.post("/api/diaries", (req, res) => {
    try {
      const diaries = req.body;
      if (!Array.isArray(diaries)) {
        return res.status(400).json({ error: "Invalid data format. Expected an array of diaries." });
      }
      fs.writeFileSync(DIARIES_FILE, JSON.stringify(diaries, null, 2), "utf-8");
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error writing diaries file:", error);
      return res.status(500).json({ error: "Failed to save diaries to server: " + error.message });
    }
  });

  // API Endpoint: Get saved syllabus from server
  app.get("/api/syllabus", (req, res) => {
    try {
      if (fs.existsSync(SYLLABUS_FILE)) {
        const data = fs.readFileSync(SYLLABUS_FILE, "utf-8");
        return res.json(JSON.parse(data));
      }
      return res.json([]);
    } catch (error: any) {
      console.error("Error reading syllabus file:", error);
      return res.status(500).json({ error: "Failed to read syllabus from server: " + error.message });
    }
  });

  // API Endpoint: Save syllabus to server
  app.post("/api/syllabus", (req, res) => {
    try {
      const syllabus = req.body;
      if (!Array.isArray(syllabus)) {
        return res.status(400).json({ error: "Invalid data format. Expected an array of syllabus." });
      }
      fs.writeFileSync(SYLLABUS_FILE, JSON.stringify(syllabus, null, 2), "utf-8");
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error writing syllabus file:", error);
      return res.status(500).json({ error: "Failed to save syllabus to server: " + error.message });
    }
  });

  // Initialize Gemini AI SDK lazily and safely
  let ai: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
      }
      ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return ai;
  }

  // API Endpoint: AI Assistance for filling out the lesson diary columns
  app.post("/api/gemini/suggest", async (req, res) => {
    try {
      const { subject, classSection, chapterName, concept, periodsAllotted } = req.body;

      if (!subject || !chapterName) {
        return res.status(400).json({ error: "Subject and Chapter Name are required." });
      }

      const client = getGeminiClient();

      const prompt = `You are an expert curriculum developer. Help a school teacher complete their Daily Lesson Diary entry.
Details of the class:
- Subject: ${subject}
- Class and Section: ${classSection || "Not Specified"}
- Name of the Chapter: ${chapterName}
- Current Concept / Topic: ${concept || "Not Specified"}
- No of Periods Allotted: ${periodsAllotted || "Not Specified"}

Provide helpful suggestions for the following columns in the lesson diary:
1. "concept": If the current concept is empty or brief, suggest a refined, brief educational concept or sub-topic (10-15 words).
2. "expectedOutcome": Specify a clear, measurable learning outcome for the students starting with "Students will be able to..." (15-25 words).
3. "tlmRequired": Suggest Teaching Learning Materials (TLMs) that are highly relevant, practical, and effective for this concept (e.g., charts, flashcards, smartboard, physical models, textbook, daily life objects) (10-15 words).
4. "remarks": Suggest a brief remark of achievements or feedback indicator (e.g. "Most students understood and participated in the exercises.", "Some students struggled with pronunciation, practice planned.") (10-20 words).

Keep all outputs highly concise, realistic, and tailored to school teaching. Response MUST be in JSON.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              concept: {
                type: Type.STRING,
                description: "Refined, brief description of the sub-topic or concept to be taught.",
              },
              expectedOutcome: {
                type: Type.STRING,
                description: "Expected learning outcome starting with 'Students will be able to...'.",
              },
              tlmRequired: {
                type: Type.STRING,
                description: "Teaching Learning Material (TLM) recommended for this class.",
              },
              remarks: {
                type: Type.STRING,
                description: "Typical achievements/remarks for this concept.",
              },
            },
            required: ["concept", "expectedOutcome", "tlmRequired", "remarks"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No text response received from Gemini.");
      }

      const suggestions = JSON.parse(responseText.trim());
      res.json(suggestions);
    } catch (error: any) {
      console.error("Gemini suggestion error:", error);
      res.status(500).json({ error: error.message || "An error occurred while generating suggestions." });
    }
  });

  // API Endpoint: AI Syllabus Generator
  app.post("/api/gemini/generate-syllabus", async (req, res) => {
    try {
      const { subject, classId } = req.body;

      if (!subject || !classId) {
        return res.status(400).json({ error: "Subject and Class ID are required." });
      }

      const client = getGeminiClient();

      const prompt = `You are an expert curriculum developer. Help a school teacher generate a detailed syllabus (chapters & concepts) for their class.
Subject: ${subject}
Class: ${classId}

Provide exactly 6 chapters that are highly relevant, standard, and appropriate for this subject and class.
For each chapter, provide exactly 4 key concepts or sub-topics that will be taught.
For each concept, specify a clear, measurable learning outcome starting with "Students will be able to..." (in simple English or appropriate language suited for ${subject}).

All outputs must be realistic, conforming to general academic standards. Response MUST be in JSON.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              chapters: {
                type: Type.ARRAY,
                description: "List of chapters for the syllabus",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "Name of the chapter, e.g. 'Chapter 1: Real Numbers' or appropriate translation",
                    },
                    concepts: {
                      type: Type.ARRAY,
                      description: "List of key concepts or sub-topics inside the chapter",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: {
                            type: Type.STRING,
                            description: "Sub-topic or concept name",
                          },
                          learningOutcome: {
                            type: Type.STRING,
                            description: "Expected learning outcome for the concept, e.g., 'Students will be able to...'",
                          }
                        },
                        required: ["name", "learningOutcome"]
                      }
                    }
                  },
                  required: ["name", "concepts"]
                }
              }
            },
            required: ["chapters"]
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No text response received from Gemini.");
      }

      const generatedSyllabus = JSON.parse(responseText.trim());
      res.json(generatedSyllabus);
    } catch (error: any) {
      console.error("Gemini syllabus generation error:", error);
      res.status(500).json({ error: error.message || "An error occurred while generating the syllabus." });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
