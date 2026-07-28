const { parsePdfCached, generateInterviewReport, generateInterviewReportPdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")

/**
 * Controller to generate interview report supporting preparationDuration option,
 * with structured error outputs { success: false, message: "..." }.
 */
async function generateInterViewReportController(req, res) {
    console.log(`\n========================================`);
    console.time("Total Request");
    console.time("File upload");

    const startTime = Date.now();
    let resumeParsingMs = 0;
    let promptCreationMs = 0;
    let geminiApiMs = 0;
    let dbSaveMs = 0;

    try {
        const { selfDescription = "", jobDescription = "", preparationDuration = "30_days" } = req.body

        const trimmedJd = jobDescription.trim()
        const trimmedSelfDesc = selfDescription.trim()

        console.timeEnd("File upload");

        // Input Validations
        if (!trimmedJd) {
            return res.status(400).json({ success: false, message: "Job description is required." });
        }
        if (trimmedJd.length < 20) {
            return res.status(400).json({ success: false, message: "Job description must be at least 20 characters long." });
        }
        if (!trimmedSelfDesc && !req.file) {
            return res.status(400).json({ success: false, message: "Either a self description or a PDF resume (or both) is required." });
        }

        // 1. Resume Parsing
        const parseStart = Date.now();
        console.time("Resume Parsing");
        let resumeText = "";
        if (req.file) {
            try {
                const parseResult = await parsePdfCached(req.file.buffer);
                resumeText = parseResult.text;
            } catch (e) {
                console.timeEnd("Resume Parsing");
                return res.status(400).json({ success: false, message: "Could not parse the uploaded PDF file. Please try a different PDF." });
            }
        }
        console.timeEnd("Resume Parsing");
        resumeParsingMs = Date.now() - parseStart;

        // 2. Initial DB document creation
        const initialDbStart = Date.now();
        const initialReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription: trimmedSelfDesc,
            jobDescription: trimmedJd,
            preparationDuration,
            status: "pending",
            title: "Generating Interview Plan..."
        });
        const initialDbMs = Date.now() - initialDbStart;
        const reportId = initialReport._id;

        // 3. Prompt Creation & Gemini API Invocation
        console.time("Gemini response");
        const aiCallStart = Date.now();
        
        let aiResultData;
        try {
            const aiResponseObj = await generateInterviewReport({
                resume: resumeText,
                selfDescription: trimmedSelfDesc,
                jobDescription: trimmedJd,
                preparationDuration
            });
            aiResultData = aiResponseObj.data;
            geminiApiMs = aiResponseObj.geminiDuration || (Date.now() - aiCallStart);
        } catch (aiErr) {
            console.timeEnd("Gemini response");
            await interviewReportModel.findByIdAndUpdate(reportId, {
                status: "failed",
                statusReason: aiErr.message || "Gemini API call failed"
            });

            console.error(`[ERROR] Gemini API execution failed: ${aiErr.message}`);
            return res.status(aiErr.statusCode || 500).json({
                success: false,
                message: aiErr.message || "AI returned an invalid JSON response.",
                errorCode: aiErr.errorCode || "AI_GENERATION_FAILED"
            });
        }
        console.timeEnd("Gemini response");

        // 4. Database Save Timing
        console.time("Database Save");
        const dbSaveStart = Date.now();
        const updatedReport = await interviewReportModel.findByIdAndUpdate(
            reportId,
            {
                ...aiResultData,
                preparationDuration,
                status: "completed",
                statusReason: ""
            },
            { new: true }
        ).lean();
        console.timeEnd("Database Save");

        dbSaveMs = initialDbMs + (Date.now() - dbSaveStart);
        const totalDurationMs = Date.now() - startTime;

        console.log(`\n--- PERFORMANCE TIMING SUMMARY ---`);
        console.log(`Resume Parsing: ${resumeParsingMs} ms`);
        console.log(`Prompt Creation: ${promptCreationMs} ms`);
        console.log(`Gemini API: ${geminiApiMs} ms`);
        console.log(`Database Save: ${dbSaveMs} ms`);
        console.log(`Total Request: ${totalDurationMs} ms`);

        console.time("Response sent to frontend");
        res.status(201).json({
            success: true,
            message: "Interview report generated successfully.",
            status: "completed",
            interviewReport: updatedReport
        });
        console.timeEnd("Response sent to frontend");

        console.timeEnd("Total Request");
        console.log(`========================================\n`);

    } catch (err) {
        console.error("Unhandled Controller Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "An unexpected server error occurred."
        });
    }
}

/**
 * Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params;
        const interviewReport = await interviewReportModel.findOne({
            _id: interviewId,
            user: req.user.id
        }).lean();

        if (!interviewReport) {
            return res.status(404).json({ success: false, message: "Interview report not found." });
        }

        res.status(200).json({
            success: true,
            message: "Interview report fetched successfully.",
            interviewReport
        });
    } catch (err) {
        console.error("Error fetching interview report:", err);
        res.status(500).json({ success: false, message: "Failed to fetch interview report." });
    }
}

/** 
 * Controller to get all interview reports of logged-in user.
 */
async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel
            .find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("title matchScore atsScore candidateName preparationDuration status statusReason createdAt")
            .lean();

        res.status(200).json({
            success: true,
            message: "Interview reports fetched successfully.",
            interviewReports
        });
    } catch (err) {
        console.error("Error fetching all interview reports:", err);
        res.status(500).json({ success: false, message: "Failed to fetch interview reports." });
    }
}

/**
 * Controller to delete an interview report by interviewId.
 */
async function deleteInterviewReportController(req, res) {
    try {
        const { interviewId } = req.params;
        const report = await interviewReportModel.findOneAndDelete({
            _id: interviewId,
            user: req.user.id
        });

        if (!report) {
            return res.status(404).json({ success: false, message: "Interview report not found." });
        }

        res.status(200).json({ success: true, message: "Interview report deleted successfully." });
    } catch (err) {
        console.error("Error deleting interview report:", err);
        res.status(500).json({ success: false, message: "Failed to delete interview report." });
    }
}

/**
 * Controller to generate Interview Report PDF.
 */
async function generateReportPdfController(req, res) {
    try {
        const { interviewReportId } = req.params;
        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        }).lean();

        if (!interviewReport) {
            return res.status(404).json({ success: false, message: "Interview report not found." });
        }

        if (interviewReport.status === "pending") {
            return res.status(400).json({ success: false, message: "Report is still being generated." });
        }

        const pdfBuffer = await generateInterviewReportPdf({
            interviewReport,
            user: req.user
        });

        const safeTitle = (interviewReport.title || "Interview_Report").replace(/[^a-zA-Z0-9_-]/g, "_");

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${safeTitle}_Report.pdf"`
        });

        res.send(pdfBuffer);
    } catch (err) {
        console.error("Error generating report PDF:", err);
        res.status(500).json({ success: false, message: "Failed to generate report PDF." });
    }
}

module.exports = {
    generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    deleteInterviewReportController,
    generateReportPdfController
};