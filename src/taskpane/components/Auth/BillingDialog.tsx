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
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  BillingState,
  applyFreeMembershipCode,
  ensureBillingStateForUser,
  getTrialDaysRemaining,
  isTrialActive,
  startStripeCheckout,
} from "../../Services/billing";

interface BillingDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  email?: string;
}

const BillingDialog: React.FC<BillingDialogProps> = ({ open, onClose, userId, email }) => {
  const [billingState, setBillingState] = React.useState<BillingState | null>(null);
  const [code, setCode] = React.useState("");
  const [banner, setBanner] = React.useState<{ severity: "success" | "error" | "info"; text: string } | null>(null);
  const [busyPlan, setBusyPlan] = React.useState<"monthly" | "yearly" | null>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setBillingState(ensureBillingStateForUser(userId));
    setBanner(null);
  }, [open, userId]);

  if (!billingState) {
    return null;
  }

  const daysRemaining = getTrialDaysRemaining(billingState);
  const trialActive = isTrialActive(billingState);

  const handleCodeApply = () => {
    const result = applyFreeMembershipCode(userId, billingState, code);
    setBanner({ severity: result.ok ? "success" : "error", text: result.message });

    if (result.state) {
      setBillingState(result.state);
      setCode("");
    }
  };

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    setBusyPlan(plan);
    const result = await startStripeCheckout({ plan, code: billingState.discountCode, email, userId });
    setBusyPlan(null);
    setBanner({ severity: result.ok ? "info" : "error", text: result.message });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Billing and Subscription</DialogTitle>
      <DialogContent>
        <Stack spacing={1.2}>
          <Paper variant="outlined" sx={{ p: 1.4, borderRadius: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Trial Status
              </Typography>
              <Chip
                size="small"
                color={trialActive ? "success" : "default"}
                label={trialActive ? `${daysRemaining} days left` : "Trial ended"}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: "#334155" }}>
              30-day free trial starts at sign-up with no credit card required.
            </Typography>
            <Typography variant="caption" sx={{ color: "#475569", mt: 0.5, display: "block" }}>
              Current plan: {billingState.plan.replace("_", " ")}
            </Typography>
          </Paper>

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Plans (Auto-renew)
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
            <Paper variant="outlined" sx={{ p: 1.3, borderRadius: 2, flex: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>Monthly</Typography>
              <Typography variant="body2" sx={{ color: "#334155", mb: 1 }}>
                $0.99 / month
              </Typography>
              <Button
                size="small"
                fullWidth
                variant="contained"
                onClick={() => handleCheckout("monthly")}
                disabled={busyPlan !== null}
                sx={{ textTransform: "none" }}
              >
                {busyPlan === "monthly" ? "Opening checkout..." : "Choose monthly"}
              </Button>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.3, borderRadius: 2, flex: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>Yearly</Typography>
              <Typography variant="body2" sx={{ color: "#334155", mb: 1 }}>
                $0.99 / year
              </Typography>
              <Button
                size="small"
                fullWidth
                variant="contained"
                onClick={() => handleCheckout("yearly")}
                disabled={busyPlan !== null}
                sx={{ textTransform: "none" }}
              >
                {busyPlan === "yearly" ? "Opening checkout..." : "Choose yearly"}
              </Button>
            </Paper>
          </Stack>

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Discount or Free Membership Code
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              size="small"
              placeholder="Enter code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <Button variant="outlined" sx={{ textTransform: "none" }} onClick={handleCodeApply}>
              Apply
            </Button>
          </Stack>

          <Typography variant="caption" sx={{ color: "#64748b" }}>
            Stripe integration scaffold: use env vars `STRIPE_CHECKOUT_ENDPOINT` or plan checkout URLs.
          </Typography>

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
