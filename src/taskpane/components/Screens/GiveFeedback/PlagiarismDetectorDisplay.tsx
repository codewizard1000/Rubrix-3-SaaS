import React from "react";
import { Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { PlagiarismDetectorResult } from "../../../Services/plagiarismDetector";

interface PlagiarismDetectorDisplayProps {
  result: PlagiarismDetectorResult;
  onBack: () => void;
  onRunAgain: () => void;
}

interface TextSegment {
  text: string;
  highlight: boolean;
}

const createHighlightedSegments = (
  text: string,
  ranges: PlagiarismDetectorResult["highlightedRanges"],
  maxLength = 12000
): TextSegment[] => {
  const preview = text.slice(0, maxLength);
  const sortedRanges = [...ranges]
    .map((range) => ({
      start: Math.min(Math.max(0, range.start), preview.length),
      end: Math.min(Math.max(0, range.end), preview.length),
    }))
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  sortedRanges.forEach((range) => {
    const last = merged[merged.length - 1];
    if (!last || range.start >= last.end) {
      merged.push(range);
      return;
    }

    last.end = Math.max(last.end, range.end);
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

const PlagiarismDetectorDisplay: React.FC<PlagiarismDetectorDisplayProps> = ({ result, onBack, onRunAgain }) => {
  const segments = React.useMemo(
    () => createHighlightedSegments(result.analyzedText, result.highlightedRanges),
    [result.analyzedText, result.highlightedRanges]
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
        Plagiarism Detector Results
      </Typography>

      <Typography variant="body2" sx={{ color: "#475569", textAlign: "center", mb: 2.2 }}>
        Winston plagiarism scan complete. Review source matches before final decisions.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} sx={{ mb: 1.5 }}>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, flex: 1 }}>
          <Typography variant="caption" sx={{ color: "#475569" }}>
            Overall plagiarism score
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
            {result.overallPercentage}%
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, flex: 1 }}>
          <Typography variant="caption" sx={{ color: "#475569" }}>
            Matching sources
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
            {result.sourceCount}
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
          if (!segment.highlight) {
            return <React.Fragment key={index}>{segment.text}</React.Fragment>;
          }

          return (
            <Box
              key={index}
              component="span"
              sx={{
                backgroundColor: "rgba(245, 158, 11, 0.25)",
                px: 0.2,
                borderRadius: 0.5,
              }}
            >
              {segment.text}
            </Box>
          );
        })}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.8 }}>
          Top matching sources
        </Typography>

        {result.sources.length === 0 && (
          <Typography variant="body2" sx={{ color: "#64748b" }}>
            No source matches returned by Winston.
          </Typography>
        )}

        {result.sources.map((source, index) => (
          <Box key={`${source.url}-${index}`} sx={{ mb: index === result.sources.length - 1 ? 0 : 1.1 }}>
            <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 600 }}>
              {source.title}
            </Typography>
            {source.url ? (
              <Typography
                component="a"
                href={source.url}
                target="_blank"
                rel="noreferrer"
                variant="caption"
                sx={{ color: "#2563eb", textDecoration: "none", display: "inline-block", mb: 0.3 }}
              >
                {source.url}
              </Typography>
            ) : null}
            <Typography variant="caption" sx={{ color: "#334155", display: "block" }}>
              Match score: {source.score}%
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
              Words: {source.plagiarizedWords} total, {source.identicalWords} identical, {source.similarWords} similar
            </Typography>
            {index !== result.sources.length - 1 && <Divider sx={{ mt: 0.8 }} />}
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default PlagiarismDetectorDisplay;
