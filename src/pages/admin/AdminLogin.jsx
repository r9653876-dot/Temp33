import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Logo } from '../../components/Logo';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await loginAdmin(email, password);
    if (result.success) {
      navigate('/admin');
    } else {
      setError(result.error || 'Failed to login to admin portal');
    }
    setIsLoading(false);
  };

  return (
    <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem', background: 'var(--color-gray-50)' }}>
      <Card glass style={{ width: '100%', maxWidth: '400px', padding: '2rem', border: '1px solid var(--color-gray-200)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Logo />
          <h2 style={{ marginTop: '1rem', fontSize: '1.5rem', color: 'var(--color-plum)' }}>Admin Portal</h2>
        </div>

        {error && <div style={{ color: 'var(--color-red)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Admin Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" variant="primary" style={{ marginTop: '1rem', background: 'var(--color-plum)' }} disabled={isLoading}>
            {isLoading ? 'Authenticating...' : 'Secure Login'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
