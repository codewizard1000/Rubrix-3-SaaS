// utils/OpenAiCall.ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey:process.env.API_KEY,
});
export async function DocumentWriting(
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

    const resultText = response?.text || "No response from Gemini.";
    callback(resultText, null);
  } catch (error) {
    callback(null, error);
    console.error("Error during Gemini API call:", error);
  }
}
