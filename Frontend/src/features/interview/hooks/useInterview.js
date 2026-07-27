import { deleteInterviewReport, getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateInterviewReportPdf } from "../services/interview.api"
import { useContext, useEffect, useState } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"

const getApiErrorMessage = (error) => {
    return error?.response?.data?.message || error?.message || "Request failed"
}

export const useInterview = () => {
    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports } = context
    const [ isDownloadingPdf, setIsDownloadingPdf ] = useState(false)

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response.interviewReport)
            return response.interviewReport
        } catch (error) {
            console.error(error)
            throw new Error(getApiErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    const getReportById = async (id) => {
        setLoading(true)
        try {
            const response = await getInterviewReportById(id)
            setReport(response.interviewReport)
            return response.interviewReport
        } catch (error) {
            console.error(error)
            setReport(null)
        } finally {
            setLoading(false)
        }
    }

    const getReports = async () => {
        setLoading(true)
        try {
            const response = await getAllInterviewReports()
            setReports(response.interviewReports || [])
            return response.interviewReports
        } catch (error) {
            console.error(error)
            setReports([])
        } finally {
            setLoading(false)
        }
    }

    const downloadReportPdf = async (interviewReportId) => {
        setIsDownloadingPdf(true)
        try {
            const pdfBlob = await generateInterviewReportPdf({ interviewReportId })
            const url = window.URL.createObjectURL(new Blob([ pdfBlob ], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            const fileName = report?.title ? `${report.title.replace(/\s+/g, '_')}_Report.pdf` : `Interview_Report_${interviewReportId}.pdf`
            link.setAttribute("download", fileName)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error("PDF Download Error:", error)
            alert(getApiErrorMessage(error))
        } finally {
            setIsDownloadingPdf(false)
        }
    }

    const removeReport = async (id) => {
        setLoading(true)
        try {
            await deleteInterviewReport(id)
            setReports((prev) => prev.filter((r) => r._id !== id))
            if (report?._id === id) {
                setReport(null)
            }
        } catch (error) {
            console.error(error)
            alert(getApiErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        let isMounted = true
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
        return () => {
            isMounted = false
        }
    }, [ interviewId ])

    return {
        loading,
        isDownloadingPdf,
        report,
        reports,
        generateReport,
        getReportById,
        getReports,
        downloadReportPdf,
        removeReport
    }
}