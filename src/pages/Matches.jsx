import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { useAuth } from '../auth/AuthProvider';
import './Discover.css'; // Reusing some styles

export function Matches() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch('/api/matches');
        if (res.ok) {
          const data = await res.json();
          setMatches(data);
        } else {
          setError('Failed to load matches');
        }
      } catch (e) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  const calculateAge = (dob) => {
    if (!dob) return 'Unknown';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <Logo />
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item" onClick={() => navigate('/discover')}>Discover</button>
          <button className="nav-item active" onClick={() => navigate('/matches')}>Matches</button>
          <button className="nav-item" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="nav-item" onClick={() => navigate('/profile')}>My Profile</button>
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={logoutUser} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>Log Out</button>
        </div>
      </aside>

      <main className="dashboard-main discover-main">
        <div className="discover-content">
          <header className="discover-header">
            <div>
              <h1 style={{ color: 'var(--color-plum)', margin: 0, fontSize: '2rem' }}>My Matches 💖</h1>
              <p style={{ color: 'var(--text-muted)' }}>People who like you back</p>
            </div>
          </header>

          <div style={{ padding: '2rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center' }}>Loading matches...</div>
            ) : error ? (
              <div style={{ color: 'var(--color-red)' }}>{error}</div>
            ) : matches.length === 0 ? (
              <Card glass style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <h3 style={{ color: 'var(--color-magenta)', marginBottom: '1rem' }}>No matches yet</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Keep exploring LumiLove and discover new connections.</p>
                <Button onClick={() => navigate('/discover')} variant="primary">Start Discovering</Button>
              </Card>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                {matches.map(m => (
                  <Card hoverable className="profile-card" key={m.match_id}>
                    <div className="profile-card-image">
                      {m.profile_photo_url ? (
                        <img src={m.profile_photo_url} alt={m.full_name} />
                      ) : m.primary_photo ? (
                        // Fallback to legacy primary_photo joined object if profile_photo_url isn't set on profile
                        <img src={`/api/profile/photos/${m.primary_photo.id}`} alt={m.full_name} />
                      ) : (
                        <div className="profile-card-image-placeholder">No Photo</div>
                      )}
                    </div>
                    <div className="profile-card-content">
                      <div className="profile-card-header">
                        <h3>{m.full_name.split(' ')[0]}, {calculateAge(m.date_of_birth)}</h3>
                      </div>
                      <p className="profile-card-meta">{m.profession ? `${m.profession} · ` : ''}{m.location}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Matched on {new Date(m.match_date).toLocaleDateString()}</p>
                      
                      <Button variant="primary" style={{ width: '100%' }} disabled title="Messaging coming in Phase 5">Message (Coming Soon)</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
