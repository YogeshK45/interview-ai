import React, { useState, useEffect } from 'react'
import '../style/interview.scss'
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate, useParams } from 'react-router'

const getPreparationPlanTitle = (duration) => {
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

const getNavItems = (duration) => [
    { id: 'technical', label: 'Technical Questions', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>) },
    { id: 'behavioral', label: 'Behavioral Questions', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>) },
    { id: 'hr', label: 'HR Questions', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>) },
    { id: 'project', label: 'Project Questions', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>) },
    { id: 'coding', label: 'Coding Questions', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 6 2 12 8 18" /><polyline points="16 18 22 12 16 6" /></svg>) },
    { id: 'systemDesign', label: 'System Design', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>) },
    { id: 'roadmap', label: getPreparationPlanTitle(duration), icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>) },
    { id: 'recommendations', label: 'Final Recommendations', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>) },
]

// ── Sub-components ────────────────────────────────────────────────────────────
const QuestionCard = ({ item, index }) => {
    const [ open, setOpen ] = useState(false)
    return (
        <div className='q-card'>
            <div className='q-card__header' onClick={() => setOpen(o => !o)}>
                <span className='q-card__index'>Q{index + 1}</span>
                <p className='q-card__question'>{item.question}</p>
                <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
            </div>
            {open && (
                <div className='q-card__body'>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--intention'>Intention</span>
                        <p>{item.intention}</p>
                    </div>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--answer'>Model Answer</span>
                        <p>{item.answer}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

const RoadMapDay = ({ day, duration }) => {
    const isShortTime = duration === '30_minutes' || duration === '1_hour' || duration === '2_hours' || duration === 'tomorrow';
    const badgeLabel = isShortTime ? `Step ${day.day}` : `Day ${day.day}`;

    return (
        <div className='roadmap-day'>
            <div className='roadmap-day__header'>
                <span className='roadmap-day__badge'>{badgeLabel}</span>
                <h3 className='roadmap-day__focus'>{day.focus}</h3>
            </div>
            <ul className='roadmap-day__tasks'>
                {(day.tasks || []).map((task, i) => (
                    <li key={i}>
                        <span className='roadmap-day__bullet' />
                        {task}
                    </li>
                ))}
            </ul>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
const Interview = () => {
    const [ activeNav, setActiveNav ] = useState('technical')
    const { report, getReportById, loading, isDownloadingPdf, downloadReportPdf } = useInterview()
    const { interviewId } = useParams()
    const navigate = useNavigate()

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        }
    }, [ interviewId ])

    if (loading || !report) {
        return (
            <main className='loading-screen'>
                <h1>Loading your interview report...</h1>
            </main>
        )
    }

    const navItems = getNavItems(report.preparationDuration)

    const matchScoreColor =
        (report.matchScore || 0) >= 80 ? 'score--high' :
            (report.matchScore || 0) >= 60 ? 'score--mid' : 'score--low'

    const renderQuestionSection = (title, list = []) => (
        <section>
            <div className='content-header'>
                <h2>{title}</h2>
                <span className='content-header__count'>{list.length} questions</span>
            </div>
            {list.length === 0 ? (
                <p style={{ color: '#94a3b8', fontStyle: 'italic', padding: '1rem 0' }}>No questions generated for this section.</p>
            ) : (
                <div className='q-list'>
                    {list.map((q, i) => (
                        <QuestionCard key={i} item={q} index={i} />
                    ))}
                </div>
            )}
        </section>
    )

    return (
        <div className='interview-page'>
            {/* Top Back Navigation Bar */}
            <div style={{ padding: '1rem 2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                    type="button"
                    onClick={() => navigate('/app')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#a5b4fc',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    &larr; Back to Dashboard
                </button>
                <h1 style={{ fontSize: '1.2rem', color: '#f8fafc', fontWeight: '700' }}>
                    {report.title || "Interview Strategy Report"}
                </h1>
            </div>

            <div className='interview-layout'>

                {/* ── Left Nav ── */}
                <nav className='interview-nav'>
                    <div className="nav-content">
                        <p className='interview-nav__label'>Report Sections</p>
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`}
                                onClick={() => setActiveNav(item.id)}
                            >
                                <span className='interview-nav__icon'>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                    {/* Professional PDF Download Button */}
                    <button
                        onClick={() => downloadReportPdf(interviewId)}
                        disabled={isDownloadingPdf}
                        className='button primary-button'
                        style={{ opacity: isDownloadingPdf ? 0.7 : 1, cursor: isDownloadingPdf ? 'wait' : 'pointer', marginTop: '1rem' }}
                    >
                        <svg height="0.9rem" style={{ marginRight: "0.5rem" }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 16l-5-5h3V4h4v7h3l-5 5zm9 4H3v-2h18v2z" />
                        </svg>
                        {isDownloadingPdf ? "Generating PDF..." : "Download Interview Report PDF"}
                    </button>
                </nav>

                <div className='interview-divider' />

                {/* ── Center Content ── */}
                <main className='interview-content'>
                    {/* Executive Summary Card at the top of content */}
                    {report.resumeSummary && (
                        <div style={{
                            background: 'rgba(30, 41, 59, 0.7)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            marginBottom: '1.5rem'
                        }}>
                            <h3 style={{ color: '#818cf8', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                                Executive Resume Summary
                            </h3>
                            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                {report.resumeSummary}
                            </p>
                        </div>
                    )}

                    {activeNav === 'technical' && renderQuestionSection("Technical Questions", report.technicalQuestions)}
                    {activeNav === 'behavioral' && renderQuestionSection("Behavioral Questions", report.behavioralQuestions)}
                    {activeNav === 'hr' && renderQuestionSection("HR & Cultural Fit Questions", report.hrQuestions)}
                    {activeNav === 'project' && renderQuestionSection("Project Architecture Questions", report.projectQuestions)}
                    {activeNav === 'coding' && renderQuestionSection("Coding & Algorithm Questions", report.codingQuestions)}
                    {activeNav === 'systemDesign' && renderQuestionSection("System Design Questions", report.systemDesignQuestions)}

                    {activeNav === 'roadmap' && (
                        <section>
                            <div className='content-header'>
                                <h2>{getPreparationPlanTitle(report.preparationDuration)}</h2>
                                <span className='content-header__count'>{(report.preparationPlan || []).length} steps</span>
                            </div>
                            <div className='roadmap-list'>
                                {(report.preparationPlan || []).map((day) => (
                                    <RoadMapDay key={day.day} day={day} duration={report.preparationDuration} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'recommendations' && (
                        <section>
                            <div className='content-header'>
                                <h2>Final Recommendations</h2>
                            </div>
                            <div className='q-list'>
                                {(report.finalRecommendations || []).map((rec, i) => (
                                    <div key={i} className='q-card' style={{ padding: '1rem', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <span style={{ background: '#4f46e5', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0 }}>
                                            {i + 1}
                                        </span>
                                        <p style={{ color: '#e2e8f0', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>{rec}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </main>

                <div className='interview-divider' />

                {/* ── Right Sidebar ── */}
                <aside className='interview-sidebar'>

                    {/* Candidate Name */}
                    {report.candidateName && (
                        <div style={{ marginBottom: '1.25rem' }}>
                            <p className='match-score__label'>Candidate</p>
                            <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: '700' }}>{report.candidateName}</h3>
                        </div>
                    )}

                    {/* Match Score & ATS Score */}
                    <div className='match-score'>
                        <p className='match-score__label'>Match Score</p>
                        <div className={`match-score__ring ${matchScoreColor}`}>
                            <span className='match-score__value'>{report.matchScore || 0}</span>
                            <span className='match-score__pct'>%</span>
                        </div>
                        <p className='match-score__sub'>Overall Match for Role</p>
                    </div>

                    {report.atsScore !== undefined && (
                        <div className='match-score' style={{ marginTop: '1rem' }}>
                            <p className='match-score__label'>ATS Score</p>
                            <div className="match-score__ring score--high" style={{ borderColor: '#34d399' }}>
                                <span className='match-score__value' style={{ color: '#34d399' }}>{report.atsScore}</span>
                                <span className='match-score__pct' style={{ color: '#34d399' }}>%</span>
                            </div>
                            <p className='match-score__sub'>ATS Resume Compatibility</p>
                        </div>
                    )}

                    <div className='sidebar-divider' />

                    {/* Skills Found */}
                    {report.skillsFound && report.skillsFound.length > 0 && (
                        <div className='skill-gaps' style={{ marginBottom: '1.5rem' }}>
                            <p className='skill-gaps__label' style={{ color: '#34d399' }}>Skills Found</p>
                            <div className='skill-gaps__list'>
                                {report.skillsFound.map((skill, i) => (
                                    <span key={i} className='skill-tag' style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Missing Skills / Gaps */}
                    <div className='skill-gaps'>
                        <p className='skill-gaps__label'>Skill Gaps</p>
                        <div className='skill-gaps__list'>
                            {(report.skillGaps || []).map((gap, i) => (
                                <span key={i} className={`skill-tag skill-tag--${gap.severity}`} title={gap.recommendation || ""}>
                                    {gap.skill} ({gap.severity})
                                </span>
                            ))}
                        </div>
                    </div>

                </aside>
            </div>
        </div>
    )
}

export default Interview