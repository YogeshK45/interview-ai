const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const chromiumModule = require("@sparticuz/chromium")
const chromium = chromiumModule.default || chromiumModule
const puppeteer = require("puppeteer-core")
const pdfParse = require("pdf-parse")
const crypto = require("crypto")

// ==========================================
// 1. CONFIGURATION & FAST MODEL SELECTION
// ==========================================
const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || "";
const FAST_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey });

let browserInstance = null;

/**
 * Reusable Puppeteer-Core Browser instance configured with @sparticuz/chromium
 * for Render Linux instances and Cloud / Serverless environments.
 * Uses `chromiumModule.default || chromiumModule` to safely handle CommonJS export resolution.
 */
async function getBrowser() {
    if (!browserInstance || !browserInstance.isConnected()) {
        let execPath = "";
        try {
            execPath = await chromium.executablePath();
        } catch (err) {
            console.warn("[CHROMIUM WARNING] Failed to get chromium.executablePath():", err.message);
        }

        // Local development fallback if running locally on macOS/Windows
        if (!execPath) {
            if (process.platform === "darwin") {
                execPath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
            } else if (process.platform === "win32") {
                execPath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
            } else {
                execPath = "/usr/bin/google-chrome";
            }
        }

        browserInstance = await puppeteer.launch({
            args: chromium.args || [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ],
            defaultViewport: chromium.defaultViewport || { width: 1200, height: 800 },
            executablePath: execPath,
            headless: chromium.headless !== undefined ? chromium.headless : true,
        });
    }
    return browserInstance;
}

// ==========================================
// 2. RESUME EXTRACTION & CACHING
// ==========================================
const pdfParseCache = new Map();
const MAX_CACHE_SIZE = 100;

function extractKeyResumeSections(rawText = "", maxChars = 1500) {
    if (!rawText) return "";

    const clean = rawText
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    console.time("Resume Text Extraction");

    const lines = clean.split("\n");
    const sections = [];
    let currentSection = "";
    let buffer = [];

    const targetHeaderRegex = /^(skills|technical skills|key skills|experience|work experience|employment history|projects|key projects|education|academic background)/i;
    const allHeaderRegex = /^(summary|objective|skills|experience|projects|education|certifications|awards|languages|interests)/i;

    for (const line of lines) {
        const trimmed = line.trim();
        if (targetHeaderRegex.test(trimmed)) {
            if (currentSection && buffer.length > 0) {
                sections.push(`${currentSection}:\n${buffer.slice(0, 6).join("\n")}`);
            }
            currentSection = trimmed;
            buffer = [];
        } else if (allHeaderRegex.test(trimmed) && !targetHeaderRegex.test(trimmed)) {
            if (currentSection && buffer.length > 0) {
                sections.push(`${currentSection}:\n${buffer.slice(0, 6).join("\n")}`);
            }
            currentSection = "";
            buffer = [];
        } else if (currentSection && trimmed) {
            buffer.push(trimmed);
        }
    }

    if (currentSection && buffer.length > 0) {
        sections.push(`${currentSection}:\n${buffer.slice(0, 6).join("\n")}`);
    }

    let extracted = sections.join("\n\n");

    if (!extracted || extracted.length < 100) {
        extracted = clean.substring(0, 1000);
    } else if (extracted.length > maxChars) {
        extracted = extracted.substring(0, maxChars) + "\n[Truncated]";
    }

    console.timeEnd("Resume Text Extraction");
    return extracted;
}

async function parsePdfCached(fileBuffer) {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
        return { text: "", cached: false };
    }

    const hash = crypto.createHash("md5").update(fileBuffer).digest("hex");
    if (pdfParseCache.has(hash)) {
        return { text: pdfParseCache.get(hash), cached: true };
    }

    console.time("Resume Parsing");
    const parsed = await pdfParse(fileBuffer);
    console.timeEnd("Resume Parsing");

    const extractedText = extractKeyResumeSections(parsed?.text || "", 1500);

    if (pdfParseCache.size >= MAX_CACHE_SIZE) {
        const firstKey = pdfParseCache.keys().next().value;
        pdfParseCache.delete(firstKey);
    }

    pdfParseCache.set(hash, extractedText);
    return { text: extractedText, cached: false };
}

// ==========================================
// 3. ZOD SCHEMA FOR REPORT GENERATION
// ==========================================
const qnaItemSchema = z.object({
    question: z.string().describe("Interview question"),
    intention: z.string().describe("Interviewer goal"),
    answer: z.string().describe("Brief STAR format model answer")
});

const interviewReportSchema = z.object({
    candidateName: z.string().describe("Candidate full name"),
    title: z.string().describe("Job title"),
    matchScore: z.number().min(0).max(100),
    atsScore: z.number().min(0).max(100),
    resumeSummary: z.string().describe("Short background summary"),
    skillsFound: z.array(z.string()).describe("Top skills matched"),
    skillGaps: z.array(z.object({
        skill: z.string(),
        severity: z.enum([ "low", "medium", "high" ]),
        recommendation: z.string()
    })).describe("Top missing skill gaps"),
    hrQuestions: z.array(qnaItemSchema).describe("2 HR questions"),
    technicalQuestions: z.array(qnaItemSchema).describe("2 Technical questions"),
    projectQuestions: z.array(qnaItemSchema).describe("2 Project questions"),
    codingQuestions: z.array(qnaItemSchema).describe("2 Coding questions"),
    behavioralQuestions: z.array(qnaItemSchema).describe("2 Behavioral questions"),
    systemDesignQuestions: z.array(qnaItemSchema).describe("2 System Design questions"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("Step number (1, 2, 3...)"),
        focus: z.string().describe("Primary focus of this step or day"),
        tasks: z.array(z.string()).describe("Actionable preparation tasks")
    })).describe("Tailored preparation plan/roadmap"),
    finalRecommendations: z.array(z.string()).describe("Top strategic recommendations")
});

function getPreparationPlanTitle(duration) {
    switch (duration) {
        case '30_minutes': return '30-Minute Revision Plan';
        case '1_hour': return '1-Hour Preparation Strategy';
        case '2_hours': return '2-Hour Preparation Schedule';
        case 'tomorrow': return 'Tomorrow Interview Preparation Plan';
        case '3_days': return '3-Day Preparation Plan';
        case '7_days': return '7-Day Preparation Plan';
        case '15_days': return '15-Day Preparation Plan';
        case '60_days': return '60-Day Preparation Plan';
        case '90_days': return '90-Day Preparation Plan';
        case '30_days':
        default:
            return '30-Day Preparation Plan';
    }
}

function getRoadmapInstruction(duration) {
    switch (duration) {
        case "30_minutes":
            return "Generate a 30-minute minute-wise high-yield revision plan (e.g. 3-5 concise minute-based checkpoints covering core pitch, top technical concepts, and quick checklist).";
        case "1_hour":
            return "Generate a detailed 60-minute interview strategy (e.g. 6 10-minute milestone blocks).";
        case "2_hours":
            return "Generate a complete 2-hour preparation schedule (e.g. 8 15-minute milestone blocks).";
        case "tomorrow":
            return "Generate an hour-by-hour preparation plan for tomorrow.";
        case "3_days":
            return "Generate a Day 1, Day 2, and Day 3 preparation roadmap.";
        case "7_days":
            return "Generate a Day 1 to Day 7 preparation roadmap.";
        case "15_days":
            return "Generate a Day 1 to Day 15 preparation roadmap.";
        case "60_days":
            return "Generate a complete 60-day roadmap.";
        case "90_days":
            return "Generate a complete 90-day roadmap.";
        case "30_days":
        default:
            return "Generate a 30-day preparation roadmap.";
    }
}

// ==========================================
// 4. SAFE ROBUST GEMINI JSON PARSER & REPAIR
// ==========================================
function safeParseGeminiJson(rawText) {
    if (!rawText || typeof rawText !== "string") {
        console.error("Raw Gemini Response is empty or non-string");
        throw new Error("AI returned an empty or invalid response.");
    }

    console.log("Raw Gemini Response:", rawText);

    let text = rawText.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        text = text.substring(firstBrace, lastBrace + 1);
    }

    try {
        return JSON.parse(text);
    } catch (firstErr) {
        console.warn("[JSON PARSE WARNING] Initial JSON.parse failed. Attempting syntax cleanup...", firstErr.message);
    }

    let cleaned = text
        .replace(/,\s*([\}\]])/g, "$1")
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");

    try {
        return JSON.parse(cleaned);
    } catch (secondErr) {
        console.warn("[JSON PARSE WARNING] Second JSON.parse failed. Attempting auto-repair...", secondErr.message);
    }

    let repaired = autoRepairTruncatedJson(cleaned);

    try {
        return JSON.parse(repaired);
    } catch (finalErr) {
        console.error("[JSON PARSE FATAL] Failed to parse Gemini JSON output after repair attempts:", finalErr.message);
        const parseError = new Error("AI returned an invalid JSON response.");
        parseError.statusCode = 500;
        parseError.errorCode = "INVALID_AI_JSON";
        throw parseError;
    }
}

function autoRepairTruncatedJson(jsonStr) {
    let s = jsonStr.trim();
    let inString = false;
    let escapeNext = false;
    let stack = [];

    for (let i = 0; i < s.length; i++) {
        const char = s[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (char === '\\') {
            escapeNext = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === '{' || char === '[') {
                stack.push(char);
            } else if (char === '}') {
                if (stack[stack.length - 1] === '{') stack.pop();
            } else if (char === ']') {
                if (stack[stack.length - 1] === '[') stack.pop();
            }
        }
    }

    if (inString) {
        s += '"';
    }

    s = s.replace(/,\s*$/, "");

    while (stack.length > 0) {
        const open = stack.pop();
        if (open === '{') s += '}';
        else if (open === '[') s += ']';
    }

    return s;
}

// ==========================================
// 5. GEMINI API REPORT GENERATION
// ==========================================
async function generateInterviewReport({ resume = "", selfDescription = "", jobDescription = "", preparationDuration = "30_days" }) {
    console.time("Prompt Creation");

    const keyResumeData = extractKeyResumeSections(resume, 1500);
    const cleanedJd = (jobDescription || "").substring(0, 1000);
    const cleanedSelfDesc = (selfDescription || "").substring(0, 400);
    const roadmapInstruction = getRoadmapInstruction(preparationDuration);

    const prompt = `Role: Expert Technical Interviewer. Build a concise, high-impact interview report.

JOB REQUIREMENTS:
${cleanedJd}

CANDIDATE DATA (Skills, Experience, Projects, Education):
${keyResumeData || "Not provided."}
${cleanedSelfDesc ? `SELF DESC: ${cleanedSelfDesc}` : ""}

PREPARATION DURATION REQUIREMENT:
${roadmapInstruction}

Instructions:
1. Infer matchScore and atsScore.
2. Provide 2 targeted questions each for HR, Technical, Projects, Coding, Behavioral, and System Design with interviewer intent and model answer.
3. Generate the preparationPlan matching the PREPARATION DURATION REQUIREMENT exactly.
Keep descriptions brief and to the point. Output valid JSON.`;

    console.timeEnd("Prompt Creation");

    console.time("Gemini API");
    const geminiStart = Date.now();

    const response = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
            temperature: 0.1,
            maxOutputTokens: 8192
        }
    });

    console.timeEnd("Gemini API");
    const geminiDuration = Date.now() - geminiStart;

    if (!response || !response.text) {
        console.error("Gemini API returned an empty response payload");
        const emptyError = new Error("AI returned an invalid JSON response.");
        emptyError.statusCode = 500;
        emptyError.errorCode = "EMPTY_AI_RESPONSE";
        throw emptyError;
    }

    const parsedData = safeParseGeminiJson(response.text);

    return {
        data: parsedData,
        geminiDuration
    };
}

async function generatePdfFromHtml(htmlContent) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
        return await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" }
        });
    } finally {
        await page.close();
    }
}

async function generateInterviewReportPdf({ interviewReport, user }) {
    const candidateName = interviewReport.candidateName || user?.username || "Candidate";
    const jobTitle = interviewReport.title || "Target Position";
    const matchScore = interviewReport.matchScore || 0;
    const atsScore = interviewReport.atsScore || 0;
    const dateStr = new Date(interviewReport.createdAt || Date.now()).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric"
    });

    const planTitle = getPreparationPlanTitle(interviewReport.preparationDuration);

    const renderQnaList = (title, items) => {
        if (!items || items.length === 0) return "";
        return `
            <div class="section-card page-break-inside-avoid">
                <div class="section-header">
                    <h2>${title}</h2>
                    <span class="badge-count">${items.length} Questions</span>
                </div>
                ${items.map((item, idx) => `
                    <div class="qna-box">
                        <div class="qna-title">Q${idx + 1}. ${escapeHtml(item.question)}</div>
                        <div class="qna-sub"><strong>Intention:</strong> ${escapeHtml(item.intention)}</div>
                        <div class="qna-ans"><strong>Model Answer / Approach:</strong> ${escapeHtml(item.answer)}</div>
                    </div>
                `).join("")}
            </div>
        `;
    };

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Interview Report - ${escapeHtml(candidateName)}</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background-color: #ffffff; line-height: 1.5; font-size: 13px; }
            .page-break-inside-avoid { page-break-inside: avoid; }
            .header-banner { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); color: #ffffff; padding: 24px 30px; border-radius: 12px; margin-bottom: 24px; }
            .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
            .header-title h1 { font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 4px; }
            .header-title p { font-size: 14px; color: #c7d2fe; }
            .header-date { font-size: 12px; color: #a5b4fc; text-align: right; }
            .metrics-row { display: flex; gap: 16px; margin-top: 12px; }
            .metric-badge { background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2); padding: 8px 16px; border-radius: 8px; display: flex; align-items: center; gap: 10px; }
            .metric-val { font-size: 20px; font-weight: 800; color: #38bdf8; }
            .metric-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #e0e7ff; }
            .section-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
            .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
            .section-header h2 { font-size: 16px; font-weight: 700; color: #0f172a; }
            .badge-count { background: #e0e7ff; color: #4338ca; font-weight: 600; font-size: 11px; padding: 2px 10px; border-radius: 12px; }
            .summary-text { font-size: 13px; color: #334155; line-height: 1.6; }
            .grid-2 { display: flex; gap: 16px; margin-bottom: 20px; }
            .grid-col { flex: 1; }
            .pill-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
            .pill { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px; }
            .pill-found { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .pill-gap-high { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
            .pill-gap-medium { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .pill-gap-low { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
            .qna-box { background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #4f46e5; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px; }
            .qna-title { font-weight: 700; font-size: 13px; color: #1e1b4b; margin-bottom: 4px; }
            .qna-sub { font-size: 12px; color: #475569; margin-bottom: 6px; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; }
            .qna-ans { font-size: 12px; color: #334155; line-height: 1.5; white-space: pre-line; }
            .roadmap-timeline { display: flex; flex-direction: column; gap: 10px; }
            .roadmap-item { background: #ffffff; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; }
            .roadmap-day { font-weight: 700; color: #4338ca; font-size: 12px; }
            .roadmap-focus { font-weight: 600; color: #0f172a; font-size: 13px; margin-bottom: 4px; }
            .roadmap-tasks { font-size: 12px; color: #475569; padding-left: 18px; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="header-banner">
            <div class="header-top">
                <div class="header-title">
                    <h1>AI Interview Strategy Report</h1>
                    <p>Candidate: <strong>${escapeHtml(candidateName)}</strong> &bull; Target Role: <strong>${escapeHtml(jobTitle)}</strong></p>
                </div>
                <div class="header-date">Generated on<br><strong>${dateStr}</strong></div>
            </div>
            <div class="metrics-row">
                <div class="metric-badge"><span class="metric-val">${matchScore}%</span><span class="metric-lbl">Role Match Score</span></div>
                <div class="metric-badge"><span class="metric-val" style="color: #34d399;">${atsScore}%</span><span class="metric-lbl">ATS Compatibility</span></div>
            </div>
        </div>
        <div class="section-card page-break-inside-avoid"><div class="section-header"><h2>Executive Summary</h2></div><p class="summary-text">${escapeHtml(interviewReport.resumeSummary || "No summary.")}</p></div>
        ${renderQnaList("Technical Questions", interviewReport.technicalQuestions)}
        ${renderQnaList("Behavioral Questions", interviewReport.behavioralQuestions)}
        ${renderQnaList("HR & Cultural Fit Questions", interviewReport.hrQuestions)}
        ${renderQnaList("Project Architecture Questions", interviewReport.projectQuestions)}
        ${renderQnaList("Coding Questions", interviewReport.codingQuestions)}
        ${renderQnaList("System Design Questions", interviewReport.systemDesignQuestions)}

        ${(interviewReport.preparationPlan && interviewReport.preparationPlan.length > 0) ? `
            <div class="section-card page-break-inside-avoid">
                <div class="section-header">
                    <h2>${escapeHtml(planTitle)}</h2>
                    <span class="badge-count">${interviewReport.preparationPlan.length} Steps</span>
                </div>
                <div class="roadmap-timeline">
                    ${interviewReport.preparationPlan.map(d => `
                        <div class="roadmap-item">
                            <span class="roadmap-day">${interviewReport.preparationDuration?.includes('minutes') || interviewReport.preparationDuration?.includes('hour') || interviewReport.preparationDuration === 'tomorrow' ? 'Step' : 'Day'} ${d.day}</span>
                            <div class="roadmap-focus">${escapeHtml(d.focus)}</div>
                            <ul class="roadmap-tasks">
                                ${(d.tasks || []).map(t => `<li>${escapeHtml(t)}</li>`).join("")}
                            </ul>
                        </div>
                    `).join("")}
                </div>
            </div>
        ` : ""}

        <div class="footer">Confidential &bull; Prepared exclusively for ${escapeHtml(candidateName)}</div>
    </body>
    </html>
    `;

    return await generatePdfFromHtml(htmlContent);
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

module.exports = {
    parsePdfCached,
    generateInterviewReport,
    generateInterviewReportPdf
};