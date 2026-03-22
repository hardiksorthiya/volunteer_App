import React, { useState } from 'react';

const HelpSupport = () => {
  const [activeSection, setActiveSection] = useState(null);

  const toggleSection = (section) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const faqSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      questions: [
        {
          q: 'How do I create an account?',
          a: 'Click on the "Register" button in the top right corner of the homepage. Fill in your personal information including name, email, phone number, and password. After registration, you will receive a confirmation email.'
        },
        {
          q: 'How do I reset my password?',
          a: 'If you forget your password, click on "Forgot Password" on the login page. Enter your email address, and we will send you a password reset link. Follow the instructions in the email to create a new password.'
        },
        {
          q: 'What information do I need to provide?',
          a: 'You need to provide your name, email address, phone number, and create a secure password. You can also upload a profile picture and add additional information in your profile settings.'
        }
      ]
    },
    {
      id: 'volunteer-activities',
      title: 'Volunteer Activities',
      questions: [
        {
          q: 'How do I find volunteer opportunities?',
          a: 'Navigate to the "Activities" section from the main menu. You can browse all available activities, filter by category, location, or date. Use the search function to find specific opportunities that match your interests.'
        },
        {
          q: 'How do I join a volunteer activity?',
          a: 'Click on any activity card to view details. If the activity is open for volunteers, you will see a "Join Activity" button. Click it to register your interest. The activity organizer will review your request and notify you.'
        },
        {
          q: 'How do I track my volunteer hours?',
          a: 'Your volunteer hours are automatically tracked when you complete tasks assigned to you. You can view your total hours, activities participated in, and statistics on your Dashboard. All hours are verified by activity organizers.'
        },
        {
          q: 'Can I create my own volunteer activity?',
          a: 'Yes! If you are an organization or have the necessary permissions, you can create activities by clicking "Add Activity" in the Activities section. Fill in the activity details, set dates, and assign tasks.'
        }
      ]
    },
    {
      id: 'account-management',
      title: 'Account Management',
      questions: [
        {
          q: 'How do I update my profile information?',
          a: 'Go to your Profile page from the sidebar menu. Click "Edit Profile" to update your name, phone number, email, or profile picture. Remember to save your changes when you are done.'
        },
        {
          q: 'How do I change my password?',
          a: 'Go to Settings or Profile, then select "Change Password". You will need to enter your current password and then provide your new password twice to confirm.'
        },
        {
          q: 'How do I delete my account?',
          a: 'To delete your account, please contact our support team through the Help & Support page or email support@volunteerconnect.com. Account deletion is permanent and cannot be undone.'
        }
      ]
    },
    {
      id: 'technical-support',
      title: 'Technical Support',
      questions: [
        {
          q: 'I cannot log in to my account. What should I do?',
          a: 'First, verify that you are using the correct email and password. Try resetting your password if necessary. Clear your browser cache and cookies, or try using a different browser. If problems persist, contact our support team.'
        },
        {
          q: 'The page is not loading correctly. How can I fix this?',
          a: 'Try refreshing the page or clearing your browser cache. Ensure you are using a supported browser (Chrome, Firefox, Safari, or Edge) with the latest version. Disable browser extensions that might interfere with the site.'
        },
        {
          q: 'How do I report a bug or technical issue?',
          a: 'If you encounter a bug or technical issue, please contact our support team with details about the problem, including what you were doing when it occurred, your browser and device information, and any error messages you saw.'
        }
      ]
    },
    {
      id: 'organizations',
      title: 'For Organizations',
      questions: [
        {
          q: 'How do I register my organization?',
          a: 'Contact us at organizations@volunteerconnect.com or through the Help & Support page. We will guide you through the organization registration process and set up your account with appropriate permissions.'
        },
        {
          q: 'How do I manage volunteer activities?',
          a: 'As an organization, you can create activities, assign tasks to volunteers, track participation, and verify volunteer hours. Use the Activities section to manage all your volunteer opportunities.'
        },
        {
          q: 'How do I communicate with volunteers?',
          a: 'You can communicate with volunteers through the Chat feature in each activity. Volunteers can message you with questions, and you can send announcements and updates to all participants.'
        }
      ]
    }
  ];

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
            <h1 className="mb-1 fw-bold text-white" style={{ fontSize: '1.75rem' }}>Help & Support</h1>
            <p className="text-white mb-0" style={{ opacity: 0.9 }}>Find answers to common questions and get assistance</p>
          </div>
        </div>

        {/* Quick Contact */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '16px' }}>
              <div className="card-body p-4 text-center">
                <div className="mb-3" style={{ fontSize: '2.5rem' }}>📧</div>
                <h5 className="fw-bold mb-2" style={{ color: '#1e293b' }}>Email Support</h5>
                <p className="text-muted mb-3 small">Get help via email</p>
                <a href="mailto:support@volunteerconnect.com" className="btn btn-primary w-100">
                  support@volunteerconnect.com
                </a>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '16px' }}>
              <div className="card-body p-4 text-center">
                <div className="mb-3" style={{ fontSize: '2.5rem' }}>💬</div>
                <h5 className="fw-bold mb-2" style={{ color: '#1e293b' }}>Live Chat</h5>
                <p className="text-muted mb-3 small">Chat with our support team</p>
                <button className="btn btn-primary w-100" disabled>
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '16px' }}>
              <div className="card-body p-4 text-center">
                <div className="mb-3" style={{ fontSize: '2.5rem' }}>📞</div>
                <h5 className="fw-bold mb-2" style={{ color: '#1e293b' }}>Phone Support</h5>
                <p className="text-muted mb-3 small">Call us for immediate help</p>
                <a href="tel:+1234567890" className="btn btn-primary w-100">
                  +1 (234) 567-890
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
          <div className="card-body p-4">
            <h2 className="fw-bold mb-4" style={{ color: '#1e293b', fontSize: '1.75rem' }}>Frequently Asked Questions</h2>
            
            {faqSections.map((section) => (
              <div key={section.id} className="mb-4">
                <h3 className="fw-semibold mb-3" style={{ color: '#334155', fontSize: '1.3rem' }}>
                  {section.title}
                </h3>
                
                {section.questions.map((item, index) => (
                  <div key={index} className="mb-3">
                    <button
                      onClick={() => toggleSection(`${section.id}-${index}`)}
                      className="btn btn-link text-start w-100 p-3 rounded mb-2"
                      style={{
                        textDecoration: 'none',
                        backgroundColor: activeSection === `${section.id}-${index}` ? '#eff6ff' : '#f8f9fa',
                        color: '#1e293b',
                        border: '1px solid #e5e7eb',
                        fontWeight: '600'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span>{item.q}</span>
                        <span style={{ fontSize: '1.2rem' }}>
                          {activeSection === `${section.id}-${index}` ? '−' : '+'}
                        </span>
                      </div>
                    </button>
                    {activeSection === `${section.id}-${index}` && (
                      <div className="p-3 mb-3 rounded" style={{ backgroundColor: '#f8f9fa', borderLeft: '4px solid #2563eb', marginLeft: '1rem' }}>
                        <p className="mb-0" style={{ color: '#374151', lineHeight: '1.7' }}>
                          {item.a}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Additional Resources */}
        <div className="card shadow-sm border-0 mt-4" style={{ borderRadius: '16px' }}>
          <div className="card-body p-4">
            <h2 className="fw-bold mb-4" style={{ color: '#1e293b', fontSize: '1.75rem' }}>Additional Resources</h2>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="p-3 rounded" style={{ backgroundColor: '#f8f9fa', borderLeft: '4px solid #2563eb' }}>
                  <h5 className="fw-semibold mb-2" style={{ color: '#1e293b' }}>Privacy Policy</h5>
                  <p className="text-muted small mb-2">Learn how we protect and handle your personal information</p>
                  <a href="/privacy-policy" className="btn btn-sm btn-outline-primary">Read More</a>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 rounded" style={{ backgroundColor: '#f8f9fa', borderLeft: '4px solid #2563eb' }}>
                  <h5 className="fw-semibold mb-2" style={{ color: '#1e293b' }}>Terms & Conditions</h5>
                  <p className="text-muted small mb-2">Review our terms of service and user agreement</p>
                  <a href="/terms-conditions" className="btn btn-sm btn-outline-primary">Read More</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
