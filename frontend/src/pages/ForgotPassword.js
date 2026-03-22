import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/api';
import '../css/Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', {
        email
      });

      if (response.data.success) {
        setSentEmail(email);
        setSuccess(true);
        setEmail('');
      } else {
        setError(response.data?.message || 'Failed to send reset link. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Left Panel - Welcome Section */}
        <div className="auth-welcome-panel">
          <div className="decorative-circle"></div>
          <div className="decorative-circle"></div>
          <div className="auth-welcome-content">
            <h1 className="auth-welcome-title">Reset</h1>
            <h2 className="auth-welcome-headline">Your Password</h2>
            <p className="auth-welcome-description">
              No worries! We'll help you regain access to your account. 
              Enter your email address and we'll send you a secure link 
              to reset your password.
            </p>
          </div>
        </div>

        {/* Right Panel - Reset Form */}
        <div className="auth-form-panel">
          {!success ? (
            <>
              <h2 className="auth-form-title">Forgot Password</h2>
              <p className="auth-form-subtitle">
                Enter your email address and we'll send you a link to reset your password
              </p>
              
              <form onSubmit={handleSubmit}>
                {/* Email Input */}
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email</label>
                  <div className="form-input-wrapper">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      className="form-input form-input-placeholder-email"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && <div className="error-message">{error}</div>}

                {/* Submit Button */}
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="forgot-password-success">
              <div className="success-icon-wrapper">
                <svg 
                  className="success-icon" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    d="M22 11.08V12a10 10 0 1 1-5.93-9.14" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <polyline 
                    points="22 4 12 14.01 9 11.01" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="auth-form-title">Check Your Email</h2>
              <p className="auth-form-subtitle">
                We've sent a password reset link to <strong>{sentEmail || 'your email address'}</strong>
              </p>
              <div className="success-info-box">
                <p>
                  Please check your inbox and click on the reset link to create a new password. 
                  The link will expire in 1 hour for security reasons.
                </p>
                <p style={{ marginTop: '1rem', marginBottom: 0 }}>
                  Didn't receive the email? Check your spam folder or try again.
                </p>
              </div>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => {
                  setSuccess(false);
                  setSentEmail('');
                  setEmail('');
                }}
              >
                Send Another Email
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <p className="auth-link">
            Remember your password? <Link to="/login">Sign in</Link>
          </p>
          <p className="auth-link">
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

