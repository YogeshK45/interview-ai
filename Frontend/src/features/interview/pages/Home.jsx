import React, { useState, useRef, useCallback } from 'react'
import "../style/home.scss"
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate } from 'react-router'
import { useAuth } from '../../auth/hooks/useAuth.js'

const Home = () => {
    const { loading, progressMessage, generateReport, reports, removeReport } = useInterview()
    const { user, handleLogout, loading: authLoading } = useAuth()
    const [ jobDescription, setJobDescription ] = useState("")
    const [ selfDescription, setSelfDescription ] = useState("")
    const [ preparationDuration, setPreparationDuration ] = useState("30_days")
    const [ resumeMeta, setResumeMeta ] = useState(null)
    const [ reportQuery, setReportQuery ] = useState("")
    const [ errorMessage, setErrorMessage ] = useState("")
    const resumeInputRef = useRef()

    const navigate = useNavigate()

    const handleGenerateReport = useCallback(async () => {
        if (loading) return;
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
                resumeFile,
                preparationDuration
            })
            if (!data?._id) {
                setErrorMessage("Failed to generate report. Please try again.")
                return
            }
            navigate(`/interview/${data._id}`)
        } catch (e) {
            setErrorMessage(e?.message || "Failed to generate report. Please try again.")
        }
    }, [ loading, jobDescription, selfDescription, preparationDuration, generateReport, navigate ])

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
                    disabled={authLoading || loading}
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
                            disabled={loading}
                            className='panel__textarea'
                            placeholder={`Paste the full job description here...\ne.g. 'Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design...'`}
                            maxLength={5000}
                        />
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
                            <label className={`dropzone ${loading ? 'dropzone--disabled' : ''}`} htmlFor='resume' style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
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
                                        {!loading && (
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
                                        )}
                                    </div>
                                )}
                                <input onChange={handleResumeChange} ref={resumeInputRef} disabled={loading} hidden type='file' id='resume' name='resume' accept='.pdf' />
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
                                disabled={loading}
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

                {/* Progress banner when loading */}
                {loading && (
                    <div className="progress-banner" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#a5b4fc',
                        padding: '12px 20px',
                        margin: '0 24px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                        </svg>
                        <span>{progressMessage || "Generating your plan..."}</span>
                        <style>{`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}</style>
                    </div>
                )}

                {/* Card Footer */}
                <div className='interview-card__footer' style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <div className='prep-time-selector' style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label htmlFor='prepDuration' style={{ fontSize: '0.85rem', color: '#7d8590', fontWeight: 500 }}>
                            Preparation Time:
                        </label>
                        <select
                            id='prepDuration'
                            value={preparationDuration}
                            onChange={(e) => setPreparationDuration(e.target.value)}
                            disabled={loading}
                            style={{
                                backgroundColor: '#1e2535',
                                color: '#e6edf3',
                                border: '1px solid #2a3348',
                                borderRadius: '0.5rem',
                                padding: '0.45rem 0.75rem',
                                fontSize: '0.85rem',
                                outline: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <option value="30_minutes">Interview in 30 Minutes</option>
                            <option value="1_hour">Interview in 1 Hour</option>
                            <option value="2_hours">Interview in 2 Hours</option>
                            <option value="tomorrow">Interview Tomorrow</option>
                            <option value="3_days">3 Days</option>
                            <option value="7_days">7 Days</option>
                            <option value="15_days">15 Days</option>
                            <option value="30_days">30 Days (Default)</option>
                            <option value="60_days">60 Days</option>
                            <option value="90_days">90 Days</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerateReport}
                        disabled={loading}
                        className='generate-btn'
                        style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', marginLeft: 'auto' }}
                    >
                        {loading ? (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                                </svg>
                                <span>Generating Plan...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
                                <span>Generate My Interview Strategy</span>
                            </>
                        )}
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
                            disabled={loading}
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
                                    <div className="report-item__main" onClick={() => !loading && navigate(`/interview/${report._id}`)}>
                                        <h3>{report.title || 'Untitled Position'}</h3>
                                        <p className='report-meta'>Generated on {new Date(report.createdAt).toLocaleDateString()}</p>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                            <span className={`match-score ${report.matchScore >= 80 ? 'score--high' : report.matchScore >= 60 ? 'score--mid' : 'score--low'}`}>
                                                Match: {report.matchScore || 0}%
                                            </span>
                                            {report.atsScore !== undefined && (
                                                <span className="match-score score--high" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
                                                    ATS: {report.atsScore}%
                                                </span>
                                            )}
                                            {report.status && (
                                                <span className="match-score" style={{
                                                    background: report.status === 'completed' ? 'rgba(59, 130, 246, 0.15)' : report.status === 'pending' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                    color: report.status === 'completed' ? '#60a5fa' : report.status === 'pending' ? '#facc15' : '#f87171'
                                                }}>
                                                    {report.status.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="report-delete"
                                        onClick={() => removeReport(report._id)}
                                        disabled={loading}
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