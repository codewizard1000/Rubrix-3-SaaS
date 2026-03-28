import React from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { formatPlanName, UsageSummary } from "../../Services/billing";

export type UsageWarningLevel = "none" | "info" | "warning" | "critical";

const getCapacityRatio = (summary: UsageSummary): number => {
  if (summary.monthlyBaseCapacity <= 0) {
    return 0;
  }

  return summary.monthlyBaseWordsLeft / summary.monthlyBaseCapacity;
};

export const getUsageWarningLevel = (summary: UsageSummary): UsageWarningLevel => {
  if (summary.monthlyBaseWordsLeft <= 0) {
    return "critical";
  }

  const ratio = getCapacityRatio(summary);

  if (ratio <= 0.05) {
    return "critical";
  }

  if (ratio <= 0.1) {
    return "warning";
  }

  if (ratio <= 0.2) {
    return "info";
  }

  return "none";
};

const getWarningText = (summary: UsageSummary, level: UsageWarningLevel): string | null => {
  if (level === "none") {
    return null;
  }

  if (summary.planId === "trial" && summary.monthlyBaseWordsLeft > 0) {
    return `Trial is near limit: ${summary.monthlyBaseWordsLeft.toLocaleString()} words remaining.`;
  }

  if (summary.monthlyBaseWordsLeft <= 0) {
    return "Monthly base words are exhausted. Use top-ups or wait for cycle reset.";
  }

  if (level === "critical") {
    return `Critical: ${summary.monthlyBaseWordsLeft.toLocaleString()} words left this cycle.`;
  }

  if (level === "warning") {
    return `Warning: ${summary.monthlyBaseWordsLeft.toLocaleString()} words left this cycle.`;
  }

  return `Heads up: ${summary.monthlyBaseWordsLeft.toLocaleString()} words left this cycle.`;
};

interface UsageMeterProps {
  summary: UsageSummary;
  compact?: boolean;
}

const UsageMeter: React.FC<UsageMeterProps> = ({ summary, compact = false }) => {
  const warningLevel = getUsageWarningLevel(summary);
  const warningText = getWarningText(summary, warningLevel);
  const progressValue = Math.min(
    100,
    Math.max(0, Math.round((summary.monthlyBaseWordsUsed / Math.max(1, summary.monthlyBaseCapacity)) * 100))
  );
  const progressColor = warningLevel === "critical" ? "error" : warningLevel === "warning" ? "warning" : "primary";
  const warningColor = warningLevel === "critical" ? "#b91c1c" : warningLevel === "warning" ? "#b45309" : "#0369a1";

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="caption" sx={{ color: "#475569", display: "block", mb: compact ? 0.3 : 0.5 }}>
        {summary.planId === "trial" ? "Trial usage" : `${formatPlanName(summary.planId)} usage`}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={progressValue}
        color={progressColor}
        sx={{ height: compact ? 6 : 8, borderRadius: 999 }}
      />
      <Typography variant="caption" sx={{ color: "#475569", display: "block", mt: 0.5 }}>
        {summary.monthlyBaseWordsUsed.toLocaleString()} / {summary.monthlyBaseCapacity.toLocaleString()} words used
      </Typography>
      {warningText && (
        <Typography variant="caption" sx={{ color: warningColor, display: "block", mt: 0.3, fontWeight: 700 }}>
          {warningText}
        </Typography>
      )}
    </Box>
  );
};

export default UsageMeter;
