interface WinstonAiSentence {
  text?: string;
  sentence?: string;
  score?: number;
  start?: number;
  end?: number;
  start_pos?: number;
  end_pos?: number;
  startIndex?: number;
  endIndex?: number;
}

interface WinstonAiPayload {
  score?: number;
  sentences?: WinstonAiSentence[];
  result?: {
    score?: number;
    sentences?: WinstonAiSentence[];
  };
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

const clampPercent = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, numeric));
};

const getSentenceText = (sentence: WinstonAiSentence, fullText: string): string => {
  const direct = String(sentence.text || sentence.sentence || "").trim();
  if (direct.length > 0) {
    return direct;
  }

  const start = Number(sentence.start ?? sentence.start_pos ?? sentence.startIndex);
  const end = Number(sentence.end ?? sentence.end_pos ?? sentence.endIndex);
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return fullText.slice(start, end).trim();
  }

  return "";
};

const getConfidence = (aiLikelihood: number): AggregatedPassage["confidence"] => {
  if (aiLikelihood >= 70) {
    return "High";
  }

  if (aiLikelihood >= 45) {
    return "Medium";
  }

  return "Low";
};

const parseFailureMessage = async (response: Response): Promise<string> => {
  const fallback = `Winston request failed with status ${response.status}.`;

  try {
    const payload = await response.json();
    if (typeof payload?.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }

    if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }

    return fallback;
  } catch {
    return fallback;
  }
};

const buildConfidenceNote = (overallPercentage: number, highlightedCount: number): string => {
  if (highlightedCount === 0) {
    return "No strong AI-likely passages were highlighted. Review manually before concluding authorship.";
  }

  if (overallPercentage >= 70) {
    return "High AI-likelihood signal from Winston. Review highlighted passages first.";
  }

  if (overallPercentage >= 45) {
    return "Moderate AI-likelihood signal from Winston. Use manual review to confirm.";
  }

  return "Low AI-likelihood signal from Winston. Manual verification is still recommended.";
};

export const detectAiWriting = async (documentText: string): Promise<AiDetectorResult> => {
  const boundedDocument = documentText.slice(0, 16000);

  const response = await fetch("/api/winston/ai-content-detection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: boundedDocument }),
  });

  if (!response.ok) {
    throw new Error(await parseFailureMessage(response));
  }

  const payload = (await response.json()) as WinstonAiPayload;
  const resolvedPayload = payload?.result && typeof payload.result === "object" ? payload.result : payload;

  const humanScore = clampPercent(resolvedPayload?.score ?? payload?.score);
  const overallAiLikelihood = Number((100 - humanScore).toFixed(1));

  const rawSentences = Array.isArray(resolvedPayload?.sentences)
    ? resolvedPayload.sentences
    : Array.isArray(payload?.sentences)
      ? payload.sentences
      : [];

  const highlightedPassages = rawSentences
    .map((sentence): AggregatedPassage | null => {
      const snippet = getSentenceText(sentence, boundedDocument);
      if (snippet.length < 18) {
        return null;
      }

      const sentenceHumanScore = clampPercent(sentence.score);
      const aiLikelihood = Number((100 - sentenceHumanScore).toFixed(1));

      if (aiLikelihood < 45) {
        return null;
      }

      return {
        textSnippet: snippet,
        score: aiLikelihood,
        votes: 1,
        confidence: getConfidence(aiLikelihood),
        reason: `Winston sentence score: ${sentenceHumanScore.toFixed(1)}% human-likely.`,
      };
    })
    .filter((item): item is AggregatedPassage => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);

  return {
    overallPercentage: overallAiLikelihood,
    confidenceNote: buildConfidenceNote(overallAiLikelihood, highlightedPassages.length),
    highlightedPassages,
    passBreakdown: [
      {
        pass: 1,
        focus: "Winston v2 AI content detection",
        overallPercentage: overallAiLikelihood,
      },
    ],
    analyzedText: boundedDocument,
  };
};
