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
  "Predictability, repetitive syntax, and low lexical variance",
  "Uniform tone, model-like transitions, and generic abstraction",
  "Overconfident certainty, low narrative friction, and synthetic rhythm",
];

const cleanModelJson = (rawText: string): string => {
  return rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
};

const parsePassResult = (rawText: string, pass: number, focus: string): DetectorPassResult => {
  const cleaned = cleanModelJson(rawText);

  let parsed: any = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
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

const splitIntoChunks = (text: string, chunkSize = 2200, overlap = 300): string[] => {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const end = Math.min(text.length, cursor + chunkSize);
    chunks.push(text.slice(cursor, end));
    if (end >= text.length) break;
    cursor = Math.max(0, end - overlap);
  }

  return chunks;
};

const heuristicDetectorPass = (documentText: string, pass: number, focus: string): DetectorPassResult => {
  const sentences = documentText
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 40);

  const normalized = sentences.map((s) => s.toLowerCase());
  const repeatedStarts = normalized.filter((s, i, arr) => {
    const key = s.slice(0, 24);
    return key.length > 12 && arr.findIndex((x) => x.slice(0, 24) === key) !== i;
  });

  const genericMarkers = [
    "in conclusion",
    "overall",
    "furthermore",
    "moreover",
    "it is important to note",
    "this demonstrates",
    "in today's world",
  ];

  const markerHits = normalized.filter((s) => genericMarkers.some((m) => s.includes(m)));

  const base = 45;
  const repetitionBoost = Math.min(20, repeatedStarts.length * 4);
  const markerBoost = Math.min(20, markerHits.length * 3);
  const overall = Math.max(20, Math.min(90, base + repetitionBoost + markerBoost));

  const snippets = sentences
    .slice(0, 8)
    .map((line) => ({
      textSnippet: line.slice(0, 180),
      reason: "Heuristic fallback: repetitive/generic sentence patterns.",
      score: Math.max(40, Math.min(85, overall + 8)),
    }));

  return {
    pass,
    focus,
    overall_ai_likelihood_percent: overall,
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
5. Be decisive for likely AI passages; do not default to low scores.

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
    return heuristicDetectorPass(documentText, pass, focus);
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
      const confidence: "High" | "Medium" | "Low" = item.votes >= 3 ? "High" : item.votes >= 2 ? "Medium" : "Low";

      return {
        textSnippet: item.textSnippet,
        score: Number(avgScore.toFixed(1)),
        votes: item.votes,
        confidence,
        reason: item.reasons[0] || "Flagged by detector pass consensus.",
      };
    })
    .filter((item) => item.votes >= 2 || item.score >= 70)
    .sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return b.score - a.score;
    });

  const passAverage =
    passes.reduce((sum, pass) => sum + pass.overall_ai_likelihood_percent, 0) / Math.max(1, passes.length);

  const documentLength = Math.max(documentText.length, 1);
  const weightedCoverage = aggregatedPassages.reduce((sum, snippet) => {
    const weight = (snippet.textSnippet.length / documentLength) * (snippet.score / 100) * Math.max(0.6, snippet.votes / 3);
    return sum + weight;
  }, 0);

  const coveragePercent = Math.min(100, weightedCoverage * 130);
  const overallPercentage = Number(Math.min(100, passAverage * 0.45 + coveragePercent * 0.55).toFixed(1));

  const averageVotes = aggregatedPassages.reduce((sum, snippet) => sum + snippet.votes, 0) / Math.max(1, aggregatedPassages.length);

  let confidenceNote = "Low detector agreement. Treat this as a screening signal and review manually.";
  if (overallPercentage >= 70 || (averageVotes >= 2.3 && aggregatedPassages.length > 0)) {
    confidenceNote = "High detector agreement. Likely AI-assisted writing; review highlighted passages first.";
  } else if (overallPercentage >= 45 || averageVotes >= 1.8) {
    confidenceNote = "Moderate detector agreement. Mixed/partial AI indicators found; manual verification recommended.";
  }

  if (aggregatedPassages.length === 0) {
    confidenceNote = "No strong consensus passages were found across detector passes. Manual review is still recommended.";
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
  const boundedDocument = documentText.length > 16000 ? documentText.slice(0, 16000) : documentText;
  const chunks = splitIntoChunks(boundedDocument);
  const passes: DetectorPassResult[] = [];

  for (let index = 0; index < PASS_FOCUS.length; index += 1) {
    const passNumber = index + 1;
    const focus = PASS_FOCUS[index];

    const chunkResults: DetectorPassResult[] = [];
    for (const chunk of chunks) {
      const result = await runDetectorPass(chunk, passNumber, focus);
      chunkResults.push(result);
    }

    const mergedOverall =
      chunkResults.reduce((sum, result) => sum + result.overall_ai_likelihood_percent, 0) /
      Math.max(1, chunkResults.length);

    const mergedPassages = chunkResults.flatMap((result) => result.passages);

    passes.push({
      pass: passNumber,
      focus,
      overall_ai_likelihood_percent: Number(mergedOverall.toFixed(1)),
      passages: mergedPassages,
    });
  }

  return aggregatePasses(boundedDocument, passes);
};
