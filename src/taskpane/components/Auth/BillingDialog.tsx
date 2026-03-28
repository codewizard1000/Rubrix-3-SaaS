import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import {
  BILLING_PLANS,
  BillingPlanDefinition,
  BillingState,
  BillingInterval,
  TOP_UP_LABELS,
  TOP_UP_WORD_PACK_SIZE,
  TopUpType,
  ensureBillingStateForUser,
  formatPlanName,
  formatPrice,
  getAnnualPrice,
  getUsageSummary,
  startStripeCheckout,
  UsageSummary,
} from "../../Services/billing";
import UsageMeter from "./UsageMeter";

interface BillingDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  email?: string;
}

const formatFeatureSummary = (plan: BillingPlanDefinition): string => {
  const hasAiDetector = plan.includes.includes("ai_detector") ? "AI detector: yes" : "AI detector: no";
  const hasPlagiarism = plan.includes.includes("plagiarism") ? "Plagiarism: yes" : "Plagiarism: no";
  return `${hasAiDetector} • ${hasPlagiarism}`;
};

const BillingDialog: React.FC<BillingDialogProps> = ({ open, onClose, userId, email }) => {
  const [billingState, setBillingState] = React.useState<BillingState | null>(null);
  const [usageSummary, setUsageSummary] = React.useState<UsageSummary | null>(null);
  const [annual, setAnnual] = React.useState(false);
  const [banner, setBanner] = React.useState<{ severity: "success" | "error" | "info"; text: string } | null>(null);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const refreshState = React.useCallback(() => {
    const state = ensureBillingStateForUser(userId);
    const usage = getUsageSummary(userId);
    setBillingState(state);
    setUsageSummary(usage);
    setAnnual(state.billingInterval === "annual");
  }, [userId]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    refreshState();
    setBanner(null);
  }, [open, refreshState]);

  if (!billingState || !usageSummary) {
    return null;
  }

  const interval: BillingInterval = annual ? "annual" : "monthly";
  const isTrial = billingState.planId === "trial";

  const handleCheckoutPlan = async (planId: BillingPlanDefinition["id"]) => {
    setBusyKey(`plan:${planId}`);
    const result = await startStripeCheckout(
      {
        kind: "subscription",
        userId,
        email,
        planId,
        billingInterval: interval,
      },
      billingState.discountCode
    );
    setBusyKey(null);

    setBanner({
      severity: result.ok ? "info" : "error",
      text: result.ok
        ? "Stripe checkout opened. Subscription/plan status updates after webhook confirmation."
        : result.message,
    });
  };

  const handleTopUpCheckout = async (topUpType: TopUpType) => {
    setBusyKey(`topup:${topUpType}`);
    const result = await startStripeCheckout({
      kind: "topup",
      userId,
      email,
      topUpType,
    });
    setBusyKey(null);

    setBanner({
      severity: result.ok ? "info" : "error",
      text: result.ok
        ? "Top-up checkout opened. Balance updates after webhook confirmation."
        : result.message,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Billing, Plans, and Usage</DialogTitle>
      <DialogContent>
        <Stack spacing={1.4}>
          <Paper variant="outlined" sx={{ p: 1.3, borderRadius: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8, flexWrap: "wrap" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Current Status
              </Typography>
              <Chip size="small" label={`Plan: ${formatPlanName(billingState.planId)}`} />
              <Chip size="small" label={`Words left: ${usageSummary.monthlyBaseWordsLeft.toLocaleString()}`} />
              {isTrial && <Chip size="small" color="warning" label={`${usageSummary.trialWordsLeft.toLocaleString()} trial words left`} />}
            </Stack>
            <Typography variant="caption" sx={{ color: "#475569", display: "block" }}>
              Monthly cycle ends on {new Date(usageSummary.cycleEndsAt).toLocaleDateString()}.
            </Typography>
            <Typography variant="caption" sx={{ color: "#475569", display: "block" }}>
              Monthly base usage: {usageSummary.monthlyBaseWordsUsed.toLocaleString()} /{" "}
              {usageSummary.monthlyBaseCapacity.toLocaleString()} words.
            </Typography>
            <Box sx={{ mt: 1 }}>
              <UsageMeter summary={usageSummary} compact />
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.3, borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Subscription Plans
              </Typography>
              <FormControlLabel
                control={<Switch checked={annual} onChange={(event) => setAnnual(event.target.checked)} />}
                label="Annual billing (20% off)"
              />
            </Stack>

            <Typography variant="caption" sx={{ color: "#475569", display: "block", mb: 1 }}>
              Standard plans: 200,000 words/month. Heavy duty plans: 2,000,000 words/month.
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1,
              }}
            >
              {BILLING_PLANS.map((plan) => {
                const price = annual ? getAnnualPrice(plan.monthlyPrice) : plan.monthlyPrice;
                const billingLabel = annual ? "year" : "month";
                const selected = billingState.planId === plan.id;
                const busy = busyKey === `plan:${plan.id}`;

                return (
                  <Paper
                    key={plan.id}
                    variant="outlined"
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      borderColor: selected ? "#2563eb" : undefined,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700 }}>{plan.title}</Typography>
                    <Typography variant="body2" sx={{ color: "#334155", mb: 0.5 }}>
                      {formatPrice(price)} / {billingLabel}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#475569", display: "block" }}>
                      {plan.monthlyWordCapacity.toLocaleString()} words / month
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#475569", display: "block", mb: 0.8 }}>
                      {formatFeatureSummary(plan)}
                    </Typography>
                    <Button
                      size="small"
                      fullWidth
                      variant={selected ? "outlined" : "contained"}
                      onClick={() => handleCheckoutPlan(plan.id)}
                      disabled={Boolean(busyKey)}
                      sx={{ textTransform: "none" }}
                    >
                      {busy ? "Opening checkout..." : selected ? "Change plan" : "Choose plan"}
                    </Button>
                  </Paper>
                );
              })}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.3, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Top-ups (No rollover)
            </Typography>
            <Typography variant="caption" sx={{ color: "#475569", display: "block", mb: 1 }}>
              25 essays x 2,000 words each = {TOP_UP_WORD_PACK_SIZE.toLocaleString()} words per pack.
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              {(Object.keys(TOP_UP_LABELS) as TopUpType[]).map((topUpType) => {
                const busy = busyKey === `topup:${topUpType}`;
                const wordsLeft = usageSummary.topUpWordsLeft[topUpType];
                return (
                  <Paper key={topUpType} variant="outlined" sx={{ p: 1.1, borderRadius: 2, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {TOP_UP_LABELS[topUpType]}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#475569", display: "block", mb: 0.7 }}>
                      {wordsLeft.toLocaleString()} words available this cycle
                    </Typography>
                    <Button
                      size="small"
                      fullWidth
                      variant="outlined"
                      onClick={() => handleTopUpCheckout(topUpType)}
                      disabled={Boolean(busyKey)}
                      sx={{ textTransform: "none" }}
                    >
                      {busy ? "Opening checkout..." : `Buy ${TOP_UP_WORD_PACK_SIZE.toLocaleString()} words`}
                    </Button>
                  </Paper>
                );
              })}
            </Stack>
          </Paper>

          <Divider />
          <Button variant="text" size="small" onClick={refreshState} sx={{ textTransform: "none", alignSelf: "flex-start" }}>
            Refresh subscription and usage
          </Button>

          {banner && <Alert severity={banner.severity}>{banner.text}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BillingDialog;
