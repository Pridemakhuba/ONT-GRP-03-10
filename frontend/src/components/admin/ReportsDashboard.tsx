// src/components/admin/ReportsDashboard.tsx
import { useEffect, useState } from 'react';
import { reportsApi } from '../../services/api';
import { toast } from 'react-toastify';

interface ReportSummary {
    totalProposals?: number;
    totalAccepted?: number;
    totalRejected?: number;
    totalUnderReview?: number;
    totalStudents?: number;
    averageScore?: number;
}

export default function ReportsDashboard() {
    const [summary, setSummary] = useState<ReportSummary | null>(null);
    const [reportType, setReportType] = useState('proposals');
    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: '',
        department: ''
    });

    useEffect(() => { loadSummary(); }, []);

    async function loadSummary() {
        try {
            const res = await reportsApi.getSummary();
            setSummary(res.data as ReportSummary);
        } catch {
            toast.error('Failed to load summary');
        } finally {
            setLoading(false);
        }
    }

    async function loadReport() {
        setLoading(true);
        const params: any = {};
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
        if (filters.status) params.status = filters.status;
        if (filters.department) params.department = filters.department;

        try {
            let res;
            if (reportType === 'proposals') res = await reportsApi.getProposalSubmissions(params);
            else if (reportType === 'evaluations') res = await reportsApi.getEvaluationResults(params);
            else if (reportType === 'workload') res = await reportsApi.getSupervisorWorkload(params);
            else if (reportType === 'student-progress') res = await reportsApi.getStudentProgress(params);
            else if (reportType === 'department') res = await reportsApi.getDepartmentPerformance(params);
            else if (reportType === 'deadline') res = await reportsApi.getDeadlineCompliance(params);
            setReportData((res?.data as any[]) || []);
        } catch {
            toast.error('Failed to load report');
        } finally {
            setLoading(false);
        }
    }

    async function exportCSV() {
        setExporting(true);
        const params: any = { ...filters, format: 'csv' };

        try {
            let res: any;
            if (reportType === 'proposals') res = await reportsApi.getProposalSubmissions(params);
            else if (reportType === 'evaluations') res = await reportsApi.getEvaluationResults(params);
            else if (reportType === 'workload') res = await reportsApi.getSupervisorWorkload(params);
            else if (reportType === 'student-progress') res = await reportsApi.getStudentProgress(params);
            else if (reportType === 'department') res = await reportsApi.getDepartmentPerformance(params);
            else if (reportType === 'deadline') res = await reportsApi.getDeadlineCompliance(params);

            const blob = new Blob([res.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            toast.success('CSV exported!');
        } catch {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    }

    if (loading && !summary) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Reports & Analytics</h1>
                <p className="page-subtitle">Dynamic reports with filters and CSV export</p>
            </div>

            {summary && (
                <div className="stats-grid" style={{ marginBottom: 24 }}>
                    <div className="stat-card">
                        <div className="stat-icon navy">📄</div>
                        <div>
                            <div className="stat-value">{summary.totalProposals ?? 0}</div>
                            <div className="stat-label">Total Proposals</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green">✅</div>
                        <div>
                            <div className="stat-value">{summary.totalAccepted ?? 0}</div>
                            <div className="stat-label">Accepted</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon gold">⏳</div>
                        <div>
                            <div className="stat-value">{summary.totalUnderReview ?? 0}</div>
                            <div className="stat-label">Under Review</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon navy">🎓</div>
                        <div>
                            <div className="stat-value">{summary.totalStudents ?? 0}</div>
                            <div className="stat-label">Students</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Generate Report</h3>
                </div>

                {/* Report type buttons */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                    <button onClick={() => { setReportType('proposals'); setReportData([]); }}
                        className={`btn ${reportType === 'proposals' ? 'btn-primary' : 'btn-outline-primary'}`}>
                        📄 Proposals
                    </button>
                    <button onClick={() => { setReportType('evaluations'); setReportData([]); }}
                        className={`btn ${reportType === 'evaluations' ? 'btn-primary' : 'btn-outline-primary'}`}>
                        ⭐ Evaluations
                    </button>
                    <button onClick={() => { setReportType('workload'); setReportData([]); }}
                        className={`btn ${reportType === 'workload' ? 'btn-primary' : 'btn-outline-primary'}`}>
                        👨‍🏫 Workload
                    </button>
                    <button onClick={() => { setReportType('student-progress'); setReportData([]); }}
                        className={`btn ${reportType === 'student-progress' ? 'btn-primary' : 'btn-outline-primary'}`}>
                        🎓 Progress
                    </button>
                    <button onClick={() => { setReportType('department'); setReportData([]); }}
                        className={`btn ${reportType === 'department' ? 'btn-primary' : 'btn-outline-primary'}`}>
                        🏢 Department
                    </button>
                    <button onClick={() => { setReportType('deadline'); setReportData([]); }}
                        className={`btn ${reportType === 'deadline' ? 'btn-primary' : 'btn-outline-primary'}`}>
                        ⏰ Deadline
                    </button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Start Date</label>
                        <input type="date" className="form-control" value={filters.startDate}
                            onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">End Date</label>
                        <input type="date" className="form-control" value={filters.endDate}
                            onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Department</label>
                        <input type="text" className="form-control" placeholder="e.g. Computer Science"
                            value={filters.department}
                            onChange={e => setFilters({ ...filters, department: e.target.value })} />
                    </div>
                    <button onClick={loadReport} className="btn btn-primary">🔍 Run Report</button>
                    {reportData.length > 0 && (
                        <button onClick={exportCSV} className="btn btn-secondary" disabled={exporting}>
                            {exporting ? 'Exporting...' : '📥 Export CSV'}
                        </button>
                    )}
                </div>
            </div>

            {reportData.length > 0 && (
                <div className="card mt-2">
                    <div className="card-header">
                        <h3 className="card-title">Results ({reportData.length} records)</h3>
                    </div>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    {Object.keys(reportData[0]).map(key => (
                                        <th key={key}>{key}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((row, i) => (
                                    <tr key={i}>
                                        {Object.values(row).map((val: any, j) => (
                                            <td key={j}>{String(val ?? '-')}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}