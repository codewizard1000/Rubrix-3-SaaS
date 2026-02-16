import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY,
});

export async function CommentAI(
  studentText,
  feedbackOptions,
  callback
) {
  console.log("Feedback Options:", feedbackOptions);
  const level = localStorage.getItem("academicLevel") || "High School";

  let Commentprompt = "";

  if (feedbackOptions.inline && !feedbackOptions.other) {
    Commentprompt = `
You are an expert academic writing instructor evaluating student writing at the ${level} level.

Your job is to identify **exact snippets** of the student's text and attach professional feedback comments.

🚨 VERBATIM EXTRACTION RULES:
1. Every "textSnippet" must be copied **exactly as-is** from the student's text below — **character by character**, including punctuation, capitalization, and spaces.
2. You are NOT allowed to correct, paraphrase, reformat, or normalize text in any way.
3. If you cannot safely copy a snippet *verbatim*, skip that comment entirely.
4. Each snippet must be **an exact substring** found in the student text (use internal matching check).
5. Each "textSnippet" must be **≤ 120 characters**. If the relevant text is longer, cut a smaller portion — but do not modify it.
6. Do not include duplicate or overlapping snippets.
7. Comments must be specific, short (≤ 2 sentences), and constructive.

⚠️ CHECKSUM RULE:
Before output, internally ensure that every textSnippet exactly matches part of the provided student text (no normalization).

OUTPUT FORMAT:
Response Format (Strict JSON Array)
[
  {
    "textSnippet": "exact portion of the student's text (unchanged)",
    "comment": "teacher-style constructive feedback appropriate for ${level}"
  }
]

STUDENT WRITING:
"""
${studentText}
"""
`;
  }  else if (!feedbackOptions.inline && feedbackOptions.other) {
    Commentprompt = `
You are an expert academic writing coach analyzing student writing at the ${level} level.

The user has requested **specific types of feedback** related to:
"${feedbackOptions.otherText}"

Focus only on these requested areas. For each relevant portion of the student’s writing, find **short text snippets** that illustrate these issues or strengths and provide **clear, targeted feedback**.

✅ EXAMPLES of requested focus areas:
- Grammar or sentence structure
- Argument clarity
- Organization
- Academic tone
- Transitions, citations, etc.

Follow these rules:
1. Each "textSnippet" must be **verbatim** from the student text (no editing).
2. Each "comment" must directly relate to the requested focus areas.
3. Limit snippets to **≤ 120 characters**.
4. Skip irrelevant sections.
5. Keep comments specific, constructive, and brief (≤ 2 sentences).

OUTPUT FORMAT (strict JSON):
[
  {
    "textSnippet": "exact portion of the student's text (unchanged)",
    "comment": "feedback focused on ${feedbackOptions.otherText}"
  }
]

STUDENT WRITING:
"""
${studentText}
"""
`;
  }  else if (feedbackOptions.inline && feedbackOptions.other) {
    Commentprompt = `
You are an advanced AI writing evaluator combining **inline comments** and **targeted feedback** on specific areas for ${level}-level students.

The requested focus areas are:
"${feedbackOptions.otherText}"

🔹 INLINE COMMENT RULES (for writing quality):
- Identify **exact text snippets** needing improvement.
- Follow the same verbatim extraction rules as before.
- Give constructive, short feedback per snippet.

🔹 TARGETED FEEDBACK RULES (for custom areas):
- Address topics mentioned by the user (e.g., ${feedbackOptions.otherText})
- Provide short, helpful comments that reference those focus areas.

⚙️ COMBINED OUTPUT FORMAT (Strict JSON Array):
[
  {
    "textSnippet": "exact portion of the student's text (unchanged)",
    "comment": "AI feedback combining inline & ${feedbackOptions.otherText} focus"
  }
]

🚨 VERBATIM EXTRACTION RULES:
1. Copy each snippet **exactly as-is** (no paraphrasing).
2. No duplicates or overlapping snippets.
3. Each snippet ≤ 120 characters.
4. Each comment ≤ 2 sentences.

STUDENT WRITING:
"""
${studentText}
"""
`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: Commentprompt }],
        },
      ],
    });

    let resultText = response?.text || "";
    resultText = resultText
      .replace(/```(?:json)?/gi, "")
      .replace(/```/g, "")
      .trim();

    const jsonMatch = resultText.match(/\[([\s\S]*?)\]/);
    if (!jsonMatch) throw new Error("No JSON array found in response.");

    const cleanJson = jsonMatch[0];
    const parsedArray = JSON.parse(cleanJson);

    if (Array.isArray(parsedArray)) {
      callback(parsedArray, null);
    } else {
      throw new Error("Invalid JSON format in AI response.");
    }
  } catch (error) {
    callback(null, error);
    console.error("Error during Gemini API call:", error);
  }
}
