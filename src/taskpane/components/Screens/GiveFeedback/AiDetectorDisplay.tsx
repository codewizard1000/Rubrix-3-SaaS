import React from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AggregatedPassage, AiDetectorResult } from "../../../Services/aiDetector";

interface AiDetectorDisplayProps {
  result: AiDetectorResult;
  onBack: () => void;
  onRunAgain: () => void;
}

interface TextSegment {
  text: string;
  highlight: boolean;
  passage?: AggregatedPassage;
}

const getHighlightColor = (confidence: AggregatedPassage["confidence"]): string => {
  if (confidence === "High") {
    return "rgba(239, 68, 68, 0.28)";
  }

  if (confidence === "Medium") {
    return "rgba(245, 158, 11, 0.25)";
  }

  return "rgba(234, 179, 8, 0.2)";
};

const createHighlightedSegments = (
  text: string,
  passages: AggregatedPassage[],
  maxLength = 12000
): TextSegment[] => {
  const preview = text.slice(0, maxLength);
  const ranges: Array<{ start: number; end: number; passage: AggregatedPassage }> = [];

  passages.forEach((passage) => {
    const index = preview.toLowerCase().indexOf(passage.textSnippet.toLowerCase());
    if (index !== -1) {
      ranges.push({
        start: index,
        end: index + passage.textSnippet.length,
        passage,
      });
    }
  });

  ranges.sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number; passage: AggregatedPassage }> = [];
  ranges.forEach((range) => {
    const last = merged[merged.length - 1];
    if (!last || range.start >= last.end) {
      merged.push(range);
      return;
    }

    if (range.passage.score > last.passage.score) {
      last.end = Math.max(last.end, range.end);
      last.passage = range.passage;
    } else {
      last.end = Math.max(last.end, range.end);
    }
  });

  const segments: TextSegment[] = [];
  let cursor = 0;

  merged.forEach((range) => {
    if (range.start > cursor) {
      segments.push({ text: preview.slice(cursor, range.start), highlight: false });
    }

    segments.push({
      text: preview.slice(range.start, range.end),
      highlight: true,
      passage: range.passage,
    });

    cursor = range.end;
  });

  if (cursor < preview.length) {
    segments.push({ text: preview.slice(cursor), highlight: false });
  }

  if (segments.length === 0) {
    segments.push({ text: preview, highlight: false });
  }

  return segments;
};

const AiDetectorDisplay: React.FC<AiDetectorDisplayProps> = ({ result, onBack, onRunAgain }) => {
  const segments = React.useMemo(
    () => createHighlightedSegments(result.analyzedText, result.highlightedPassages),
    [result.analyzedText, result.highlightedPassages]
  );

  return (
    <Box sx={{ width: "100%", maxWidth: 840, mx: "auto" }}>
      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
        <Button startIcon={<ArrowBackIcon />} size="small" onClick={onBack} sx={{ textTransform: "none" }}>
          Back to feedback tools
        </Button>
        <Button
          startIcon={<RestartAltIcon />}
          size="small"
          variant="outlined"
          onClick={onRunAgain}
          sx={{ textTransform: "none" }}
        >
          Run detector again
        </Button>
      </Stack>

      <Typography
        variant="h5"
        fontWeight={700}
        sx={{
          color: "#0f172a",
          mb: 0.5,
          textAlign: "center",
          fontFamily: "Poppins, sans-serif",
          fontSize: { xs: "1.2rem", sm: "1.35rem" },
        }}
      >
        AI Detector Results
      </Typography>

      <Typography variant="body2" sx={{ color: "#475569", textAlign: "center", mb: 2.2 }}>
        3-pass analysis complete. Review highlighted passages and confidence before making a final decision.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} sx={{ mb: 1.5 }}>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, flex: 1 }}>
          <Typography variant="caption" sx={{ color: "#475569" }}>
            Overall AI-likely percentage
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
            {result.overallPercentage}%
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, flex: 1 }}>
          <Typography variant="caption" sx={{ color: "#475569" }}>
            Highlighted passages
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
            {result.highlightedPassages.length}
          </Typography>
        </Paper>
      </Stack>

      <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, mb: 1.5, backgroundColor: "#f8fafc" }}>
        <Typography variant="caption" sx={{ color: "#334155" }}>
          Confidence note
        </Typography>
        <Typography variant="body2" sx={{ color: "#0f172a" }}>
          {result.confidenceNote}
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.8 }}>
          Pass breakdown
        </Typography>
        <Stack direction="column" spacing={0.6}>
          {result.passBreakdown.map((pass) => (
            <Box key={pass.pass} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" sx={{ color: "#334155", pr: 1 }}>
                Pass {pass.pass}: {pass.focus}
              </Typography>
              <Chip size="small" label={`${pass.overallPercentage}%`} />
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          p: 1.2,
          borderRadius: 2,
          mb: 1.5,
          maxHeight: 260,
          overflowY: "auto",
          whiteSpace: "pre-wrap",
          lineHeight: 1.6,
          fontSize: "0.85rem",
        }}
      >
        {segments.map((segment, index) => {
          if (!segment.highlight || !segment.passage) {
            return <React.Fragment key={index}>{segment.text}</React.Fragment>;
          }

          return (
            <Box
              key={index}
              component="span"
              sx={{
                backgroundColor: getHighlightColor(segment.passage.confidence),
                px: 0.2,
                borderRadius: 0.5,
              }}
              title={`${segment.passage.confidence} confidence • score ${segment.passage.score}% • ${segment.passage.reason}`}
            >
              {segment.text}
            </Box>
          );
        })}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.8 }}>
          Highlighted passages
        </Typography>

        {result.highlightedPassages.length === 0 && (
          <Typography variant="body2" sx={{ color: "#64748b" }}>
            No consensus passages found across all 3 passes.
          </Typography>
        )}

        {result.highlightedPassages.map((passage, index) => (
          <Box key={`${passage.textSnippet}-${index}`} sx={{ mb: index === result.highlightedPassages.length - 1 ? 0 : 1.1 }}>
            <Typography variant="body2" sx={{ color: "#0f172a", fontStyle: "italic" }}>
              "{passage.textSnippet}"
            </Typography>
            <Typography variant="caption" sx={{ color: "#334155" }}>
              Score: {passage.score}% | Votes: {passage.votes}/3 | Confidence: {passage.confidence}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
              {passage.reason}
            </Typography>
            {index !== result.highlightedPassages.length - 1 && <Divider sx={{ mt: 0.8 }} />}
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default AiDetectorDisplay;
