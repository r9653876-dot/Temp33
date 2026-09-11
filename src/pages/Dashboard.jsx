import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';

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
    navigate('/');
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading dashboard...</div>;

  const isPending = profile?.status === 'pending';

  return (
    <div className="app-container" style={{ padding: '2rem 1rem' }}>
      <header className="header glass-panel" style={{ marginBottom: '2rem' }}>
        <Logo />
        <nav className="nav">
          <Button variant="ghost" onClick={handleLogout}>Log Out</Button>
        </nav>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto' }}>
        {isPending ? (
          <Card glass style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <h2>Profile Under Review</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '1rem auto' }}>
              Your profile has been submitted and is currently waiting for admin approval. You'll be able to connect with others once approved.
            </p>
            <Button variant="secondary" onClick={handleLogout} style={{ marginTop: '2rem' }}>Log Out</Button>
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: '2rem' }}>
            <h1 style={{ fontSize: '2rem' }}>Welcome back, {profile?.full_name?.split(' ')[0]}!</h1>
            
            <Card hoverable>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <img 
                  src={profile?.profile_photo_url || 'https://via.placeholder.com/150?text=Photo'} 
                  alt="Profile" 
                  style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <h3>{profile?.full_name}</h3>
                  <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0' }}>{profile?.location}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="tag" style={{ background: 'var(--color-green)', color: 'white' }}>Approved</span>
                    <span className="tag">{profile?.relationship_preference}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Link to="/profile" style={{ textDecoration: 'none' }}>
                    <Button variant="primary" style={{ width: '100%' }}>Edit Profile</Button>
                  </Link>
                </div>
              </div>
            </Card>

            <Card glass>
              <h3>Discover Matches</h3>
              <p style={{ color: 'var(--text-muted)' }}>This feature will be unlocked in the next release!</p>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
