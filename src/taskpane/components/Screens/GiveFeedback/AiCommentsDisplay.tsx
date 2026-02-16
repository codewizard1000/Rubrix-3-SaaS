import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Divider,
  Tooltip,
  IconButton,
  TextField,
  CircularProgress,
} from "@mui/material";
import CommentIcon from "@mui/icons-material/Comment";
import ReplayIcon from "@mui/icons-material/Replay";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { searchDocument } from "../../../Utils/SearchTextToAddComment";
import { redoAIComment } from "../../../Services/redoComment";

export default function AiCommentsDisplay({ comments = [], onAllCommentsCleared }) {
  const [localComments, setLocalComments] = useState(comments);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [redoingIndex, setRedoingIndex] = useState(null); // ✅ Added this state

  useEffect(() => {
    if (localComments.length === 0) {
      onAllCommentsCleared?.(); // trigger parent reset
    }
  }, [localComments, onAllCommentsCleared]);

  const handleDelete = (index) => {
    const updated = localComments.filter((_, i) => i !== index);
    setLocalComments(updated);
    // onAction?.("delete", index);
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditedText(localComments[index].comment);
  };

  const handleSaveEdit = (index) => {
    const updated = [...localComments];
    updated[index].comment = editedText;
    setLocalComments(updated);
    setEditingIndex(null);
    setEditedText("");
    // onAction?.("rewrite", updated[index]);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedText("");
  };

  const handleAccept = async (index, item) => {
    try {
      await searchDocument(item.textSnippet, item.comment);

      const updated = localComments.filter((_, i) => i !== index);
      setLocalComments(updated);

      // onAction?.("accept", item);
    } catch (err) {
      console.error("Error inserting comment:", err);
    }
  };

  const handleRedo = async (index, item) => {
    const level = localStorage.getItem("academicLevel") || "High School";

    try {
      setRedoingIndex(index); // show spinner for this item

      const originalComment = item.comment;

      const updated = [...localComments];
      updated[index].comment = "(Regenerating improved feedback...)";
      setLocalComments(updated);

      // ✅ use original comment when sending to AI
      await redoAIComment(item.textSnippet, originalComment, level, (result, error) => {
        setRedoingIndex(null); // stop loader
        if (error) {
          updated[index].comment = "Error regenerating comment.";
          setLocalComments(updated);
        } else {
          updated[index].comment = result.comment;
          setLocalComments(updated);
          // onAction?.("redo", result);
        }
      });
    } catch (err) {
      console.error("Error in redo handler:", err);
      setRedoingIndex(null);
    }
  };

  if (!localComments.length) {
    return (
      <Typography
        variant="body2"
        sx={{ textAlign: "center", color: "#64748b", mt: 4 }}
      >
        No comments yet. Run AI feedback to see results.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%",
        maxWidth: 700,
        mx: "auto",
      }}
    >
      <Typography
        variant="h5"
        fontWeight={700}
        sx={{
          color: "#0f172a",
          mb: "-5px",
          textAlign: "center",
          fontFamily: "Poppins, sans-serif",
          fontSize: { xs: "1.25rem", sm: "1.4rem" },
        }}
      >
        AI Comments Review
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: "#475569",
          textAlign: "center",
          mb: 2,
          lineHeight: 1.6,
          fontSize: { xs: "0.8rem", sm: "0.9rem" },
        }}
        textAlign="center"
      >
        Review and refine AI-generated feedback — accept, edit, or regenerate comments for the best writing insights.
      </Typography>
      {localComments.map((item, index) => (
        <Paper
          key={index}
          elevation={4}
          sx={{
            p: 2,
            borderRadius: 3,
            backgroundColor: "rgba(255,255,255,0.9)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            transition: "all 0.25s ease",
            "&:hover": { transform: "translateY(-2px)" },
          }}
        >
          {/* 🔹 Student Snippet */}
          <Typography
            sx={{
              fontStyle: "italic",
              fontSize: "0.8rem",
              mb: 1,
              background: "#f8fafc",
              p: 1,
              borderRadius: 1,
              fontFamily: "Poppins, sans-serif",
              color: "#475569",
            }}
          >
            {item.textSnippet}
          </Typography>

          {/* 🔹 AI Comment Text */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <CommentIcon sx={{ color: "#2563eb", fontSize: 18, mt: "2px" }} />
            {editingIndex === index ? (
              <TextField
                fullWidth
                multiline
                minRows={2}
                size="small"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
              />
            ) : (
              <Typography
                variant="body2"
                sx={{
                  color: "#334155",
                  fontSize: "0.85rem",
                  lineHeight: 1.5,
                }}
              >
                {item.comment}
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 1.2 }} />

          {/* 🔹 Actions */}
          <Stack
            direction="row"
            spacing={0.5}
            justifyContent="flex-end"
            alignItems="center"
          >
            {editingIndex === index ? (
              <>
                <Tooltip title="Save changes" arrow>
                  <IconButton
                    size="small"
                    onClick={() => handleSaveEdit(index)}
                    sx={{ color: "#16a34a" }}
                  >
                    <SaveIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Cancel edit" arrow>
                  <IconButton
                    size="small"
                    onClick={handleCancelEdit}
                    sx={{ color: "#dc2626" }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip title="Accept comment" arrow>
                  <IconButton
                    size="small"
                    onClick={() => handleAccept(index, item)}
                    sx={{ color: "#16a34a" }}
                  >
                    <CheckCircleIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Have AI redo comment" arrow>
                  <IconButton
                    size="small"
                    onClick={() => handleRedo(index, item)}
                    sx={{ color: "#2563eb" }}
                  >
                    {redoingIndex === index ? (
                      <CircularProgress size={16} sx={{ color: "#2563eb" }} />
                    ) : (
                      <ReplayIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Manually edit comment" arrow>
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(index)}
                    sx={{ color: "#9333ea" }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete comment" arrow>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(index)}
                    sx={{ color: "#dc2626" }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        </Paper>
      ))}
    </Box>
  );
}
