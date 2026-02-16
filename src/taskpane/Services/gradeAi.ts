import { createPartFromUri, GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

//  1. Analyze Rubric File Function 
export const analyzeRubricFile = async (file, callback: (result: any, error: any) => void) => {
    try {
        if (!file) {
            return callback(null, "No file provided.");
        }
        const uploaded = await ai.files.upload({
            file,
            config: { displayName: file.name },
        });
        let getFile = await ai.files.get({ name: uploaded.name });
        while (getFile.state === "PROCESSING") {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            getFile = await ai.files.get({ name: uploaded.name });
        }

        if (getFile.state === "FAILED") {
            return callback(null, "File processing failed.");
        }

        // Step 3: Create the prompt
        const content: any[] = ["what is in this rubric?"];
        if (getFile.uri && getFile.mimeType) {
            const filePart = createPartFromUri(getFile.uri, getFile.mimeType);
            content.push(filePart);
        }
        // Step 4: Ask Gemini for rubric summary
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: content,
        });

        const summary = response.text?.trim();
        callback(summary, null);
    } catch (error) {
        console.error("Error analyzing rubric:", error);
        callback(null, error);
    }
};

// Interface for graded example
export interface GradedExample {
  fileName: string;
  content: string;
}

export const gradeDocumentAI = async (
  documentText,
  rubricSummary,
  userCriteria,
  examples,
  callback: (result: any, error: any) => void
) => {
  try {
    // Build the examples section for the prompt
    let examplesSection = "";
    if (examples && examples.length > 0) {
      examplesSection = `
## GRADED EXAMPLES (Few-Shot Learning)

The following are previously graded papers for the SAME assignment type. Analyze the grading style, comment patterns, and point deductions the instructor uses. Apply similar standards to the new document.

IMPORTANT: Pay close attention to:
- The overall grade assigned and what merit level it represents
- Specific feedback comments and their tone/style
- Patterns in what the instructor values or penalizes
- How the instructor phrases constructive criticism

---
`;
      examples.forEach((example, index) => {
        examplesSection += `
### Example ${index + 1}: ${example.fileName}

${example.content}

---
`;
      });
    }

    const prompt = `
You are an academic grading assistant that adapts to individual instructor styles.

Your task:
- Evaluate the given student's document based on the rubric and/or manual instructor criteria.
- ${examples && examples.length > 0 ? "IMPORTANT: Use the provided graded examples to understand the instructor's grading style, comment patterns, and standards. Match their approach closely." : "Use academic grading principles and professional tone."}

Inputs:
Rubric Summary (if available):
${rubricSummary || "None provided"}

Instructor Criteria (if available):
${userCriteria || "None provided"}

${examplesSection}

Student Document to Grade:
${documentText}

Output Instructions:
You must return the grading result **strictly** in this JSON structure (no extra text, no commentary outside JSON):

{
  "grade_summary": {
    "overall_grade": "A, B, C, D, F or numeric (0–100)",
    "total_score": "<if numeric grading used>",
    "general_feedback": "A concise overall paragraph of feedback (max 120 words)."
  },
  "criteria_feedback": [
    {
      "criterion": "<Criterion name or category>",
      "grade": "<A, B, C, D, F >",
      "score": "<points or qualitative grade>",
      "comment": "<Short feedback on this specific criterion>"
    }
  ]
}

Rules:
1. Be concise and factual — avoid repetition or vague praise.
2. Each comment should be constructive, under 50 words.
3. Keep JSON valid and syntactically correct.
4. If rubric or manual criteria are missing, infer reasonable grading criteria (e.g., Clarity, Grammar, Argument Strength, Structure).
5. ${examples && examples.length > 0 ? "Match the instructor's comment style and grading strictness shown in the examples." : "Use a professional, encouraging tone."}
6. DO NOT include markdown, explanations, or any text outside JSON.

Now, generate the grading result based on these instructions.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

     let gradeText = response.text?.trim() || "";
    let parsedResult = null;

    try {
      const jsonMatch = gradeText.match(/```json([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : gradeText;

      parsedResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.warn("⚠️ JSON parsing failed, returning raw text:", parseError);
      return callback(null, "Invalid JSON format in AI response. Raw text: " + gradeText);
    }

    callback(parsedResult, null);
  } catch (error) {
    console.error("❌ Error during grading:", error);
    callback(null, error);
  }
};
