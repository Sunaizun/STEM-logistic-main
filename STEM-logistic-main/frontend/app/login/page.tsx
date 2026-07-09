'use client';
import { login, setToken } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleLogin() {
    setError('');
    try {
      const { access_token } = await login(identifier, password);
      setToken(access_token);
      router.push('/dashboard');
    } catch (e) {
      setError('Неверный логин или пароль');
    }
  }

  return (
    <div className="login-page">
      <div className="login-card card">
        <h1 className="h1" style={{ textAlign: 'center' }}>STEM WMS</h1>
        <div className="field"><label>Email или телефон</label><input className="input" value={identifier} onChange={e => setIdentifier(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
        <div className="field"><label>Пароль</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
        {error && <div className="error">{error}</div>}
        <button className="btn black" style={{ width: '100%', marginTop: 12 }} onClick={handleLogin}>Войти</button>
      </div>
    </div>
  );
}
