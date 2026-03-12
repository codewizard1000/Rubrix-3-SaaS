import { createPartFromUri, GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export type GradingToughness = "5-Very Hard" | "4-Hard" | "3-Medium" | "2-Easy" | "1-Very Easy";
export type FeedbackTone = "Formal" | "Professional and Friendly" | "Friendly";
export type FeedbackPerson = "First" | "Second" | "Third";

export interface GradeGenerationOptions {
  gradingToughness: GradingToughness;
  feedbackTone: FeedbackTone;
  person: FeedbackPerson;
  savedRubricName?: string | null;
}

export interface GradedExample {
  fileName: string;
  content: string;
}

export const analyzeRubricFile = async (
  file: File,
  callback: (result: any, error: any) => void
) => {
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

    const content: any[] = ["Summarize rubric criteria, levels, and weighting from this grading rubric."];
    if (getFile.uri && getFile.mimeType) {
      const filePart = createPartFromUri(getFile.uri, getFile.mimeType);
      content.push(filePart);
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: content,
    });

    callback(response.text?.trim(), null);
  } catch (error) {
    console.error("Error analyzing rubric:", error);
    callback(null, error);
  }
};

export const analyzeRubricText = async (text: string, callback: (result: any, error: any) => void) => {
  try {
    if (!text || text.trim().length === 0) {
      return callback(null, "No rubric text provided.");
    }

    const prompt = `
You are analyzing a grading rubric provided as text.
Extract and summarize the key criteria, grading levels, and point values.

Rubric Text:
${text}

Provide a concise and direct summary of the grading standards.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    callback(response.text?.trim(), null);
  } catch (error) {
    console.error("Error analyzing rubric text:", error);
    callback(null, error);
  }
};

export const gradeDocumentAI = async (
  documentText: string,
  rubricSummary: string | null,
  userCriteria: string,
  examples: GradedExample[] | null,
  options: GradeGenerationOptions,
  callback: (result: any, error: any) => void
) => {
  try {
    let examplesSection = "";
    if (examples && examples.length > 0) {
      examplesSection = `
## GRADED EXAMPLES (Few-Shot Learning)

These papers were graded by the same instructor.
Match their grading strictness, feedback structure, and deduction style.

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
You are an academic grading assistant that adapts to instructor style.

Grading configuration:
- Toughness: ${options.gradingToughness}
- Feedback tone: ${options.feedbackTone}
- Feedback person perspective: ${options.person}
- Selected saved rubric name: ${options.savedRubricName || "None"}

Interpretation guidance for toughness:
- 5-Very Hard: strict deductions and high standard threshold.
- 4-Hard: firm but fair deductions.
- 3-Medium: balanced grading.
- 2-Easy: lenient grading.
- 1-Very Easy: very lenient and encouragement-focused.

Person guidance:
- First: comments should use first-person instructor voice (e.g. "I noticed...").
- Second: comments should address student directly (e.g. "You should...").
- Third: comments should use objective third-person phrasing.

Inputs:
Rubric Summary (if available):
${rubricSummary || "None provided"}

Instructor Criteria (if available):
${userCriteria || "None provided"}

${examplesSection}

Student Document to Grade:
${documentText}

Output Instructions:
Return valid JSON only, with this exact structure:

{
  "grade_summary": {
    "overall_grade": "A, B, C, D, F or numeric (0-100)",
    "total_score": "<if numeric grading used>",
    "general_feedback": "Concise paragraph (max 120 words)."
  },
  "criteria_feedback": [
    {
      "criterion": "<criterion>",
      "grade": "<A, B, C, D, F>",
      "score": "<points or qualitative score>",
      "comment": "<constructive feedback under 50 words>"
    }
  ]
}

Rules:
1. Keep comments clear, specific, and non-repetitive.
2. Enforce the toughness setting consistently.
3. Tone and phrasing must match selected tone/person settings.
4. If rubric and criteria are missing, infer criteria such as Clarity, Grammar, Structure, Argument.
5. Do not include markdown or non-JSON text.
6. If examples are present, align with instructor style from examples.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const gradeText = response.text?.trim() || "";

    try {
      const jsonMatch = gradeText.match(/```json([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : gradeText;
      const parsedResult = JSON.parse(jsonString);
      callback(parsedResult, null);
    } catch (parseError) {
      console.warn("JSON parsing failed for grading response", parseError);
      callback(null, "Invalid JSON format in AI response.");
    }
  } catch (error) {
    console.error("Error during grading:", error);
    callback(null, error);
  }
};
