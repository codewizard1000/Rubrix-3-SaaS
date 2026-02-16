import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  AppBar,
  Avatar,
  Toolbar,
  Checkbox,
  TextField,
  Button,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CommentIcon from "@mui/icons-material/Comment";
import GradeIcon from "@mui/icons-material/Grade";
import { useNavigate } from "react-router-dom";
import { getDocumentText } from "../../../Utils/documentUtils";
import Toast from "../../Toast/ToastMessage";
import Loader from "../../loader/Loader";
import { CommentAI } from "../../../Services/commentAi";
import AiCommentsDisplay from "./AiCommentsDisplay";
import GradeDocumentUI from "./GradeDocument";

export default function GiveFeedback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiComments, setAiComments] = useState([]);
  const [showGrading, setShowGrading] = useState(false);
  const [inlineChecked, setInlineChecked] = useState(true);
  const [otherChecked, setOtherChecked] = useState(false);
  const [otherComment, setOtherComment] = useState("");

  const handleAiCommentsClick = async () => {
    setLoading(true);
    try {
      const Documenttext = await getDocumentText();
      if (!Documenttext) {
        setInfo("your document is empty please write something to get comments");
        return;
      }

      const feedbackOptions = {
        inline: inlineChecked,
        other: otherChecked,
        otherText: otherChecked ? otherComment.trim() : "",
      };

      await CommentAI(Documenttext, feedbackOptions, async (res, err) => {
        if (res) {
          setAiComments(res);
        }
        if (err) console.log("OpenAI Error:", err);
      });
      setLoading(false);
    } catch (error) {
      console.error("Error in AI Comments click:", error);
    } finally {
      setLoading(false);
    }
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

      <Box sx={{ mt: 4, p: 2 }}>
        {showGrading ? (
          <GradeDocumentUI onBack={() => setShowGrading(false)} />
        ) : aiComments.length > 0 ? (
          <AiCommentsDisplay
            comments={aiComments}
            onAllCommentsCleared={() => setAiComments([])}
          />
        ) : (
          <>
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
                  "&:hover": {
                    backgroundColor: "rgba(0,0,0,0.05)",
                    transform: "translateY(-1px)",
                  },
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
              Give Feedback
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
            >
              Review and refine student writing using AI-powered comments and grading
              tools.
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
                gap: 2.5,
                justifyItems: "center",
                width: "100%",
                maxWidth: "100%",
              }}
            >
              {/* --- Paper 1: AI Comments --- */}
              <Paper
                sx={{
                  width: { xs: "80%", sm: "70%", md: "60%" },
                  p: 2.2,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, #0ea5a5, #2563eb)",
                  color: "white",
                  cursor: "default",
                  transition: "all 0.25s ease",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 8px 16px rgba(0,0,0,0.25)",
                  },
                }}
              >
                <Box
                  sx={{
                    mb: 1.2,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    p: 1,
                    borderRadius: "50%",
                  }}
                >
                  <CommentIcon sx={{ fontSize: 24 }} />
                </Box>

                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{
                    fontSize: { xs: "0.9rem", sm: "0.95rem" },
                  }}
                >
                  AI Comments
                </Typography>

                {/* Checkboxes Section */}
                <Box>
                  {/* First Checkbox */}
                  <Box sx={{ display: "flex", mb: 1 }}>
                    <Checkbox
                      checked={inlineChecked}
                      onChange={(e) => setInlineChecked(e.target.checked)}
                      size="small"
                      sx={{
                        color: "white",
                        "&.Mui-checked": { color: "white" },
                        marginTop: "-10px",
                      }}
                    />
                    <Typography
                      variant="body2"
                       sx={{
                        mt: 0.6,
                        opacity: 0.9,
                        lineHeight: 1.4,
                        fontSize: { xs: "0.75rem", sm: "0.8rem" },
                        textAlign: "left",
                      }}
                    >
                      Get AI-powered inline comments for better writing feedback.
                    </Typography>
                  </Box>

                  {/* Second Checkbox */}
                  <Box sx={{ display: "flex", mb: 1 }}>
                    <Checkbox
                      checked={otherChecked}
                      onChange={(e) => setOtherChecked(e.target.checked)}
                      size="small"
                      sx={{
                        color: "white",
                        "&.Mui-checked": { color: "white" },
                        marginTop: "-10px",
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.6,
                        opacity: 0.9,
                        lineHeight: 1.4,
                        fontSize: { xs: "0.75rem", sm: "0.8rem" },
                        textAlign: "left",
                      }}
                    >
                      Other feedback comments
                    </Typography>
                  </Box>

                  {/* Text Field */}
                  {otherChecked && (
                    <TextField
                      fullWidth
                      variant="outlined"
                      size="small"
                      placeholder="Enter specifics of areas to be commented on."
                      value={otherComment}
                      sx={{
                        backgroundColor: "white",
                        borderRadius: "6px",
                      }}
                      onChange={(e) => setOtherComment(e.target.value)}
                    />
                  )}

                  {/* Generate Button */}
                  <Button
                    variant="contained"
                    onClick={handleAiCommentsClick}
                    disabled={!inlineChecked && !otherChecked}
                    sx={{
                      background: "linear-gradient(135deg, #0ea5a5, #2563eb)",
                      color: "white",
                      textTransform: "none",
                      borderRadius: "8px",
                      fontWeight: 500,
                      marginTop: otherChecked ? 1.5 : "",
                      "&:hover": {
                        background: "linear-gradient(135deg, #0c9696, #1d4ed8)",
                      },
                    }}
                  >
                    Generate AI Comments
                  </Button>
                </Box>
              </Paper>

              {/* --- Paper 2: AI Grade Paper --- */}
              <Paper
                onClick={() => setShowGrading(true)}
                sx={{
                  width: { xs: "80%", sm: "70%", md: "60%" },
                  p: 2.2,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 8px 16px rgba(0,0,0,0.25)",
                  },
                }}
              >
                <Box
                  sx={{
                    mb: 1.2,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    p: 1,
                    borderRadius: "50%",
                  }}
                >
                  <GradeIcon sx={{ fontSize: 24 }} />
                </Box>

                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{
                    fontSize: { xs: "0.9rem", sm: "0.95rem" },
                  }}
                >
                  AI Grade Paper
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.6,
                    opacity: 0.9,
                    lineHeight: 1.4,
                    fontSize: { xs: "0.75rem", sm: "0.8rem" },
                  }}
                >
                  Upload or describe standards to get structured grading.
                </Typography>
              </Paper>
            </Box>
          </>
        )}
        {loading && <Loader />}

        {error && <Toast error={error} onClose={() => setError(null)} />}
        {info && <Toast info={info} onClose={() => setInfo(null)} />}
        {success && <Toast success={success} onClose={() => setSuccess(null)} />}
      </Box>
    </>
  );
}
