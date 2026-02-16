import React, { useState, useEffect } from "react";
import {Box,Typography,Paper,TextField,MenuItem,Button,Fade,Stack,Tooltip,IconButton,AppBar,Toolbar,Avatar,} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useNavigate } from "react-router-dom";

export default function ChangeLevelPanel() {
    const navigate = useNavigate();
    const [level, setLevel] = useState(() => localStorage.getItem("academicLevel") || "High School");
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        localStorage.setItem("academicLevel", level);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
    };

    function Backbutton() {
        navigate("/");
    }

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
                        src={require("../../../../../assets/Main.png")}
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
            <Box
                sx={{
                    p: 3,
                    pt: 4,

                }}
            >
                <Tooltip title="Back" arrow>
                    <IconButton
                        onClick={Backbutton}
                        size="small"
                        sx={{
                            position: "fixed",
                            top: "70px",
                            left: 16,
                            color: "#64748b",
                            backgroundColor: "rgba(255,255,255,0.7)",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            "&:hover": { backgroundColor: "rgba(0,0,0,0.05)", transform: "translateY(-1px)" },
                        }}
                    >
                        <ArrowBackIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>

                {/* 🧭 Header */}
                <Box textAlign="center" mb={4} mt={2}>
                    <Typography
                        variant="h5"
                        fontWeight={700}
                        sx={{
                            color: "#0f172a",
                            mb: 1,
                            textAlign: "center",
                            fontFamily: "Poppins, sans-serif",
                            fontSize: { xs: "1.25rem", sm: "1.4rem" },
                        }}
                    >
                        Academic Level

                    </Typography>


                    <Typography variant="body2" sx={{ color: "#475569", mt: 1 }}>
                        Fine-tune how AI writes, reviews, and grades based on your selected level.
                    </Typography>
                </Box>

                {/* <Divider sx={{ mb: 3 }} /> */}
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        borderRadius: 3,
                        background: "linear-gradient(135deg, #2563eb, #1e40af)",
                        color: "white",
                        boxShadow: "0 6px 14px rgba(37,99,235,0.25)",
                    }}
                >
                    <Box display="flex" alignItems="center" gap={1.2} mb={2}>
                        <SchoolIcon sx={{ fontSize: 26 }} />
                        <Typography variant="h6" fontWeight="600">
                            Select Level
                        </Typography>
                    </Box>

                    <TextField
                        select
                        fullWidth
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        sx={{
                            mb: 3,
                            borderRadius: 1.5,
                            backgroundColor: "white",
                            "& .MuiInputBase-root": {
                                height: 48,
                                fontWeight: 500,
                                color: "#1e3a8a",
                            },
                        }}
                    >
                        {[
                            "Middle School",
                            "High School",
                            "College 1st & 2nd year",
                            "College 3rd & 4th year",
                            "Graduate",
                        ].map((lvl) => (
                            <MenuItem key={lvl} value={lvl}>
                                {lvl}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="contained"
                        fullWidth
                        onClick={handleSave}
                        sx={{
                            bgcolor: "white",
                            color: "#1e3a8a",
                            textTransform: "uppercase",
                            fontWeight: "bold",
                            borderRadius: 3,
                            py: 1.2,
                            transition: "all 0.3s ease",
                            "&:hover": {
                                bgcolor: "#f8fafc",
                                transform: "translateY(-2px)",
                                boxShadow: "0 8px 16px rgba(0,0,0,0.12)",
                            },
                        }}
                    >
                        Save Level
                    </Button>

                    <Fade in={isSaved}>
                        <Stack
                            direction="row"
                            justifyContent="center"
                            alignItems="center"
                            spacing={1}
                            sx={{ mt: 2 }}
                        >
                            <CheckCircleIcon color="success" fontSize="small" />
                            <Typography variant="body2">Level saved successfully!</Typography>
                        </Stack>
                    </Fade>
                </Paper>
            </Box>
        </>
    );
}
