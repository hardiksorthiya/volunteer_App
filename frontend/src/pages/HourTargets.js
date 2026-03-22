import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const HourTargets = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ startDate: '', endDate: '', hours: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const extractYMD = (value) => {
    if (!value) return '';
    const s = String(value);
    const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : s;
  };

  const formatDMY = (value) => {
    const ymd = extractYMD(value);
    const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return ymd;
    const [, y, mo, d] = m;
    return `${d}-${mo}-${y}`;
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [meRes, histRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/users/me/hour-targets')
      ]);
      if (meRes.data.success) setCurrent(meRes.data.data);
      if (histRes.data.success) setHistory(histRes.data.data || []);
    } catch (e) {
      console.error('Error loading hour targets:', e);
      setError(e.response?.data?.message || 'Failed to load hour targets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    load();
  }, [navigate]);

  const formatDateTime = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const openAdd = () => {
    setModalMode('add');
    setEditId(null);
    setForm({ startDate: '', endDate: '', hours: '' });
    setShowModal(true);
  };

  const openEdit = (row) => {
    setModalMode('edit');
    setEditId(row.id);
    setForm({
      startDate: extractYMD(row.start_date || ''),
      endDate: extractYMD(row.end_date || ''),
      hours: row.target_hours != null ? String(row.target_hours) : ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const hoursNum = form.hours === '' ? null : parseInt(form.hours, 10);
    if (hoursNum === null || Number.isNaN(hoursNum) || hoursNum < 0) {
      alert('Please enter a valid non-negative number of hours.');
      return;
    }

    if (!form.startDate || !form.endDate) {
      alert('Please select a start date and an end date.');
      return;
    }

    if (new Date(form.startDate) > new Date(form.endDate)) {
      alert('Start date must be before or equal to end date.');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'add') {
        await api.put('/users/me', {
          hour_target_start_date: form.startDate,
          hour_target_end_date: form.endDate,
          hour_target_hours: hoursNum
        });
      } else {
        await api.put(`/users/me/hour-targets/${editId}`, {
          hour_target_start_date: form.startDate,
          hour_target_end_date: form.endDate,
          hour_target_hours: hoursNum
        });
      }

      await load();
      setShowModal(false);
    } catch (e) {
      console.error('Error saving hour target:', e);
      alert(e.response?.data?.message || 'Failed to save target.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRow = async (id) => {
    if (!window.confirm('Delete this hour target row?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/users/me/hour-targets/${id}`);
      await load();
    } catch (e) {
      console.error('Error deleting hour target row:', e);
      alert(e.response?.data?.message || 'Failed to delete target.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearActive = async () => {
    if (!window.confirm('Clear the active hour target?')) return;
    setDeletingId('active');
    try {
      await api.delete('/users/me/hour-target');
      await load();
    } catch (e) {
      console.error('Error clearing active hour target:', e);
      alert(e.response?.data?.message || 'Failed to clear target.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="container-fluid">
          <div className="d-flex justify-content-center align-items-center" style={{ padding: '2rem 0' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentHours = current?.hour_target_hours ?? null;
  const currentStart = current?.hour_target_start_date || null;
  const currentEnd = current?.hour_target_end_date || null;
  const currentType = current?.hour_target_type || null;

  return (
    <div className="dashboard-content">
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">Hour Targets</h3>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-primary" onClick={openAdd}>
              Add target
            </button>
            <button className="btn btn-outline-secondary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div>
                <h5 className="card-title mb-2">Current target</h5>
                {currentHours != null && currentStart && currentEnd ? (
                  <div className="d-flex flex-wrap gap-3 align-items-center">
                    <span className="badge bg-primary text-uppercase">
                      {formatDMY(currentStart)} - {formatDMY(currentEnd)}
                    </span>
                    <span className="fw-semibold">{Number(currentHours)} hours</span>
                  </div>
                ) : currentType && currentHours != null ? (
                  <div className="d-flex flex-wrap gap-3 align-items-center">
                    <span className="badge bg-primary text-uppercase">{currentType}</span>
                    <span className="fw-semibold">{Number(currentHours)} hours</span>
                  </div>
                ) : (
                  <div className="text-muted">No target set.</div>
                )}
                <div className="text-muted small mt-2">
                  Dashboard uses the active target (start/end) to show progress.
                </div>
              </div>

              {currentHours != null && currentStart && currentEnd && (
                <button
                  className="btn btn-outline-danger"
                  onClick={handleClearActive}
                  disabled={deletingId === 'active'}
                >
                  {deletingId === 'active' ? 'Clearing…' : 'Clear active'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="card-title mb-0">Target history</h5>
              <div className="text-muted small">{history.length} record(s)</div>
            </div>

            {history.length === 0 ? (
              <div className="text-muted">No history yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped align-middle mb-0">
                  <thead className="table-primary">
                    <tr>
                      <th>Date range</th>
                      <th className="text-end">Hours</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {h.start_date && h.end_date ? (
                            <span>
                              {formatDMY(h.start_date)} - {formatDMY(h.end_date)}
                            </span>
                          ) : (
                            <span className="text-uppercase">{h.target_type}</span>
                          )}
                        </td>
                        <td className="text-end fw-semibold">{Number(h.target_hours)} hrs</td>
                        
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-2">
                            <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(h)}>
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteRow(h.id)}
                              disabled={deletingId === h.id}
                            >
                              {deletingId === h.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <div
            className="modal show"
            tabIndex="-1"
            style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 560 }}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {modalMode === 'add' ? 'Add hour target' : 'Edit hour target'}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)} aria-label="Close" />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Start date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">End date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.endDate}
                      onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Target hours</label>
                    <input
                      type="number"
                      className="form-control"
                      min={0}
                      placeholder="e.g. 10"
                      value={form.hours}
                      onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                    />
                    <div className="form-text">
                      Use the active target (start/end) to calculate progress on the Dashboard.
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HourTargets;

