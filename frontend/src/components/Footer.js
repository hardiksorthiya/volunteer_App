import React from 'react';
import { Link } from 'react-router-dom';
import './css/Footer.css';

const Footer = () => {
  const appVersion = '1.0.0'; // Get from package.json

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-left">
          <Link to="/privacy-policy" className="footer-link">Privacy Policy</Link>
          <Link to="/terms-conditions" className="footer-link">Terms & Conditions</Link>
          <Link to="/help-support" className="footer-link">Help & Support</Link>
        </div>
        <div className="footer-right">
          <span className="footer-version">App Version: {appVersion}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
