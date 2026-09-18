import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function AdminDashboard() {
  const { logoutAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users')
      ]);
      if (statsRes.ok && usersRes.ok) {
        setStats(await statsRes.json());
        setUsers(await usersRes.json());
      } else {
        setError(`API Error: /stats returned ${statsRes.status}, /users returned ${usersRes.status}`);
      }
    } catch (e) {
      console.error(e);
      setError(`Network error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (userId, action) => {
    const res = await fetch(`/api/admin/users/${userId}/${action}`, { method: 'POST' });
    if (res.ok) {
      fetchData(); // Refresh list and stats
    } else {
      alert('Failed to perform action');
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading Admin Portal...</div>;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
        <h1 style={{ color: 'var(--color-plum)', margin: 0 }}>LumiLove Admin</h1>
        <Button variant="ghost" onClick={logoutAdmin}>Log Out Admin</Button>
      </header>

      {error && (
        <div style={{ background: 'var(--color-red)', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <Card style={{ background: 'white' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Users</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats?.totalUsers || 0}</div>
        </Card>
        <Card style={{ background: 'white', borderLeft: '4px solid var(--color-amber)' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Pending</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats?.pendingProfiles || 0}</div>
        </Card>
        <Card style={{ background: 'white', borderLeft: '4px solid var(--color-green)' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Approved</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats?.approvedProfiles || 0}</div>
        </Card>
      </section>

      <section>
        <h2>Recent Registrations & Profiles</h2>
        <Card style={{ background: 'white', padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1rem' }}>Email</th>
                <th style={{ padding: '1rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Registered</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem' }}>{u.email}</td>
                  <td style={{ padding: '1rem' }}>{u.full_name || '-'}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className="tag" style={{ 
                      background: u.profile_status === 'approved' ? 'var(--color-green)' : 
                                  u.profile_status === 'pending' ? 'var(--color-amber)' : 
                                  'var(--color-red)', 
                      color: 'white' 
                    }}>
                      {u.profile_status || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                    {u.profile_status === 'pending' && (
                      <>
                        <Button size="sm" style={{ background: 'var(--color-green)', color: 'white', border: 'none' }} onClick={() => handleAction(u.id, 'approve')}>Approve</Button>
                        <Button size="sm" style={{ background: 'var(--color-red)', color: 'white', border: 'none' }} onClick={() => handleAction(u.id, 'reject')}>Reject</Button>
                      </>
                    )}
                    {u.profile_status === 'approved' && (
                      <Button size="sm" style={{ background: 'var(--color-amber)', color: 'white', border: 'none' }} onClick={() => handleAction(u.id, 'suspend')}>Suspend</Button>
                    )}
                    {u.profile_status === 'suspended' && (
                      <Button size="sm" style={{ background: 'var(--color-green)', color: 'white', border: 'none' }} onClick={() => handleAction(u.id, 'reactivate')}>Reactivate</Button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
