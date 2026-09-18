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
    profession: '',
    interests: '',
    location: '',
    relationship_preference: ''
  });
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setFormData({
          bio: data.bio || '',
          profession: data.profession || '',
          interests: data.interests ? JSON.parse(data.interests).join(', ') : '',
          location: data.location || '',
          relationship_preference: data.relationship_preference || ''
        });
        setPhotos(data.photos || []);
      }
    } catch (e) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setMessage('');

    const uploadData = new FormData();
    uploadData.append('photo', file);

    try {
      const res = await fetch('/api/profile/photos', {
        method: 'POST',
        body: uploadData
      });

      if (res.ok) {
        setMessage('Photo uploaded successfully');
        fetchProfile(); // Refresh photos
      } else {
        const data = await res.json();
        setError(data.error || 'Photo upload failed');
      }
    } catch (err) {
      setError('Network error during upload');
    } finally {
      setUploading(false);
      e.target.value = null; // reset input
    }
  };

  const handleSetPrimary = async (id) => {
    try {
      const res = await fetch(`/api/profile/photos/${id}/primary`, { method: 'PUT' });
      if (res.ok) {
        fetchProfile();
      }
    } catch (e) {
      setError('Failed to set primary photo');
    }
  };

  const handleDeletePhoto = async (id) => {
    try {
      const res = await fetch(`/api/profile/photos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProfile();
      }
    } catch (e) {
      setError('Failed to delete photo');
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

      <main style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <Card glass>
          <h2>Manage Photos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {photos.map(p => (
              <div key={p.id} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: p.is_primary ? '3px solid var(--color-magenta)' : '1px solid #ccc' }}>
                <img src={`/api/profile/photos/${p.id}`} alt="Profile" style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', padding: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  {!p.is_primary && <button onClick={() => handleSetPrimary(p.id)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>Make Primary</button>}
                  {p.is_primary && <span style={{ color: 'var(--color-magenta)', fontSize: '0.8rem', fontWeight: 'bold' }}>Primary</span>}
                  <button onClick={() => handleDeletePhoto(p.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-coral)', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
                </div>
              </div>
            ))}
            
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', border: '2px dashed var(--color-gray-200)', borderRadius: '12px', cursor: 'pointer', background: 'var(--color-gray-50)' }}>
              <span style={{ color: 'var(--color-magenta)', fontWeight: 'bold' }}>{uploading ? 'Uploading...' : '+ Upload Photo'}</span>
              <input type="file" accept="image/jpeg, image/png, image/webp" style={{ display: 'none' }} onChange={handlePhotoUpload} disabled={uploading} />
            </label>
          </div>
        </Card>

        <Card glass>
          <h2 style={{ marginBottom: '2rem' }}>Edit Profile Details</h2>
          
          {message && <div style={{ color: 'var(--color-green)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{message}</div>}
          {error && <div style={{ color: 'var(--color-red)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input label="Location" name="location" value={formData.location} onChange={handleChange} />
              <Input label="Profession" name="profession" value={formData.profession} onChange={handleChange} placeholder="e.g. Graphic Designer" />
            </div>
            
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

            <Button type="submit" variant="primary" style={{ marginTop: '1rem' }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
