import React, { useEffect, useState } from 'react';
import { studentsApi, supervisorsApi, assignmentsApi } from '../../services/api';
import { toast } from 'react-toastify';

export default function AssignSupervisor() {
  const [students, setStudents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sRes, supRes] = await Promise.all([
          studentsApi.getAll(),
          supervisorsApi.getAll()
        ]);
        setStudents(sRes.data);
        setSupervisors(supRes.data);
      } catch { toast.error('Failed to load data'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  async function loadAssignments(studentId) {
    if (!studentId) return;
    try {
      const res = await assignmentsApi.getByStudent(studentId);
      setAssignments(res.data);
    } catch { setAssignments([]); }
  }

  async function handleAssign() {
    if (!selectedStudent || !selectedSupervisor) {
      toast.warning('Select both a student and a supervisor');
      return;
    }
    try {
      await assignmentsApi.assign({
        studentID: parseInt(selectedStudent),
        supervisorID: parseInt(selectedSupervisor),
        isPrimary: isPrimary
      });
      toast.success('Supervisor assigned!');
      loadAssignments(selectedStudent);
      setSelectedSupervisor('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    }
  }

  async function handleRemove(assignmentId) {
    if (!window.confirm('Remove this supervisor assignment?')) return;
    try {
      await assignmentsApi.remove(assignmentId);
      toast.success('Assignment removed');
      loadAssignments(selectedStudent);
    } catch { toast.error('Failed to remove assignment'); }
  }

  if (loading) return <div style={{padding:40,textAlign:'center'}}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Assign Supervisors to Students</h1>
        <p className="page-subtitle">Link supervisors to students for proposal management</p>
      </div>

      <div className="grid-2">
        {/* Assign Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">New Assignment</h3>
          </div>
          
          <div className="form-group">
            <label className="form-label">Student</label>
            <select className="form-control" value={selectedStudent}
              onChange={e => { setSelectedStudent(e.target.value); loadAssignments(e.target.value); }}>
              <option value="">-- Select Student --</option>
              {students.map(s => (
                <option key={s.studentID} value={s.studentID}>
                  {s.studentNumber} - {s.user?.firstName} {s.user?.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Supervisor</label>
            <select className="form-control" value={selectedSupervisor}
              onChange={e => setSelectedSupervisor(e.target.value)}>
              <option value="">-- Select Supervisor --</option>
              {supervisors.map(s => (
                <option key={s.supervisorID} value={s.supervisorID}>
                  {s.user?.firstName} {s.user?.lastName} ({s.expertise})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
              <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} />
              Primary Supervisor
            </label>
          </div>

          <button onClick={handleAssign} className="btn btn-primary" style={{width:'100%'}}>
            Assign Supervisor
          </button>
        </div>

        {/* Current Assignments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              Current Assignments
              {selectedStudent && <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:8}}>
                ({assignments.length})
              </span>}
            </h3>
          </div>

          {!selectedStudent ? (
            <div className="empty-state">
              <div className="empty-icon">👈</div>
              <div className="empty-title">Select a student to see their supervisors</div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👨‍🏫</div>
              <div className="empty-title">No supervisors assigned</div>
            </div>
          ) : (
            assignments.map(a => (
              <div key={a.studentSupervisorID} style={{
                display:'flex',alignItems:'center',justifyContent:'space-between',
                padding:'12px 0',borderBottom:'1px solid var(--border)'
              }}>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>
                    {a.supervisor?.user?.firstName} {a.supervisor?.user?.lastName}
                  </div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>
                    {a.supervisor?.expertise} {a.isPrimary && '· Primary'}
                  </div>
                </div>
                <button onClick={() => handleRemove(a.studentSupervisorID)}
                  className="btn btn-sm btn-outline" style={{color:'red'}}>
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}