import React, { useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    Divider,
    Stack,
    Tooltip,
    IconButton,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import SchoolIcon from "@mui/icons-material/School";
import DeleteIcon from "@mui/icons-material/Delete";
import { getDocumentText, insertGradeAtTop, extractTextFromDocx } from "../../../Utils/documentUtils";
import Loader from "../../loader/Loader";
import { analyzeRubricFile, gradeDocumentAI, GradedExample } from "../../../Services/gradeAi";
import Toast from "../../Toast/ToastMessage";

interface ExampleFile {
    file: File;
    id: number;
    name: string;
    status: 'extracting' | 'ready' | 'error';
}

export default function GradeDocumentUI({ onBack }) {
    const [rubricFile, setRubricFile] = useState<File | null>(null);
    const [manualCriteria, setManualCriteria] = useState("");
    const [exampleFiles, setExampleFiles] = useState<ExampleFile[]>([]);
    const [extractedExamples, setExtractedExamples] = useState<GradedExample[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setRubricFile(e.target.files[0]);
        }
    };

    const handleExampleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const files = Array.from(e.target.files);

        // Add files to the list
        const newFiles: ExampleFile[] = files.map(file => ({
            file,
            id: Date.now() + Math.random(),
            name: file.name,
            status: 'extracting'
        }));

        setExampleFiles(prev => [...prev, ...newFiles]);

        // Extract text from each file
        for (const fileObj of newFiles) {
            try {
                const content = await extractTextFromDocx(fileObj.file);
                
                // Update file status and add to extracted examples
                setExampleFiles(prev => 
                    prev.map(f => f.id === fileObj.id ? { ...f, status: 'ready' } : f)
                );
                
                setExtractedExamples(prev => [...prev, {
                    fileName: fileObj.name,
                    content: content
                }]);
            } catch (err) {
                console.error("Error extracting text from example:", err);
                setExampleFiles(prev => 
                    prev.map(f => f.id === fileObj.id ? { ...f, status: 'error' } : f)
                );
                setError(`Failed to extract text from ${fileObj.name}`);
            }
        }
    };

    const removeExample = (id: number) => {
        const fileToRemove = exampleFiles.find(f => f.id === id);
        if (fileToRemove) {
            setExampleFiles(prev => prev.filter(f => f.id !== id));
            setExtractedExamples(prev => prev.filter(e => e.fileName !== fileToRemove.name));
        }
    };

    const handleGrade = async () => {
        setLoading(true);
        try {
            const documentText = await getDocumentText();
            if (!documentText) {
                setInfo("Document is empty. Please write something first.");
                setLoading(false);
                return
            }

            // Prepare examples for the AI
            const examplesForAI = extractedExamples.length > 0 ? extractedExamples : null;

            if (rubricFile) {
                analyzeRubricFile(rubricFile, async (rubricSummary, error) => {
                    if (error) {
                        console.error("Rubric Analysis Error:", error);
                        return;
                    }

                    await gradeDocumentAI(documentText, rubricSummary, manualCriteria, examplesForAI, async (result, error) => {

                        if (error) {
                            console.error("Grading Error:", error);
                            return;
                        }

                        await insertGradeAtTop(result);
                        setLoading(false);
                    setRubricFile(null)
                    setSuccess("Document graded successfully.");
                    });
                });

            } else {
                console.log("No rubric file uploaded, using manual criteria only.");
                // No file uploaded, just use manual criteria
                await gradeDocumentAI(documentText, null, manualCriteria, examplesForAI, async (result, error) => {
                    
                    if (error) {
                        console.error("Grading Error:", error);
                        return;
                    }
                    await insertGradeAtTop(result);
                    setLoading(false);
                    setRubricFile(null)
                    setSuccess("Document graded successfully.");
                });
            }
        } catch (err) {
            setLoading(false);
            console.error("Error during grading process:", err);
        }
    }

    return (
        <Box
            sx={{
                p: 2,
            }}
        >
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
                AI Grade Document
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
                Upload a grading rubric or type your grading criteria manually. The AI will
                evaluate the document and insert the grade summary at the top.
            </Typography>

            {/* === FEW-SHOT EXAMPLES SECTION === */}
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
                <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    sx={{ fontSize: "0.85rem", mb: 0.5, color: "#166534" }}
                >
                    <SchoolIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: "text-bottom" }} />
                    Upload Graded Examples (Few-Shot)
                </Typography>
                <Typography
                    variant="caption"
                    sx={{ color: "#15803d", display: "block", mb: 1 }}
                >
                    Upload previously graded papers for this assignment. The AI will learn your grading style.
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
                        Upload Examples (.docx)
                        <input
                            hidden
                            accept=".docx"
                            type="file"
                            multiple
                            onChange={handleExampleUpload}
                        />
                    </Button>
                </Box>
                
                {/* List of uploaded examples */}
                {exampleFiles.length > 0 && (
                    <List dense sx={{ mt: 1, mb: 0, py: 0 }}>
                        {exampleFiles.map((file) => (
                            <ListItem key={file.id} sx={{ py: 0.5, px: 1 }}>
                                <ListItemText
                                    primary={file.name}
                                    secondary={file.status === 'extracting' ? 'Processing...' : file.status === 'error' ? 'Error' : 'Ready'}
                                    primaryTypographyProps={{ fontSize: "0.75rem" }}
                                    secondaryTypographyProps={{ 
                                        fontSize: "0.7rem",
                                        color: file.status === 'error' ? 'error' : file.status === 'extracting' ? 'text.secondary' : 'success.main'
                                    }}
                                />
                                <ListItemSecondaryAction>
                                    <IconButton
                                        edge="end"
                                        size="small"
                                        onClick={() => removeExample(file.id)}
                                        sx={{ color: "#ef4444" }}
                                    >
                                        <DeleteIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>

            <Paper
                variant="outlined"
                sx={{
                    p: 1.2,
                    borderRadius: 2,
                    backgroundColor: "#f8fafc",
                    mb: 1.5,
                }}
            >
                <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    sx={{ fontSize: "0.85rem", mb: 0.5 }}
                >
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
                        Upload PDF
                        <input
                            hidden
                            accept=".pdf"
                            type="file"
                            onChange={handleFileUpload}
                        />
                    </Button>
                </Box>
                {rubricFile && (
                    <Typography sx={{ fontSize: "0.75rem", mt: 0.4 }}>
                        Uploaded: {rubricFile.name}
                    </Typography>
                )}
            </Paper>

            <Divider sx={{ my: 1.5, fontSize: "0.8rem" }}>OR</Divider>

            {/* === MANUAL CRITERIA === */}
            <Paper
                variant="outlined"
                sx={{
                    p: 1.2,
                    borderRadius: 2,
                    backgroundColor: "#f8fafc",
                }}
            >
                <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    sx={{ fontSize: "0.85rem", mb: 0.4 }}
                >
                    Enter Grading Standards
                </Typography>
                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="e.g. Clarity (25%), Grammar (20%), Argument Strength (30%)..."
                    value={manualCriteria}
                    onChange={(e) => setManualCriteria(e.target.value)}
                    sx={{
                        mt: 0.5,
                        "& .MuiInputBase-input": { fontSize: "0.8rem", },
                    }}
                />
            </Paper>

            {/* === GENERATE BUTTON === */}
            <Button
                fullWidth
                variant="contained"
                disabled={!rubricFile && !manualCriteria}
                sx={{
                    mt: 2,
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
        </Box>
    );
}
