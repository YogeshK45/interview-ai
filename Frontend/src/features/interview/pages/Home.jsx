import React, { useState, useRef } from 'react'
import "../style/home.scss"
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate } from 'react-router'
import { useAuth } from '../../auth/hooks/useAuth.js'

const Home = () => {
    const { loading, generateReport, reports, removeReport } = useInterview()
    const { user, handleLogout, loading: authLoading } = useAuth()
    const [ jobDescription, setJobDescription ] = useState("")
    const [ selfDescription, setSelfDescription ] = useState("")
    const [ resumeMeta, setResumeMeta ] = useState(null)
    const [ reportQuery, setReportQuery ] = useState("")
    const [ errorMessage, setErrorMessage ] = useState("")
    const resumeInputRef = useRef()

    const navigate = useNavigate()

    const handleGenerateReport = async () => {
        setErrorMessage("")
        const resumeFile = resumeInputRef.current?.files?.[ 0 ]

        // Validate Job Description
        if (!jobDescription.trim()) {
            setErrorMessage("Target Job Description is required.")
            return
        }

        if (jobDescription.trim().length < 20) {
            setErrorMessage("Job description should be at least 20 characters long.")
            return
        }

        // Validate Candidate Profile (Resume or Self Description)
        if (!selfDescription.trim() && !resumeFile) {
            setErrorMessage("Either a PDF Resume or a Quick Self-Description (or both) is required.")
            return
        }

        // Validate Resume file type & size if attached
        if (resumeFile) {
            if (resumeFile.type !== "application/pdf" && !resumeFile.name.endsWith(".pdf")) {
                setErrorMessage("Only PDF resume files are supported.")
                return
            }
            if (resumeFile.size > 10 * 1024 * 1024) {
                setErrorMessage("Resume file size exceeds the 10MB limit.")
                return
            }
        }

        try {
            const data = await generateReport({
                jobDescription: jobDescription.trim(),
                selfDescription: selfDescription.trim(),
                resumeFile
            })
            if (!data?._id) {
                setErrorMessage("Failed to generate report. Please try again.")
                return
            }
            navigate(`/interview/${data._id}`)
        } catch (e) {
            setErrorMessage(e?.message || "Failed to generate report. Please try again.")
        }
    }

    const handleResumeChange = (e) => {
        setErrorMessage("")
        const file = e.target.files?.[ 0 ]
        if (!file) {
            setResumeMeta(null)
            return
        }

        if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
            setErrorMessage("Invalid file format. Only PDF files are allowed.")
            e.target.value = ""
            setResumeMeta(null)
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            setErrorMessage("File size exceeds 10MB limit.")
            e.target.value = ""
            setResumeMeta(null)
            return
        }

        setResumeMeta({
            name: file.name,
            sizeMb: (file.size / (1024 * 1024)).toFixed(2)
        })
    }

    const clearResumeFile = (e) => {
        e.stopPropagation()
        if (resumeInputRef.current) {
            resumeInputRef.current.value = ""
        }
        setResumeMeta(null)
    }

    return (
        <div className='home-page'>
            {user && (
                <button
                    type="button"
                    className="logout-btn"
                    onClick={handleLogout}
                    disabled={authLoading}
                >
                    {authLoading ? "Logging out..." : "Logout"}
                </button>
            )}

            {/* Page Header */}
            <header className='page-header'>
                <h1>Create Your Custom <span className='highlight'>Interview Plan</span></h1>
                <p>Let our AI analyze the job requirements and your unique profile to build a winning strategy.</p>
            </header>

            {/* Main Card */}
            <div className='interview-card'>
                <div className='interview-card__body'>

                    {/* Left Panel - Job Description */}
                    <div className='panel panel--left'>
                        <div className='panel__header'>
                            <span className='panel__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                            </span>
                            <h2>Target Job Description</h2>
                            <span className='badge badge--required'>Required</span>
                        </div>
                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            className='panel__textarea'
                            placeholder={`Paste the full job description here...\ne.g. 'Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design...'`}
                            maxLength={5000}
                        />
                        {/* Live Character Counter Fix */}
                        <div className='char-counter'>{jobDescription.length} / 5000 characters</div>
                    </div>

                    {/* Vertical Divider */}
                    <div className='panel-divider' />

                    {/* Right Panel - Profile */}
                    <div className='panel panel--right'>
                        <div className='panel__header'>
                            <span className='panel__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </span>
                            <h2>Your Profile</h2>
                        </div>

                        {/* Upload Resume */}
                        <div className='upload-section'>
                            <label className='section-label'>
                                Upload Resume
                                <span className='badge badge--best'>Best Results</span>
                            </label>
                            <label className='dropzone' htmlFor='resume'>
                                <span className='dropzone__icon'>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                                </span>
                                <p className='dropzone__title'>Click to upload or drag &amp; drop</p>
                                <p className='dropzone__subtitle'>PDF only (Max 10MB)</p>
                                {resumeMeta && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                        <p className='dropzone__file' style={{ margin: 0 }}>
                                            Selected: <strong>{resumeMeta.name}</strong> ({resumeMeta.sizeMb} MB)
                                        </p>
                                        <button
                                            type="button"
                                            onClick={clearResumeFile}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            &times; Remove
                                        </button>
                                    </div>
                                )}
                                <input onChange={handleResumeChange} ref={resumeInputRef} hidden type='file' id='resume' name='resume' accept='.pdf' />
                            </label>
                        </div>

                        {errorMessage && (
                            <div className="error-banner" role="alert" style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                marginTop: '12px',
                                fontSize: '13px'
                            }}>
                                {errorMessage}
                            </div>
                        )}

                        {/* OR Divider */}
                        <div className='or-divider'><span>OR</span></div>

                        {/* Quick Self-Description */}
                        <div className='self-description'>
                            <label className='section-label' htmlFor='selfDescription'>Quick Self-Description</label>
                            <textarea
                                value={selfDescription}
                                onChange={(e) => setSelfDescription(e.target.value)}
                                id='selfDescription'
                                name='selfDescription'
                                className='panel__textarea panel__textarea--short'
                                placeholder="Briefly describe your experience, key skills, and years of experience if you don't have a resume handy..."
                            />
                        </div>

                        {/* Info Box */}
                        <div className='info-box'>
                            <span className='info-box__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" stroke="#1a1f27" strokeWidth="2" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="#1a1f27" strokeWidth="2" /></svg>
                            </span>
                            <p>Either a <strong>Resume</strong> or a <strong>Self Description</strong> is required to generate a personalized plan.</p>
                        </div>
                    </div>
                </div>

                {/* Card Footer */}
                <div className='interview-card__footer'>
                    <span className='footer-info'>AI-Powered Strategy Generation &bull; Fast Generation</span>
                    <button
                        onClick={handleGenerateReport}
                        disabled={loading}
                        className='generate-btn'
                        style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
                        {loading ? "Generating Your Plan..." : "Generate My Interview Strategy"}
                    </button>
                </div>
            </div>

            {/* Recent Reports List */}
            {reports.length > 0 && (
                <section className='recent-reports'>
                    <div className="recent-reports__header">
                        <h2>My Recent Interview Plans</h2>
                        <input
                            className="reports-search"
                            type="text"
                            placeholder="Search reports..."
                            value={reportQuery}
                            onChange={(e) => setReportQuery(e.target.value)}
                        />
                    </div>
                    <ul className='reports-list'>
                        {reports
                            .filter((r) => {
                                const q = reportQuery.trim().toLowerCase()
                                if (!q) return true
                                return (r.title || "").toLowerCase().includes(q)
                            })
                            .map(report => (
                                <li key={report._id} className='report-item'>
                                    <div className="report-item__main" onClick={() => navigate(`/interview/${report._id}`)}>
                                        <h3>{report.title || 'Untitled Position'}</h3>
                                        <p className='report-meta'>Generated on {new Date(report.createdAt).toLocaleDateString()}</p>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                            <span className={`match-score ${report.matchScore >= 80 ? 'score--high' : report.matchScore >= 60 ? 'score--mid' : 'score--low'}`}>
                                                Match: {report.matchScore || 0}%
                                            </span>
                                            {report.atsScore !== undefined && (
                                                <span className="match-score score--high" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
                                                    ATS: {report.atsScore}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="report-delete"
                                        onClick={() => removeReport(report._id)}
                                    >
                                        Delete
                                    </button>
                                </li>
                            ))}
                    </ul>
                </section>
            )}

            {/* Page Footer */}
            <footer className='page-footer'>
                <a href='#'>Privacy Policy</a>
                <a href='#'>Terms of Service</a>
                <a href='#'>Help Center</a>
            </footer>
        </div>
    )
}

export default Home