import React from "react";
import { Box, Typography, Avatar, Button, Tooltip, Fade, } from "@mui/material";
import QuizIcon from "@mui/icons-material/Quiz";
import FeedbackIcon from "@mui/icons-material/Feedback";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate } from "react-router-dom";
import EditNoteIcon from "@mui/icons-material/EditNote";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const featuresTop = [
    {
        key: "create",
        title: "Create",
        desc: "Quizzes & rubrics",
        Icon: QuizIcon,
        gradient: "linear-gradient(135deg,#0f172a 0%, #0ea5a5 100%)",
    },
    {
        key: "feedback",
        title: "Feedback",
        desc: "Comment & grade",
        Icon: FeedbackIcon,
        gradient: "linear-gradient(135deg,#1a1633 0%, #7c3aed 100%)",
    },
];

const featuresBottom = [
    {
        key: "references",
        title: "Reference",
        desc: "Check citations",
        Icon: MenuBookIcon,
        gradient: "linear-gradient(135deg,#041627 0%, #2563eb 100%)",
    },
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
    const [hover, setHover] = React.useState(false);

    const handleFeatureClick = (key) => {
        switch (key) {
            case "create":
                navigate("/create");
                break;
            case "feedback":
                navigate("/feedback");
                break;
            case "references":
                navigate("/RefranceCheck");
                break;
            case "level":
                navigate("/changelevel");
                break;
            case "mainbody":
                navigate("/mainBodyWritingTools");
                break;
            default:
                console.log("Unknown feature clicked");
        }
    };

    const renderFeatureBox = (feature) => {
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
                <Typography
                    variant="body1"
                    sx={{ fontWeight: 600, fontSize: 13, mb: 0.3 }}
                >
                    {title}
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ fontSize: 10, opacity: 0.85, lineHeight: 1 }}
                >
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

            <Box sx={{ p: 3, }}>
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                    <Typography
                        variant="h5"
                        sx={{
                            position: "relative",
                            display: "inline-block",
                            fontWeight: 800,
                            fontSize: "1.8rem", // 🔹 smaller size
                            fontFamily: "'Poppins', sans-serif",
                            letterSpacing: 0.6,
                            background: "linear-gradient(270deg, #00e0ff, #00ffa3, #007bff, #8b5cf6)",
                            backgroundSize: "400% 400%",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            textTransform: "uppercase",
                            animation:
                                "gradientFlow 5s ease infinite, floatIn 1.3s ease-out, glowPulse 3s ease-in-out infinite",
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
                                background:
                                    "linear-gradient(90deg, transparent, #00ffa3, #00e0ff, transparent)",
                                animation: "shineLine 3s ease-in-out infinite",
                            },
                            "@keyframes shineLine": {
                                "0%, 100%": { opacity: 0.4, width: "38%" },
                                "50%": { opacity: 1, width: "68%" },
                            },
                        }}
                    //   textAlign="center"
                    >
                        Rubrix
                    </Typography>
                </Box>

                {/* Tagline */}
                <Box sx={{ my: 3 }}>
                    <Typography
                        sx={{
                            fontFamily: "Poppins, sans-serif",
                            fontStyle: "italic",
                            letterSpacing: 0.4,
                        }}
                        textAlign="center"
                    >
                        Empowering educators to craft meaningful learning, elevate feedback, and inspire growth — all powered by Rubrix.
                    </Typography>
                </Box>
                <Box sx={{p:"5px"}}>
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
                                        transform: hover
                                            ? "translateX(5px)"
                                            : "translateX(-5px)",
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
                                background:
                                    hover
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
                {/* Features grid */}
                <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                    {featuresTop.map(renderFeatureBox)}
                </Box>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                    {featuresBottom.map(renderFeatureBox)}
                </Box>
            </Box>
        </>
    );
}
