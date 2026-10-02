import { useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, Layers3 } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

export default function AuthScreen({ onAuthenticated }) {
  const initialInviteToken = new URLSearchParams(window.location.search).get('invite') || '';
  const [mode, setMode] = useState(initialInviteToken ? 'register' : 'login');
  const [registrationMethod, setRegistrationMethod] = useState(initialInviteToken ? 'invite' : 'create');
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteToken, setInviteToken] = useState(initialInviteToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login'
        ? { email, password }
        : {
          name,
          email,
          password,
          ...(registrationMethod === 'create' ? { workspaceName } : { inviteToken: inviteToken.trim() }),
        };
      const { user } = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('invite');
      window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
      onAuthenticated(user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }

  function switchMode() {
    setMode((current) => current === 'login' ? 'register' : 'login');
    setError('');
  }

  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="Team Task Tracker">
        <div className="auth-brand"><span className="brand-mark"><Layers3 size={21} /></span><span>tandem</span></div>
        <div className="story-copy">
          <p className="eyebrow">A calmer way to work together</p>
          <h1>Good work,<br />in good company.</h1>
          <p className="story-description">A shared place to see what matters, what’s moving, and what comes next.</p>
          <div className="story-checks">
            <span><Check size={15} /> One board, the whole team</span>
            <span><Check size={15} /> Clear owners and due dates</span>
            <span><Check size={15} /> Progress everyone can see</span>
          </div>
        </div>
        <div className="story-footer"><span className="story-dot" /> Your team’s work, in sync</div>
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand"><span className="brand-mark"><Layers3 size={20} /></span> tandem</div>
        <div className="auth-form-wrap">
          <p className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'GET YOUR TEAM STARTED'}</p>
          <h2>{mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}</h2>
          <p className="auth-subtitle">{mode === 'login' ? 'Pick up where your team left off.' : 'Create a private workspace or join your team by invitation.'}</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <div aria-label="Workspace setup" className="auth-choice" role="group">
                  <button aria-pressed={registrationMethod === 'create'} className={registrationMethod === 'create' ? 'auth-choice-active' : ''} onClick={() => setRegistrationMethod('create')} type="button">Create workspace</button>
                  <button aria-pressed={registrationMethod === 'invite'} className={registrationMethod === 'invite' ? 'auth-choice-active' : ''} onClick={() => setRegistrationMethod('invite')} type="button">Join with invite</button>
                </div>
                <label className="field-label">
                  Your name
                  <input autoComplete="name" maxLength="60" minLength="2" onChange={(event) => setName(event.target.value)} placeholder="Jordan Lee" required value={name} />
                </label>
                {registrationMethod === 'create' ? (
                  <label className="field-label">
                    Workspace name
                    <input autoComplete="organization" maxLength="80" minLength="2" onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Studio North" required value={workspaceName} />
                  </label>
                ) : (
                  <label className="field-label">
                    Invitation token
                    <input autoCapitalize="none" autoComplete="off" onChange={(event) => setInviteToken(event.target.value)} placeholder="Paste your team invitation link token" required spellCheck="false" value={inviteToken} />
                  </label>
                )}
              </>
            )}
            <label className="field-label">
              Work email
              <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required type="email" value={email} />
            </label>
            <label className="field-label">
              Password
              <span className="password-wrap">
                <input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required type={showPassword ? 'text' : 'password'} value={password} />
                <button aria-label={showPassword ? 'Hide password' : 'Show password'} className="password-toggle" onClick={() => setShowPassword((shown) => !shown)} type="button">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary auth-submit" disabled={pending} type="submit">
              {pending ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              {!pending && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? 'New to Tandem?' : 'Already have an account?'}{' '}
            <button onClick={switchMode} type="button">{mode === 'login' ? 'Create an account' : 'Sign in'}</button>
          </p>
          <p className="auth-terms">By continuing, you agree to use this workspace responsibly.</p>
        </div>
      </section>
    </main>
  );
}