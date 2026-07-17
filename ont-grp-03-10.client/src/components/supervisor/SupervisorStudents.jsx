import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supervisorsApi, assignmentsApi } from '../../services/api';

export default function SupervisorStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const allSup = await supervisorsApi.getAll();
        const me = allSup.data.find(s => s.user.aDUsername === user?.username);
        if (me) {
          const res = await assignmentsApi.getBySupervisor(me.supervisorID);
          setStudents(res.data);
        }
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, [user]);

  if (loading) return <div style={{padding:40,textAlign:'center'}}>Loading...</div>;

  return (
    <div>
      <div className="page-header"><h1 className="page-title">My Students</h1><p className="page-subtitle">{students.length} student(s) under your supervision</p></div>
      <div className="card">
        {students.length === 0
          ? <div className="empty-state"><div className="empty-icon">👥</div><div className="empty-title">No students assigned yet</div></div>
          : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Student No.</th><th>Program</th><th>Research Topic</th><th>Email</th></tr></thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.studentID}>
                      <td style={{fontWeight:600}}>{s.user.firstName} {s.user.lastName}</td>
                      <td style={{fontSize:12}}>{s.studentNumber}</td>
                      <td style={{fontSize:12}}>{s.program}</td>
                      <td style={{fontSize:12,color:'var(--text-muted)',maxWidth:200}}>{s.researchTopic||'—'}</td>
                      <td style={{fontSize:12}}><a href={`mailto:${s.user.email}`}>{s.user.email}</a></td>
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
