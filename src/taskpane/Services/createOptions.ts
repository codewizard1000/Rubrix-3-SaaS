// utils/OpenAiCall.ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey:process.env.API_KEY,
});
export async function createOptionsAi(
  prompt: string,
  callback: (result: any, error: any) => void
) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

   const resultText =
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      response?.text ||
      "No response from Gemini.";

    let parsedJson = null;

    try {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      parsedJson = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(resultText);
    } catch (err) {
      console.warn("⚠️ Failed to parse JSON, returning raw text instead.");
      parsedJson = { content: resultText };
    }

    // ✅ Always return both parsed + raw
    callback(parsedJson, null);
  } catch (error) {
    callback(null, error);
    console.error("Error during Gemini API call:", error);
  }
}
