import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/Logo';

export function Profile() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    bio: '',
    interests: '',
    location: '',
    relationship_preference: '',
    profile_photo_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setFormData({
            bio: data.bio || '',
            interests: data.interests ? JSON.parse(data.interests).join(', ') : '',
            location: data.location || '',
            relationship_preference: data.relationship_preference || '',
            profile_photo_url: data.profile_photo_url || ''
          });
        }
      } catch (e) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const interestsArray = formData.interests.split(',').map(i => i.trim()).filter(Boolean);
      
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, interests: interestsArray })
      });

      if (res.ok) {
        setMessage('Profile updated successfully!');
      } else {
        const data = await res.json();
        setError(data.error || 'Update failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div className="app-container" style={{ padding: '2rem 1rem' }}>
      <header className="header glass-panel" style={{ marginBottom: '2rem' }}>
        <Logo />
        <nav className="nav">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </nav>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Card glass>
          <h2 style={{ marginBottom: '2rem' }}>Edit Profile</h2>
          
          {message && <div style={{ color: 'var(--color-green)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{message}</div>}
          {error && <div style={{ color: 'var(--color-red)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input label="Location" name="location" value={formData.location} onChange={handleChange} />
            <Input label="Bio" name="bio" value={formData.bio} onChange={handleChange} />
            <Input label="Interests (comma separated)" name="interests" value={formData.interests} onChange={handleChange} />
            
            <div className="lumilove-input-wrapper">
              <label className="lumilove-label">Relationship Preference</label>
              <select 
                name="relationship_preference" 
                value={formData.relationship_preference} 
                onChange={handleChange}
                className="lumilove-input"
              >
                <option value="Friendship">Friendship</option>
                <option value="Dating">Dating</option>
                <option value="Networking">Networking</option>
              </select>
            </div>

            <Input label="Profile Photo URL" name="profile_photo_url" value={formData.profile_photo_url} onChange={handleChange} />

            <Button type="submit" variant="primary" style={{ marginTop: '1rem' }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
