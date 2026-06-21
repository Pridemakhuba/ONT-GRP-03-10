const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://localhost:7001/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Dashboard
  getStats:       ()           => request("/dashboard/stats"),

  // Students
  getStudents:    ()           => request("/students"),
  getStudent:     (id)         => request(`/students/${id}`),
  createStudent:  (data)       => request("/students",       { method: "POST", body: JSON.stringify(data) }),
  updateStudent:  (id, data)   => request(`/students/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteStudent:  (id)         => request(`/students/${id}`, { method: "DELETE" }),

  // Proposals
  getProposals:   (status)     => request(`/proposals${status ? `?status=${status}` : ""}`),
  createProposal: (data)       => request("/proposals",      { method: "POST", body: JSON.stringify(data) }),
  updateProposalStatus: (id, data) => request(`/proposals/${id}/status`, { method: "PATCH", body: JSON.stringify(data) }),

  // Evaluator / Review Queue
  // evaluatorId is the logged-in user's evaluator/supervisor record.
  // Backend excludes proposals where studentId belongs to this evaluator's own supervisees.
  getReviewQueue: (evaluatorId) => request(`/proposals/review-queue?evaluatorId=${evaluatorId}`),
  submitReview:   (proposalId, data) => request(`/proposals/${proposalId}/review`, { method: "POST", body: JSON.stringify(data) }),

  // Milestones
  getMilestones:  ()           => request("/milestones"),

  // Submissions
  getSubmissions: ()           => request("/submissions"),
};
