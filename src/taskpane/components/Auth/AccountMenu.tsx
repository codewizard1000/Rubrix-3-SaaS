import React from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../../context/AuthContext";
import BillingDialog from "./BillingDialog";
import AuthGate from "./AuthGate";
import { formatPlanName, getUsageSummary } from "../../Services/billing";

const AccountMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [billingOpen, setBillingOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);
  const [wordsLeft, setWordsLeft] = React.useState<number>(0);
  const [planLabel, setPlanLabel] = React.useState<string>("Trial");

  React.useEffect(() => {
    if (!user?.id) {
      setWordsLeft(0);
      setPlanLabel("Trial");
      return undefined;
    }

    const refresh = () => {
      const summary = getUsageSummary(user.id);
      setWordsLeft(summary.monthlyBaseWordsLeft);
      setPlanLabel(formatPlanName(summary.planId));
    };

    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, [user?.id, billingOpen]);

  if (!user?.id) {
    return (
      <>
        <Box
          sx={{
            position: "fixed",
            top: 8,
            right: 10,
            zIndex: 1400,
            display: "flex",
            alignItems: "center",
            gap: 0.8,
          }}
        >
          <Button
            size="small"
            variant="contained"
            onClick={() => setAuthOpen(true)}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 1.4,
              py: 0.6,
              fontWeight: 700,
              background: "linear-gradient(135deg,#0f172a,#1d4ed8)",
            }}
          >
            Login / Sign up
          </Button>
        </Box>

        <Dialog open={authOpen} onClose={() => setAuthOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Login / Sign up</DialogTitle>
          <DialogContent>
            <AuthGate embedded />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email ||
    "Account";

  return (
    <>
      <Box
        sx={{
          position: "fixed",
          top: 8,
          right: 10,
          zIndex: 1400,
          display: "flex",
          alignItems: "center",
          gap: 0.8,
        }}
      >
        <Tooltip title="Account">
          <IconButton
            size="small"
            onClick={(event) => setAnchorEl(event.currentTarget)}
            sx={{
              border: "1px solid rgba(148, 163, 184, 0.55)",
              backgroundColor: "rgba(255,255,255,0.95)",
            }}
          >
            <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: "#1d4ed8" }}>
              {(displayName || "A").charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Tooltip>
        <Chip
          size="small"
          label={`${wordsLeft.toLocaleString()} words left`}
          sx={{
            fontWeight: 700,
            backgroundColor: "rgba(255,255,255,0.95)",
            border: "1px solid rgba(148, 163, 184, 0.55)",
          }}
        />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem disableRipple>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b" }}>
              {user.email || "Signed in"}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 0.4 }}>
              {planLabel} • {wordsLeft.toLocaleString()} words left this month
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setBillingOpen(true);
          }}
        >
          <ReceiptLongIcon fontSize="small" sx={{ mr: 1 }} />
          Billing and settings
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <ManageAccountsIcon fontSize="small" sx={{ mr: 1 }} />
          Account
        </MenuItem>
        <MenuItem
          onClick={async () => {
            setAnchorEl(null);
            await signOut();
          }}
        >
          <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
          Sign out
        </MenuItem>
      </Menu>

      <BillingDialog
        open={billingOpen}
        onClose={() => setBillingOpen(false)}
        userId={user.id}
        email={user.email}
      />
    </>
  );
};

export default AccountMenu;
