import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../config/api';
import '../css/Auth.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(null); // null = checking, true = valid, false = invalid

  useEffect(() => {
    // Check if token is provided
    if (!token) {
      setTokenValid(false);
      setError('Invalid or missing reset token. Please request a new password reset link.');
    } else {
      setTokenValid(true);
    }
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'password') {
      setPassword(value);
    } else if (name === 'confirmPassword') {
      setConfirmPassword(value);
    }
    setError('');
    setSuccess(false);
  };

  const validatePassword = (pwd) => {
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset token. Please request a new password reset link.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/reset-password-with-token', {
        token,
        newPassword: password
      });

      if (response.data.success) {
        setSuccess(true);
        setPassword('');
        setConfirmPassword('');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(response.data?.message || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to reset password. Please try again.';
      setError(errorMessage);
      
      // If token is invalid/expired, allow user to request new one
      if (errorMessage.includes('invalid') || errorMessage.includes('expired') || errorMessage.includes('not found')) {
        setTokenValid(false);
      }
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-form-panel">
            <div className="loading">Checking reset token...</div>
          </div>
        </div>
      </div>
    );
  }

  if (tokenValid === false && !success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-welcome-panel">
            <div className="decorative-circle"></div>
            <div className="decorative-circle"></div>
            <div className="auth-welcome-content">
              <h1 className="auth-welcome-title">Invalid</h1>
              <h2 className="auth-welcome-headline">Reset Link</h2>
              <p className="auth-welcome-description">
                This password reset link is invalid or has expired. 
                Please request a new password reset link.
              </p>
            </div>
          </div>

          <div className="auth-form-panel">
            <h2 className="auth-form-title">Reset Link Expired</h2>
            <p className="auth-form-subtitle">
              The password reset link you're trying to use is invalid or has expired. 
              Password reset links expire after 1 hour for security reasons.
            </p>
            
            <div className="error-message" style={{ marginBottom: '1.5rem' }}>
              {error || 'Invalid or expired reset token'}
            </div>

            <Link to="/forgot-password" className="btn-primary" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
              Request New Reset Link
            </Link>

            <p className="auth-link">
              Remember your password? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

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
              Enter your new password below. Make sure it's strong and secure. 
              You'll be able to sign in with your new password after this.
            </p>
          </div>
        </div>

        {/* Right Panel - Reset Form */}
        <div className="auth-form-panel">
          {!success ? (
            <>
              <h2 className="auth-form-title">Reset Password</h2>
              <p className="auth-form-subtitle">
                Enter your new password. It must be at least 6 characters long.
              </p>
              
              <form onSubmit={handleSubmit}>
                {/* New Password Input */}
                <div className="form-group">
                  <label htmlFor="password" className="form-label">New Password</label>
                  <div className="form-input-wrapper">
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={password}
                      onChange={handleChange}
                      placeholder="Enter new password"
                      className="form-input"
                      required
                      disabled={loading}
                      minLength={6}
                    />
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                  <div className="form-input-wrapper">
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm new password"
                      className="form-input"
                      required
                      disabled={loading}
                      minLength={6}
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
                  {loading ? 'Resetting Password...' : 'Reset Password'}
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
              <h2 className="auth-form-title">Password Reset Successful!</h2>
              <p className="auth-form-subtitle">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              <div className="success-info-box">
                <p>
                  Redirecting to login page in a few seconds...
                </p>
              </div>
              <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                Go to Login
              </Link>
            </div>
          )}

          {/* Navigation Links */}
          {!success && (
            <>
              <p className="auth-link">
                Remember your password? <Link to="/login">Sign in</Link>
              </p>
              <p className="auth-link">
                Need a new reset link? <Link to="/forgot-password">Request reset link</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

