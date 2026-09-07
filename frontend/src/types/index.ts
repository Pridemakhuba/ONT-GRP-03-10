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

export type ProposalStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'Accepted'
  | 'Rejected'
  | 'Revised';

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
  submissionDate?: string | null;
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

export interface Evaluation extends EvaluationScores {
  rubricID: number;
  proposalID: number;
  evaluatorName?: string;
  totalScore: number;
  sectionScores?: SectionScores;
  recommendation: Recommendation;
  feedbackNotes: string;
  confidentialNotes?: string;
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
  title: string;
  dueDate: string;
  isActive: boolean;
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