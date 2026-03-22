import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../config/api';
import { EyeIcon, EyeOffIcon } from '../components/Icons';
import '../css/Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Check for success message from registration
  useEffect(() => {
    // If already logged in, redirect to dashboard
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
      return;
    }

    if (location.state?.message) {
      setSuccess(location.state.message);
      // Clear the state to prevent showing message on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password
      });

      if (response.data && response.data.success) {
        // Store token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data));
        
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        
        // Show success message
        setSuccess('Login successful! Redirecting...');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        // Handle case where response doesn't have success: true
        setError(response.data?.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      // Handle different types of errors
      if (err.response) {
        // Server responded with error status
        setError(err.response.data?.message || 'Login failed. Please check your credentials.');
      } else if (err.request) {
        // Request was made but no response received (network error)
        setError('Unable to connect to server. Please check your internet connection and ensure the server is running.');
      } else {
        // Something else happened
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
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
            <h1 className="auth-welcome-title">Welcome</h1>
            <h2 className="auth-welcome-headline">Volunteer Connect</h2>
            <p className="auth-welcome-description">
              Join thousands of volunteers making a difference in their communities. 
              Connect with organizations, find meaningful opportunities, and create 
              positive change together.
            </p>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="auth-form-panel">
          <h2 className="auth-form-title">Sign in</h2>
          <p className="auth-form-subtitle">Enter your credentials to access your account</p>
          
          <form onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <div className="form-input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="form-input form-input-placeholder-email"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="form-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="form-input form-input-placeholder-lock form-input-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOffIcon className="password-toggle-icon" />
                  ) : (
                    <EyeIcon className="password-toggle-icon" />
                  )}
                  <span className="password-toggle-text">{showPassword ? 'HIDE' : 'SHOW'}</span>
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="auth-options-row">
              <div className="remember-me">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="rememberMe">Remember me</label>
              </div>
              <Link to="/forgot-password" className="forgot-password-link">
                Forgot Password?
              </Link>
            </div>

            {/* Error/Success Messages */}
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {/* Sign In Button */}
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading || (success && success.includes('Login successful'))}
            >
              {loading ? 'Signing in...' : (success && success.includes('Login successful')) ? 'Success!' : 'Sign in'}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="auth-link">
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
