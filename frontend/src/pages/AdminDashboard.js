/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import PageHeader from '../components/PageHeader';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/Dashboard.css';
import '../css/AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Global stats (all activities) - admin data only
  const [stats, setStats] = useState({
    totalActivities: 0,
    completedActivities: 0,
    totalHours: 0,
    totalTasks: 0
  });
  const [allActivities, setAllActivities] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [taskHoursData, setTaskHoursData] = useState([]);
  const [dateFilter, setDateFilter] = useState('last_week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loadingTaskHours, setLoadingTaskHours] = useState(false);
  const [taskHoursDateRange, setTaskHoursDateRange] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const u = JSON.parse(userData);
        const isAdmin = u.role === 0 || u.user_type === 'admin';
        if (!isAdmin) {
          navigate('/dashboard');
          return;
        }
      } catch (e) {
        navigate('/dashboard');
        return;
      }
    }
    const load = async () => {
      await fetchUser();
      await fetchGlobalStats();
      await fetchTaskHoursByActivity();
    };
    load();
  }, [navigate]);

  useEffect(() => {
    fetchTaskHoursByActivity();
  }, [dateFilter, customStartDate, customEndDate]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/users/me');
      if (response.data.success) setUser(response.data.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalStats = async () => {
    try {
      const [myActivitiesRes, completedRes, totalTasksRes, totalHoursRes] = await Promise.all([
        api.get('/activities/stats/my-activities'),
        api.get('/activities/stats/completed'),
        api.get('/activities/stats/total-tasks'),
        api.get('/activities/stats/total-hours')
      ]);
      const totalActivities = myActivitiesRes.data?.success ? myActivitiesRes.data.data.my_activities : 0;
      const completedActivities = completedRes.data?.success ? completedRes.data.data.completed_activities : 0;
      const totalTasks = totalTasksRes.data?.success ? totalTasksRes.data.data.total_tasks : 0;
      const totalHours = totalHoursRes.data?.success ? totalHoursRes.data.data.total_hours : 0;
      setStats({ totalActivities, completedActivities, totalHours, totalTasks });

      const activitiesRes = await api.get('/activities');
      const activities = activitiesRes.data?.success ? activitiesRes.data.data || [] : [];
      setAllActivities(activities);
      const categoryCounts = {};
      activities.forEach(activity => {
        const category = activity.category || 'Uncategorized';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      setCategoryData(Object.entries(categoryCounts).map(([name, value]) => ({ name, value })));
    } catch (err) {
      console.error('Error fetching global stats:', err);
    }
  };

  const fetchTaskHoursByActivity = async () => {
    setLoadingTaskHours(true);
    try {
      let url = '/activities/stats/task-hours-by-activity?';
      if (dateFilter === 'custom' && customStartDate && customEndDate) {
        url += `start_date=${customStartDate}&end_date=${customEndDate}`;
      } else {
        url += `period=${dateFilter}`;
      }
      const response = await api.get(url);
      if (response.data.success) {
        setTaskHoursData(response.data.data.task_hours_by_activity || []);
        setTaskHoursDateRange(response.data.data.date_range || null);
      } else {
        setTaskHoursData([]);
        setTaskHoursDateRange(null);
      }
    } catch (error) {
      setTaskHoursData([]);
      setTaskHoursDateRange(null);
    } finally {
      setLoadingTaskHours(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })}`;
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate) return 'N/A';
    const startFormatted = formatDate(startDate);
    const endFormatted = endDate ? formatDate(endDate) : null;
    if (endFormatted && startFormatted !== endFormatted) return `${startFormatted} - ${endFormatted}`;
    return startFormatted;
  };

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <div className="container-fluid">
        <div className="row g-3">
          {/* Left - same layout as Dashboard */}
          <div className="col-xl-8 col-lg-12 col-md-12 col-sm-12">
            {/* Statistics Cards - global labels */}
            <div className="stats-cards">
              <div className="stat-card stat-all">
                <div className="stat-content">
                  <div className="stat-number">{stats.totalActivities}</div>
                  <div className="stat-label">Total Activity</div>
                </div>
                <div className="stat-chart">
                  <div className="chart-bar" style={{ height: `${stats.totalActivities > 0 ? 100 : 0}%` }}></div>
                </div>
              </div>
              <div className="stat-card stat-completed">
                <div className="stat-content">
                  <div className="stat-number">{stats.completedActivities}</div>
                  <div className="stat-label">Completed Activity</div>
                  
                </div>
                <div className="stat-chart">
                  <div className="chart-bar" style={{ height: `${stats.totalActivities > 0 ? (stats.completedActivities / stats.totalActivities) * 100 : 0}%` }}></div>
                </div>
              </div>
              <div className="stat-card stat-cancelled">
                <div className="stat-content">
                  <div className="stat-number">{stats.totalHours}</div>
                  <div className="stat-label">Total Hour</div>
                  
                </div>
                <div className="stat-chart">
                  <div className="chart-bar" style={{ height: `${stats.totalHours > 0 ? Math.min((stats.totalHours / 100) * 100, 100) : 0}%` }}></div>
                </div>
              </div>
              <div className="stat-card stat-tasks">
                <div className="stat-content">
                  <div className="stat-number">{stats.totalTasks}</div>
                  <div className="stat-label">Total Task</div>
                  
                </div>
                <div className="stat-chart">
                  <div className="chart-bar" style={{ height: `${stats.totalTasks > 0 ? Math.min((stats.totalTasks / Math.max(stats.totalTasks, 1)) * 100, 100) : 0}%` }}></div>
                </div>
              </div>
            </div>

            {/* All Activities - admin only */}
            <div className="work-history-card">
              <div className="history-tabs">
                <button className="tab-btn active">All Activities ({allActivities.length})</button>
              </div>
              <div className="tab-content">
                <div className="activities-list">
                  {allActivities.length === 0 ? (
                    <div className="empty-state">
                      <p>No activities in the platform yet</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover table-striped align-middle">
                        <thead className="table-primary">
                          <tr>
                            <th>Activity Name</th>
                            <th>Date</th>
                            <th>Location</th>
                            <th className="text-end">Total Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allActivities.slice(0, 10).map((activity) => (
                            <tr key={activity.id}>
                              <td><strong>{activity.title || 'Activity'}</strong></td>
                              <td>{formatDateRange(activity.start_date, activity.end_date)}</td>
                              <td>{activity.location || activity.address || 'N/A'}</td>
                              <td className="text-end fw-semibold">{Number(activity.task_hours || 0)} hrs</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right - Activity Categories & Task Hours (same as Dashboard) */}
          <div className="col-xl-4 col-lg-12 col-md-12 col-sm-12">
            <div className="card shadow-sm mb-4 dashboard-chart-card">
              <div className="card-body dashboard-chart-body">
                <h5 className="card-title mb-3">Activity Categories</h5>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250} className="pie-chart-container">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => {
                          const COLORS = ['#2563eb', '#8b5cf6', '#f97316', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];
                          return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                        })}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-5">
                    <p className="text-muted">No activities with categories found</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card shadow-sm dashboard-chart-card">
              <div className="card-body dashboard-chart-body">
                <div className="d-flex justify-content-between align-items-center mb-3 dashboard-chart-header">
                  <h5 className="card-title mb-0">Task Hours by Activity</h5>
                  <div className="dashboard-time-filter">
                    <select
                      className="form-select form-select-sm"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    >
                      <option value="last_week">Last 7 Days</option>
                      <option value="last_month">Last Month</option>
                      <option value="last_year">Last Year</option>
                      <option value="custom">Custom Date</option>
                    </select>
                  </div>
                </div>
                {taskHoursDateRange && (
                  <div className="mb-2">
                    <small className="text-muted">
                      {taskHoursDateRange.start_date} to {taskHoursDateRange.end_date}
                    </small>
                  </div>
                )}
                {dateFilter === 'custom' && (
                  <div className="mb-3 row g-2">
                    <div className="col-6">
                      <label className="form-label small">Start Date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small">End Date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                {loadingTaskHours ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted mt-2">Loading task hours data...</p>
                  </div>
                ) : taskHoursData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={taskHoursData} margin={{ top: 5, right: 5, left: 5, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="activity_title"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value) => [`${value} hours`, 'Total Hours']}
                        labelFormatter={(label) => `Activity: ${label}`}
                      />
                      <Bar dataKey="total_hours" fill="#2563eb" radius={[4, 4, 0, 0]}>
                        {taskHoursData.map((entry, index) => {
                          const colors = ['#2563eb', '#8b5cf6', '#f97316', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-5">
                    <p className="text-muted">No task hours data for the selected period</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
