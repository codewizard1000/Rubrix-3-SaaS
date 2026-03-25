import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Divider,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import SchoolIcon from "@mui/icons-material/School";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import {
  getDocumentText,
  insertGradeAtTop,
  extractTextFromDocx,
} from "../../../Utils/documentUtils";
import {
  analyzeRubricFile,
  analyzeRubricText,
  gradeDocumentAI,
  GradedExample,
  GradeGenerationOptions,
  GradingToughness,
  FeedbackTone,
  FeedbackPerson,
} from "../../../Services/gradeAi";
import Loader from "../../loader/Loader";
import Toast from "../../Toast/ToastMessage";
import { checkUsageAccess, consumeUsage, estimateWords } from "../../../Services/billing";

interface ExampleFile {
  file: File;
  id: number;
  name: string;
  status: "extracting" | "ready" | "error";
}

interface SavedRubric {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

const RUBRIC_STORAGE_KEY = "rubrix3saas.saved-rubrics";

const TOUGHNESS_OPTIONS: GradingToughness[] = [
  "5-Very Hard",
  "4-Hard",
  "3-Medium",
  "2-Easy",
  "1-Very Easy",
];

const TONE_OPTIONS: FeedbackTone[] = ["Formal", "Professional and Friendly", "Friendly"];
const PERSON_OPTIONS: FeedbackPerson[] = ["First", "Second", "Third"];

const loadSavedRubrics = (): SavedRubric[] => {
  try {
    const raw = localStorage.getItem(RUBRIC_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load saved rubrics", error);
    return [];
  }
};

const persistSavedRubrics = (rubrics: SavedRubric[]) => {
  localStorage.setItem(RUBRIC_STORAGE_KEY, JSON.stringify(rubrics));
};

const mergeRubricCriteria = (savedRubricContent: string, manualCriteria: string): string => {
  const parts = [savedRubricContent.trim(), manualCriteria.trim()].filter(Boolean);
  const uniqueParts = Array.from(new Set(parts));
  return uniqueParts.join("\n\n");
};

interface GradeDocumentProps {
  onBack: () => void;
  userId: string;
}

export default function GradeDocumentUI({ onBack, userId }: GradeDocumentProps) {
  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [rubricText, setRubricText] = useState<string | null>(null);
  const [manualCriteria, setManualCriteria] = useState("");
  const [exampleFiles, setExampleFiles] = useState<ExampleFile[]>([]);
  const [extractedExamples, setExtractedExamples] = useState<GradedExample[]>([]);
  const [savedRubrics, setSavedRubrics] = useState<SavedRubric[]>([]);
  const [selectedSavedRubricId, setSelectedSavedRubricId] = useState("");
  const [newRubricName, setNewRubricName] = useState("");
  const [gradingToughness, setGradingToughness] = useState<GradingToughness>("3-Medium");
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("Professional and Friendly");
  const [person, setPerson] = useState<FeedbackPerson>("Second");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setSavedRubrics(loadSavedRubrics());
  }, []);

  const selectedSavedRubric = useMemo(
    () => savedRubrics.find((rubric) => rubric.id === selectedSavedRubricId) || null,
    [savedRubrics, selectedSavedRubricId]
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) {
      return;
    }

    const file = e.target.files[0];
    setRubricFile(file);

    if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
      try {
        setLoading(true);
        const extractedText = await extractTextFromDocx(file);
        setRubricText(extractedText);
      } catch (uploadError) {
        console.error("Failed to extract rubric text", uploadError);
        setError("Failed to extract text from uploaded rubric file.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setRubricText(null);
  };

  const handleExampleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const files = Array.from(e.target.files);

    const pending: ExampleFile[] = files.map((file) => ({
      file,
      id: Date.now() + Math.random(),
      name: file.name,
      status: "extracting",
    }));

    setExampleFiles((previous) => [...previous, ...pending]);

    for (const pendingFile of pending) {
      try {
        const content = await extractTextFromDocx(pendingFile.file);
        setExampleFiles((previous) =>
          previous.map((item) => (item.id === pendingFile.id ? { ...item, status: "ready" } : item))
        );
        setExtractedExamples((previous) => [
          ...previous,
          {
            fileName: pendingFile.name,
            content,
          },
        ]);
      } catch (exampleError) {
        console.error("Failed to extract example file", exampleError);
        setExampleFiles((previous) =>
          previous.map((item) => (item.id === pendingFile.id ? { ...item, status: "error" } : item))
        );
        setError(`Failed to extract text from ${pendingFile.name}`);
      }
    }
  };

  const removeExample = (id: number) => {
    const fileToRemove = exampleFiles.find((file) => file.id === id);
    if (!fileToRemove) {
      return;
    }

    setExampleFiles((previous) => previous.filter((file) => file.id !== id));
    setExtractedExamples((previous) => previous.filter((item) => item.fileName !== fileToRemove.name));
  };

  const handleSaveRubric = async () => {
    let rubricContent = manualCriteria.trim() || rubricText?.trim() || "";

    // If a file is uploaded but text extraction hasn't populated yet,
    // derive a summary directly from the uploaded file so saving still works.
    if (!rubricContent && rubricFile) {
      try {
        const summary = await getRubricSummary();
        rubricContent = summary?.trim() || "";
      } catch (error) {
        console.error("Failed to summarize uploaded rubric during save", error);
      }

      if (!rubricContent) {
        rubricContent = `Uploaded rubric file: ${rubricFile.name}`;
      }
    }

    if (!rubricContent) {
      setInfo("Add grading standards text or upload a rubric file before saving.");
      return;
    }

    const resolvedName = newRubricName.trim() || `Rubric ${savedRubrics.length + 1}`;

    const saved: SavedRubric = {
      id: `${Date.now()}`,
      name: resolvedName,
      content: rubricContent,
      createdAt: new Date().toISOString(),
    };

    const next = [saved, ...savedRubrics];
    setSavedRubrics(next);
    persistSavedRubrics(next);
    setSelectedSavedRubricId(saved.id);
    setNewRubricName("");
    setSuccess("Rubric saved for reuse.");
  };

  const getRubricSummary = async (): Promise<string | null> => {
    if (!rubricFile) {
      return null;
    }

    if (rubricText && (rubricFile.name.endsWith(".docx") || rubricFile.name.endsWith(".doc"))) {
      return new Promise((resolve, reject) => {
        analyzeRubricText(rubricText, (rubricSummary, rubricError) => {
          if (rubricError) {
            reject(rubricError);
            return;
          }

          resolve(rubricSummary);
        });
      });
    }

    return new Promise((resolve, reject) => {
      analyzeRubricFile(rubricFile, (rubricSummary, rubricError) => {
        if (rubricError) {
          reject(rubricError);
          return;
        }

        resolve(rubricSummary);
      });
    });
  };

  const gradeDocument = async (
    documentText: string,
    rubricSummary: string | null,
    criteria: string,
    examplesForAI: GradedExample[] | null,
    options: GradeGenerationOptions
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      gradeDocumentAI(documentText, rubricSummary, criteria, examplesForAI, options, (result, gradeError) => {
        if (gradeError) {
          reject(gradeError);
          return;
        }

        resolve(result);
      });
    });
  };

  const handleGrade = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (!userId) {
        setError("Login / Sign up is required before grading.");
        return;
      }

      const documentText = await getDocumentText();
      if (!documentText) {
        setInfo("Document is empty. Please write something first.");
        return;
      }
      const words = estimateWords(documentText);
      const access = checkUsageAccess(userId, "grade_paper", words);
      if (!access.allowed) {
        setError(access.message || "Usage limit reached.");
        return;
      }

      const rubricSummary = await getRubricSummary();

      const combinedCriteria = mergeRubricCriteria(
        selectedSavedRubric?.content || "",
        manualCriteria
      );

      const options: GradeGenerationOptions = {
        gradingToughness,
        feedbackTone,
        person,
        savedRubricName: selectedSavedRubric?.name || null,
      };

      const examplesForAI = extractedExamples.length > 0 ? extractedExamples : null;
      const gradingResult = await gradeDocument(
        documentText,
        rubricSummary,
        combinedCriteria,
        examplesForAI,
        options
      );

      await insertGradeAtTop(gradingResult);
      consumeUsage(userId, "grade_paper", words, {
        source: "grade_document",
      });
      setSuccess(`Document graded successfully. ${words.toLocaleString()} words consumed.`);
      setRubricFile(null);
      setRubricText(null);
    } catch (gradeError) {
      console.error("Grading flow failed", gradeError);
      setError("Unable to grade document. Check rubric input and API configuration.");
    } finally {
      setLoading(false);
    }
  };

  const canGrade = Boolean(rubricFile || manualCriteria.trim() || selectedSavedRubricId);

  return (
    <Box sx={{ p: 2 }}>
      <Tooltip title="Back" arrow>
        <IconButton
          onClick={onBack}
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
        AI Grade Paper
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
      >
        Select a saved rubric or upload one, then configure grading style before generating feedback.
      </Typography>

      <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, mb: 1.5, backgroundColor: "#f8fafc" }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: "0.85rem", mb: 0.7 }}>
          Saved Rubrics
        </Typography>

        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
          <InputLabel id="saved-rubric-label">Select saved rubric</InputLabel>
          <Select
            labelId="saved-rubric-label"
            value={selectedSavedRubricId}
            label="Select saved rubric"
            onChange={(event) => {
              const id = event.target.value;
              setSelectedSavedRubricId(id);

              const selected = savedRubrics.find((rubric) => rubric.id === id);
              if (selected) {
                setManualCriteria(selected.content);
              }
            }}
          >
            <MenuItem value="">None</MenuItem>
            {savedRubrics.map((rubric) => (
              <MenuItem key={rubric.id} value={rubric.id}>
                {rubric.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            label="Save current rubric as"
            value={newRubricName}
            onChange={(event) => setNewRubricName(event.target.value)}
          />
          <Button
            variant="outlined"
            onClick={handleSaveRubric}
            startIcon={<SaveIcon />}
            sx={{ textTransform: "none", whiteSpace: "nowrap" }}
          >
            Save rubric
          </Button>
        </Stack>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          p: 1.2,
          borderRadius: 2,
          backgroundColor: "#f0fdf4",
          mb: 1.5,
          border: "1px solid #86efac",
        }}
      >
        <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: "0.85rem", mb: 0.5, color: "#166534" }}>
          <SchoolIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: "text-bottom" }} />
          Upload Graded Examples (Few-Shot)
        </Typography>
        <Typography variant="caption" sx={{ color: "#15803d", display: "block", mb: 1 }}>
          Upload graded papers so AI can adapt to your grading style.
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button
            component="label"
            startIcon={<UploadFileIcon sx={{ fontSize: 18 }} />}
            sx={{
              color: "#166534",
              fontSize: "0.75rem",
              textTransform: "capitalize",
              py: 0.4,
              backgroundColor: "#dcfce7",
              "&:hover": { backgroundColor: "#bbf7d0" },
            }}
          >
            Upload examples (.docx)
            <input hidden accept=".docx" type="file" multiple onChange={handleExampleUpload} />
          </Button>
        </Box>

        {exampleFiles.length > 0 && (
          <List dense sx={{ mt: 1, mb: 0, py: 0 }}>
            {exampleFiles.map((file) => (
              <ListItem key={file.id} sx={{ py: 0.5, px: 1 }}>
                <ListItemText
                  primary={file.name}
                  secondary={
                    file.status === "extracting"
                      ? "Processing..."
                      : file.status === "error"
                      ? "Error"
                      : "Ready"
                  }
                  primaryTypographyProps={{ fontSize: "0.75rem" }}
                  secondaryTypographyProps={{
                    fontSize: "0.7rem",
                    color:
                      file.status === "error"
                        ? "error"
                        : file.status === "extracting"
                        ? "text.secondary"
                        : "success.main",
                  }}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" size="small" onClick={() => removeExample(file.id)} sx={{ color: "#ef4444" }}>
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, backgroundColor: "#f8fafc", mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: "0.85rem", mb: 0.5 }}>
          Upload Rubric (optional)
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button
            component="label"
            startIcon={<UploadFileIcon sx={{ fontSize: 18 }} />}
            sx={{
              mt: 0.5,
              color: "#2563eb",
              fontSize: "0.75rem",
              textTransform: "capitalize",
              py: 0.4,
            }}
          >
            Upload PDF or DOC
            <input hidden accept=".pdf,.doc,.docx" type="file" onChange={handleFileUpload} />
          </Button>
        </Box>
        {rubricFile && (
          <Typography sx={{ fontSize: "0.75rem", mt: 0.4 }}>Uploaded: {rubricFile.name}</Typography>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, backgroundColor: "#f8fafc", mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: "0.85rem", mb: 0.4 }}>
          Enter Grading Standards
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={3}
          placeholder="e.g. Clarity (25%), Grammar (20%), Argument Strength (30%)..."
          value={manualCriteria}
          onChange={(event) => setManualCriteria(event.target.value)}
          sx={{
            mt: 0.5,
            "& .MuiInputBase-input": { fontSize: "0.8rem" },
          }}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, backgroundColor: "#f8fafc", mb: 1.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <FormControl fullWidth size="small">
            <InputLabel id="toughness-label">Grading Toughness</InputLabel>
            <Select
              labelId="toughness-label"
              label="Grading Toughness"
              value={gradingToughness}
              onChange={(event) => setGradingToughness(event.target.value as GradingToughness)}
            >
              {TOUGHNESS_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="tone-label">Feedback Tone</InputLabel>
            <Select
              labelId="tone-label"
              label="Feedback Tone"
              value={feedbackTone}
              onChange={(event) => setFeedbackTone(event.target.value as FeedbackTone)}
            >
              {TONE_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="person-label">Person</InputLabel>
            <Select
              labelId="person-label"
              label="Person"
              value={person}
              onChange={(event) => setPerson(event.target.value as FeedbackPerson)}
            >
              {PERSON_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Divider sx={{ my: 1.5, fontSize: "0.8rem" }}>Ready</Divider>

      <Button
        fullWidth
        variant="contained"
        disabled={!canGrade}
        sx={{
          mt: 1,
          py: 0.9,
          borderRadius: 2,
          fontSize: "0.8rem",
          background: "linear-gradient(135deg, #7c3aed, #2563eb)",
          textTransform: "capitalize",
        }}
        startIcon={<AutoFixHighIcon sx={{ fontSize: 18 }} />}
        onClick={handleGrade}
      >
        Generate Grade
      </Button>

      {loading && <Loader />}
      {error && <Toast error={error} onClose={() => setError(null)} />}
      {info && <Toast info={info} onClose={() => setInfo(null)} />}
      {success && <Toast success={success} onClose={() => setSuccess(null)} />}
    </Box>
  );
}
