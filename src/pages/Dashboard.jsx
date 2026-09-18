import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { Settings, User, Heart, MessageCircle, Compass, LogOut } from 'lucide-react';
import './Dashboard.css';

export function Dashboard() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  if (loading || !user) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-plum)' }}>Loading dashboard...</div>;

  // Handle Account Status
  if (user.user_status === 'suspended' || user.user_status === 'deleted') {
    return (
      <div className="app-container" style={{ padding: '2rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Card glass style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛔</div>
          <h2>Account Deactivated</h2>
          <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>Your account is currently {user.user_status}. You cannot access LumiLove.</p>
          <Button variant="secondary" onClick={handleLogout} style={{ marginTop: '2rem' }}>Log Out</Button>
        </Card>
      </div>
    );
  }

  // Handle Profile Statuses
  if (user.profile_status === 'pending') {
    return (
      <div className="app-container" style={{ padding: '2rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Card glass style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <h2 style={{ color: 'var(--color-plum)' }}>Profile Under Review</h2>
          <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>
            Your profile is currently under review. You will be able to use LumiLove once your profile is approved.
          </p>
          <Button variant="secondary" onClick={handleLogout} style={{ marginTop: '2rem' }}>Log Out</Button>
        </Card>
      </div>
    );
  }

  if (user.profile_status === 'rejected') {
    return (
      <div className="app-container" style={{ padding: '2rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Card glass style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{ color: 'var(--color-red)' }}>Profile Not Approved</h2>
          <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>
            Unfortunately, your profile did not meet our community guidelines and was not approved.
          </p>
          <Button variant="secondary" onClick={handleLogout} style={{ marginTop: '2rem' }}>Log Out</Button>
        </Card>
      </div>
    );
  }

  if (user.profile_status === 'suspended') {
    return (
      <div className="app-container" style={{ padding: '2rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Card glass style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛑</div>
          <h2 style={{ color: 'var(--color-red)' }}>Profile Suspended</h2>
          <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>
            Your profile has been suspended by administration.
          </p>
          <Button variant="secondary" onClick={handleLogout} style={{ marginTop: '2rem' }}>Log Out</Button>
        </Card>
      </div>
    );
  }

  // Approved User Dashboard
  const firstName = profile?.full_name?.split(' ')[0] || 'Beautiful';

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <Logo />
        </div>
        <nav className="sidebar-nav">
          <Link to="/discover" className="nav-item"><Compass size={20} /> <span>Discover</span></Link>
          <Link to="/matches" className="nav-item"><Heart size={20} /> <span>Matches</span></Link>
          <Link to="#" className="nav-item"><MessageCircle size={20} /> <span>Messages</span></Link>
          <Link to="/profile" className="nav-item"><User size={20} /> <span>My Profile</span></Link>
          <Link to="#" className="nav-item"><Settings size={20} /> <span>Settings</span></Link>
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}><LogOut size={20} /> <span>Log Out</span></button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="mobile-header">
          <Logo />
          <button className="mobile-menu-btn" onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--color-plum)' }}><LogOut size={20} /></button>
        </header>

        <div className="dashboard-content">
          <header className="dashboard-welcome">
            <div>
              <h1 style={{ color: 'var(--color-plum)', margin: 0, fontSize: '2.5rem' }}>Welcome, {firstName} ✨</h1>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1.1rem' }}>Ready to find your spark today?</p>
            </div>
            {profile?.profile_photo_url && (
              <img 
                src={profile.profile_photo_url} 
                alt="Profile" 
                className="welcome-avatar"
              />
            )}
          </header>

          <div className="dashboard-grid">
            <Card hoverable className="highlight-card">
              <div className="card-icon gradient-bg-1"><Compass size={24} color="white" /></div>
              <h3>Discover</h3>
              <p style={{ color: 'var(--text-muted)' }}>Explore new potential matches in your area.</p>
              <Button variant="primary" style={{ marginTop: '1rem', width: '100%' }} onClick={() => navigate('/discover')}>Start Exploring</Button>
            </Card>

            <Card hoverable className="highlight-card">
              <div className="card-icon gradient-bg-2"><Heart size={24} color="white" /></div>
              <h3>Matches</h3>
              <p style={{ color: 'var(--text-muted)' }}>Connect with people who like you back.</p>
              <Button variant="secondary" style={{ marginTop: '1rem', width: '100%' }} onClick={() => navigate('/matches')}>View Matches</Button>
            </Card>

            <Card hoverable className="highlight-card">
              <div className="card-icon gradient-bg-3"><MessageCircle size={24} color="white" /></div>
              <h3>Messages</h3>
              <p style={{ color: 'var(--text-muted)' }}>Continue your conversations.</p>
              <Button variant="outline" style={{ marginTop: '1rem', width: '100%' }}>Open Inbox</Button>
            </Card>
          </div>

          <section style={{ marginTop: '3rem' }}>
            <h2 style={{ color: 'var(--color-plum)', marginBottom: '1.5rem' }}>Your Profile Status</h2>
            <Card glass style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>{profile?.full_name}</h3>
                <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>{profile?.location || 'Add your location'}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="status-badge approved" style={{ background: 'var(--color-green)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem' }}>Approved</div>
                <div className="completion-bar-container" style={{ width: '150px', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div className="completion-bar" style={{ width: '85%', height: '100%', background: 'var(--color-magenta)' }}></div>
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-magenta)' }}>85% Complete</span>
              </div>
            </Card>
          </section>
        </div>
      </main>

      <nav className="mobile-bottom-nav">
        <Link to="/discover" className="bottom-nav-item"><Compass size={24} /></Link>
        <Link to="/matches" className="bottom-nav-item"><Heart size={24} /></Link>
        <Link to="#" className="bottom-nav-item"><MessageCircle size={24} /></Link>
        <Link to="/profile" className="bottom-nav-item"><User size={24} /></Link>
      </nav>
    </div>
  );
}
