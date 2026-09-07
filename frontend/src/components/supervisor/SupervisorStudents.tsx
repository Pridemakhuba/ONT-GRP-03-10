import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supervisorsApi, assignmentsApi } from '../../services/api';
import type { Student } from '../../types';

export default function SupervisorStudents() {
    const { user } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            setError(null);
            try {
                const allSup = await supervisorsApi.getAll();
                // Match by aDUsername first, but fall back to userID — a Supervisor
                // record created on the fly (e.g. auto-created when an admin assigns
                // a non-pre-registered @gmail.com/@soit.ac.za/etc. staff member) may
                // not have aDUsername populated the same way an AD-imported one does.
                const me = allSup.data.find(
                    s => s.user.aDUsername === user?.username || s.userID === user?.userID
                );

                if (!me) {
                    setStudents([]);
                    return;
                }

                const res = await assignmentsApi.getBySupervisor(me.supervisorID);
                setStudents(res.data);
            } catch {
                setError('Failed to load your students. Please try refreshing.');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [user]);

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">My Students</h1>
                <p className="page-subtitle">{students.length} student(s) under your supervision</p>
            </div>

            {error && (
                <div className="alert alert-danger mb-2" style={{ padding: '8px 12px', fontSize: 12.5 }}>
                    ⚠️ {error}
                </div>
            )}

            <div className="card">
                {students.length === 0
                    ? (
                        <div className="empty-state">
                            <div className="empty-icon">👥</div>
                            <div className="empty-title">No students assigned yet</div>
                            <div className="empty-text">Once an admin assigns a student to you, they'll show up here.</div>
                        </div>
                    )
                    : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Student No.</th>
                                        <th>Program</th>
                                        <th>Research Topic</th>
                                        <th>Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(s => (
                                        <tr key={s.studentID}>
                                            <td data-label="Name" style={{ fontWeight: 600 }}>{s.user.firstName} {s.user.lastName}</td>
                                            <td data-label="Student No." style={{ fontSize: 12 }}>{s.studentNumber}</td>
                                            <td data-label="Program" style={{ fontSize: 12 }}>{s.program}</td>
                                            <td data-label="Research Topic" style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>{s.researchTopic || '—'}</td>
                                            <td data-label="Email" style={{ fontSize: 12 }}><a href={`mailto:${s.user.email}`}>{s.user.email}</a></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                }
            </div>
        </div>
    );
}