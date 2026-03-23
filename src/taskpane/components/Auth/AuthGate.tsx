import React from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  TextField,
  Alert,
  Chip,
  Divider,
  Avatar,
  CircularProgress,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import MicrosoftIcon from "@mui/icons-material/Window";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import { useAuth } from "../../context/AuthContext";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AuthGate: React.FC = () => {
  const { signInWithGoogle, signInWithMicrosoft, sendMagicLink, error, clearError } = useAuth();
  const [email, setEmail] = React.useState("");
  const [emailInfo, setEmailInfo] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSendMagicLink = async () => {
    clearError();
    setEmailInfo(null);

    if (!emailRegex.test(email.trim())) {
      setEmailInfo("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    const result = await sendMagicLink(email.trim());
    setSubmitting(false);

    if (result.error) {
      return;
    }

    setEmailInfo("Magic link sent. Open your email and return to this add-in.");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        background: "radial-gradient(circle at 10% 10%, #dbeafe 0%, #f8fafc 38%, #e2e8f0 100%)",
      }}
    >
      <Chip
        label="Login"
        color="primary"
        sx={{ position: "fixed", top: 10, right: 12, zIndex: 1300, fontWeight: 600 }}
      />
      <Paper
        elevation={8}
        sx={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 3,
          p: 3,
          border: "1px solid #cbd5e1",
        }}
      >
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 2 }}>
          <Avatar src={require("../../../../assets/Main.png")} alt="Rubrix logo" />
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "1rem" }}>Rubrix</Typography>
            <Typography variant="caption" sx={{ color: "#334155" }}>
              Sign in to continue
            </Typography>
          </Box>
        </Stack>

        <Typography variant="body2" sx={{ color: "#334155", mb: 2 }}>
          App usage is locked until authentication. Sessions stay signed in unless you manually sign out.
        </Typography>

        <Stack spacing={1.2}>
          <Button
            variant="contained"
            startIcon={<GoogleIcon />}
            onClick={signInWithGoogle}
            sx={{ textTransform: "none", borderRadius: 2, py: 1.1 }}
          >
            Continue with Google
          </Button>

          <Button
            variant="outlined"
            startIcon={<MicrosoftIcon />}
            onClick={signInWithMicrosoft}
            sx={{ textTransform: "none", borderRadius: 2, py: 1.1 }}
          >
            Continue with Microsoft
          </Button>
        </Stack>

        <Divider sx={{ my: 2.2 }}>or</Divider>

        <Stack spacing={1.2}>
          <TextField
            label="Email"
            fullWidth
            size="small"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@school.edu"
          />
          <Button
            variant="outlined"
            startIcon={submitting ? <CircularProgress size={16} /> : <MailOutlineIcon />}
            onClick={handleSendMagicLink}
            disabled={submitting}
            sx={{ textTransform: "none", borderRadius: 2, py: 1.05 }}
          >
            Send email sign-in link
          </Button>
        </Stack>

        {emailInfo && (
          <Alert severity={emailInfo.includes("valid") ? "warning" : "info"} sx={{ mt: 2 }}>
            {emailInfo}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2.2 }}>
          <Typography variant="caption" sx={{ color: "#475569", display: "block" }}>
            Billing policy: 30-day free trial with no credit card required for sign-up.
          </Typography>
          <Typography variant="caption" sx={{ color: "#475569", display: "block", mt: 0.3 }}>
            After trial, plans are $0.99 monthly or $0.99 yearly, auto-renew via Stripe.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default AuthGate;
