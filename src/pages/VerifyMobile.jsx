import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useAuth } from '../auth/AuthProvider';

export function VerifyMobile() {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();

  React.useEffect(() => {
    if (user?.mobile_number && !user?.mobile_verified) {
      setMobile(user.mobile_number);
    }
  }, [user]);

  const handleSetMobile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/mobile/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Verification code sent to your mobile.');
        setStep(2);
      } else {
        setError(data.error || 'Failed to set mobile number');
      }
    } catch (err) {
      setError('Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/mobile/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otp.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Mobile number verified successfully!');
        await refreshUser();
        setTimeout(() => navigate('/dashboard'), 1500);
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
      const res = await fetch('/api/auth/mobile/resend', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('A new verification code has been sent to your mobile.');
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
          <h2 style={{ marginTop: '1rem', fontSize: '1.5rem' }}>Verify Mobile</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {step === 1 ? 'Please provide your mobile number.' : `We sent a 6-digit code to ${mobile}`}
          </p>
        </div>

        {error && <div style={{ color: 'var(--color-red)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        {success && <div style={{ color: 'var(--color-green)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{success}</div>}

        {step === 1 ? (
          <form onSubmit={handleSetMobile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input 
              label="Mobile Number (with country code)" 
              name="mobile" 
              value={mobile} 
              onChange={(e) => setMobile(e.target.value)} 
              placeholder="+1234567890" 
              required 
            />

            <Button type="submit" variant="primary" style={{ marginTop: '1rem' }} disabled={isLoading || !mobile}>
              {isLoading ? 'Sending...' : 'Send Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              {isLoading ? 'Verifying...' : 'Verify Mobile'}
            </Button>
            
            <Button type="button" variant="outline" onClick={handleResend} disabled={isLoading} style={{ marginTop: '0.5rem' }}>
              Resend Code
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={isLoading} style={{ marginTop: '0.5rem' }}>
              Change Number
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
