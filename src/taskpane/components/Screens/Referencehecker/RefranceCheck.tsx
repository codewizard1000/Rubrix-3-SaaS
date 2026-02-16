import React, { useState } from "react";
import {Box,Typography,Button,Tooltip, Toolbar, AppBar, Avatar, IconButton,} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import DescriptionIcon from "@mui/icons-material/Description";
import Loader from "../../loader/Loader";
import { getDocumentText, insertReferenceReportHTML } from "../../../Utils/documentUtils";
import { ReferenceCheckAI } from "../../../Services/referenceCheckerAi";
import Toast from "../../Toast/ToastMessage";


export default function ReferenceCheckerPanel() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [info, setInfo] = useState(null);

    const runReferenceCheck = async () => {
        setLoading(true);
        try {
            const accadmicLevel = localStorage.getItem("academicLevel") || "undergraduate";
            const documentText = await getDocumentText()
            if (!documentText) {
                setInfo("Your document is empty. Please write something to check references.");
                setLoading(false);
                return;
            }
            await ReferenceCheckAI(documentText, accadmicLevel, async (result, error) => {
                if (error) {
                    console.error(error);
                } else {
                    console.log(result)
                    await insertReferenceReportHTML(result)
                    setSuccess("Reference check completed and report inserted into the end of document.");
                }
            });
        } catch (error) {
            console.error("Error running reference check:", error);
        } finally {
            setLoading(false);
        }
    }

    const handleBack = () => {
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
                    p: { xs: 4, marginTop: "32px" }
                }}
            >
                <Tooltip title="Back" arrow>
                    <IconButton
                        onClick={handleBack}
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
                    AI Reference Checker
                </Typography>

                <Typography
                    variant="body2"
                    sx={{
                        color: "#475569",
                        textAlign: "center",
                        mb: 4,
                        lineHeight: 1.6,
                        fontSize: { xs: "0.8rem", sm: "0.9rem" },
                    }}
                    textAlign="center"
                >
                    The AI will analyze your document, verify all in-text citations and references, and
                    generate a detailed report highlighting missing, fake, or mismatched references.
                </Typography>
                <Button
                    fullWidth
                    variant="contained"
                    sx={{
                        mt: 1,
                        py: 0.9,
                        borderRadius: 2,
                        fontSize: "0.8rem",
                        background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                        textTransform: "capitalize",
                        "&:hover": {
                                    transform: "translateY(-2px)",
                                    boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                                },

                    }}
                    onClick={runReferenceCheck}
                    startIcon={<DescriptionIcon sx={{ fontSize: 18 }} />}
                >
                    Check References
                </Button>

                {error && (
          <Toast
            error={error}
            onClose={() => setError(null)}
          />
        )}
        {info && (
          <Toast
            info={info}
            onClose={() => setInfo(null)}
          />
        )}
        {success && (
          <Toast
            success={success}
            onClose={() => setSuccess(null)}
          />
        )}

                {loading && <Loader />}
            </Box>
        </>
    );
}
