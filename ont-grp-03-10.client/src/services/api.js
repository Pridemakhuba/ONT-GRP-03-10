// ============================================================
// src/services/api.js
// Centralised Axios instance with JWT interceptors
// ============================================================
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('prs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
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
  login:   (data)    => api.post('/auth/login', data),
  me:      ()        => api.get('/auth/me'),
  logout:  ()        => api.post('/auth/logout'),
};

// ---- Users ----
export const usersApi = {
  getAll:       (search) => api.get('/users', { params: { search } }),
  getById:      (id)     => api.get(`/users/${id}`),
  updateRole:   (id, role) => api.put(`/users/${id}/role`, { role }),
  searchAD:     (search) => api.get('/users/import-from-ad', { params: { search } }),
  importUsers:  (data)   => api.post('/users/import', data),
};

// ---- Students ----
export const studentsApi = {
  getAll:   ()     => api.get('/students'),
  getById:  (id)   => api.get(`/students/${id}`),
  getMe:    ()     => api.get('/students/me'),
  create:   (data) => api.post('/students', data),
  update:   (id, data) => api.put(`/students/${id}`, data),
};

// ---- Supervisors ----
export const supervisorsApi = {
  getAll:   ()     => api.get('/supervisors'),
  getById:  (id)   => api.get(`/supervisors/${id}`),
  create:   (data) => api.post('/supervisors', data),
  update:   (id, data) => api.put(`/supervisors/${id}`, data),
};

// ---- Student-Supervisor Assignments ----
export const assignmentsApi = {
  assign:         (data) => api.post('/student-supervisors/assign', data),
  getByStudent:   (studentId) => api.get(`/student-supervisors/student/${studentId}`),
  getBySupervisor: (supervisorId) => api.get(`/student-supervisors/supervisor/${supervisorId}`),
  remove:         (id) => api.delete(`/student-supervisors/${id}`),
};

// ---- Proposals ----
export const proposalsApi = {
  getAll:           (status) => api.get('/proposals', { params: { status } }),
  getById:          (id)     => api.get(`/proposals/${id}`),
  getByStudent:     (studentId) => api.get(`/proposals/student/${studentId}`),
  getPendingEval:   ()       => api.get('/proposals/pending-evaluation'),
  create:           (formData) => api.post('/proposals', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update:           (id, data) => api.put(`/proposals/${id}`, data),
  submit:           (id)    => api.put(`/proposals/${id}/submit`),
  supervisorSignoff: (id)   => api.put(`/proposals/${id}/supervisor-signoff`),
  assignEvaluators: (id, data) => api.post(`/proposals/${id}/assign-evaluators`, data),
};

// ---- Evaluations ----
export const evaluationsApi = {
  submit:         (formData)    => api.post('/evaluations', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getById:        (id)          => api.get(`/evaluations/${id}`),
  getByProposal:  (proposalId)  => api.get(`/evaluations/proposal/${proposalId}`),
  getResults:     (proposalId)  => api.get(`/evaluations/proposal/${proposalId}/results`),
  getByEvaluator: (evaluatorId) => api.get(`/evaluations/evaluator/${evaluatorId}`),
};

// ---- Ethics Certificates ----
export const ethicsApi = {
  upload:        (formData)   => api.post('/ethics-certificates', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getByProposal: (proposalId) => api.get(`/ethics-certificates/proposal/${proposalId}`),
  delete:        (id)         => api.delete(`/ethics-certificates/${id}`),
};

// ---- Notifications ----
export const notificationsApi = {
  getAll:      ()   => api.get('/notifications'),
  getUnread:   ()   => api.get('/notifications/unread-count'),
  markRead:    (id) => api.put(`/notifications/${id}/read`),
  markAllRead: ()   => api.put('/notifications/mark-all-read'),
};
// ---- Deadlines ----
export const deadlinesApi = {
  getAll:    ()   => api.get('/deadlines'),
  getActive: ()   => api.get('/deadlines/active'),
  create:    (data) => api.post('/deadlines', data),
  update:    (id, data) => api.put(`/deadlines/${id}`, data),
  delete:    (id)  => api.delete(`/deadlines/${id}`),
};

export default api;
