import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY,
});

export async function redoAIComment(textSnippet, previousComment, level, callback: (result: any, error: any) => void) {

  const prompt = `
You are an expert academic writing instructor improving feedback comments for ${level} students.

You are given:
1. The student's exact text snippet.
2. The previous AI-generated feedback comment.

Your task:
- Rewrite the feedback comment so it’s clearer, more professional, and more actionable.
- Keep the meaning and intent but improve phrasing and tone.
- Be concise (1–2 sentences max).
- Do NOT modify or paraphrase the student's text snippet.
- Do NOT include or repeat the previous comment in your response.
- The output should be pure JSON with only the textSnippet and the improved new comment.

Example format:
[
  {
    "textSnippet": "exact student text snippet",
    "comment": "improved rewritten feedback comment"
  }
]

Now improve the feedback based on the following:

STUDENT TEXT SNIPPET:
"""${textSnippet}"""

PREVIOUS COMMENT:
"""${previousComment.replace(/"/g, '\\"')}"""
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let resultText = response?.text || "";
    resultText = resultText
      .replace(/```(?:json)?/gi, "")
      .replace(/```/g, "")
      .trim();

    const jsonMatch = resultText.match(/\[([\s\S]*?)\]/);
    if (!jsonMatch) throw new Error("No JSON array found in AI response.");

    const cleanJson = jsonMatch[0];
    const parsedArray = JSON.parse(cleanJson);

    console.log("Parsed redoAIComment response:", parsedArray);
    if (Array.isArray(parsedArray) && parsedArray.length > 0) {
      callback(parsedArray[0], null);
    } else {
      throw new Error("Invalid JSON format in AI response.");
    }
  } catch (error) {
    console.error("Error during redoAIComment:", error);
    callback(null, error);
  }
}
