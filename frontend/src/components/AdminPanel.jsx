import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Users, ClipboardList, CalendarDays, Trash2, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminPanel = () => {
  const { token, currentUser } = useAuth();
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState({ usersCount: 0, resultsCount: 0, appointmentsCount: 0 });
  const [users, setUsers] = useState([]);
  const [results, setResults] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const axiosClient = useMemo(() => {
    return axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  }, [token]);

  const loadAdminData = async () => {
    setLoading(true);
    setError('');

    try {
      const [overviewRes, usersRes, resultsRes, appointmentsRes] = await Promise.all([
        axiosClient.get(`${API_URL}/admin/overview`),
        axiosClient.get(`${API_URL}/admin/users`),
        axiosClient.get(`${API_URL}/admin/results`),
        axiosClient.get(`${API_URL}/admin/appointments`),
      ]);

      setOverview(overviewRes.data);
      setUsers(usersRes.data.users || []);
      setResults(resultsRes.data.results || []);
      setAppointments(appointmentsRes.data.appointments || []);
    } catch (err) {
      const message = err?.response?.data?.error || err.message || 'Failed to load admin data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && currentUser?.role === 'admin') {
      loadAdminData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentUser?.role]);

  const updateUserRole = async (userId, role) => {
    try {
      const updatedUser = users.find((u) => u.id === userId);
      const newRole = role === 'admin' ? 'admin' : 'user';
      const displayName = updatedUser?.displayName || updatedUser?.email || 'User';

      await axiosClient.patch(`${API_URL}/admin/users/${userId}`, { role: newRole });
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user)));

      if (newRole === 'admin') {
        alert(`✅ ${displayName} has been promoted to Admin!\n\nThey will need to log out and log back in to access the Admin Panel.`);
      } else {
        alert(`✅ ${displayName} has been demoted to User.`);
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to update user role');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Delete this user and all their records? This cannot be undone.')) return;

    try {
      await axiosClient.delete(`${API_URL}/admin/users/${userId}`);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      setResults((prev) => prev.filter((result) => result.userId !== userId));
      setAppointments((prev) => prev.filter((appointment) => appointment.userId !== userId));
      setOverview((prev) => ({
        ...prev,
        usersCount: Math.max(0, prev.usersCount - 1),
      }));
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete user');
    }
  };

  const deleteResult = async (resultId) => {
    if (!window.confirm('Delete this assessment record?')) return;

    try {
      await axiosClient.delete(`${API_URL}/admin/results/${resultId}`);
      setResults((prev) => prev.filter((result) => result.id !== resultId));
      setOverview((prev) => ({
        ...prev,
        resultsCount: Math.max(0, prev.resultsCount - 1),
      }));
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete assessment');
    }
  };

  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      const response = await axiosClient.patch(`${API_URL}/admin/appointments/${appointmentId}`, { status });
      setAppointments((prev) => prev.map((item) => (item.id === appointmentId ? response.data.appointment : item)));
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to update appointment status');
    }
  };

  const deleteAppointment = async (appointmentId) => {
    if (!window.confirm('Delete this appointment?')) return;

    try {
      await axiosClient.delete(`${API_URL}/admin/appointments/${appointmentId}`);
      setAppointments((prev) => prev.filter((item) => item.id !== appointmentId));
      setOverview((prev) => ({
        ...prev,
        appointmentsCount: Math.max(0, prev.appointmentsCount - 1),
      }));
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete appointment');
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Admin Access Required</h2>
        <p className="text-slate-600 dark:text-slate-400">Your account does not have admin privileges.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">Admin Control Center</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track all users and manage records.</p>
        </div>
        <button
          onClick={loadAdminData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-800/40">
          <p className="text-xs uppercase tracking-wider text-slate-500">Users</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{overview.usersCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-800/40">
          <p className="text-xs uppercase tracking-wider text-slate-500">Assessments</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{overview.resultsCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-800/40">
          <p className="text-xs uppercase tracking-wider text-slate-500">Appointments</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{overview.appointmentsCount}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button onClick={() => setTab('users')} className={`px-4 py-2 rounded-full font-bold ${tab === 'users' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
          <Users size={16} className="inline mr-2" /> Users
        </button>
        <button onClick={() => setTab('results')} className={`px-4 py-2 rounded-full font-bold ${tab === 'results' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
          <ClipboardList size={16} className="inline mr-2" /> Assessments
        </button>
        <button onClick={() => setTab('appointments')} className={`px-4 py-2 rounded-full font-bold ${tab === 'appointments' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
          <CalendarDays size={16} className="inline mr-2" /> Appointments
        </button>
      </div>

      {loading && <p className="text-slate-500">Loading admin records...</p>}
      {error && <p className="text-red-500 font-semibold">{error}</p>}

      {!loading && !error && tab === 'users' && (
        <div className="space-y-3">
          {users.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800/40"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="font-black text-slate-900 dark:text-white">{user.displayName || 'Unnamed user'}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Results: {user._count?.results || 0} | Appointments: {user._count?.appointments || 0}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => updateUserRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                    className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 font-bold text-sm inline-flex items-center gap-2"
                  >
                    <Shield size={14} />
                    {user.role === 'admin' ? 'Set User' : 'Set Admin'}
                  </button>
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="px-3 py-2 rounded-lg bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 font-bold text-sm inline-flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && !error && tab === 'results' && (
        <div className="space-y-3">
          {results.map((result) => (
            <div key={result.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="font-black text-slate-900 dark:text-white">{result.user?.displayName || result.user?.email || 'Unknown user'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Score: {result.score} | Level: {result.level}</p>
                <p className="text-xs text-slate-400">{new Date(result.timestamp).toLocaleString()}</p>
              </div>
              <button onClick={() => deleteResult(result.id)} className="px-3 py-2 rounded-lg bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 font-bold text-sm inline-flex items-center gap-2 w-fit">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && tab === 'appointments' && (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="font-black text-slate-900 dark:text-white">{appointment.user?.displayName || appointment.user?.email || 'Unknown user'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{appointment.doctorName} | {appointment.slot}</p>
                <p className="text-xs text-slate-400">Status: {appointment.status}</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')} className="px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold text-sm">Confirm</button>
                <button onClick={() => updateAppointmentStatus(appointment.id, 'completed')} className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 font-bold text-sm">Complete</button>
                <button onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')} className="px-3 py-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 font-bold text-sm">Cancel</button>
                <button onClick={() => deleteAppointment(appointment.id)} className="px-3 py-2 rounded-lg bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 font-bold text-sm inline-flex items-center gap-2">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
