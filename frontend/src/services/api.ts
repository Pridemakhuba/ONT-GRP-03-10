import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type {
  User,
  LoginResponse,
  Student,
  Supervisor,
  Proposal,
  Evaluation,
  EvaluationResults,
  EthicsCertificate,
  Notification,
  ADUser,
  ImportResults,
  Deadline,
  ReportParams,
  ReportSummary,
} from '../types';

// Vite exposes env vars via import.meta.env — make sure your tsconfig
// includes "vite/client" in "types" (or a src/vite-env.d.ts with
// `/// <reference types="vite/client" />`) so this doesn't error.
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Uploaded files (proposals, ethics certs, etc.) are served by the same
// backend as the API, under the same origin in dev — Vite proxies both
// /api and /Uploads to whatever port Aspire assigns the backend each run
// (see vite.config.ts). No hardcoded host needed. Only set
// VITE_FILE_BASE_URL if the frontend is ever served separately from the
// backend (e.g. a deployed static frontend pointing at a remote API).
export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL || '';

// Builds an absolute/openable URL for a file path returned by the API
// (e.g. "/Uploads/proposals/9/xyz.pdf", or an already-absolute "http://...").
export function resolveFileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${FILE_BASE_URL}${normalizedPath}`;
}

// Attach JWT token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('prs_token');
  if (token) {
    config.headers.set
      ? config.headers.set('Authorization', `Bearer ${token}`)
      : (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('prs_token');
      localStorage.removeItem('prs_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ---- Auth ----
export const authApi = {
  login: (data: { username: string; password: string }): Promise<AxiosResponse<LoginResponse>> =>
    api.post('/auth/login', data),
  me: (): Promise<AxiosResponse<User>> => api.get('/auth/me'),
  logout: (): Promise<AxiosResponse<void>> => api.post('/auth/logout'),
};

// ---- Users ----
export const usersApi = {
  getAll: (search?: string): Promise<AxiosResponse<User[]>> =>
    api.get('/users', { params: { search } }),
  getById: (id: number | string): Promise<AxiosResponse<User>> => api.get(`/users/${id}`),
  updateRole: (id: number | string, role: string): Promise<AxiosResponse<User>> =>
    api.put(`/users/${id}/role`, { role }),
  searchAD: (search: string): Promise<AxiosResponse<ADUser[]>> =>
    api.get('/users/import-from-ad', { params: { search } }),
  importUsers: (data: { aDUsernames: string[]; role: string }): Promise<AxiosResponse<ImportResults>> =>
    api.post('/users/import', data),
};

// ---- Students ----
export const studentsApi = {
  getAll: (): Promise<AxiosResponse<Student[]>> => api.get('/students'),
  getById: (id: number | string): Promise<AxiosResponse<Student>> => api.get(`/students/${id}`),
  getMe: (): Promise<AxiosResponse<Student>> => api.get('/students/me'),
  create: (data: Partial<Student> & { userID: number }): Promise<AxiosResponse<Student>> =>
    api.post('/students', data),
  update: (id: number | string, data: Partial<Student>): Promise<AxiosResponse<Student>> =>
    api.put(`/students/${id}`, data),
};

// ---- Supervisors ----
export const supervisorsApi = {
  getAll: (): Promise<AxiosResponse<Supervisor[]>> => api.get('/supervisors'),
  getById: (id: number | string): Promise<AxiosResponse<Supervisor>> => api.get(`/supervisors/${id}`),
  create: (data: Partial<Supervisor> & { userID: number }): Promise<AxiosResponse<Supervisor>> =>
    api.post('/supervisors', data),
  update: (id: number | string, data: Partial<Supervisor>): Promise<AxiosResponse<Supervisor>> =>
    api.put(`/supervisors/${id}`, data),
};

// ---- Student-Supervisor Assignments ----
export interface AssignmentResult {
  studentSupervisorID: number;
  studentID: number;
  supervisorID: number;
  isPrimary: boolean;
}

export const assignmentsApi = {
  assign: (data: { studentID: number; supervisorID: number; isPrimary?: boolean }): Promise<AxiosResponse<AssignmentResult>> =>
    api.post('/student-supervisors/assign', data),
  getByStudent: (studentId: number | string): Promise<AxiosResponse<Supervisor[]>> =>
    api.get(`/student-supervisors/student/${studentId}`),
  getBySupervisor: (supervisorId: number | string): Promise<AxiosResponse<Student[]>> =>
    api.get(`/student-supervisors/supervisor/${supervisorId}`),
  remove: (id: number | string): Promise<AxiosResponse<void>> =>
    api.delete(`/student-supervisors/${id}`),
};

// ---- Proposals ----
export const proposalsApi = {
  getAll: (status?: string): Promise<AxiosResponse<Proposal[]>> =>
    api.get('/proposals', { params: { status } }),
  getById: (id: number | string): Promise<AxiosResponse<Proposal>> => api.get(`/proposals/${id}`),
  getByStudent: (studentId: number | string): Promise<AxiosResponse<Proposal[]>> =>
    api.get(`/proposals/student/${studentId}`),
  getPendingEval: (): Promise<AxiosResponse<Proposal[]>> => api.get('/proposals/pending-evaluation'),
  create: (formData: FormData): Promise<AxiosResponse<Proposal>> =>
    api.post('/proposals', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: number | string, data: Partial<Proposal>): Promise<AxiosResponse<Proposal>> =>
    api.put(`/proposals/${id}`, data),
  submit: (id: number | string): Promise<AxiosResponse<Proposal>> =>
    api.put(`/proposals/${id}/submit`),
  supervisorSignoff: (id: number | string): Promise<AxiosResponse<Proposal>> =>
    api.put(`/proposals/${id}/supervisor-signoff`),
  assignEvaluators: (
    id: number | string,
    data: { proposalID: number; evaluatorIDs: number[] }
  ): Promise<AxiosResponse<Proposal>> => api.post(`/proposals/${id}/assign-evaluators`, data),
};

// ---- Evaluations ----
export const evaluationsApi = {
  submit: (formData: FormData): Promise<AxiosResponse<Evaluation>> =>
    api.post('/evaluations', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getById: (id: number | string): Promise<AxiosResponse<Evaluation>> => api.get(`/evaluations/${id}`),
  getByProposal: (proposalId: number | string): Promise<AxiosResponse<Evaluation[]>> =>
    api.get(`/evaluations/proposal/${proposalId}`),
  getResults: (proposalId: number | string): Promise<AxiosResponse<EvaluationResults>> =>
    api.get(`/evaluations/proposal/${proposalId}/results`),
  getByEvaluator: (evaluatorId: number | string): Promise<AxiosResponse<Evaluation[]>> =>
    api.get(`/evaluations/evaluator/${evaluatorId}`),
};

// ---- Ethics Certificates ----
export const ethicsApi = {
  upload: (formData: FormData): Promise<AxiosResponse<EthicsCertificate>> =>
    api.post('/ethics-certificates', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getByProposal: (proposalId: number | string): Promise<AxiosResponse<EthicsCertificate[]>> =>
    api.get(`/ethics-certificates/proposal/${proposalId}`),
  delete: (id: number | string): Promise<AxiosResponse<void>> =>
    api.delete(`/ethics-certificates/${id}`),
};

// ---- Notifications ----
export const notificationsApi = {
  getAll: (): Promise<AxiosResponse<Notification[]>> => api.get('/notifications'),
  getUnread: (): Promise<AxiosResponse<{ count: number }>> => api.get('/notifications/unread-count'),
  markRead: (id: number | string): Promise<AxiosResponse<void>> => api.put(`/notifications/${id}/read`),
  markAllRead: (): Promise<AxiosResponse<void>> => api.put('/notifications/mark-all-read'),
};

// ---- Deadlines ----
export const deadlinesApi = {
  getAll: (): Promise<AxiosResponse<Deadline[]>> => api.get('/deadlines'),
  getActive: (): Promise<AxiosResponse<Deadline[]>> => api.get('/deadlines/active'),
  create: (data: Omit<Deadline, 'deadlineID'>): Promise<AxiosResponse<Deadline>> =>
    api.post('/deadlines', data),
  update: (id: number | string, data: Partial<Deadline>): Promise<AxiosResponse<Deadline>> =>
    api.put(`/deadlines/${id}`, data),
  delete: (id: number | string): Promise<AxiosResponse<void>> => api.delete(`/deadlines/${id}`),
};

// ---- Reports ----
export const reportsApi = {
  getSummary: (): Promise<AxiosResponse<ReportSummary>> => api.get('/reports/summary'),
  getProposalSubmissions: (params?: ReportParams): Promise<AxiosResponse<unknown>> =>
    api.get('/reports/proposal-submissions', { params }),
  getEvaluationResults: (params?: ReportParams): Promise<AxiosResponse<unknown>> =>
    api.get('/reports/evaluation-results', { params }),
  getSupervisorWorkload: (params?: ReportParams): Promise<AxiosResponse<unknown>> =>
    api.get('/reports/supervisor-workload', { params }),
  getStudentProgress: (params?: ReportParams): Promise<AxiosResponse<unknown>> =>
    api.get('/reports/student-progress', { params }),
  getDepartmentPerformance: (params?: ReportParams): Promise<AxiosResponse<unknown>> =>
    api.get('/reports/department-performance', { params }),
  getDeadlineCompliance: (params?: ReportParams): Promise<AxiosResponse<unknown>> =>
    api.get('/reports/deadline-compliance', { params }),
};

export default api;