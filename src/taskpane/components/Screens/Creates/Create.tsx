import React, { useState } from "react";
import { Box, Typography, Button, TextField, MenuItem, Modal, Paper, IconButton, Tooltip, AppBar, Toolbar, Avatar } from "@mui/material";
import QuizIcon from "@mui/icons-material/Quiz";
import AssessmentIcon from "@mui/icons-material/Assessment";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SchoolIcon from "@mui/icons-material/School";
import BookIcon from "@mui/icons-material/Book";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import EmojiObjectsIcon from "@mui/icons-material/EmojiObjects";
import PsychologyIcon from "@mui/icons-material/Psychology";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { createOptionsAi } from "../../../Services/createOptions";
import Loader from "../../loader/Loader";
import { convertQuizToHTML, convertRubricToHtml, generateDOKQuestionsHTML, generateExemplarHTML, generateLessonPlanHTML, generateProgressReportHTML, generateResourceHTML, generateSyllabusHTML, insertCreatOptionHTML, insertText } from "../../../Utils/documentUtils";
import Toast from "../../Toast/ToastMessage";

const cardStyle = {
  p: 1.8,
  borderRadius: 3,
  cursor: "pointer",
  transition: "0.3s",
  width: "100%",
  maxWidth: 320,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  "&:hover": {
    transform: "scale(1.03)",
    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
  },
  background: "linear-gradient(135deg, #0f172a, #2563eb)",
  color: "white",
};

const formConfig = {
  "Quiz": [
    { name: "subject", label: "Subject", type: "text" },
    { name: "topic", label: "Topic", type: "text" },
    { name: "numQuestions", label: "Number of Questions", type: "number", defaultValue: 5 },
    { name: "difficulty", label: "Difficulty", type: "select", options: ["Easy", "Medium", "Hard"], defaultValue: "Medium" },
  ],
  "Rubric": [
    { name: "criteria", label: "Number of Criteria", type: "number", defaultValue: 4 },
    { name: "performanceLevels", label: "Performance Levels", type: "text", placeholder: "Excellent, Good, Fair, Poor" },
  ],
  "Lesson Plan": [
    { name: "topic", label: "Lesson Topic", type: "text" },
    { name: "duration", label: "Duration (minutes)", type: "number", defaultValue: 45 },
    { name: "objective", label: "Learning Objective", type: "text" },
  ],
  "Syllabus": [
    { name: "subject", label: "Course Subject", type: "text" },
    { name: "weeks", label: "Duration (weeks)", type: "number", defaultValue: 12 },
    { name: "gradingPolicy", label: "Grading Policy", type: "text" },
  ],
  "Progress Report": [
    { name: "student", label: "Student Name", type: "text" },
    { name: "subject", label: "Subject", type: "text" },
    { name: "comments", label: "Comments", type: "text", placeholder: "Strengths and areas for improvement..." },
  ],
  "Resource": [
    { name: "topic", label: "Topic", type: "text" },
    { name: "format", label: "Resource Type", type: "select", options: ["Worksheet", "Study Guide", "Notes"] },
  ],
  "Exemplar": [
    { name: "topic", label: "Topic", type: "text" },
    { name: "writingType", label: "Writing Type", type: "select", options: ["Essay", "Report", "Answer Sheet"] },
  ],
  "DOK Questions": [
    { name: "subject", label: "Subject", type: "text" },
    { name: "dokLevel", label: "DOK Level", type: "select", options: ["Level 1", "Level 2", "Level 3", "Level 4"] },
  ],
};

const promptTemplates = {
  "Quiz": ({ subject, topic, numQuestions, difficulty, level }) =>
    `You are an expert ${subject} teacher. Create a ${difficulty} quiz for ${level} students on "${topic}". 
Include exactly ${numQuestions} questions with four options each and mark the correct answer. 
 DO NOT include markdown, explanations, or any text outside JSON.
Return the result strictly in JSON:
{
  "title": "string",
  "questions": [
    { "question": "string", "options": ["string"], "answer": "string" }
  ]
}`,

  "Rubric": ({ criteria, performanceLevels, level }) =>
    `Create a grading rubric for ${level} students. 
It should include ${criteria} criteria and these performance levels: ${performanceLevels}. 
DO NOT include markdown, explanations, or any text outside JSON.
Return strictly in JSON:
{
  "criteria": [
    {
      "name": "string",
      "levels": [
        { "level": "string", "descriptor": "string", "points": "number" }
      ]
    }
  ]
}`,
  "Lesson Plan": ({ topic, duration, objective, level }) =>
    `Create a detailed lesson plan for ${level} students on "${topic}". 
The lesson duration is ${duration} minutes. The objective is "${objective}". 
Include steps, materials, and assessments. 
DO NOT include markdown, explanations, or any text outside JSON.
Return strictly in JSON:
{
  "topic": "string",
  "duration": "number",
  "objective": "string",
  "materials": ["string"],
  "activities": ["string"],
  "assessment": ["string"]
}`,
  "Syllabus": ({ subject, weeks, gradingPolicy, level }) =>
    `Write a ${weeks}-week syllabus for ${level} students studying ${subject}. 
Include overview, weekly breakdown, learning objectives, and grading policy (${gradingPolicy}). 
DO NOT include markdown, explanations, or any text outside JSON.
Return strictly in JSON:
{
  "subject": "string",
  "weeks": "number",
  "overview": "string",
  "weeklyPlan": [{ "week": "number", "topic": "string" }],
  "gradingPolicy": "string"
}`,
  "Progress Report": ({ student, subject, comments, level }) =>
    `Generate a progress report for ${student}, a ${level} student in ${subject}. 
Use the given comment hint: "${comments}". 
DO NOT include markdown, explanations, or any text outside JSON.
Return strictly in JSON:
{
  "student": "string",
  "subject": "string",
  "strengths": ["string"],
  "areasForImprovement": ["string"],
  "summary": "string"
}`,
  "Resource": ({ topic, format, level }) =>
    `Create a ${format.toLowerCase()} resource for ${level} students on "${topic}". 
Ensure it’s educational, easy to understand, and engaging. 
DO NOT include markdown, explanations, or any text outside JSON.
Return strictly in JSON:
{
  "title": "string",
  "topic": "string",
  "type": "string",
  "content": ["string"]
}`,
  "Exemplar": ({ topic, writingType, level }) =>
    `Provide an exemplar ${writingType.toLowerCase()} on the topic "${topic}" for ${level} students. 
Include an introduction, body, and conclusion. 
DO NOT include markdown, explanations, or any text outside JSON.
Return strictly in JSON:
{
  "title": "string",
  "introduction": "string",
  "body": ["string"],
  "conclusion": "string"
}`,
  "DOK Questions": ({ subject, dokLevel, level }) =>
    `Generate Depth of Knowledge (${dokLevel}) questions for ${subject} suitable for ${level} students. 
  DO NOT include markdown, explanations, or any text outside JSON.
Return strictly in JSON:
{
  "questions": [{ "question": "string", "dokLevel": "string" }]
}`,
};

export default function CreateSection() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [formValues, setFormValues] = useState({});
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [info, setInfo] = useState(null);

  const handleSelect = (title) => {
    setSelected({ title });
    setFormValues({});
    setOpen(true);
  };

  const handleInputChange = (name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  function Backbutton() {
    navigate("/");
  }

  const handleGenerate = async () => {
    setOpen(false);
    setLoading(true);

    const level = localStorage.getItem("academicLevel") || "High School";
    const templateFn = promptTemplates[selected?.title];
    const finalPrompt = templateFn
      ? templateFn({ ...formValues, level }) + (instructions ? ` Additional instructions: ${instructions}` : "")
      : "Generate relevant content.";

    try {
      await createOptionsAi(finalPrompt, async (res, err) => {
        if (res) {
          if (selected?.title === "Quiz") {
            const htmlQuiz = convertQuizToHTML(res);
            await insertCreatOptionHTML(htmlQuiz);
          } else if (selected?.title === "Rubric") {
            const HtmlRubric = convertRubricToHtml(res);
            await insertCreatOptionHTML(HtmlRubric);
          } else if (selected?.title === "Syllabus") {
            const SyllabusHTML = generateSyllabusHTML(res);
            await insertCreatOptionHTML(SyllabusHTML);
          } else if (selected?.title === "Lesson Plan") {
            const LessonPlanHTML = generateLessonPlanHTML(res)
            await insertCreatOptionHTML(LessonPlanHTML);
          } else if (selected?.title === "Progress Report") {
            const ProgressReportHTML = generateProgressReportHTML(res)
            await insertCreatOptionHTML(ProgressReportHTML);
          } else if (selected?.title === "Resource") {
            const resourceHTML = generateResourceHTML(res);
            await insertCreatOptionHTML(resourceHTML);
          } else if (selected?.title === "DOK Questions") {
            const DOKQuestionsHTML = generateDOKQuestionsHTML(res);
            await insertCreatOptionHTML(DOKQuestionsHTML);
          }
        }
        if (err) console.log("OpenAI Error:", err);
      });
    } catch (error) {
      console.error("handleGenerate Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const cardData = [
    { title: "Quiz", desc: "Generate quiz questions", icon: <QuizIcon /> },
    { title: "Rubric", desc: "Create grading criteria", icon: <AssessmentIcon /> },
    { title: "Syllabus", desc: "Generate course outline", icon: <MenuBookIcon /> },
    { title: "Progress Report", desc: "Create student progress", icon: <SchoolIcon /> },
    { title: "Resource", desc: "Helpful learning materials", icon: <BookIcon /> },
    { title: "Exemplar", desc: "Model answers or samples", icon: <AutoStoriesIcon /> },
    { title: "Lesson Plan", desc: "Lesson objectives & flow", icon: <EmojiObjectsIcon /> },
    { title: "DOK Questions", desc: "Depth of Knowledge level", icon: <PsychologyIcon /> },
  ];

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
          >Rubrix</Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />

      <Box sx={{ p: 3, }}>
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
          Create Content

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
          Empower your teaching with AI — generate quizzes, lesson plans, rubrics, and resources effortlessly.

        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
          {cardData.map((item) => (
            <Paper key={item.title} sx={cardStyle} onClick={() => handleSelect(item.title)}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box sx={{ fontSize: 25 }}>{item.icon}</Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.1 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 12, opacity: 0.9, lineHeight: 1 }}>
                    {item.desc}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>

        {/* Dynamic Modal */}
        {/* <Box p={4}> */}
        <Modal open={open} onClose={() => setOpen(false)}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              bgcolor: "background.paper",
              p: 4,
              borderRadius: 3,
              boxShadow: 24,
              width: 200,
              maxWidth: "80%",
            }}
          >
            <Typography variant="h6" mb={2}>
              {selected?.title} Options
            </Typography>

            {/* Dynamic Fields */}
            {formConfig[selected?.title]?.map((field) => (
              <TextField
                key={field.name}
                fullWidth
                size="small"
                label={field.label}
                type={field.type === "number" ? "number" : "text"}
                select={field.type === "select"}
                defaultValue={field.defaultValue || ""}
                placeholder={field.placeholder || ""}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                sx={{ mb: 2 }}
              >
                {field.options?.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
            ))}

            <TextField
              fullWidth
              size="small"
              label="Additional Instructions (Optional)"
              multiline
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Button
              variant="contained"
              fullWidth
              size="small"
              sx={{
                textTransform: "capitalize",
                borderRadius: 2,
                py: 1,
                bgcolor: "#2563eb",
                "&:hover": { bgcolor: "#1d4ed8" },
              }}
              onClick={handleGenerate}
            >
              Generate {selected?.title}
            </Button>
          </Box>
        </Modal>
        {/* </Box> */}
        {loading && <Loader />}

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
      </Box>
    </>
  );
}