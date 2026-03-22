import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../config/api';
import { EyeIcon, EyeOffIcon } from '../components/Icons';
import '../css/Home.css';

const Home = () => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // If already logged in, redirect to dashboard
  if (token) {
    navigate('/dashboard');
    return null;
  }

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
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data));
        
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        
        setSuccess('Login successful! Redirecting...');
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        setError(response.data?.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response) {
        // Server responded with error status
        setError(err.response.data?.message || 'Login failed. Please check your credentials.');
      } else if (err.request) {
        // Request was made but no response received (network/CORS/server down)
        const apiUrl = process.env.REACT_APP_API_URL || 'the API server';
        setError(`Unable to connect to the server. Please ensure the backend server is running on port 3000. Error: ${err.message || 'Network error'}`);
      } else {
        // Something else happened
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home">
      {/* Top Background Section */}
      <div className="home-background">
        <div className="home-background-overlay"></div>
      </div>

      {/* Main Content Section */}
      <div className="home-content-wrapper">
        <div className="home-content-container">
          {/* Left Side - Title and Subtitle */}
          <div className="home-left-panel">
            <h1 className="home-title">Volunteer Connect</h1>
            <h2 className="home-subtitle">Connect. Volunteer. Make a Difference.</h2>
            <p className="home-description">
              Join thousands of volunteers and organizations making a positive impact in their communities. 
              Discover meaningful opportunities, connect with like-minded individuals, and create lasting change together.
            </p>
            <div className="home-features">
              <div className="home-feature">
                <span className="home-feature-icon">🤝</span>
                <span>Connect with Organizations</span>
              </div>
              <div className="home-feature">
                <span className="home-feature-icon">❤️</span>
                <span>Make a Real Impact</span>
              </div>
              <div className="home-feature">
                <span className="home-feature-icon">🌟</span>
                <span>Build Your Community</span>
              </div>
            </div>
            <Link to="/register" className="home-cta-button">
              Get Started Free
            </Link>
          </div>

          {/* Right Side - Login Form */}
          <div className="home-right-panel">
            <div className="home-login-card">
              <h2 className="home-login-title">Welcome Back</h2>
              <p className="home-login-subtitle">Sign in to your account</p>
              
              <form onSubmit={handleSubmit} className="home-login-form">
                {/* Email Input */}
                <div className="home-form-group">
                  <label htmlFor="home-email" className="home-form-label">Email</label>
                  <div className="home-form-input-wrapper">
                    <input
                      type="email"
                      id="home-email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      className="home-form-input form-input-placeholder-email"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="home-form-group">
                  <label htmlFor="home-password" className="home-form-label">Password</label>
                  <div className="home-form-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="home-password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className="home-form-input form-input-placeholder-lock form-input-password"
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
                <div className="home-options-row">
                  <div className="remember-me">
                    <input
                      type="checkbox"
                      id="home-rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <label htmlFor="home-rememberMe">Remember me</label>
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
                  className="home-btn-primary" 
                  disabled={loading || success}
                >
                  {loading ? 'Signing in...' : success ? 'Success!' : 'Sign in'}
                </button>
              </form>

              {/* Sign Up Link */}
              <p className="home-signup-link">
                Don't have an account? <Link to="/register">Sign up</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

