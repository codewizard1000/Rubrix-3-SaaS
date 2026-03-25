import React from "react";
import { Box, Typography, Avatar, Button, Tooltip, Fade, Paper } from "@mui/material";
import QuizIcon from "@mui/icons-material/Quiz";
import FeedbackIcon from "@mui/icons-material/Feedback";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate } from "react-router-dom";
import EditNoteIcon from "@mui/icons-material/EditNote";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useAuth } from "../../context/AuthContext";
import Toast from "../Toast/ToastMessage";
import { formatPlanName, getUsageSummary } from "../../Services/billing";

type FeatureKey = "create" | "feedback" | "level";

interface FeatureCard {
  key: FeatureKey;
  title: string;
  desc: string;
  Icon: typeof QuizIcon;
  gradient: string;
}

const featuresTop: FeatureCard[] = [
  {
    key: "create",
    title: "Create",
    desc: "Quizzes and rubrics",
    Icon: QuizIcon,
    gradient: "linear-gradient(135deg,#0f172a 0%, #0ea5a5 100%)",
  },
  {
    key: "feedback",
    title: "Feedback",
    desc: "Comment and grade",
    Icon: FeedbackIcon,
    gradient: "linear-gradient(135deg,#1a1633 0%, #7c3aed 100%)",
  },
];

const featuresBottom: FeatureCard[] = [
  {
    key: "level",
    title: "Change Level",
    desc: "Adjust level",
    Icon: SwapHorizIcon,
    gradient: "linear-gradient(135deg,#0b2b16 0%, #10b981 100%)",
  },
];

export default function TeacherToolsGrid() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hover, setHover] = React.useState(false);
  const [authInfo, setAuthInfo] = React.useState<string | null>(null);
  const [usageLine, setUsageLine] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.id) {
      setUsageLine(null);
      return undefined;
    }

    const refresh = () => {
      const summary = getUsageSummary(user.id);
      setUsageLine(
        `${formatPlanName(summary.planId)} • ${summary.monthlyBaseWordsLeft.toLocaleString()} words left this month`
      );
    };

    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, [user?.id]);

  const handleFeatureClick = (key: FeatureKey | "mainbody") => {
    if (!user?.id) {
      setAuthInfo("Login / Sign up is required before using Rubrix features.");
      return;
    }

    switch (key) {
      case "create":
        navigate("/create");
        break;
      case "feedback":
        navigate("/feedback");
        break;
      case "level":
        navigate("/changelevel");
        break;
      case "mainbody":
        navigate("/mainBodyWritingTools");
        break;
      default:
        break;
    }
  };

  const renderFeatureBox = (feature: FeatureCard) => {
    const { key, title, desc, Icon, gradient } = feature;
    return (
      <Box
        key={key}
        onClick={() => handleFeatureClick(key)}
        sx={{
          flex: 1,
          minWidth: 110,
          maxWidth: 130,
          height: 100,
          m: 0.8,
          p: 1.2,
          borderRadius: 2,
          background: gradient,
          color: "white",
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          transition: "all 0.25s ease",
          cursor: "pointer",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 5px 10px rgba(0,0,0,0.35)",
          },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <Icon sx={{ fontSize: 26, mb: 0.5 }} />
        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: 13, mb: 0.3 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: 10, opacity: 0.85, lineHeight: 1 }}>
          {desc}
        </Typography>
      </Box>
    );
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          background: "#0f172a",
          backdropFilter: "blur(6px)",
        }}
      >
        <Toolbar sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar
            src={require("../../../../assets/Main.png")}
            alt="Rubrix Logo"
            sx={{
              width: 32,
              height: 32,
              backgroundColor: "transparent",
            }}
          />
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 600,
              letterSpacing: 0.5,
              fontFamily: "Poppins, sans-serif",
            }}
          >
            Rubrix
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />

      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <Typography
            variant="h5"
            sx={{
              position: "relative",
              display: "inline-block",
              fontWeight: 800,
              fontSize: "1.8rem",
              fontFamily: "'Poppins', sans-serif",
              letterSpacing: 0.6,
              background: "linear-gradient(270deg, #00e0ff, #00ffa3, #007bff, #8b5cf6)",
              backgroundSize: "400% 400%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textTransform: "uppercase",
              animation: "gradientFlow 5s ease infinite, floatIn 1.3s ease-out, glowPulse 3s ease-in-out infinite",
              filter: "drop-shadow(0 0 10px rgba(0, 255, 163, 0.35))",
              "@keyframes gradientFlow": {
                "0%": { backgroundPosition: "0% 50%" },
                "50%": { backgroundPosition: "100% 50%" },
                "100%": { backgroundPosition: "0% 50%" },
              },
              "@keyframes floatIn": {
                "0%": { opacity: 0, transform: "translateY(-35px) scale(0.85)" },
                "60%": { opacity: 1, transform: "translateY(8px) scale(1.03)" },
                "100%": { transform: "translateY(0) scale(1)" },
              },
              "@keyframes glowPulse": {
                "0%, 100%": { filter: "drop-shadow(0 0 7px rgba(0, 255, 163, 0.45))" },
                "50%": { filter: "drop-shadow(0 0 16px rgba(0, 191, 255, 0.75))" },
              },
              "&::after": {
                content: '""',
                position: "absolute",
                left: "50%",
                bottom: "-4px",
                transform: "translateX(-50%)",
                width: "55%",
                height: "2.5px",
                borderRadius: "2px",
                background: "linear-gradient(90deg, transparent, #00ffa3, #00e0ff, transparent)",
                animation: "shineLine 3s ease-in-out infinite",
              },
              "@keyframes shineLine": {
                "0%, 100%": { opacity: 0.4, width: "38%" },
                "50%": { opacity: 1, width: "68%" },
              },
            }}
          >
            Rubrix
          </Typography>
        </Box>

        <Box sx={{ my: 3 }}>
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontStyle: "italic",
              letterSpacing: 0.4,
            }}
            textAlign="center"
          >
            Empowering educators to craft meaningful learning, elevate feedback, and inspire growth with Rubrix.
          </Typography>
          {!user?.id && (
            <Typography
              variant="caption"
              sx={{ color: "#475569", mt: 1, textAlign: "center", display: "block", fontWeight: 600 }}
            >
              Explore the landing page first, then use top-right Login / Sign up to unlock tools.
            </Typography>
          )}
          {usageLine && (
            <Paper
              variant="outlined"
              sx={{
                mt: 1.2,
                py: 0.8,
                px: 1.2,
                borderRadius: 2,
                textAlign: "center",
                borderColor: "#cbd5e1",
                backgroundColor: "#f8fafc",
              }}
            >
              <Typography variant="caption" sx={{ color: "#0f172a", fontWeight: 700 }}>
                {usageLine}
              </Typography>
            </Paper>
          )}
        </Box>
        <Box sx={{ p: "5px" }}>
          <Tooltip
            TransitionComponent={Fade}
            TransitionProps={{ timeout: 400 }}
            title="Refine your writing with AI assistance"
            placement="bottom"
            arrow
          >
            <Button
              fullWidth
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              onClick={() => handleFeatureClick("mainbody")}
              startIcon={<EditNoteIcon />}
              endIcon={
                <ArrowForwardIcon
                  sx={{
                    opacity: hover ? 1 : 0,
                    transform: hover ? "translateX(5px)" : "translateX(-5px)",
                    transition: "all 0.3s ease",
                  }}
                />
              }
              sx={{
                mb: 2,
                py: 1.3,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: "none",
                fontSize: "15px",
                background: hover
                  ? "linear-gradient(135deg,#2e3ab0 0%, #6366f1 50%, #0ea5e9 100%)"
                  : "linear-gradient(135deg,#1e3a8a 0%, #6366f1 50%, #14b8a6 100%)",
                color: "white",
                fontFamily: "Poppins, sans-serif",
                letterSpacing: 0.4,
                transition: "0.3s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                },
              }}
            >
              AI Writing Assistant
            </Button>
          </Tooltip>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>{featuresTop.map(renderFeatureBox)}</Box>
        <Box sx={{ display: "flex", justifyContent: "center" }}>{featuresBottom.map(renderFeatureBox)}</Box>
      </Box>
      {authInfo && <Toast info={authInfo} onClose={() => setAuthInfo(null)} />}
    </>
  );
}
