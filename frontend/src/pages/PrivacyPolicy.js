import React from 'react';

const PrivacyPolicy = () => {
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
            <h1 className="mb-1 fw-bold text-white" style={{ fontSize: '1.75rem' }}>Privacy Policy</h1>
            <p className="text-white mb-0" style={{ opacity: 0.9 }}>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Content */}
        <div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
          <div className="card-body p-4">
            <div className="content-wrapper" style={{ color: '#374151', lineHeight: '1.8' }}>
              
              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>1. Introduction</h2>
                <p className="mb-3">
                  Welcome to Volunteer Connect. We are committed to protecting your privacy and ensuring the security of your personal information. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
                </p>
                <p>
                  By using our services, you agree to the collection and use of information in accordance with this policy. 
                  If you do not agree with our policies and practices, please do not use our services.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>2. Information We Collect</h2>
                <h3 className="fw-semibold mb-2" style={{ color: '#334155', fontSize: '1.2rem' }}>2.1 Personal Information</h3>
                <p className="mb-3">
                  We may collect personal information that you provide directly to us, including:
                </p>
                <ul className="mb-3" style={{ paddingLeft: '1.5rem' }}>
                  <li className="mb-2">Name and contact information (email address, phone number)</li>
                  <li className="mb-2">Profile information and preferences</li>
                  <li className="mb-2">Account credentials and authentication information</li>
                  <li className="mb-2">Volunteer activity history and records</li>
                  <li className="mb-2">Organization information (if applicable)</li>
                </ul>

                <h3 className="fw-semibold mb-2 mt-4" style={{ color: '#334155', fontSize: '1.2rem' }}>2.2 Usage Information</h3>
                <p className="mb-3">
                  We automatically collect certain information about your use of our platform, including:
                </p>
                <ul className="mb-3" style={{ paddingLeft: '1.5rem' }}>
                  <li className="mb-2">Device information and identifiers</li>
                  <li className="mb-2">Browser type and version</li>
                  <li className="mb-2">IP address and location data</li>
                  <li className="mb-2">Pages visited and time spent on pages</li>
                  <li className="mb-2">Clickstream data and interaction patterns</li>
                </ul>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>3. How We Use Your Information</h2>
                <p className="mb-3">We use the collected information for various purposes, including:</p>
                <ul className="mb-3" style={{ paddingLeft: '1.5rem' }}>
                  <li className="mb-2">To provide, maintain, and improve our services</li>
                  <li className="mb-2">To process and manage volunteer activities</li>
                  <li className="mb-2">To communicate with you about your account and activities</li>
                  <li className="mb-2">To send important updates and notifications</li>
                  <li className="mb-2">To personalize your experience and content</li>
                  <li className="mb-2">To analyze usage patterns and improve platform functionality</li>
                  <li className="mb-2">To detect, prevent, and address technical issues and security threats</li>
                  <li className="mb-2">To comply with legal obligations and enforce our terms</li>
                </ul>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>4. Information Sharing and Disclosure</h2>
                <p className="mb-3">We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:</p>
                <ul className="mb-3" style={{ paddingLeft: '1.5rem' }}>
                  <li className="mb-2"><strong>With Organizations:</strong> Your volunteer activity information may be shared with organizations you volunteer with</li>
                  <li className="mb-2"><strong>Service Providers:</strong> We may share information with third-party service providers who assist us in operating our platform</li>
                  <li className="mb-2"><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid legal requests</li>
                  <li className="mb-2"><strong>Business Transfers:</strong> Information may be transferred in connection with mergers, acquisitions, or asset sales</li>
                  <li className="mb-2"><strong>With Your Consent:</strong> We may share information with your explicit consent</li>
                </ul>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>5. Data Security</h2>
                <p className="mb-3">
                  We implement appropriate technical and organizational security measures to protect your personal information against 
                  unauthorized access, alteration, disclosure, or destruction. These measures include:
                </p>
                <ul className="mb-3" style={{ paddingLeft: '1.5rem' }}>
                  <li className="mb-2">Encryption of data in transit and at rest</li>
                  <li className="mb-2">Regular security assessments and updates</li>
                  <li className="mb-2">Access controls and authentication mechanisms</li>
                  <li className="mb-2">Secure server infrastructure</li>
                </ul>
                <p className="mb-3">
                  However, no method of transmission over the Internet or electronic storage is 100% secure. 
                  While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>6. Your Rights and Choices</h2>
                <p className="mb-3">You have the right to:</p>
                <ul className="mb-3" style={{ paddingLeft: '1.5rem' }}>
                  <li className="mb-2">Access and review your personal information</li>
                  <li className="mb-2">Update or correct inaccurate information</li>
                  <li className="mb-2">Request deletion of your account and data</li>
                  <li className="mb-2">Opt-out of certain communications</li>
                  <li className="mb-2">Export your data in a portable format</li>
                  <li className="mb-2">Object to processing of your personal information</li>
                </ul>
                <p className="mb-3">
                  To exercise these rights, please contact us through the Help & Support section or email us at the contact information provided below.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>7. Cookies and Tracking Technologies</h2>
                <p className="mb-3">
                  We use cookies and similar tracking technologies to track activity on our platform and hold certain information. 
                  Cookies are files with a small amount of data which may include an anonymous unique identifier.
                </p>
                <p className="mb-3">
                  You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. 
                  However, if you do not accept cookies, you may not be able to use some portions of our platform.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>8. Data Retention</h2>
                <p className="mb-3">
                  We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, 
                  unless a longer retention period is required or permitted by law. When we no longer need your information, 
                  we will securely delete or anonymize it.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>9. Children's Privacy</h2>
                <p className="mb-3">
                  Our platform is not intended for children under the age of 13. We do not knowingly collect personal information 
                  from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, 
                  please contact us immediately.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>10. Changes to This Privacy Policy</h2>
                <p className="mb-3">
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy 
                  on this page and updating the "Last updated" date at the top of this policy.
                </p>
                <p className="mb-3">
                  You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective 
                  when they are posted on this page.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>11. Contact Us</h2>
                <p className="mb-3">
                  If you have any questions about this Privacy Policy or our privacy practices, please contact us:
                </p>
                <div className="p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                  <p className="mb-2"><strong>Email:</strong> privacy@volunteerconnect.com</p>
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

export default PrivacyPolicy;
