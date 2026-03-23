/* eslint-disable no-undef */
/* eslint-disable prettier/prettier */

/**
 * Extracts text content from a DOCX file
 * Uses the FileReader API to read the file and extract text
 */
export const extractTextFromDocx = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          reject(new Error("Failed to read file"));
          return;
        }

        // Use JSZip to extract document.xml from the DOCX file
        const JSZip = await import("jszip");
        const zip = new JSZip.default();
        const loadedZip = await zip.loadAsync(arrayBuffer);
        
        // Get the main document content
        const docXml = await loadedZip.file("word/document.xml")?.async("text");
        
        if (!docXml) {
          reject(new Error("Could not find document.xml in DOCX file"));
          return;
        }

        // Parse the XML and extract text content
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(docXml, "text/xml");
        
        // Extract all text nodes from w:t elements
        const textNodes = xmlDoc.getElementsByTagName("w:t");
        let extractedText = "";
        
        for (let i = 0; i < textNodes.length; i++) {
          const node = textNodes[i];
          if (node.textContent) {
            extractedText += node.textContent;
          }
          // Add space after each text node to separate words
          extractedText += " ";
        }
        
        // Clean up the text
        const cleanedText = extractedText
          .replace(/\s+/g, " ")
          .replace(/\n\s*\n/g, "\n\n")
          .trim();
        
        resolve(cleanedText);
      } catch (error) {
        console.error("Error extracting text from DOCX:", error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

export const getDocumentText = async (): Promise<string> => {
    return await Word.run(async (context) => {
        const doc = context.document;
        const body = doc.body;

        // Load the content of the document
        body.load("text");

        await context.sync();

        // Get the entire text content of the body
        const documentText = body.text;

        return documentText;
    });
};

export const insertText = async (test: string) => {
    try {
        await Word.run(async (context) => {
            const selection = context.document.getSelection();

            selection.insertText(test, Word.InsertLocation.start);
            await context.sync();
        });
    } catch (error) {
        console.log("insertText.ts, Line No: 15, Error: ", error);
    }
};

export const insertCreatOptionHTML = async (HTML: string) => {
    try {
        await Word.run(async (context) => {
            const selection = context.document.getSelection();

            selection.insertHtml(HTML, Word.InsertLocation.start);
            await context.sync();
        });
    } catch (error) {
        console.log("insertText.ts, Line No: 15, Error: ", error);
    }
};

export const getSelectedText = async () => {
    return new Promise<string | null>((resolve, reject) => {
        Word.run(async (context) => {
            const selection = context.document.getSelection();
            selection.load("text");
            await context.sync();

            const selectedText = selection.text;

            if (selectedText) {
                resolve(selectedText);
            } else {
                resolve(null);
            }
        }).catch((error) => {
            console.error("Error retrieving selected text:", error);
            reject("An error occurred while retrieving the selected text."); // Reject on error
        });
    });
};

export const insertGradeAtTop = async (gradeData) => {
  try {
    if (!gradeData || !gradeData.grade_summary) {
      console.warn("⚠️ No valid grade data found to insert.");
      return;
    }

    const { grade_summary, criteria_feedback } = gradeData;

const summaryHTML = `
  <div style="
    border: 2px solid #4f46e5;
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 20px;
    font-family: 'Segoe UI', sans-serif;
    font-size: 11pt;
  ">
    <h2 style="color:#1e3a8a;margin-top:0;margin-bottom:6px;">AI Grade Summary</h2>
    <p><strong>Overall Grade:</strong> ${grade_summary.overall_grade}</p>
    ${
      grade_summary.total_score
        ? `<p><strong>Score:</strong> ${grade_summary.total_score}</p>`
        : ""
    }
    <p style="margin-bottom:10px;"><strong>Feedback:</strong> ${
      grade_summary.general_feedback
    }</p>

    <hr style="border:none;border-top:1px solid #cbd5e1;margin:12px 0;" />

    <h3 style="color:#4338ca;margin:8px 0;">Criteria Feedback</h3>
    <div style="
      background:#ffffff;
      border:1px solid #cbd5e1;
      border-radius:8px;
      padding:10px 14px;
    ">
      <ul style="margin:0;padding-left:18px;">
        ${criteria_feedback
          .map(
            (c) => `
            <li style="margin-bottom:6px;">
              <strong>${c.criterion}</strong> — 
              <em>${c.grade}</em> (${c.score}): 
              ${c.comment}
            </li>`
          )
          .join("")}
      </ul>
    </div>
  </div>

  <!-- Blank line for spacing -->
  <p style="height:20px;">&nbsp;</p>
`;


    await Word.run(async (context) => {
      const body = context.document.body;
      body.insertHtml(summaryHTML, Word.InsertLocation.start);
      await context.sync();
    });
  } catch (error) {
    console.error("❌ Error inserting grade summary:", error);
  }
};

export const addTrackingModeForEveryOne = async () => {
    await Word.run(async (context) => {
        const document: Word.Document = context.document;
        document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
        await context.sync();
    });
}

export const removeTrackingModeForEveryone = async () => {
    await Word.run(async (context) => {
        const document: Word.Document = context.document;
        document.changeTrackingMode = Word.ChangeTrackingMode.off;
        await context.sync();
    });
}

export function parseEditSuggestions(rawResult) {
  try {
    // Remove markdown artifacts
    const cleanText = rawResult
      .replace(/```(?:json)?/gi, "")
      .replace(/```/g, "")
      .trim();

    const jsonMatch = cleanText.match(/\[([\s\S]*?)\]/);
    if (!jsonMatch) throw new Error("No valid JSON array found in response.");

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate shape
    if (!Array.isArray(parsed))
      throw new Error("Parsed content is not an array.");

    // Filter only valid objects
    return parsed.filter(
      (item) =>
        item.original_text &&
        item.suggested_text &&
        typeof item.original_text === "string" &&
        typeof item.suggested_text === "string"
    );
  } catch (err) {
    console.error("❌ JSON Parse Error:", err);
    return [];
  }
}

export async function replaceInWordDocument(edits) {
  if (!window.Office) {
    console.error("❌ Office.js not available");
    return;
  }

  await Word.run(async (context) => {
    const body = context.document.body;

    for (const { original_text, suggested_text } of edits) {
      try {
        // Create a search query for the original text
        const searchResults = body.search(original_text, {
          matchCase: true,
          matchWholeWord: false,
          matchWildcards: false,
        });

        context.load(searchResults, "text");

        await context.sync();

        if (searchResults.items.length > 0) {
          searchResults.items.forEach((item) => {
            item.insertText(suggested_text, "Replace");
          });
        } else {
          console.warn(`⚠️ Text not found: "${original_text}"`);
        }

        await context.sync();
      } catch (e) {
        console.error(`Error replacing text: ${original_text}`, e);
      }
    }

    console.log("✅ All replacements complete.");
  });
}

// Converts AI quiz JSON into a clean HTML string
export function convertQuizToHTML(quizData) {
  if (!quizData || !quizData.questions) return "<p>No quiz data available.</p>";

  let html = `<h2 style="margin-bottom:10px;">${quizData.title}</h2>`;

  quizData.questions.forEach((q, index) => {
    html += `
      <div style="margin-bottom:20px;">
        <p><strong>Q${index + 1}:</strong> ${q.question}</p>
        <ul style="list-style-type: none; padding-left: 10px;"> 
          ${q.options
            .map(
              (opt) =>
                `<li style="margin-bottom:4px;">${opt}</li>`
            )
            .join("")}
        </ul>
        <p><em><strong>Answer:</strong> ${q.answer}</em></p>
      </div>
    `;
  });

  return html;
}

export function convertRubricToHtml(rubricObj, title = "Grading Rubric") {
  if (!rubricObj || !Array.isArray(rubricObj.criteria)) return "";

  // collect level names from the first criterion (assumes consistent levels across criteria)
  const first = rubricObj.criteria[0];
  const levels = first?.levels?.map((l) => l.level) || [];

  // Build table header
  let html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; max-width: 900px; margin: 12px 0;">
  <h3 style="margin:0 0 8px 0; font-size:16px; color:#0f172a;">${escapeHtml(title)}</h3>
  <table style="width:100%; border-collapse:collapse; border:1px solid #e2e8f0;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="text-align:left; padding:10px; border-right:1px solid #e2e8f0; font-weight:700;">Criterion</th>`;

  // header columns for each level (include points label placeholder)
  for (const lvl of levels) {
    html += `<th style="text-align:left; padding:10px; border-right:1px solid #e2e8f0; font-weight:600;">${escapeHtml(lvl)}</th>`;
  }

  html += `</tr></thead><tbody>`;

  // Build rows for each criterion
  for (const c of rubricObj.criteria) {
    html += `<tr>`;
    html += `<td style="vertical-align:top; padding:10px; border-top:1px solid #e2e8f0; width:30%;"><strong>${escapeHtml(c.name)}</strong></td>`;

    // for each level cell put descriptor and points
    // match order using levels array
    const cellLevels = c.levels || [];
    for (const lvlName of levels) {
      const matched = cellLevels.find((lv) => lv.level === lvlName) || {};
      const descriptor = matched.descriptor ? escapeHtml(matched.descriptor) : "";
      const points = matched.points !== undefined ? escapeHtml(String(matched.points)) : "";
      html += `<td style="vertical-align:top; padding:10px; border-top:1px solid #e2e8f0;">
                 <div style="font-size:13px; color:#0f172a; margin-bottom:6px;">${descriptor}</div>
                 ${points ? `<div style="font-size:12px; color:#475569;"><em>Points: ${points}</em></div>` : ""}
               </td>`;
    }

    html += `</tr>`;
  }

  html += `</tbody></table></div><p></p>`; // <p></p> leaves the extra blank line

  return html;
}

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateSyllabusHTML(data) {
  if (!data) return "<p>No syllabus data available.</p>";

  const { subject, weeks, overview, weeklyPlan = [], learningObjectives = [], gradingPolicy } = data;

  return `
  <div style="font-family: 'Segoe UI', sans-serif; color: #1e293b; line-height: 1.6; padding: 20px;">

    <!-- 🔹 Header -->
    <h1 style="text-align: center; color: #2563eb; font-size: 28px; margin-bottom: 10px;">
      ${subject} – Course Syllabus
    </h1>
    <p style="text-align: center; font-size: 14px; color: #64748b;">
      Duration: ${weeks} weeks
    </p>

    <hr style="border: none; border-top: 2px solid #2563eb; margin: 15px 0;" />

    <!-- 🔹 Overview -->
    <section style="margin-bottom: 25px;">
      <h2 style="color: #0f172a; font-size: 20px; border-left: 5px solid #2563eb; padding-left: 10px;">
        Course Overview
      </h2>
      <p style="margin-top: 8px; font-size: 15px;">
        ${overview}
      </p>
    </section>

    <!-- 🔹 Weekly Plan -->
    <section style="margin-bottom: 25px;">
      <h2 style="color: #0f172a; font-size: 20px; border-left: 5px solid #2563eb; padding-left: 10px;">
        Weekly Plan
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
        <thead>
          <tr style="background-color: #eff6ff; color: #1e3a8a;">
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Week</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Topic</th>
          </tr>
        </thead>
        <tbody>
          ${weeklyPlan
            .map(
              (w) => `
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 8px; width: 80px;">${w.week}</td>
              <td style="border: 1px solid #e2e8f0; padding: 8px;">${w.topic}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </section>

    <!-- 🔹 Learning Objectives -->
    ${
      learningObjectives.length
        ? `<section style="margin-bottom: 25px;">
        <h2 style="color: #0f172a; font-size: 20px; border-left: 5px solid #2563eb; padding-left: 10px;">
          Learning Objectives
        </h2>
        <ul style="margin-top: 8px; font-size: 15px; list-style-type: disc; margin-left: 25px;">
          ${learningObjectives.map((obj) => `<li>${obj}</li>`).join("")}
        </ul>
      </section>`
        : ""
    }

    <!-- 🔹 Grading Policy -->
    ${
      gradingPolicy
        ? `<section style="margin-bottom: 10px;">
        <h2 style="color: #0f172a; font-size: 20px; border-left: 5px solid #2563eb; padding-left: 10px;">
          Grading Policy
        </h2>
        <p style="margin-top: 8px; font-size: 15px;">
          ${gradingPolicy}
        </p>
      </section>`
        : ""
    }

    <hr style="border: none; border-top: 1px solid #cbd5e1; margin-top: 25px;" />
    <p style="text-align: center; font-size: 12px; color: #94a3b8;">
      © Rubrix AI - Auto-Generated Syllabus
    </p>

  </div>
  `;
}

export function generateLessonPlanHTML(data) {
  if (!data) return "<p>No lesson plan data provided.</p>";

  const {
    topic,
    duration,
    objective,
    materials = [],
    activities = [],
    assessment = [],
  } = data;

  return `
  <div style="font-family: 'Segoe UI', sans-serif; color: #1e293b; line-height: 1.6; padding: 20px;">

    <!-- 🔹 Header -->
    <div style="text-align: center; margin-bottom: 25px;">
      <h1 style="color: #2563eb; font-size: 30px; margin-bottom: 5px;">
        Lesson Plan: ${topic}
      </h1>
      <p style="font-size: 14px; color: #64748b;">
        Duration: ${duration} minutes
      </p>
    </div>

    <!-- 🔹 Objective -->
    <section style="margin-bottom: 25px;">
      <h2 style="color: #0f172a; font-size: 20px; border-left: 5px solid #2563eb; padding-left: 10px; margin-bottom: 8px;">
        Objective
      </h2>
      <p style="font-size: 15px;">
        ${objective}
      </p>
    </section>

    <!-- 🔹 Materials -->
    ${
      materials.length
        ? `<section style="margin-bottom: 25px;">
        <h2 style="color: #0f172a; font-size: 20px; border-left: 5px solid #2563eb; padding-left: 10px; margin-bottom: 8px;">
          Required Materials
        </h2>
        <ul style="list-style-type: square; margin-left: 25px; font-size: 15px;">
          ${materials.map((m) => `<li>${m}</li>`).join("")}
        </ul>
      </section>`
        : ""
    }

    <!-- 🔹 Activities -->
    ${
      activities.length
        ? `<section style="margin-bottom: 25px;">
        <h2 style="color: #0f172a; font-size: 20px; border-left: 5px solid #2563eb; padding-left: 10px; margin-bottom: 8px;">
          Lesson Activities
        </h2>
        ${activities
          .map(
            (a, i) => `
          <div style="margin-bottom: 15px; border: 1px solid #e2e8f0; background-color: #f8fafc; border-radius: 8px; padding: 12px;">
            <strong style="color: #2563eb;">Step ${i + 1}:</strong> 
            <div style="margin-top: 5px; white-space: pre-wrap;">${a}</div>
          </div>`
          )
          .join("")}
      </section>`
        : ""
    }

    <!-- 🔹 Assessment -->
    ${
      assessment.length
        ? `<section style="margin-bottom: 25px;">
        <h2 style="color: #0f172a; font-size: 20px; border-left: 5px solid #2563eb; padding-left: 10px; margin-bottom: 8px;">
          Assessment
        </h2>
        ${assessment
          .map(
            (a) => `
          <div style="margin-bottom: 15px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f1f5f9;">
            <div style="white-space: pre-wrap;">${a}</div>
          </div>`
          )
          .join("")}
      </section>`
        : ""
    }

    <!-- 🔹 Footer -->
    <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
    <p style="text-align: center; font-size: 12px; color: #94a3b8;">
      © Rubrix AI - Automatically Generated Lesson Plan
    </p>
  </div>
  `;
}

export const generateProgressReportHTML = (report) => {
  if (!report) return "";

  const { student, subject, strengths = [], areasForImprovement = [], summary = "" } = report;

  const strengthsList = strengths
    .map((s) => `<li style="margin-bottom: 4px;">${s}</li>`)
    .join("");

  const improvementList = areasForImprovement
    .map((a) => `<li style="margin-bottom: 4px;">${a}</li>`)
    .join("");

  return `
  <div style="font-family: 'Segoe UI', sans-serif; color: #1e293b; background: #f9fafb; padding: 24px; border-radius: 10px; border: 1px solid #e2e8f0; max-width: 800px; margin: auto;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 4px;">📘 Progress Report</h1>
      <p style="font-size: 15px; color: #475569; margin: 0;">Subject: <strong>${subject}</strong></p>
      <p style="font-size: 15px; color: #475569; margin: 0;">Student: <strong>${student}</strong></p>
    </div>

    <!-- Strengths Section -->
    <div style="background: #e0f2fe; padding: 16px 20px; border-radius: 8px; margin-bottom: 16px;">
      <h2 style="color: #0369a1; font-size: 18px; margin-bottom: 8px;">🌟 Strengths</h2>
      <ul style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.6;">${strengthsList}</ul>
    </div>

    <!-- Areas for Improvement -->
    <div style="background: #fef3c7; padding: 16px 20px; border-radius: 8px; margin-bottom: 16px;">
      <h2 style="color: #b45309; font-size: 18px; margin-bottom: 8px;">⚙️ Areas for Improvement</h2>
      <ul style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.6;">${improvementList}</ul>
    </div>

    <!-- Summary -->
    <div style="background: #ecfdf5; padding: 16px 20px; border-radius: 8px;">
      <h2 style="color: #047857; font-size: 18px; margin-bottom: 8px;">📝 Summary</h2>
      <p style="font-size: 15px; line-height: 1.7; color: #064e3b;">${summary}</p>
    </div>

    <!-- Footer -->
    <div style="text-align: right; margin-top: 16px; font-size: 13px; color: #94a3b8;">
      <em>Generated by AI Teaching Assistant</em>
    </div>
  </div>`;
};

export const generateResourceHTML = (resource) => {
  if (!resource) return "";

  const { title, topic, type, content = [] } = resource;

  const contentHTML = content
    .map(
      (point, index) => `
      <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px;">
        <div style="background: #2563eb; color: white; font-weight: bold; font-size: 13px; min-width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          ${index + 1}
        </div>
        <div style="font-size: 15px; line-height: 1.6; color: #1e293b;">${point}</div>
      </div>`
    )
    .join("");

  return `
  <div style="font-family: 'Segoe UI', sans-serif; color: #0f172a; background: #f9fafb; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 850px; margin: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 26px; color: #1e3a8a; margin-bottom: 6px;">📘 ${title}</h1>
      <p style="font-size: 15px; color: #475569; margin: 0;">
        <strong>Topic:</strong> ${topic} &nbsp; | &nbsp;
        <strong>Type:</strong> ${type}
      </p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 20px 24px; border-radius: 10px; border: 1px solid #e5e7eb;">
      ${contentHTML}
    </div>

    <!-- Footer -->
    <div style="text-align: right; margin-top: 20px; font-size: 13px; color: #94a3b8;">
      <em>Generated by AI Educational Assistant</em>
    </div>

  </div>`;
};

export const generateExemplarHTML = (exemplar) => {
  if (!exemplar) return "";

  const { title, introduction, body = [], conclusion } = exemplar;

  const bodyHTML = body
    .map(
      (item, index) => `
      <div style="margin-bottom: 24px; padding: 18px 20px; background: #f8fafc; border-left: 5px solid #3b82f6; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <h3 style="color: #1e3a8a; font-size: 18px; margin-bottom: 8px;">🧮 Question ${index + 1}</h3>
        <pre style="white-space: pre-wrap; font-family: 'Segoe UI', sans-serif; font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0;">${item}</pre>
      </div>`
    )
    .join("");

  return `
  <div style="font-family: 'Segoe UI', sans-serif; color: #0f172a; background: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 900px; margin: auto; box-shadow: 0 2px 12px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 28px; color: #1e40af; margin-bottom: 8px;">📘 ${title}</h1>
      <div style="height: 4px; width: 80px; background: #3b82f6; margin: 0 auto; border-radius: 2px;"></div>
    </div>

    <!-- Introduction -->
    <div style="margin-bottom: 28px;">
      <h2 style="font-size: 20px; color: #1e3a8a; margin-bottom: 8px;">Introduction</h2>
      <p style="font-size: 15px; line-height: 1.7; color: #334155;">${introduction}</p>
    </div>

    <!-- Body -->
    <div>
      ${bodyHTML}
    </div>

    <!-- Conclusion -->
    <div style="margin-top: 30px; padding: 20px; background: #eff6ff; border-radius: 10px; border: 1px solid #bfdbfe;">
      <h2 style="font-size: 20px; color: #1e3a8a; margin-bottom: 8px;">Conclusion</h2>
      <p style="font-size: 15px; color: #334155; line-height: 1.7;">${conclusion}</p>
    </div>

    <!-- Footer -->
    <div style="text-align: right; margin-top: 24px; font-size: 13px; color: #94a3b8;">
      <em>Generated by AI Educational Assistant</em>
    </div>
  </div>`;
};

export const generateDOKQuestionsHTML = (data) => {
  if (!data?.questions?.length) return "";

  const questionBlocks = data.questions
    .map(
      (q, i) => `
      <div style="margin-bottom: 28px; padding: 20px 24px; background: #f8fafc; border-left: 5px solid #2563eb; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 18px; font-weight: 600; color: #1e3a8a; margin: 0;">🔹 Question ${i + 1}</h3>
          <span style="background: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">${q.dokLevel}</span>
        </div>
        <p style="font-size: 15px; line-height: 1.7; color: #334155; margin: 0; white-space: pre-wrap;">
          ${q.question}
        </p>
      </div>`
    )
    .join("");

  return `
  <div style="font-family: 'Segoe UI', sans-serif; background: #ffffff; color: #0f172a; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 2px 10px rgba(0,0,0,0.05); padding: 36px; max-width: 900px; margin: auto;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 28px; font-weight: 700; color: #1e40af; margin-bottom: 6px;">🧠 Depth of Knowledge (DOK) Questions</h1>
      <p style="font-size: 15px; color: #475569;">Advanced critical-thinking and applied learning questions designed to challenge conceptual understanding.</p>
      <div style="height: 4px; width: 90px; background: #2563eb; margin: 14px auto; border-radius: 2px;"></div>
    </div>

    <!-- Questions -->
    ${questionBlocks}

    <!-- Footer -->
    <div style="margin-top: 32px; padding: 20px; background: #eff6ff; border-radius: 12px; border: 1px solid #bfdbfe;">
      <h3 style="font-size: 18px; font-weight: 600; color: #1e3a8a; margin-bottom: 6px;">💡 Educator’s Note</h3>
      <p style="font-size: 15px; color: #334155; line-height: 1.7; margin: 0;">
        These questions encourage learners to analyze, justify, and synthesize knowledge beyond recall — promoting deeper understanding through real-world problem-solving and critical reasoning.
      </p>
    </div>

    <div style="text-align: right; margin-top: 22px; font-size: 13px; color: #94a3b8;">
      <em>Generated by AI Educational Assistant</em>
    </div>
  </div>`;
};
