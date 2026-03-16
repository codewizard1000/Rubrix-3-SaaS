import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

interface RawPassage {
  textSnippet: string;
  reason: string;
  score: number;
}

interface DetectorPassResult {
  pass: number;
  focus: string;
  overall_ai_likelihood_percent: number;
  passages: RawPassage[];
}

export interface AggregatedPassage {
  textSnippet: string;
  score: number;
  votes: number;
  confidence: "High" | "Medium" | "Low";
  reason: string;
}

export interface AiDetectorResult {
  overallPercentage: number;
  confidenceNote: string;
  highlightedPassages: AggregatedPassage[];
  passBreakdown: Array<{
    pass: number;
    focus: string;
    overallPercentage: number;
  }>;
  analyzedText: string;
}

const PASS_FOCUS = [
  "Predictability and repetitive sentence construction",
  "Uniform tone, low personal variation, and model-like transitions",
  "Lack of natural hesitations, abrupt certainty, and synthetic flow",
];

const cleanModelJson = (rawText: string): string => {
  return rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
};

const parsePassResult = (rawText: string, pass: number, focus: string): DetectorPassResult => {
  const cleaned = cleanModelJson(rawText);

  let parsed: any = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to recover if model returned extra text around JSON.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        parsed = JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        parsed = null;
      }
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      pass,
      focus,
      overall_ai_likelihood_percent: 0,
      passages: [],
    };
  }

  const passages = Array.isArray(parsed.passages)
    ? parsed.passages
        .map((item) => ({
          textSnippet: String(item.textSnippet || "").trim(),
          reason: String(item.reason || "").trim(),
          score: Number(item.score || 0),
        }))
        .filter((item) => item.textSnippet.length >= 18 && item.score > 0)
    : [];

  return {
    pass,
    focus,
    overall_ai_likelihood_percent: Math.max(0, Math.min(100, Number(parsed.overall_ai_likelihood_percent || 0))),
    passages,
  };
};

const normalize = (value: string): string => value.replace(/\s+/g, " ").trim().toLowerCase();

const resolveSnippetFromDocument = (documentText: string, snippet: string): string | null => {
  if (!snippet) {
    return null;
  }

  if (documentText.includes(snippet)) {
    return snippet;
  }

  const normalizedDoc = documentText.toLowerCase();
  const normalizedSnippet = snippet.toLowerCase();
  const start = normalizedDoc.indexOf(normalizedSnippet);

  if (start === -1) {
    return null;
  }

  return documentText.substring(start, start + snippet.length);
};

const heuristicDetectorPass = (documentText: string, pass: number, focus: string): DetectorPassResult => {
  const snippets = documentText
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 50)
    .slice(0, 6)
    .map((line) => ({
      textSnippet: line.slice(0, 180),
      reason: "Heuristic fallback (API unavailable): long/formal low-variance sentence structure.",
      score: 58,
    }));

  return {
    pass,
    focus,
    overall_ai_likelihood_percent: snippets.length ? 52 : 35,
    passages: snippets,
  };
};

const runDetectorPass = async (documentText: string, pass: number, focus: string): Promise<DetectorPassResult> => {
  if (!ai) {
    return heuristicDetectorPass(documentText, pass, focus);
  }

  const prompt = `
You are analyzing student writing for likely AI-generated passages.

Pass ${pass} focus:
${focus}

Rules:
1. Only flag snippets copied verbatim from the document text.
2. Keep each snippet <= 180 characters.
3. Return only JSON with no markdown.
4. Score each snippet 0-100 for AI-likelihood.
5. Be conservative. Do not over-flag.

Return this exact JSON structure:
{
  "overall_ai_likelihood_percent": 0,
  "passages": [
    {
      "textSnippet": "exact snippet from document",
      "score": 0,
      "reason": "short rationale"
    }
  ]
}

Document:
"""
${documentText}
"""
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const rawText = response.text?.trim() || "";
    return parsePassResult(rawText, pass, focus);
  } catch (error) {
    console.error(`AI detector pass ${pass} failed`, error);
    return {
      pass,
      focus,
      overall_ai_likelihood_percent: 0,
      passages: [],
    };
  }
};

const aggregatePasses = (documentText: string, passes: DetectorPassResult[]): AiDetectorResult => {
  const snippetMap = new Map<
    string,
    {
      textSnippet: string;
      scores: number[];
      reasons: string[];
      votes: number;
    }
  >();

  for (const pass of passes) {
    for (const snippet of pass.passages) {
      const resolvedSnippet = resolveSnippetFromDocument(documentText, snippet.textSnippet);
      if (!resolvedSnippet) {
        continue;
      }

      const key = normalize(resolvedSnippet);
      if (!snippetMap.has(key)) {
        snippetMap.set(key, {
          textSnippet: resolvedSnippet,
          scores: [],
          reasons: [],
          votes: 0,
        });
      }

      const current = snippetMap.get(key)!;
      current.scores.push(snippet.score);
      if (snippet.reason) {
        current.reasons.push(snippet.reason);
      }
      current.votes += 1;
    }
  }

  const aggregatedPassages = Array.from(snippetMap.values())
    .map((item): AggregatedPassage => {
      const avgScore = item.scores.reduce((sum, value) => sum + value, 0) / item.scores.length;
      const confidence: "High" | "Medium" | "Low" =
        item.votes >= 3 ? "High" : item.votes >= 2 ? "Medium" : "Low";

      return {
        textSnippet: item.textSnippet,
        score: Number(avgScore.toFixed(1)),
        votes: item.votes,
        confidence,
        reason: item.reasons[0] || "Flagged by detector pass consensus.",
      };
    })
    .filter((item) => item.votes >= 2 || item.score >= 85)
    .sort((a, b) => {
      if (b.votes !== a.votes) {
        return b.votes - a.votes;
      }
      return b.score - a.score;
    });

  const passAverage =
    passes.reduce((sum, pass) => sum + pass.overall_ai_likelihood_percent, 0) / Math.max(1, passes.length);

  const documentLength = Math.max(documentText.length, 1);
  const weightedCoverage = aggregatedPassages.reduce((sum, snippet) => {
    const weight = (snippet.textSnippet.length / documentLength) * (snippet.score / 100) * (snippet.votes / 3);
    return sum + weight;
  }, 0);

  const coveragePercent = Math.min(100, weightedCoverage * 100);
  const overallPercentage = Number(Math.min(100, passAverage * 0.65 + coveragePercent * 0.35).toFixed(1));

  const averageVotes =
    aggregatedPassages.reduce((sum, snippet) => sum + snippet.votes, 0) / Math.max(1, aggregatedPassages.length);

  let confidenceNote =
    "Low detector agreement across passes. Treat this as a screening signal, not final proof.";

  if (averageVotes >= 2.5 && aggregatedPassages.length > 0) {
    confidenceNote =
      "High cross-pass agreement. Flagged passages are likely AI-assisted and should be reviewed manually.";
  } else if (averageVotes >= 2) {
    confidenceNote =
      "Moderate agreement across passes. Review highlighted passages before making a final judgment.";
  }

  if (aggregatedPassages.length === 0) {
    confidenceNote =
      "No strong consensus passages were found across the 3 detector passes. Manual review is still recommended.";
  }

  return {
    overallPercentage,
    confidenceNote,
    highlightedPassages: aggregatedPassages,
    passBreakdown: passes.map((pass) => ({
      pass: pass.pass,
      focus: pass.focus,
      overallPercentage: Number(pass.overall_ai_likelihood_percent.toFixed(1)),
    })),
    analyzedText: documentText,
  };
};

export const detectAiWriting = async (documentText: string): Promise<AiDetectorResult> => {
  const passes: DetectorPassResult[] = [];
  const boundedDocument = documentText.length > 12000 ? documentText.slice(0, 12000) : documentText;

  for (let index = 0; index < PASS_FOCUS.length; index += 1) {
    const passNumber = index + 1;
    const focus = PASS_FOCUS[index];
    const passResult = await runDetectorPass(boundedDocument, passNumber, focus);
    passes.push(passResult);
  }

  return aggregatePasses(boundedDocument, passes);
};
