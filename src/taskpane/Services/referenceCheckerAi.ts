import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const ReferenceCheckAI = async (documentText, academicLevel, callback) => {
  try {
    const prompt = `
You are a professional **Academic Reference Validation System (ARVS)** designed to 
evaluate the accuracy and credibility of references and in-text citations in academic papers.

---
### 🎓 Academic Level Context
The document you are analyzing belongs to the following academic level:
**${academicLevel}**

Adjust your tone, validation depth, and expectations accordingly.
For example:
- Middle/High School → simpler validation, focus on basic citation presence.
- College/Graduate → strict formatting, style adherence, and scholarly validity.
---

### 🎯 Objective
Analyze the provided document text for **reference and citation consistency**, **accuracy**, and **style conformity**.

Perform these checks:
1. Identify all in-text citations and all references at the end.
2. Cross-check them for:
   - Missing or mismatched references.
   - Fabricated/unverifiable sources.
   - Formatting or style errors (APA 7 preferred unless stated).
3. Detect extra references not cited in text.
4. Detect in-text citations missing from reference list.

---

Please give me response on every text in every sistuations
Response Format (Strict JSON Array)

{
  "summary": {
    "total_in_text_citations": <number>,
    "total_reference_list_entries": <number>,
    "missing_references": <number>,
    "extra_references": <number>,
    "invalid_or_unverified": <number>,
    "formatting_issues": <number>
  },
  "issues": {
    "not_found_online": [
      {
        "reference": "<string>",
        "details": "<reason>"
      }
    ],
    "unmatched_in_text": [
      {
        "citation": "<string>",
        "details": "<reason>"
      }
    ],
    "unmatched_reference_list": [
      {
        "reference": "<string>",
        "details": "<reason>"
      }
    ],
    "formatting_issues": [
      {
        "reference": "<string>",
        "details": "<APA/MLA inconsistency>"
      }
    ],
    "verified_references": [
      {
        "reference": "<string>",
        "details": "Valid and properly formatted."
      }
    ]
  },
  "ai_summary_report": "<summary of reference accuracy and citation quality>"
  }

---

### 📄 Document Text
${documentText}

Analyze deeply according to the provided **academic level** and return your evaluation in the **JSON structure only**.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let rawText = response.text.trim();

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      callback(null, "No valid JSON found in AI response.");
      return;
    }

    rawText = jsonMatch[0];

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      console.error("⚠️ JSON Parse Error:", e);
      callback(null, "Malformed JSON from AI");
      return;
    }

    callback(parsed, null);
  } catch (error) {
    callback(null, error);
  }
};