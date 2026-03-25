import React, { useState } from "react";
import {
  Box,
  Tooltip,
  Typography,
  AppBar,
  Toolbar,
  Avatar,
  IconButton,
  Button,
  Modal,
  TextField,
} from "@mui/material";
import PsychologyIcon from "@mui/icons-material/Psychology";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import Toast from "../../Toast/ToastMessage";
import { DocumentWriting } from "../../../Services/documentWriting";
import {
  addTrackingModeForEveryOne,
  getDocumentText,
  getSelectedText,
  insertText,
  parseEditSuggestions,
  removeTrackingModeForEveryone,
  replaceInWordDocument,
} from "../../../Utils/documentUtils";
import Loader from "../../loader/Loader";
import { useAuth } from "../../../context/AuthContext";
import { checkUsageAccess, consumeUsage, estimateWords } from "../../../Services/billing";

export default function AIToolsMenu() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<"" | "prompt" | "highlight">("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runDocumentWriting = async (promptText: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      DocumentWriting(promptText, (result, writingError) => {
        if (writingError) {
          reject(writingError);
          return;
        }

        resolve(String(result || ""));
      });
    });
  };

  const consumeWritingUsage = (source: string, words: number): boolean => {
    if (!user?.id) {
      setError("Login / Sign up is required before using this feature.");
      return false;
    }

    const consumeResult = consumeUsage(user.id, "writing_assist", words, {
      source,
    });

    if (!consumeResult.ok) {
      setError(consumeResult.message || "Usage limit reached.");
      return false;
    }

    return true;
  };

  const handleBack = () => {
    removeTrackingModeForEveryone();
    navigate("/");
  };

  const handleOpen = async (tool: "prompt" | "edit" | "highlight") => {
    try {
      if (!user?.id) {
        setInfo("Login / Sign up is required before using Rubrix features.");
        return;
      }

      if (tool === "highlight") {
        const documentText = await getDocumentText();
        if (!documentText) {
          setInfo("Your document is empty. Please add content to use Highlight Actions.");
          return;
        }
        const selectedText = await getSelectedText();
        if (!selectedText) {
          setInfo("Please select some text in the document to use Highlight Actions.");
          return;
        }
      }
      if (tool === "edit") {
        await editSuggestionsPrecheck();
      } else {
        setSelectedTool(tool);
        setOpen(true);
      }
    } catch (err) {
      console.error("Error in handleOpen:", err);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPrompt("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        setError("Login / Sign up is required before using this feature.");
        return;
      }

      if (selectedTool === "prompt") {
        const trimmedPrompt = prompt.trim();
        if (!trimmedPrompt) {
          setInfo("Enter a prompt before submitting.");
          return;
        }

        const requestedWords = Math.max(1, estimateWords(trimmedPrompt));
        const access = checkUsageAccess(user.id, "writing_assist", requestedWords);
        if (!access.allowed) {
          setError(access.message || "Usage limit reached.");
          return;
        }

        const academicLevel =
          localStorage.getItem("academicLevel") || "Graduate";

        const aiPrompt = `
             You are an expert academic content generator.
             Your task is to create or expand high-quality academic writing based on the user’s instruction.

             Guidelines:
              - Maintain an academic tone matching the level: "${academicLevel}".
              - The writing should be coherent, factual, and structured logically.
              - Avoid repetition, fluff, or general statements.
              - Keep it concise yet informative.
              - If the user’s instruction asks for a section (e.g. introduction, abstract, analysis), follow that request directly.

            User’s instruction:
             "${trimmedPrompt}"

            Return only the generated academic text. Do not include explanations or metadata.`;

        const result = await runDocumentWriting(aiPrompt);
        if (!consumeWritingUsage("writing_prompt", requestedWords)) {
          return;
        }

        insertText(result);
        handleClose();
        setSuccess(`Content inserted successfully. ${requestedWords.toLocaleString()} words consumed.`);

      } else if (selectedTool === "highlight") {

        if (!selectedAction) {
          setInfo("Please select an action before submitting.");
          return;
        }

        const academicLevel =
          localStorage.getItem("academicLevel") || "Graduate";
        const selectedText = await getSelectedText();
        const selectedWords = Math.max(1, estimateWords(selectedText || ""));
        const access = checkUsageAccess(user.id, "writing_assist", selectedWords);
        if (!access.allowed) {
          setError(access.message || "Usage limit reached.");
          return;
        }

        const actionInstruction = {
          "Rephrase": "Rephrase the text to improve clarity and flow.",
          "Shorten": "Condense the text while keeping the main idea intact.",
          "Elaborate": "Expand on the text with additional detail or examples.",
          "More formal": "Rewrite the text in a more formal academic tone.",
          "More casual": "Rewrite the text in a more casual and accessible tone.",
          "Bulletize": "Convert the text into clear, concise bullet points."
        }[selectedAction] || "Rephrase the text for clarity.";

        const aiPrompt = `
            You are an advanced academic writing assistant specialized in rewriting and tone adjustment.

            Your role:
             - You will receive a short passage of text selected by a user.
             - You must rewrite or refine it according to the specific action provided.
             - Maintain the original meaning while improving clarity, flow, and academic quality.
             - Adjust tone and phrasing based on the requested action type.
             - Ensure the result reads naturally at the academic level: "${academicLevel}".

            Action Type: "${selectedAction}"
            Action Instruction: "${actionInstruction}"

            Selected Text:
              "${selectedText}"

            Guidelines:
             1. Do NOT add explanations, metadata, or commentary.
             2. Do NOT summarize, expand excessively, or shorten unless explicitly instructed.
             3. Preserve the factual content and intent of the original text.
             4. Keep the rewrite concise and grammatically polished.
             5. Output ONLY the rewritten text — no prefixes, quotes, or extra formatting.

            Now, rewrite the text accordingly and return only the final improved version.`;

        const result = await runDocumentWriting(aiPrompt);
        if (!consumeWritingUsage("writing_highlight", selectedWords)) {
          return;
        }

        insertText(result);
        handleClose();
        setSuccess(`Text rewritten successfully. ${selectedWords.toLocaleString()} words consumed.`);
      }
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      setError("Unexpected error while submitting your request.");
    } finally {
      setLoading(false);
    }
  };

  const editSuggestionsPrecheck = async () => {
    setLoading(true);
    await addTrackingModeForEveryOne();
    try {
      if (!user?.id) {
        setError("Login / Sign up is required before using this feature.");
        return;
      }

      const academicLevel =
        localStorage.getItem("academicLevel") || "Graduate";

      const documentText = await getDocumentText();
      if (!documentText) {
        setInfo("Your document is empty. Please add content to get edit suggestions.");
        return;
      }
      const requestedWords = Math.max(1, estimateWords(documentText));
      const access = checkUsageAccess(user.id, "writing_assist", requestedWords);
      if (!access.allowed) {
        setError(access.message || "Usage limit reached.");
        return;
      }

      const prompt = `
            You are an expert academic writing assistant helping improve the clarity and style of a research document.

            Your task:
            - Read the document text below.
            - Identify short phrases or sentences (max 120 characters each) that can be improved for grammar, clarity, or academic tone.
            - For each, suggest one concise and refined rewrite.

            Strict Rules:
            1. DO NOT rewrite or modify the original document text in any way.
            2. ONLY analyze and suggest improvements separately.
            3. Each "original_text" must be copied EXACTLY as it appears in the document (no paraphrasing or formatting changes).
            4. Each "suggested_text" must preserve the original meaning, be ≤120 characters, and sound more polished or academic.
            5. Never include commentary, explanations, or text outside of the JSON.
            6. The tone and sophistication of suggestions must match the academic level: "${academicLevel}".
    
            Document text:
            ${documentText}

            Return ONLY valid JSON in this exact format:
             [
              {
                "original_text": "<exact phrase from document, ≤120 characters>",
                "suggested_text": "<academically improved rewrite of the phrase>"
              }
             ]`;

      const result = await runDocumentWriting(prompt);
      const edits = parseEditSuggestions(result);
      if (edits.length > 0) {
        await replaceInWordDocument(edits);
        if (!consumeWritingUsage("writing_edit_suggestions", requestedWords)) {
          return;
        }

        setSuccess(`Edit suggestions applied successfully. ${requestedWords.toLocaleString()} words consumed.`);
      } else {
        setError("No valid edits found in AI response.");
      }
    } catch (suggestionError) {
      console.log("editSuggestionsPrecheck Error:", suggestionError);
      setError("Unable to generate edit suggestions right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* AppBar */}
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
            sx={{ width: 32, height: 32, backgroundColor: "transparent" }}
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
          >Rubrix</Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />

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
            "&:hover": {
              backgroundColor: "rgba(0,0,0,0.05)",
              transform: "translateY(-1px)",
            },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>

      {/* Page Content */}
      <Box sx={{ p: { xs: 4, marginTop: "32px" } }}>
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
          AI Writing Assistant
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
          Create, enhance, and refine academic writing with intelligent
          AI-powered tools for content generation, editing, and rewriting.
        </Typography>

        {/* Buttons */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Button
            fullWidth
            onClick={() => handleOpen("prompt")}
            sx={{
              maxWidth: 650,
              height: 64,
              background:
                "linear-gradient(135deg,#1e3a8a 0%, #2563eb 40%, #3b82f6 100%)",
              color: "white",
              fontWeight: 600,
              fontSize: 17,
              textTransform: "none",
              borderRadius: "12px",
              boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
              display: "flex",
              justifyContent: "flex-start",
              pl: 3,
              "&:hover": {
                transform: "scale(1.03)",
                transition: "all 0.25s ease",
                boxShadow: "0 8px 22px rgba(0,0,0,0.35)",
              },
            }}
          >
            <PsychologyIcon sx={{ mr: 2.5, color: "#bfdbfe", fontSize: 26 }} />
            <Box textAlign="left">
              <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
                AI Prompt Box
              </Typography>
              <Typography sx={{ fontSize: 12, opacity: 0.9 }}>
                Popup for custom text generation
              </Typography>
            </Box>
          </Button>

          <Button
            fullWidth
            onClick={() => handleOpen("edit")}
            sx={{
              maxWidth: 650,
              height: 64,
              background:
                "linear-gradient(135deg,#312e81 0%, #7c3aed 50%, #a78bfa 100%)",
              color: "white",
              fontWeight: 600,
              fontSize: 17,
              textTransform: "none",
              borderRadius: "12px",
              boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
              display: "flex",
              justifyContent: "flex-start",
              pl: 3,
              "&:hover": {
                transform: "scale(1.03)",
                transition: "all 0.25s ease",
                boxShadow: "0 8px 22px rgba(0,0,0,0.35)",
              },
            }}
          >
            <AutoFixHighIcon sx={{ mr: 2.5, color: "#ddd6fe", fontSize: 26 }} />
            <Box textAlign="left">
              <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
                Edit Suggestions
              </Typography>
              <Typography sx={{ fontSize: 12, opacity: 0.9 }}>
                AI reviews and recommends edits
              </Typography>
            </Box>
          </Button>

          <Button
            fullWidth
            onClick={() => handleOpen("highlight")}
            sx={{
              maxWidth: 650,
              height: 64,
              background:
                "linear-gradient(135deg,#064e3b 0%, #10b981 60%, #34d399 100%)",
              color: "white",
              fontWeight: 600,
              fontSize: 17,
              textTransform: "none",
              borderRadius: "12px",
              boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
              display: "flex",
              justifyContent: "flex-start",
              pl: 3,
              "&:hover": {
                transform: "scale(1.03)",
                transition: "all 0.25s ease",
                boxShadow: "0 8px 22px rgba(0,0,0,0.35)",
              },
            }}
          >
            <TipsAndUpdatesIcon sx={{ mr: 2.5, color: "#bbf7d0", fontSize: 26 }} />
            <Box textAlign="left">
              <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
                Highlight Actions
              </Typography>
              <Typography sx={{ fontSize: 12, opacity: 0.9 }}>
                Context-based rewrite options
              </Typography>
            </Box>
          </Button>
        </Box>

        <Modal open={open} onClose={handleClose}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "90%",
              maxWidth: 250,
              bgcolor: "background.paper",
              borderRadius: 3,
              boxShadow: 24,
              p: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                mb: 2,
                color: "#1e293b",
                textAlign: "center",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {selectedTool === "prompt"
                ? "AI Prompt Box"
                : "Highlight Actions"}
            </Typography>

            {/* Prompt Input Box */}
            {selectedTool === "prompt" && (
              <TextField
                label="Enter your prompt"
                placeholder="e.g. Write a 150-word introduction on renewable energy..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                fullWidth
                multiline
                minRows={4}
                sx={{
                  mb: 2,
                  "& .MuiInputBase-root": {
                    alignItems: "flex-start", // keep text at top
                  },
                  "& .MuiInputBase-input": {
                    maxHeight: 150,
                    overflowY: "auto",
                  },
                }}
              />

            )}

            {/* Highlight Options */}
            {selectedTool === "highlight" && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, fontWeight: 600, color: "#475569" }}
                >
                  Choose a rewrite option:
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: 1,
                  }}
                >
                  {[
                    "Rephrase",
                    "Shorten",
                    "Elaborate",
                    "More formal",
                    "More casual",
                    "Bulletize",
                  ].map((opt) => (
                    <Button
                      key={opt}
                      variant={selectedAction === opt ? "contained" : "outlined"}
                      sx={{
                        textTransform: "none",
                        fontSize: 13,
                        borderRadius: 2,
                        fontWeight: 500,
                        color: selectedAction === opt ? "#fff" : "#2563eb",
                        // backgroundColor: selectedAction === opt ? "#2563eb" : "transparent",
                        borderColor: "#2563eb",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          backgroundColor:
                            selectedAction === opt ? "#1d4ed8" : "#eff6ff",
                          borderColor: "#1d4ed8",
                        },
                      }}
                      onClick={() => setSelectedAction(opt)}
                    >
                      {opt}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}

            {/* Action Buttons */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                mt: 2,
              }}
            >
              <Button
                onClick={handleSubmit}
                sx={{
                  textTransform: "none",
                  color: "#64748b",
                }}
              >
                Submit
              </Button>
              <Button
                onClick={handleClose}
                sx={{
                  textTransform: "none",
                  color: "#64748b",
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </Modal>

        {/* Display error message */}
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
