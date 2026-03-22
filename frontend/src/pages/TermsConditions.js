import React from 'react';

const TermsConditions = () => {
  return (
    <div className="dashboard-content">
      <div className="container-fluid">
        {/* Page Header */}
        <div className="card shadow-sm border-0 mb-4" style={{ 
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
          borderRadius: '16px',
          padding: '1.5rem 2rem'
        }}>
          <div>
            <h1 className="mb-1 fw-bold text-white" style={{ fontSize: '1.75rem' }}>Terms & Conditions</h1>
            <p className="text-white mb-0" style={{ opacity: 0.9 }}>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Content */}
        <div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
          <div className="card-body p-4">
            <div className="content-wrapper" style={{ color: '#374151', lineHeight: '1.8' }}>
              
              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>1. Acceptance of Terms</h2>
                <p className="mb-3">
                  By accessing and using the Volunteer Connect platform ("Service"), you accept and agree to be bound by the terms 
                  and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
                <p className="mb-3">
                  These Terms and Conditions ("Terms") govern your use of our platform and services. Your use of our platform 
                  constitutes acceptance of these Terms.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>2. Description of Service</h2>
                <p className="mb-3">
                  Volunteer Connect is a platform that connects volunteers with organizations and volunteer opportunities. 
                  Our service allows you to:
                </p>
                <ul className="mb-3" style={{ paddingLeft: '1.5rem' }}>
                  <li className="mb-2">Browse and search for volunteer opportunities</li>
                  <li className="mb-2">Create and manage volunteer activities</li>
                  <li className="mb-2">Track your volunteer hours and contributions</li>
                  <li className="mb-2">Communicate with organizations and other volunteers</li>
                  <li className="mb-2">Access resources and support materials</li>
                </ul>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>3. User Accounts and Registration</h2>
                <h3 className="fw-semibold mb-2" style={{ color: '#334155', fontSize: '1.2rem' }}>3.1 Account Creation</h3>
                <p className="mb-3">
                  To use certain features of our platform, you must register for an account. When registering, you agree to:
                </p>
                <ul className="mb-3" style={{ paddingLeft: '1.5rem' }}>
                  <li className="mb-2">Provide accurate, current, and complete information</li>
                  <li className="mb-2">Maintain and update your information as necessary</li>
                  <li className="mb-2">Maintain the security of your password and account</li>
                  <li className="mb-2">Accept all responsibility for activities under your account</li>
                  <li className="mb-2">Notify us immediately of any unauthorized use of your account</li>
                </ul>

                <h3 className="fw-semibold mb-2 mt-4" style={{ color: '#334155', fontSize: '1.2rem' }}>3.2 Account Responsibilities</h3>
                <p className="mb-3">
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                  that occur under your account. We reserve the right to suspend or terminate accounts that violate these Terms.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>4. User Conduct and Responsibilities</h2>
                <p className="mb-3">You agree to use our platform in a lawful and respectful manner. You agree not to:</p>
                <ul className="mb-3" style={{ paddingLeft: '1.5rem' }}>
                  <li className="mb-2">Violate any applicable laws or regulations</li>
                  <li className="mb-2">Infringe upon the rights of others</li>
                  <li className="mb-2">Post false, misleading, or fraudulent information</li>
                  <li className="mb-2">Harass, threaten, or harm other users</li>
                  <li className="mb-2">Upload malicious code, viruses, or harmful content</li>
                  <li className="mb-2">Impersonate any person or entity</li>
                  <li className="mb-2">Interfere with or disrupt the platform's operation</li>
                  <li className="mb-2">Use automated systems to access the platform without permission</li>
                  <li className="mb-2">Collect user information without consent</li>
                  <li className="mb-2">Engage in any activity that damages the platform's reputation</li>
                </ul>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>5. Volunteer Activities and Responsibilities</h2>
                <h3 className="fw-semibold mb-2" style={{ color: '#334155', fontSize: '1.2rem' }}>5.1 Participation</h3>
                <p className="mb-3">
                  By participating in volunteer activities through our platform, you acknowledge that:
                </p>
                <ul className="mb-3" style={{ paddingLeft: '1.5rem' }}>
                  <li className="mb-2">Volunteer work is performed at your own risk</li>
                  <li className="mb-2">You are responsible for your own safety and well-being</li>
                  <li className="mb-2">You must comply with organization policies and guidelines</li>
                  <li className="mb-2">You will report hours accurately and honestly</li>
                </ul>

                <h3 className="fw-semibold mb-2 mt-4" style={{ color: '#334155', fontSize: '1.2rem' }}>5.2 Liability</h3>
                <p className="mb-3">
                  Volunteer Connect is not liable for any injuries, damages, or losses that occur during volunteer activities. 
                  You participate in volunteer activities at your own discretion and risk.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>6. Content and Intellectual Property</h2>
                <h3 className="fw-semibold mb-2" style={{ color: '#334155', fontSize: '1.2rem' }}>6.1 User Content</h3>
                <p className="mb-3">
                  You retain ownership of content you post on our platform. By posting content, you grant us a non-exclusive, 
                  worldwide, royalty-free license to use, display, and distribute your content on the platform.
                </p>

                <h3 className="fw-semibold mb-2 mt-4" style={{ color: '#334155', fontSize: '1.2rem' }}>6.2 Platform Content</h3>
                <p className="mb-3">
                  All content on the platform, including design, text, graphics, logos, and software, is owned by Volunteer Connect 
                  or its licensors and is protected by copyright and other intellectual property laws.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>7. Privacy and Data Protection</h2>
                <p className="mb-3">
                  Your use of our platform is also governed by our Privacy Policy. Please review our Privacy Policy to understand 
                  how we collect, use, and protect your personal information.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>8. Service Availability and Modifications</h2>
                <p className="mb-3">
                  We reserve the right to modify, suspend, or discontinue any part of our platform at any time, with or without notice. 
                  We do not guarantee that our platform will be available at all times or that it will be error-free.
                </p>
                <p className="mb-3">
                  We may perform scheduled maintenance that may temporarily interrupt service. We will attempt to notify users 
                  of planned maintenance when possible.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>9. Termination</h2>
                <p className="mb-3">
                  We reserve the right to suspend or terminate your account and access to the platform at any time, with or without cause, 
                  for violations of these Terms or for any other reason we deem necessary.
                </p>
                <p className="mb-3">
                  You may terminate your account at any time by contacting us or using the account deletion feature in your settings.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>10. Disclaimers and Limitations of Liability</h2>
                <p className="mb-3">
                  The platform is provided "as is" and "as available" without warranties of any kind, either express or implied. 
                  We disclaim all warranties, including but not limited to merchantability, fitness for a particular purpose, 
                  and non-infringement.
                </p>
                <p className="mb-3">
                  To the maximum extent permitted by law, Volunteer Connect shall not be liable for any indirect, incidental, 
                  special, consequential, or punitive damages, including loss of profits, data, or use, arising out of or 
                  in connection with your use of the platform.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>11. Indemnification</h2>
                <p className="mb-3">
                  You agree to indemnify and hold harmless Volunteer Connect, its officers, directors, employees, and agents from 
                  any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of:
                </p>
                <ul className="mb-3" style={{ paddingLeft: '1.5rem' }}>
                  <li className="mb-2">Your use of the platform</li>
                  <li className="mb-2">Your violation of these Terms</li>
                  <li className="mb-2">Your violation of any rights of another party</li>
                  <li className="mb-2">Your participation in volunteer activities</li>
                </ul>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>12. Changes to Terms</h2>
                <p className="mb-3">
                  We reserve the right to modify these Terms at any time. We will notify users of material changes by posting 
                  the updated Terms on the platform and updating the "Last updated" date.
                </p>
                <p className="mb-3">
                  Your continued use of the platform after changes are posted constitutes acceptance of the modified Terms. 
                  If you do not agree to the modified Terms, you must stop using the platform.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>13. Governing Law</h2>
                <p className="mb-3">
                  These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], 
                  without regard to its conflict of law provisions. Any disputes arising from these Terms or your use 
                  of the platform shall be subject to the exclusive jurisdiction of the courts in [Your Jurisdiction].
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>14. Contact Information</h2>
                <p className="mb-3">
                  If you have any questions about these Terms & Conditions, please contact us:
                </p>
                <div className="p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                  <p className="mb-2"><strong>Email:</strong> legal@volunteerconnect.com</p>
                  <p className="mb-2"><strong>Support:</strong> Visit our Help & Support page for assistance</p>
                  <p className="mb-0"><strong>Address:</strong> [Your Organization Address]</p>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsConditions;
