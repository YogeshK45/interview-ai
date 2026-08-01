import axios from "axios";

/**
 * Axios instance with baseline configurations
 */
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
});

/**
 * Service to trigger interview report generation.
 * Appends optional preparationDuration while keeping existing structure intact.
 */
export const generateInterviewReport = async ({ jobDescription, selfDescription, resumeFile, preparationDuration = "30_days" }) => {
    const formData = new FormData();
    formData.append("jobDescription", jobDescription);
    formData.append("selfDescription", selfDescription);
    formData.append("preparationDuration", preparationDuration);

    if (resumeFile) {
        formData.append("resume", resumeFile);
    }

    const response = await api.post("/api/interview/", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        },
        timeout: 130000,
    });

    return response.data;
};

/**
 * Service to fetch interview report by interviewId.
 */
export const getInterviewReportById = async (interviewId) => {
    const response = await api.get(`/api/interview/report/${interviewId}`);
    return response.data;
};

/**
 * Service to fetch all interview reports for the logged-in user.
 */
export const getAllInterviewReports = async () => {
    const response = await api.get("/api/interview/");
    return response.data;
};

/**
 * Service to delete an interview report by interviewId.
 */
export const deleteInterviewReport = async (interviewId) => {
    const response = await api.delete(`/api/interview/${interviewId}`);
    return response.data;
};

/**
 * Service to request PDF generation and download.
 */
export const generateInterviewReportPdf = async ({ interviewReportId }) => {
    const response = await api.post(`/api/interview/report/pdf/${interviewReportId}`, null, {
        responseType: "blob",
        timeout: 60000
    });

    return response.data;
};