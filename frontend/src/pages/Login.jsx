import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, register } from '../services/api';
import { AuthContext } from '../context/AuthContext'; 

export default function Login() {
  const navigate = useNavigate();
  const { login: contextLogin } = useContext(AuthContext); 
  const [tab, setTab] = useState('login');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 880 : false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= 880);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const colors = {
    bgStart: '#001845',
    bgMid: '#023E7D',
    accent: '#0466C8',
    muted: '#5C677D',
    cardBg: 'rgba(255, 255, 255, 0.98)'
  };

  const containerStyle = {
    minHeight: '100vh',
    margin: 0,
    padding: 28,
    fontFamily: "Nunito, Arial, Helvetica, sans-serif",
    background: `linear-gradient(135deg, ${colors.bgStart}, ${colors.bgMid})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const cardStyle = {
    background: 'transparent',
    width: '100%',
    maxWidth: 1000,
    borderRadius: 16,
    boxShadow: '0 20px 60px rgb(53 66 84 / 100%)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    minHeight: isMobile ? 'auto' : 520
  };

  const leftStyle = {
    flex: 1,
    background: `linear-gradient(135deg, ${colors.bgStart}, ${colors.bgMid})`,
    color: '#fff',
    padding: isMobile ? 28 : 48,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: isMobile ? 'center' : 'left'
  };
  const rightStyle = {
    flex: 1,
    padding: isMobile ? 22 : 40,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    background: '#ffffff'
  };

  const formCardStyle = {
    width: '100%',
    maxWidth: 380,
    margin: '0 auto',
    padding: '6px 2px',
    background: '#ffffff'
  };

  const tabStyleBase = {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    textAlign: 'center',
    cursor: 'pointer',
    color: colors.bgMid,
    background: 'transparent',
    border: '1px solid #e9edf6'
  };

  const tabActive = {
    background: `linear-gradient(90deg, ${colors.bgStart}, ${colors.bgMid})`,
    color: '#fff',
    borderColor: 'transparent'
  };

  const labelStyle = {
    fontSize: '0.9rem',
    color: colors.muted,
    marginTop: 10,
    display: 'block'
  };

  const inputStyle = {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #d7dfe9',
    marginTop: 8,
    fontSize: '0.96rem',
    width: '100%'
  };

  const actionStyle = {
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    border: 0,
    background: colors.accent,
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%'
  };

  // LOGIN HANDLER – uses context
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const form = e.target;
    const email = form['login-email'].value;
    const password = form['login-password'].value;

    try {
      const res = await apiLogin({ email, password });
      // Use context login to store token & user
      contextLogin(res.data.token, res.data.user);
      setMessage('✅ Login successful! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      setMessage(err.response?.data?.message || '❌ Login failed. Please try again.');
    }
  };

  // SIGNUP HANDLER – calls real API (no changes)
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const form = e.target;
    const name = form['signup-name'].value;
    const email = form['signup-email'].value;
    const password = form['signup-password'].value;

    try {
      const res = await register({ name, email, password });
      setMessage('✅ Registration successful! You can now log in.');
      form.reset();
      setTab('login');
    } catch (err) {
      setMessage(err.response?.data?.message || '❌ Registration failed. Please try again.');
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle} role="region" aria-label="Authentication area">
        <div style={leftStyle}>
          <h1 style={{ fontSize: '2.4rem', margin: '0 0 12px' }}>Welcome to FCCPS</h1>
          <p style={{ color: 'rgba(255,255,255,.9)', margin: '0 0 18px', fontSize: '1.05rem' }}>
            Powerful customer churn prediction tools. Sign in to manage datasets, train models and visualize
            results.
          </p>
          <div style={{ marginTop: 18, background: 'transparent', border: '2px solid rgba(255,255,255,.12)', color: '#fff', padding: '10px 16px', borderRadius: 20, display: 'inline-block' }}>Trusted · Secure · Fast</div>
        </div>

        <div style={rightStyle}>
          <div style={formCardStyle}>
            <div style={{ color: colors.bgMid, fontSize: '1.4rem', margin: '0 0 6px' }}>Access your account</div>
            <div style={{ color: '#7485a8', margin: '0 0 18px' }}>Sign in or create a free account to continue</div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }} role="tablist">
              <div
                role="tab"
                aria-selected={tab === 'login'}
                onClick={() => setTab('login')}
                style={{ ...tabStyleBase, ...(tab === 'login' ? tabActive : {}) }}
                id="tab-login"
              >
                Login
              </div>
              <div
                role="tab"
                aria-selected={tab === 'signup'}
                onClick={() => setTab('signup')}
                style={{ ...tabStyleBase, ...(tab === 'signup' ? tabActive : {}) }}
                id="tab-signup"
              >
                Sign Up
              </div>
            </div>

            {/* 👇 MESSAGE DISPLAY */}
            {message && (
              <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, background: '#f0f4ff', color: '#023E7D', fontSize: '0.95rem' }}>
                {message}
              </div>
            )}

            <div id="login" role="tabpanel" style={{ display: tab === 'login' ? 'block' : 'none' }}>
              <form id="login-form" autoComplete="on" onSubmit={handleLoginSubmit}>
                <label htmlFor="login-email" style={labelStyle}>Email</label>
                <input id="login-email" type="email" required placeholder="example@gmail.com" style={inputStyle} />

                <label htmlFor="login-password" style={labelStyle}>Password</label>
                <input id="login-password" type="password" required placeholder="Your password" style={inputStyle} />

                <button className="action" type="submit" style={actionStyle}>Sign In</button>
              </form>
              <p style={{ fontSize: '0.88rem', color: colors.muted, textAlign: 'center', marginTop: 10 }}>
                Forgot password? <a href="#" onClick={(e) => e.preventDefault()} style={{ color: colors.accent, textDecoration: 'none' }}>Reset</a>
              </p>
            </div>

            <div id="signup" role="tabpanel" style={{ display: tab === 'signup' ? 'block' : 'none' }}>
              <form id="signup-form" autoComplete="on" onSubmit={handleSignupSubmit}>
                <label htmlFor="signup-name" style={labelStyle}>Full name</label>
                <input id="signup-name" type="text" required placeholder="John doe" style={inputStyle} />

                <label htmlFor="signup-email" style={labelStyle}>Email</label>
                <input id="signup-email" type="email" required placeholder="example@gmail.com" style={inputStyle} />

                <label htmlFor="signup-password" style={labelStyle}>Password</label>
                <input id="signup-password" type="password" required placeholder="Choose a password" style={inputStyle} />

                <button className="action" type="submit" style={actionStyle}>Create Account</button>
              </form>
              <p style={{ fontSize: '0.88rem', color: colors.muted, textAlign: 'center', marginTop: 10 }}>
                By creating an account you agree to our <a href="#" onClick={(e) => e.preventDefault()} style={{ color: colors.accent, textDecoration: 'none' }}>terms</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}