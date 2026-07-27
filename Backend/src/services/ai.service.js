const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

// Single reusable Puppeteer browser instance for maximum performance
let browserInstance = null;

async function getBrowser() {
    if (!browserInstance || !browserInstance.isConnected()) {
        browserInstance = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",
                "--disable-gpu"
            ]
        })
    }
    return browserInstance;
}

const qnaItemSchema = z.object({
    question: z.string().describe("The interview question"),
    intention: z.string().describe("Why the interviewer asks this question"),
    answer: z.string().describe("Comprehensive model answer and approach")
});

const interviewReportSchema = z.object({
    candidateName: z.string().describe("Extracted or inferred candidate full name or fallback to Candidate"),
    title: z.string().describe("Target job title derived from job description"),
    matchScore: z.number().min(0).max(100).describe("Overall candidate match score percentage for the target job"),
    atsScore: z.number().min(0).max(100).describe("ATS compatibility score percentage"),
    resumeSummary: z.string().describe("Executive summary of candidate background and key strengths relative to job description"),
    skillsFound: z.array(z.string()).describe("Key technical and soft skills present in candidate profile matching the job"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("Missing or underdeveloped skill needed for the job"),
        severity: z.enum([ "low", "medium", "high" ]).describe("Impact level of missing this skill"),
        recommendation: z.string().describe("Quick advice to bridge this specific gap")
    })).describe("Missing skills or areas needing development"),
    hrQuestions: z.array(qnaItemSchema).describe("HR and cultural fit interview questions"),
    technicalQuestions: z.array(qnaItemSchema).describe("Core technical and domain-specific questions"),
    projectQuestions: z.array(qnaItemSchema).describe("Questions testing past project work, architecture, and achievements"),
    codingQuestions: z.array(qnaItemSchema).describe("Practical coding, data structures, and algorithmic problems"),
    behavioralQuestions: z.array(qnaItemSchema).describe("STAR-method behavioral questions"),
    systemDesignQuestions: z.array(qnaItemSchema).describe("System architecture, scalability, and design questions (if applicable, else general software engineering architecture)"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("Day number (1 to 30)"),
        focus: z.string().describe("Primary study focus of the day"),
        tasks: z.array(z.string()).describe("Actionable preparation tasks for the day")
    })).describe("30-day structured study plan covering core technical topics, mock interviews, and final prep"),
    finalRecommendations: z.array(z.string()).describe("Top 5 strategic recommendations for candidate to ace the interview")
});

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const prompt = `You are an elite Tech Executive and Lead Technical Interviewer. Generate a comprehensive, professional Interview Preparation Report for a candidate based on the following details:

    [CANDIDATE RESUME]
    ${resume || "Not provided."}

    [CANDIDATE SELF DESCRIPTION]
    ${selfDescription || "Not provided."}

    [TARGET JOB DESCRIPTION]
    ${jobDescription}

    Instructions:
    1. Analyze candidate skills against target job description.
    2. Provide accurate candidateName (extract from resume or default to "Candidate"), title, matchScore (0-100), and atsScore (0-100).
    3. Generate detailed HR, Technical, Project, Coding, Behavioral, and System Design questions with clear interviewer intentions and structured model answers.
    4. Provide a structured 30-Day Preparation Roadmap (combine consecutive days logically or provide 30 structured daily checkpoints/milestones).
    5. List actionable final recommendations.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
            temperature: 0.2
        }
    });

    return JSON.parse(response.text);
}

async function generatePdfFromHtml(htmlContent) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "15mm",
                bottom: "15mm",
                left: "15mm",
                right: "15mm"
            }
        });
        return pdfBuffer;
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
        year: "numeric",
        month: "long",
        day: "numeric"
    });

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
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                color: #1e293b;
                background-color: #ffffff;
                line-height: 1.5;
                font-size: 13px;
            }
            .page-break-inside-avoid { page-break-inside: avoid; }
            .header-banner {
                background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
                color: #ffffff;
                padding: 24px 30px;
                border-radius: 12px;
                margin-bottom: 24px;
            }
            .header-top {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 16px;
            }
            .header-title h1 { font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 4px; }
            .header-title p { font-size: 14px; color: #c7d2fe; }
            .header-date { font-size: 12px; color: #a5b4fc; text-align: right; }

            .metrics-row {
                display: flex;
                gap: 16px;
                margin-top: 12px;
            }
            .metric-badge {
                background: rgba(255, 255, 255, 0.12);
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 8px 16px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .metric-val { font-size: 20px; font-weight: 800; color: #38bdf8; }
            .metric-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #e0e7ff; }

            .section-card {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 14px;
                border-bottom: 2px solid #6366f1;
                padding-bottom: 8px;
            }
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

            .qna-box {
                background: #ffffff;
                border: 1px solid #cbd5e1;
                border-left: 4px solid #4f46e5;
                padding: 12px 16px;
                border-radius: 6px;
                margin-bottom: 12px;
            }
            .qna-title { font-weight: 700; font-size: 13px; color: #1e1b4b; margin-bottom: 4px; }
            .qna-sub { font-size: 12px; color: #475569; margin-bottom: 6px; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; }
            .qna-ans { font-size: 12px; color: #334155; line-height: 1.5; white-space: pre-line; }

            .roadmap-timeline { display: flex; flex-direction: column; gap: 10px; }
            .roadmap-item { background: #ffffff; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; }
            .roadmap-day { font-weight: 700; color: #4338ca; font-size: 12px; }
            .roadmap-focus { font-weight: 600; color: #0f172a; font-size: 13px; margin-bottom: 4px; }
            .roadmap-tasks { font-size: 12px; color: #475569; padding-left: 18px; }

            .recommendation-item { display: flex; gap: 10px; margin-bottom: 8px; font-size: 13px; color: #1e293b; }
            .recommendation-bullet { color: #4f46e5; font-weight: bold; }

            .footer {
                text-align: center;
                font-size: 11px;
                color: #94a3b8;
                margin-top: 30px;
                padding-top: 10px;
                border-top: 1px solid #e2e8f0;
            }
        </style>
    </head>
    <body>
        <div class="header-banner">
            <div class="header-top">
                <div class="header-title">
                    <h1>AI Interview Strategy Report</h1>
                    <p>Candidate: <strong>${escapeHtml(candidateName)}</strong> &bull; Target Role: <strong>${escapeHtml(jobTitle)}</strong></p>
                </div>
                <div class="header-date">
                    Generated on<br><strong>${dateStr}</strong>
                </div>
            </div>
            <div class="metrics-row">
                <div class="metric-badge">
                    <span class="metric-val">${matchScore}%</span>
                    <span class="metric-lbl">Role Match Score</span>
                </div>
                <div class="metric-badge">
                    <span class="metric-val" style="color: #34d399;">${atsScore}%</span>
                    <span class="metric-lbl">ATS Compatibility</span>
                </div>
            </div>
        </div>

        <!-- Executive Summary -->
        <div class="section-card page-break-inside-avoid">
            <div class="section-header">
                <h2>Executive Resume Summary</h2>
            </div>
            <p class="summary-text">${escapeHtml(interviewReport.resumeSummary || "No summary available.")}</p>
        </div>

        <!-- Skills Found & Missing Skills -->
        <div class="grid-2 page-break-inside-avoid">
            <div class="grid-col section-card">
                <div class="section-header">
                    <h2>Skills Found</h2>
                </div>
                <div class="pill-list">
                    ${(interviewReport.skillsFound || []).map(s => `<span class="pill pill-found">${escapeHtml(s)}</span>`).join("") || "<em>None highlighted</em>"}
                </div>
            </div>
            <div class="grid-col section-card">
                <div class="section-header">
                    <h2>Missing Skills / Gaps</h2>
                </div>
                <div class="pill-list">
                    ${(interviewReport.skillGaps || []).map(g => `
                        <span class="pill pill-gap-${g.severity}">${escapeHtml(g.skill)} (${g.severity})</span>
                    `).join("") || "<em>No major skill gaps identified</em>"}
                </div>
            </div>
        </div>

        <!-- Question Sections -->
        ${renderQnaList("Technical Questions", interviewReport.technicalQuestions)}
        ${renderQnaList("Behavioral Questions", interviewReport.behavioralQuestions)}
        ${renderQnaList("HR & Cultural Fit Questions", interviewReport.hrQuestions)}
        ${renderQnaList("Project Architecture Questions", interviewReport.projectQuestions)}
        ${renderQnaList("Coding & Algorithm Questions", interviewReport.codingQuestions)}
        ${renderQnaList("System Design & Architecture Questions", interviewReport.systemDesignQuestions)}

        <!-- 30-Day Preparation Roadmap -->
        ${(interviewReport.preparationPlan && interviewReport.preparationPlan.length > 0) ? `
            <div class="section-card page-break-inside-avoid">
                <div class="section-header">
                    <h2>30-Day Preparation Roadmap</h2>
                    <span class="badge-count">${interviewReport.preparationPlan.length} Days</span>
                </div>
                <div class="roadmap-timeline">
                    ${interviewReport.preparationPlan.map(d => `
                        <div class="roadmap-item">
                            <span class="roadmap-day">Day ${d.day}</span>
                            <div class="roadmap-focus">${escapeHtml(d.focus)}</div>
                            <ul class="roadmap-tasks">
                                ${(d.tasks || []).map(t => `<li>${escapeHtml(t)}</li>`).join("")}
                            </ul>
                        </div>
                    `).join("")}
                </div>
            </div>
        ` : ""}

        <!-- Final Recommendations -->
        ${(interviewReport.finalRecommendations && interviewReport.finalRecommendations.length > 0) ? `
            <div class="section-card page-break-inside-avoid">
                <div class="section-header">
                    <h2>Final Strategic Recommendations</h2>
                </div>
                <div>
                    ${interviewReport.finalRecommendations.map(r => `
                        <div class="recommendation-item">
                            <span class="recommendation-bullet">&check;</span>
                            <span>${escapeHtml(r)}</span>
                        </div>
                    `).join("")}
                </div>
            </div>
        ` : ""}

        <div class="footer">
            Confidential &bull; Prepared exclusively for ${escapeHtml(candidateName)} &bull; AI Interview Coach Report
        </div>
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

module.exports = { generateInterviewReport, generateInterviewReportPdf }