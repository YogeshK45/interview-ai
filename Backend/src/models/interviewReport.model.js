const mongoose = require('mongoose');

const qnaSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [ true, "Question is required" ]
    },
    intention: {
        type: String,
        required: [ true, "Intention is required" ]
    },
    answer: {
        type: String,
        required: [ true, "Answer is required" ]
    }
}, {
    _id: false
});

const skillGapSchema = new mongoose.Schema({
    skill: {
        type: String,
        required: [ true, "Skill is required" ]
    },
    severity: {
        type: String,
        enum: [ "low", "medium", "high" ],
        required: [ true, "Severity is required" ]
    },
    recommendation: {
        type: String,
        default: ""
    }
}, {
    _id: false
});

const preparationPlanSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: [ true, "Day is required" ]
    },
    focus: {
        type: String,
        required: [ true, "Focus is required" ]
    },
    tasks: [ {
        type: String,
        required: [ true, "Task is required" ]
    } ]
}, {
    _id: false
});

const interviewReportSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true
    },
    title: {
        type: String,
        required: [ true, "Job title is required" ]
    },
    jobDescription: {
        type: String,
        required: [ true, "Job description is required" ]
    },
    resume: {
        type: String,
        default: ""
    },
    selfDescription: {
        type: String,
        default: ""
    },
    candidateName: {
        type: String,
        default: "Candidate"
    },
    matchScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 70
    },
    atsScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 75
    },
    resumeSummary: {
        type: String,
        default: ""
    },
    skillsFound: [ {
        type: String
    } ],
    skillGaps: [ skillGapSchema ],
    hrQuestions: [ qnaSchema ],
    technicalQuestions: [ qnaSchema ],
    projectQuestions: [ qnaSchema ],
    codingQuestions: [ qnaSchema ],
    behavioralQuestions: [ qnaSchema ],
    systemDesignQuestions: [ qnaSchema ],
    preparationPlan: [ preparationPlanSchema ],
    finalRecommendations: [ {
        type: String
    } ]
}, {
    timestamps: true
});

interviewReportSchema.index({ user: 1, createdAt: -1 });

const interviewReportModel = mongoose.model("InterviewReport", interviewReportSchema);

module.exports = interviewReportModel;