const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateInterviewReportPdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")

/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {
    try {
        const { selfDescription = "", jobDescription = "" } = req.body

        const trimmedJd = jobDescription.trim()
        const trimmedSelfDesc = selfDescription.trim()

        // Validation
        if (!trimmedJd) {
            return res.status(400).json({
                message: "Job description is required."
            })
        }

        if (trimmedJd.length < 20) {
            return res.status(400).json({
                message: "Job description must be at least 20 characters long."
            })
        }

        if (!trimmedSelfDesc && !req.file) {
            return res.status(400).json({
                message: "Either a self description or a PDF resume (or both) is required."
            })
        }

        // Validate file type if resume is uploaded
        if (req.file) {
            const allowedMimeTypes = [ "application/pdf" ]
            if (!allowedMimeTypes.includes(req.file.mimetype)) {
                return res.status(400).json({
                    message: "Only PDF resume files are supported. Please upload a PDF file."
                })
            }
        }

        let resumeText = ""
        if (req.file) {
            try {
                const parsed = await pdfParse(req.file.buffer)
                resumeText = parsed?.text || ""
            } catch (e) {
                return res.status(400).json({
                    message: "Could not parse the uploaded PDF file. Please try a different PDF."
                })
            }
        }

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription: trimmedSelfDesc,
            jobDescription: trimmedJd
        })

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription: trimmedSelfDesc,
            jobDescription: trimmedJd,
            ...interViewReportByAi
        })

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })
    } catch (err) {
        console.error("Error generating interview report:", err)
        res.status(500).json({
            message: err.message || "Failed to generate interview report. Please try again."
        })
    }
}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewId,
            user: req.user.id
        }).lean()

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        })
    } catch (err) {
        console.error("Error fetching interview report:", err)
        res.status(500).json({
            message: "Failed to fetch interview report."
        })
    }
}

/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel
            .find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("title matchScore atsScore candidateName createdAt")
            .lean()

        res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        })
    } catch (err) {
        console.error("Error fetching all interview reports:", err)
        res.status(500).json({
            message: "Failed to fetch interview reports."
        })
    }
}

/**
 * @description Controller to delete an interview report by interviewId.
 */
async function deleteInterviewReportController(req, res) {
    try {
        const { interviewId } = req.params

        const report = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })
        if (!report) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        await interviewReportModel.deleteOne({ _id: interviewId, user: req.user.id })

        res.status(200).json({
            message: "Interview report deleted successfully."
        })
    } catch (err) {
        console.error("Error deleting interview report:", err)
        res.status(500).json({
            message: "Failed to delete interview report."
        })
    }
}

/**
 * @description Controller to generate Interview Report PDF.
 */
async function generateReportPdfController(req, res) {
    try {
        const { interviewReportId } = req.params

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        }).lean()

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        const pdfBuffer = await generateInterviewReportPdf({
            interviewReport,
            user: req.user
        })

        const safeTitle = (interviewReport.title || "Interview_Report").replace(/[^a-zA-Z0-9_-]/g, "_")

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${safeTitle}_Report.pdf"`
        })

        res.send(pdfBuffer)
    } catch (err) {
        console.error("Error generating report PDF:", err)
        res.status(500).json({
            message: "Failed to generate report PDF."
        })
    }
}

module.exports = {
    generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    deleteInterviewReportController,
    generateReportPdfController
}