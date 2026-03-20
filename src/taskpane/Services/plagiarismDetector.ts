interface WinstonSourceIndex {
  start?: number;
  end?: number;
  start_pos?: number;
  end_pos?: number;
  startIndex?: number;
  endIndex?: number;
}

interface WinstonPlagiarismSource {
  title?: string;
  url?: string;
  score?: number;
  plagiarismWords?: number;
  plagiarizedWords?: number;
  wordCount?: number;
  word_count?: number;
  identicalWords?: number;
  identicalWordCount?: number;
  identical_word_count?: number;
  similarWords?: number;
  similarWordCount?: number;
  similar_word_count?: number;
  indexes?: WinstonSourceIndex[];
}

interface WinstonPlagiarismPayload {
  score?: number;
  sources?: WinstonPlagiarismSource[];
  result?: {
    score?: number;
    sources?: WinstonPlagiarismSource[];
  };
}

export interface PlagiarismMatchRange {
  start: number;
  end: number;
  textSnippet: string;
}

export interface PlagiarismSourceMatch {
  title: string;
  url: string;
  score: number;
  plagiarizedWords: number;
  identicalWords: number;
  similarWords: number;
}

export interface PlagiarismDetectorResult {
  overallPercentage: number;
  confidenceNote: string;
  sourceCount: number;
  analyzedText: string;
  highlightedRanges: PlagiarismMatchRange[];
  sources: PlagiarismSourceMatch[];
}

const clampPercent = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, numeric));
};

const toNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
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

const getIndexValue = (index: WinstonSourceIndex, field: "start" | "end"): number => {
  if (field === "start") {
    return toNumber(index.start ?? index.start_pos ?? index.startIndex);
  }

  return toNumber(index.end ?? index.end_pos ?? index.endIndex);
};

const buildConfidenceNote = (overallPercentage: number, sourceCount: number): string => {
  if (sourceCount === 0) {
    return "No matching web sources were returned. Manual verification is still recommended.";
  }

  if (overallPercentage >= 40) {
    return "High plagiarism risk signal. Review source matches carefully before final decisions.";
  }

  if (overallPercentage >= 20) {
    return "Moderate plagiarism risk signal. Inspect cited sources and context manually.";
  }

  return "Low plagiarism risk signal from Winston. Keep manual review in the workflow.";
};

export const detectPlagiarism = async (documentText: string): Promise<PlagiarismDetectorResult> => {
  const boundedDocument = documentText.slice(0, 12000);

  const response = await fetch("/api/winston/plagiarism", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: boundedDocument }),
  });

  if (!response.ok) {
    throw new Error(await parseFailureMessage(response));
  }

  const payload = (await response.json()) as WinstonPlagiarismPayload;
  const resolvedPayload = payload?.result && typeof payload.result === "object" ? payload.result : payload;

  const overallPercentage = Number(clampPercent(resolvedPayload?.score ?? payload?.score).toFixed(1));

  const rawSources = Array.isArray(resolvedPayload?.sources)
    ? resolvedPayload.sources
    : Array.isArray(payload?.sources)
      ? payload.sources
      : [];

  const sources: PlagiarismSourceMatch[] = rawSources
    .map((source): PlagiarismSourceMatch => {
      const title = String(source.title || "Untitled source").trim();
      const url = String(source.url || "").trim();
      const score = Number(clampPercent(source.score).toFixed(1));
      const plagiarizedWords = toNumber(source.plagiarizedWords ?? source.plagiarismWords ?? source.wordCount ?? source.word_count);
      const identicalWords = toNumber(source.identicalWords ?? source.identicalWordCount ?? source.identical_word_count);
      const similarWords = toNumber(source.similarWords ?? source.similarWordCount ?? source.similar_word_count);

      return {
        title: title || "Untitled source",
        url,
        score,
        plagiarizedWords,
        identicalWords,
        similarWords,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const highlightedRanges = rawSources
    .flatMap((source) => {
      const indexes = Array.isArray(source.indexes) ? source.indexes : [];
      return indexes
        .map((index): PlagiarismMatchRange | null => {
          const start = getIndexValue(index, "start");
          const end = getIndexValue(index, "end");

          if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || start < 0) {
            return null;
          }

          const clippedStart = Math.min(Math.max(0, Math.floor(start)), boundedDocument.length);
          const clippedEnd = Math.min(Math.max(0, Math.floor(end)), boundedDocument.length);
          if (clippedEnd <= clippedStart) {
            return null;
          }

          const textSnippet = boundedDocument.slice(clippedStart, clippedEnd).trim();
          if (textSnippet.length < 18) {
            return null;
          }

          return {
            start: clippedStart,
            end: clippedEnd,
            textSnippet,
          };
        })
        .filter((item): item is PlagiarismMatchRange => Boolean(item));
    })
    .sort((a, b) => a.start - b.start)
    .slice(0, 60);

  return {
    overallPercentage,
    confidenceNote: buildConfidenceNote(overallPercentage, sources.length),
    sourceCount: rawSources.length,
    analyzedText: boundedDocument,
    highlightedRanges,
    sources,
  };
};
