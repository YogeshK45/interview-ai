import { deleteInterviewReport, getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateInterviewReportPdf } from "../services/interview.api"
import { useContext, useEffect, useState, useCallback } from "react"
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

    const {
        loading,
        setLoading,
        progressMessage,
        setProgressMessage,
        report,
        setReport,
        reports,
        setReports
    } = context

    const [ isDownloadingPdf, setIsDownloadingPdf ] = useState(false)

    const pollReportStatus = useCallback(async (pendingInterviewId) => {
        const progressSteps = [
            "Analyzing profile and matching skills...",
            "Generating custom preparation roadmap...",
            "Finalizing interview strategy report..."
        ];
        let stepIdx = 0;
        let attempts = 0;
        const maxAttempts = 30;

        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                attempts++;
                stepIdx = (stepIdx + 1) % progressSteps.length;
                setProgressMessage(`Generating plan... ${progressSteps[ stepIdx ]}`);

                try {
                    const response = await getInterviewReportById(pendingInterviewId);
                    const fetchedReport = response?.interviewReport;

                    if (fetchedReport?.status === "completed") {
                        clearInterval(interval);
                        setReport(fetchedReport);
                        resolve(fetchedReport);
                    } else if (fetchedReport?.status === "failed") {
                        clearInterval(interval);
                        reject(new Error(fetchedReport.statusReason || "Generation failed."));
                    } else if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        reject(new Error("Report generation timed out. Please try again."));
                    }
                } catch (err) {
                    clearInterval(interval);
                    reject(new Error(getApiErrorMessage(err)));
                }
            }, 2000);
        });
    }, [ setProgressMessage, setReport ]);

    const generateReport = async ({ jobDescription, selfDescription, resumeFile, preparationDuration }) => {
        if (loading) return;
        setLoading(true);
        setProgressMessage("Initializing request and parsing resume...");

        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile, preparationDuration });

            if (response?.status === "completed" && response?.interviewReport) {
                setReport(response.interviewReport);
                return response.interviewReport;
            }

            if (response?.status === "pending" && response?.interviewId) {
                setProgressMessage("Your plan is being generated in background...");
                const finalReport = await pollReportStatus(response.interviewId);
                return finalReport;
            }

            if (response?.interviewReport) {
                setReport(response.interviewReport);
                return response.interviewReport;
            }

            throw new Error("Unexpected response format from server.");
        } catch (error) {
            console.error("Report Generation Error:", error);
            throw new Error(getApiErrorMessage(error));
        } finally {
            setLoading(false);
            setProgressMessage("");
        }
    };

    const getReportById = useCallback(async (id) => {
        setLoading(true);
        try {
            const response = await getInterviewReportById(id);
            setReport(response.interviewReport);
            return response.interviewReport;
        } catch (error) {
            console.error("Fetch Report Error:", error);
            setReport(null);
        } finally {
            setLoading(false);
        }
    }, [ setLoading, setReport ]);

    const getReports = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getAllInterviewReports();
            setReports(response.interviewReports || []);
            return response.interviewReports;
        } catch (error) {
            console.error("Fetch Reports Error:", error);
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, [ setLoading, setReports ]);

    const downloadReportPdf = async (interviewReportId) => {
        setIsDownloadingPdf(true);
        try {
            const pdfBlob = await generateInterviewReportPdf({ interviewReportId });
            const url = window.URL.createObjectURL(new Blob([ pdfBlob ], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            const fileName = report?.title ? `${report.title.replace(/\s+/g, '_')}_Report.pdf` : `Interview_Report_${interviewReportId}.pdf`;
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("PDF Download Error:", error);
            alert(getApiErrorMessage(error));
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const removeReport = async (id) => {
        setLoading(true);
        try {
            await deleteInterviewReport(id);
            setReports((prev) => prev.filter((r) => r._id !== id));
            if (report?._id === id) {
                setReport(null);
            }
        } catch (error) {
            console.error("Delete Report Error:", error);
            alert(getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId);
        } else {
            getReports();
        }
    }, [ interviewId, getReportById, getReports ]);

    return {
        loading,
        progressMessage,
        isDownloadingPdf,
        report,
        reports,
        generateReport,
        getReportById,
        getReports,
        downloadReportPdf,
        removeReport
    };
};