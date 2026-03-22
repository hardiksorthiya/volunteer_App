import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../config/api';
import { EyeIcon, EyeOffIcon } from '../components/Icons';
import '../css/Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        mobile: formData.phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      if (response.data && response.data.success) {
        // Redirect to login after successful registration
        navigate('/login', { state: { message: 'Registration successful! Please login.' } });
      } else {
        // Handle case where response doesn't have success: true
        setError(response.data?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      // Handle different types of errors
      if (err.response) {
        // Server responded with error status
        setError(err.response.data?.message || 'Registration failed. Please check your information and try again.');
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
            <h1 className="auth-welcome-title">Join Us</h1>
            <h2 className="auth-welcome-headline">Volunteer Connect</h2>
            <p className="auth-welcome-description">
              Start your journey of making a positive impact today. Create your account 
              to connect with organizations, discover volunteer opportunities, and be part 
              of a community that cares.
            </p>
          </div>
        </div>

        {/* Right Panel - Registration Form */}
        <div className="auth-form-panel">
          <h2 className="auth-form-title">Sign up</h2>
          <p className="auth-form-subtitle">Create your account to get started</p>
          
          <form onSubmit={handleSubmit}>
            {/* Name Input */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">Full Name</label>
              <div className="form-input-wrapper">
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="form-input form-input-placeholder-user"
                  required
                />
              </div>
            </div>

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

            {/* Phone Input */}
            <div className="form-group">
              <label htmlFor="phone" className="form-label">Phone Number</label>
              <div className="form-input-wrapper">
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  className="form-input form-input-placeholder-phone"
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

            {/* Confirm Password Input */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <div className="form-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className="form-input form-input-placeholder-lock form-input-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon className="password-toggle-icon" />
                  ) : (
                    <EyeIcon className="password-toggle-icon" />
                  )}
                  <span className="password-toggle-text">{showConfirmPassword ? 'HIDE' : 'SHOW'}</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && <div className="error-message">{error}</div>}

            {/* Sign Up Button */}
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          {/* Sign In Link */}
          <p className="auth-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
