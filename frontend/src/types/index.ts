// src/types/index.ts
// Shared domain types used across services and components

export type UserRole = 'Student' | 'Supervisor' | 'Evaluator' | 'Admin';

export interface User {
    userID: number;
    firstName: string;
    lastName: string;
    fullName?: string;
    username?: string;
    aDUsername: string;
    email: string;
    department?: string;
    title?: string;
    role: UserRole;
    isActive?: boolean;
    lastLoginDate?: string | null;
}

export interface LoginResponse extends User {
    token: string;
}

export interface Supervisor {
    supervisorID: number;
    userID: number;
    user: User;
    expertise?: string;
    isPrimary?: boolean;
}

export interface Student {
    studentID: number;
    userID: number;
    user: User;
    studentNumber: string;
    program: string;
    researchTopic?: string;
    supervisors?: Supervisor[];
}

// ---- NEW WORKFLOW STATUSES ----
export type ProposalStatus =
    | 'PENDING_ALLOCATION'
    | 'SUPERVISION_STAGE'
    | 'REVISION_REQUIRED'
    | 'READY_FOR_EXAMINATION'
    | 'UNDER_EVALUATION'
    | 'APPROVED_GRADUATION'
    | 'REJECTED';

export interface AssignedEvaluator {
    proposalEvaluatorID: number;
    evaluatorID: number;
    evaluatorName: string;
    assignedDate: string;
    hasSubmittedEvaluation: boolean;
}

export interface Proposal {
    proposalID: number;
    studentID: number;
    title: string;
    abstract: string;
    keywords?: string;
    status: ProposalStatus;
    supervisorSigned?: boolean;
    supervisorSignedDate?: string | null;
    submissionDate?: string | null;
    createdDate?: string;
    documentPath?: string;
    student?: Student;
    assignedEvaluators?: AssignedEvaluator[];
}

export interface SectionScores {
    section1Percentage: number;
    section2Percentage: number;
    section3Percentage: number;
    section4Percentage: number;
}

export type Recommendation =
    | 'Accept'
    | 'Minor Revisions'
    | 'Major Revisions'
    | 'Resubmit'
    | 'Reject';

export interface EvaluationScores {
    clarityScore: number;
    literatureScore: number;
    methodologyScore: number;
    feasibilityScore: number;
    noveltyScore: number;
    contributionScore: number;
    innovationScore: number;
    writingScore: number;
    logicScore: number;
    citationScore: number;
    ethicsScore: number;
    riskScore: number;
}

// ---- Comment fields per criterion ----
export interface EvaluationComments {
    clarityComment?: string;
    literatureComment?: string;
    methodologyComment?: string;
    feasibilityComment?: string;
    noveltyComment?: string;
    contributionComment?: string;
    innovationComment?: string;
    writingComment?: string;
    logicComment?: string;
    citationComment?: string;
    ethicsComment?: string;
    riskComment?: string;
}

export interface Evaluation extends EvaluationScores, EvaluationComments {
    rubricID: number;
    proposalID: number;
    evaluatorID?: number;
    evaluatorName?: string;
    totalScore: number;
    sectionScores?: SectionScores;
    recommendation: Recommendation;
    feedbackNotes: string;
    confidentialNotes?: string;
    evaluationDocumentPath?: string;
    submittedDate: string;
}

export interface EvaluationResults {
    averageScore: number;
    evaluatorCount: number;
    overallDecision: string;
    evaluations: Evaluation[];
}

export interface EthicsCertificate {
    ethicsID: number;
    proposalID: number;
    certificateNumber: string;
    issuedDate: string;
    expiryDate?: string | null;
}

export interface Notification {
    notificationID: number;
    message: string;
    type?: string;
    isRead: boolean;
    createdDate: string;
}

export interface ADUser {
    aDUsername: string;
    firstName: string;
    lastName: string;
    email?: string;
    department?: string;
    title?: string;
    alreadyInSystem: boolean;
}

export interface ImportResultItem {
    username: string;
    status: 'Imported' | 'Updated' | 'Failed';
    reason?: string;
}

export interface ImportResults {
    imported: number;
    results: ImportResultItem[];
}

export interface ApiErrorResponse {
    message?: string;
}

export interface Deadline {
    deadlineID: number;
    name: string;
    deadlineType: string;
    dueDate: string;
    isActive: boolean;
}

// ---- Progress Report types ----
export interface ProgressReport {
    progressReportID: number;
    studentID: number;
    supervisorID: number;
    supervisorName?: string;
    studentName?: string;
    studentNumber?: string;
    academicYear: number;
    progressStatus?: string;    // Good | Poor | Excellent
    anticipatedCompletionDate?: string | null;
    standingStatus?: string;    // Good standing | Conditional | De-registration
    comments?: string;
    submittedDate: string;
}

export interface CreateProgressReport {
    studentID: number;
    academicYear: number;
    progressStatus: string;
    anticipatedCompletionDate?: string | null;
    standingStatus?: string;
    comments?: string;
}

export interface ReportParams {
    from?: string;
    to?: string;
    department?: string;
    [key: string]: unknown;
}

export interface ReportSummary {
    totalProposals: number;
    totalStudents: number;
    totalSupervisors: number;
    totalEvaluators: number;
    [key: string]: unknown;
}