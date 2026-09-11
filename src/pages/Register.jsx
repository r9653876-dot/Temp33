import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Logo } from '../components/Logo';

export function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    date_of_birth: '',
    location: '',
    bio: '',
    interests: '',
    relationship_preference: 'Friendship',
    profile_photo_url: ''
  });
  const [isWomanCheck, setIsWomanCheck] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!isWomanCheck) {
      setError('LumiLove is a women-only space. You must confirm to proceed.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const interestsArray = formData.interests.split(',').map(i => i.trim()).filter(Boolean);
      const submitData = { ...formData, interests: interestsArray };
      delete submitData.confirmPassword;

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Registration successful! Your profile is pending review. Redirecting...');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem 1rem' }}>
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-3"></div>
      
      <Card glass style={{ width: '100%', maxWidth: '600px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Logo />
          <h2 style={{ marginTop: '1rem', fontSize: '1.5rem' }}>Join LumiLove</h2>
          <p style={{ color: 'var(--text-muted)' }}>Create your profile to start connecting.</p>
        </div>

        {error && <div style={{ color: 'var(--color-red)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        {success && <div style={{ color: 'var(--color-green)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Full Name" name="full_name" value={formData.full_name} onChange={handleChange} required />
            <Input label="Email" type="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} required />
            <Input label="Confirm Password" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Date of Birth" type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} required />
            <Input label="Location" name="location" value={formData.location} onChange={handleChange} placeholder="City, Country" required />
          </div>

          <Input label="Short Bio" name="bio" value={formData.bio} onChange={handleChange} placeholder="Tell us about yourself..." required />
          
          <Input label="Interests (comma separated)" name="interests" value={formData.interests} onChange={handleChange} placeholder="Art, Coffee, Travel" />
          
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

          <Input label="Profile Photo URL" name="profile_photo_url" value={formData.profile_photo_url} onChange={handleChange} placeholder="https://..." />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input 
              type="checkbox" 
              id="women-only" 
              checked={isWomanCheck} 
              onChange={(e) => setIsWomanCheck(e.target.checked)} 
              style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--color-magenta)' }}
            />
            <label htmlFor="women-only" style={{ fontSize: '0.875rem', fontWeight: '500' }}>
              I confirm that I identify as a woman and agree to respect this women-only space.
            </label>
          </div>

          <Button type="submit" variant="primary" style={{ marginTop: '1rem' }} disabled={isLoading || success}>
            {isLoading ? 'Creating Profile...' : 'Submit Profile'}
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--color-magenta)', fontWeight: '600', textDecoration: 'none' }}>Log In</Link>
        </p>
      </Card>
    </div>
  );
}
