import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useAuth } from '../auth/AuthProvider';

export function VerifyEmail() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otp.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Email verified successfully!');
        await refreshUser();
        setTimeout(() => navigate('/verify-mobile'), 1500);
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      setError('Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/email/resend', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('A new verification code has been sent to your email.');
      } else {
        setError(data.error || 'Failed to resend code');
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
      
      <Card glass style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ marginTop: '1rem', fontSize: '1.5rem' }}>Verify Email</h2>
          <p style={{ color: 'var(--text-muted)' }}>We sent a 6-digit code to {user?.email}</p>
        </div>

        {error && <div style={{ color: 'var(--color-red)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        {success && <div style={{ color: 'var(--color-green)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input 
            label="Verification Code" 
            name="otp" 
            value={otp} 
            onChange={(e) => setOtp(e.target.value)} 
            placeholder="Enter 6-digit code" 
            maxLength={6}
            required 
            style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.25rem' }}
          />

          <Button type="submit" variant="primary" style={{ marginTop: '1rem' }} disabled={isLoading || otp.length < 6}>
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </Button>
          
          <Button type="button" variant="outline" onClick={handleResend} disabled={isLoading} style={{ marginTop: '0.5rem' }}>
            Resend Code
          </Button>
        </form>
      </Card>
    </div>
  );
}
