import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/Logo';
import { useAuth } from '../auth/AuthProvider';
import './Discover.css';

export function Discover() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchModal, setMatchModal] = useState({ show: false, name: '', photo: '' });

  // Filters
  const [filters, setFilters] = useState({
    minAge: '',
    maxAge: '',
    location: '',
    profession: '',
    interests: ''
  });

  const fetchProfiles = async (currentFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      if (currentFilters.minAge) query.append('minAge', currentFilters.minAge);
      if (currentFilters.maxAge) query.append('maxAge', currentFilters.maxAge);
      if (currentFilters.location) query.append('location', currentFilters.location);
      if (currentFilters.profession) query.append('profession', currentFilters.profession);
      if (currentFilters.interests) query.append('interests', currentFilters.interests);

      const res = await fetch(`/api/discover?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load profiles');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchProfiles(filters);
  };

  const handlePass = (userId) => {
    setProfiles(prev => prev.filter(p => p.user_id !== userId));
  };

  const handleLike = async (userId, name, photoUrl) => {
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likedUserId: userId })
      });
      if (res.ok) {
        const data = await res.json();
        setProfiles(prev => prev.filter(p => p.user_id !== userId));
        if (data.match) {
          setMatchModal({ show: true, name, photo: photoUrl });
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to like profile');
      }
    } catch (e) {
      alert('Network error');
    }
  };

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

  if (user?.profile_status !== 'approved') {
    return (
      <div className="app-container" style={{ padding: '4rem', textAlign: 'center' }}>
        <Card glass>
          <h2 style={{ color: 'var(--color-plum)' }}>Discover Unavailable</h2>
          <p>Your profile must be approved before you can browse other profiles.</p>
          <Button onClick={() => navigate('/dashboard')} style={{ marginTop: '1rem' }}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <Logo />
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item active" onClick={() => navigate('/discover')}>Discover</button>
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
              <h1 style={{ color: 'var(--color-plum)', margin: 0, fontSize: '2rem' }}>Discover ✨</h1>
              <p style={{ color: 'var(--text-muted)' }}>Find your next spark</p>
            </div>
          </header>

          <div className="discover-layout">
            <aside className="discover-filters">
              <Card glass>
                <h3>Filters</h3>
                <form onSubmit={handleApplyFilters} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Input label="Min Age" name="minAge" type="number" value={filters.minAge} onChange={handleFilterChange} placeholder="18" />
                    <Input label="Max Age" name="maxAge" type="number" value={filters.maxAge} onChange={handleFilterChange} placeholder="99" />
                  </div>
                  <Input label="Location" name="location" value={filters.location} onChange={handleFilterChange} placeholder="City..." />
                  <Input label="Profession" name="profession" value={filters.profession} onChange={handleFilterChange} placeholder="Designer..." />
                  <Input label="Interests" name="interests" value={filters.interests} onChange={handleFilterChange} placeholder="Coffee, Art..." />
                  <Button type="submit" variant="primary">Apply Filters</Button>
                </form>
              </Card>
            </aside>

            <div className="discover-grid">
              {loading ? (
                <div style={{ textAlign: 'center', width: '100%', padding: '2rem' }}>Loading profiles...</div>
              ) : error ? (
                <div style={{ color: 'var(--color-red)' }}>{error}</div>
              ) : profiles.length === 0 ? (
                <div style={{ textAlign: 'center', width: '100%', padding: '2rem', color: 'var(--text-muted)' }}>No profiles found matching your criteria.</div>
              ) : (
                profiles.map(p => (
                  <Card hoverable className="profile-card" key={p.id}>
                    <div className="profile-card-image">
                      {p.profile_photo_url ? (
                        <img src={p.profile_photo_url} alt={p.full_name} />
                      ) : (
                        <div className="profile-card-image-placeholder">No Photo</div>
                      )}
                    </div>
                    <div className="profile-card-content">
                      <div className="profile-card-header">
                        <h3>{p.full_name.split(' ')[0]}, {calculateAge(p.date_of_birth)}</h3>
                      </div>
                      <p className="profile-card-meta">{p.profession ? `${p.profession} · ` : ''}{p.location}</p>
                      <p className="profile-card-bio">{p.bio}</p>
                      {p.interests && (
                        <div className="profile-card-tags">
                          {JSON.parse(p.interests).slice(0, 3).map((interest, i) => (
                            <span key={i} className="tag">{interest}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <Button variant="secondary" onClick={() => handlePass(p.user_id)} style={{ flex: 1 }}>Pass</Button>
                        <Button variant="primary" onClick={() => handleLike(p.user_id, p.full_name, p.profile_photo_url)} style={{ flex: 1, backgroundColor: 'var(--color-magenta)' }}>Like 💖</Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {matchModal.show && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.3s ease'
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'var(--color-white)', padding: '3rem', borderRadius: 'var(--radius-lg)',
            textAlign: 'center', maxWidth: '400px', width: '90%'
          }}>
            <h2 style={{ color: 'var(--color-magenta)', fontSize: '2.5rem', marginBottom: '1rem' }}>It's a Match! 🎉</h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>You and {matchModal.name.split(' ')[0]} liked each other.</p>
            {matchModal.photo && (
              <img src={matchModal.photo} alt={matchModal.name} style={{
                width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover',
                margin: '0 auto 2rem', border: '4px solid var(--color-pink)'
              }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Button variant="primary" onClick={() => {
                setMatchModal({ show: false, name: '', photo: '' });
                navigate('/matches');
              }}>View Matches</Button>
              <Button variant="secondary" onClick={() => setMatchModal({ show: false, name: '', photo: '' })}>Keep Discovering</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
