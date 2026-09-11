import { GoogleGenAI } from "@google/genai";
import { ProjectFile } from "./db";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export interface ExplanationResult {
  summary: string;
  structureAnalysis: string;
  entrypoint: string;
  dependencies: string[];
  executionFlow: string;
  recommendations: string[];
}

export interface ErrorExplanation {
  rootCause: string;
  suggestion: string;
  fixExample: string;
}

/**
 * Perform static code analysis on the project files using Gemini API
 */
export async function explainProject(
  projectName: string,
  projectDesc: string,
  primaryLang: string,
  files: ProjectFile[]
): Promise<ExplanationResult> {
  try {
    // Collect paths and clean lines for analysis (ensure we don't send huge binary files)
    const filesContext = files
      .map((f) => {
        // Limit code size to prevent token limits
        const truncatedContent = f.content.length > 5000 ? f.content.substring(0, 5000) + "\n... [Truncated]" : f.content;
        return `File: ${f.path || f.name}\nLanguage: ${f.language}\nContent:\n${truncatedContent}\n------------------------`;
      })
      .join("\n");

    const systemInstruction = `You are an expert senior software architect analyzing a project on Universal Code Studio.
Analyze the files and project context provided. Do not invent files that do not exist.
Your response must be a single valid JSON object adhering strictly to this schema:
{
  "summary": "High-level summary of what this project does.",
  "structureAnalysis": "Analysis of the files, layout, folders, and architectures.",
  "entrypoint": "The detected logical entrypoint file of this project (e.g. main.py, server.ts, index.html).",
  "dependencies": ["List of detected third-party packages, libraries, modules, or dependencies."],
  "executionFlow": "Description of the sequence of compilation, builds, or run stages when launched.",
  "recommendations": ["Architectural, security, styling, or performance improvements."]
}
Avoid including raw markdown wraps. Return only the JSON structure.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Project Name: ${projectName}\nDescription: ${projectDesc}\nPrimary Language: ${primaryLang}\n\nProject Files:\n${filesContext}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("Empty analysis result.");
    }

    return JSON.parse(response.text.trim());
  } catch (err: any) {
    console.error("Explain Project AI analysis failed:", err);
    return {
      summary: `A ${primaryLang} project named "${projectName}". Unable to perform AI analysis locally.`,
      structureAnalysis: `Files found in database: ${files.length} items.`,
      entrypoint: files[0]?.name || "None",
      dependencies: ["Unknown (analysis failed)"],
      executionFlow: "Standard interpreter execution.",
      recommendations: ["Ensure your API key is configured correctly in Secrets to enable complete static audits."],
    };
  }
}

/**
 * Provide quick-fix help for compiler/runtime/linter errors
 */
export async function explainError(
  fileName: string,
  language: string,
  errorLog: string,
  codeContext: string
): Promise<ErrorExplanation> {
  try {
    const systemInstruction = `You are a professional compiler and debugging assistant.
Analyze the provided compiler/runtime error logs and the surrounding source code context.
Explain the error and suggest a correction. Return only a valid JSON object matching this schema:
{
  "rootCause": "Clear, precise explanation of why this error occurred.",
  "suggestion": "Step-by-step resolution strategy.",
  "fixExample": "A corrected line or block of code showing exactly how to fix it."
}
Do not invent facts. Stay objective and direct.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `File: ${fileName}\nLanguage: ${language}\nError Output:\n${errorLog}\n\nSource Code Context:\n${codeContext}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("No suggestion returned.");
    }

    return JSON.parse(response.text.trim());
  } catch (err: any) {
    console.error("AI Debugging suggestions failed:", err);
    return {
      rootCause: "An execution error occurred inside the compiler/runtime sandbox.",
      suggestion: "Double check your bracket placement, variables scoping, and syntax definitions.",
      fixExample: "// Review your error log details for line and column numbers.",
    };
  }
}
