import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Github } from 'lucide-react';

export function LoginPage() {
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to dashboard if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let ok: boolean;
      if (mode === 'login') {
        ok = await login(email, password);
      } else {
        ok = await signup(email, password, username);
      }
      if (ok) {
        navigate('/');
      } else {
        setError(mode === 'login' ? 'Invalid credentials' : 'Email already exists');
      }
    } catch {
      setError('Connection failed. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0C10' }}>
      <div className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Github className="w-10 h-10 text-blue-500" />
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase">OpenHub</h1>
          </div>
          <p className="text-gray-500 text-sm font-mono uppercase tracking-widest">
            Local Developer Infrastructure
          </p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 space-y-4">
          <div className="flex border-b border-[#30363d]">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 pb-3 text-sm font-bold transition-colors ${
                mode === 'login'
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 pb-3 text-sm font-bold transition-colors ${
                mode === 'signup'
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#0A0C10] border border-[#30363d] rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                placeholder="dev@localhost"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-[#0A0C10] border border-[#30363d] rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="developer"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-[#0A0C10] border border-[#30363d] rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded px-3 py-2 text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-bold transition-colors"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-gray-600 font-mono uppercase">
          OpenHub v2.0 — Agentic Developer Platform
        </p>
      </div>
    </div>
  );
}
