import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoImg from './images/logo.png';
import GuestAIChat from './GuestAIChat';
import '../css/Home.css';

const Home = () => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const homeRootRef = useRef(null);

  useEffect(() => {
    const root = homeRootRef.current;
    if (!root) return undefined;

    const sections = root.querySelectorAll('.home-section--observe');
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      sections.forEach((el) => el.classList.add('home-section--visible'));
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('home-section--visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
    );

    sections.forEach((el) => io.observe(el));

    const first = sections[0];
    if (first) {
      requestAnimationFrame(() => first.classList.add('home-section--visible'));
    }

    return () => {
      sections.forEach((el) => io.unobserve(el));
      io.disconnect();
    };
  }, []);

  if (token) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="home-page" ref={homeRootRef}>
      {/* Top banner + hero: background image set via .home-hero__bg in Home.css */}
      <section className="home-hero home-section--observe position-relative d-flex flex-column min-vh-100 overflow-hidden">
        <div
          className="home-hero__bg"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${(process.env.PUBLIC_URL || '')}/images/hero-banner.jpg)`,
          }}
        />
        <div className="home-hero__overlay" aria-hidden="true" />

        <header className="home-top-bar position-relative w-100">
          <div className="container">
            <div className="row align-items-center py-3 g-2">
              <div className="col-auto">
                <Link to="/" className="d-inline-block text-decoration-none home-top-bar__logo-link">
                  <img
                    src={logoImg}
                    alt="Volunteer Connect"
                    className="home-top-bar__logo img-fluid"
                  />
                </Link>
              </div>
              <div className="col-auto ms-auto">
                <div className="d-flex flex-wrap gap-2 justify-content-end">
                  <Link to="/login" className="btn btn-outline-light home-top-bar__btn">
                    Login
                  </Link>
                  <Link to="/register" className="btn btn-light text-primary fw-semibold home-top-bar__btn">
                    Sign up
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="home-hero__body flex-grow-1 d-flex align-items-center py-4 py-lg-5">
          <div className="container-xl">
            <div className="row align-items-center justify-content-center g-4 g-lg-5">
              <div className="col-12 col-lg-6 text-center text-lg-start">
                <h1 className="home-hero__title home-hero__anim text-uppercase mb-3">Volunteer Connect</h1>
                <p className="home-hero__lead home-hero__anim fw-semibold mb-3">
                  Connect. Volunteer. Make a Difference.
                </p>
                <p className="home-hero__text home-hero__anim lead mb-4">
                  Join thousands of volunteers and organizations making a positive impact in their communities.
                  Discover meaningful opportunities, connect with like-minded individuals, and create lasting change together.
                </p>
                <ul className="home-hero__anim list-unstyled mb-0 text-start d-inline-block home-hero__anim--delay">
                  <li className="home-hero__bullet d-flex align-items-center gap-2 mb-2">
                    <span className="home-hero__bullet-icon" aria-hidden="true">🤝</span>
                    <span>Connect with Organizations</span>
                  </li>
                  <li className="home-hero__bullet d-flex align-items-center gap-2 mb-2">
                    <span className="home-hero__bullet-icon" aria-hidden="true">❤️</span>
                    <span>Make a Real Impact</span>
                  </li>
                  <li className="home-hero__bullet d-flex align-items-center gap-2">
                    <span className="home-hero__bullet-icon" aria-hidden="true">🌟</span>
                    <span>
                    Be Part of Like Minded Community
                      </span>
                  </li>
                </ul>
                <p className="home-hero__text home-hero__anim lead my-4 ">
                Find volunteer opportunities with AI-assisted search. Set targets and manage activities — try the assistant on the right.
                    
                </p>
              </div>
              <div className="col-12 col-lg-6">
                <div className="mx-auto home-hero__chat-wrap home-hero__anim home-hero__anim--chat">
                  <GuestAIChat embedded />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="home-value-cards home-section--observe position-relative overflow-hidden"
        aria-label="Features"
      >
       
        <div className="container position-relative py-5">
          <div className="row g-4 justify-content-center">
            <div className="col-12 col-md-6">
              <div className="home-value-card card border-0 shadow h-100 text-center p-4 rounded-4">
                <div className="home-value-card__icon mb-3" aria-hidden="true">
                  <svg viewBox="0 0 80 80" width="72" height="72" role="img">
                    <circle cx="34" cy="34" r="22" fill="none" stroke="#22c55e" strokeWidth="5" />
                    <path d="M28 34l4 4 10-12" fill="none" stroke="#eab308" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="50" y1="50" x2="68" y2="68" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="home-value-card__title h5 fw-bold">Find Volunteer Opportunities</h3>
                <p className="home-value-card__text text-muted mb-0 small">
                  Discover many ways to volunteer — from local community projects to virtual roles — and explore causes
                  that match your skills and schedule.
                </p>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="home-value-card card border-0 shadow h-100 text-center p-4 rounded-4">
                <div className="home-value-card__icon mb-3" aria-hidden="true">
                  <svg viewBox="0 0 80 80" width="72" height="72" role="img">
                    <rect x="18" y="14" width="40" height="48" rx="4" fill="#2563eb" opacity="0.9" />
                    <rect x="24" y="22" width="28" height="4" rx="1" fill="#fff" opacity="0.9" />
                    <rect x="24" y="30" width="20" height="3" rx="1" fill="#fff" opacity="0.7" />
                    <path d="M48 18 L58 12 L58 26 Z" fill="#3b82f6" />
                  </svg>
                </div>
                <h3 className="home-value-card__title home-value-card__title--accent h5 fw-bold text-primary">Manage your volunteer activities</h3>
                <p className="home-value-card__text text-muted mb-0 small">
                Add or join selected volunteer activities, add tasks to activities, set volunteer activity targets and track your time against target
                </p>
              </div>
            </div>
            {/* <div className="col-12 col-md-4">
              <div className="home-value-card card border-0 shadow h-100 text-center p-4 rounded-4">
                <div className="home-value-card__icon mb-3" aria-hidden="true">
                  <svg viewBox="0 0 80 80" width="72" height="72" role="img">
                    <circle cx="40" cy="40" r="28" fill="#facc15" />
                    <path
                      d="M28 24 L28 52 L36 44 L40 58 L44 44 L52 52 L48 28 Z"
                      fill="#fff"
                      stroke="#1f2937"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="home-value-card__title h5 fw-bold">Explore Business Solutions</h3>
                <p className="home-value-card__text text-muted mb-0 small">
                  Offer volunteer programs to your team or community — share virtual and on-site opportunities in one
                  place through Volunteer Connect.
                </p>
              </div>
            </div> */}
          </div>
        </div>
      </section>

      <section className="home-about home-section--observe py-5 bg-white" aria-labelledby="home-about-heading">
        <div className="container">
          <div className="row align-items-center g-4 g-lg-5">
            <div className="col-lg-6">
              <h2 id="home-about-heading" className="home-about__heading">
                About Us
              </h2>
              <p className="home-about__text text-muted">
                Volunteer Connect helps volunteers and organizations find each other — whether you are looking for
                meaningful opportunities, coordinating activities, or tracking hours toward your goals. We believe
                technology should make giving back simpler, clearer, and more rewarding.
              </p>
              <p className="home-about__text text-muted mb-0">
                Our mission is to connect more people with social-impact work than ever before: one signup, one activity,
                and one community at a time. Together we can build a better world through service, partnership, and shared
                purpose.
              </p>
            </div>
            <div className="col-lg-6 text-center text-lg-end">
              <img
                src="/images/about.png"
                alt="Illustration of connecting people with volunteer opportunities online"
                className="img-fluid home-about__illustration"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="home-mvv home-section--observe py-5" aria-labelledby="home-mvv-heading">
        <div className="container">
          <h2 id="home-mvv-heading" className="home-mvv__section-title text-center mb-2 h3 fw-bold">
            Our mission, vision &amp; values
          </h2>
          <p className="home-mvv__intro text-center text-muted mx-auto mb-5">
            What guides Volunteer Connect every day.
          </p>
          <div className="row g-4 justify-content-center">
            <div className="col-12 col-md-4">
              <article className="home-mvv-card card border h-100 shadow-sm rounded-4 p-4">
                <div className="home-mvv-card__accent home-mvv-card__accent--mission" aria-hidden="true" />
                <h3 className="home-mvv-card__title h5 fw-bold mt-1">Mission</h3>
                <p className="home-mvv-card__text text-muted mb-0 small">
                  To connect volunteers with organizations through an easy, trustworthy platform — so more people can
                  turn intent into action and strengthen their communities.
                </p>
              </article>
            </div>
            <div className="col-12 col-md-4">
              <article className="home-mvv-card card border h-100 shadow-sm rounded-4 p-4">
                <div className="home-mvv-card__accent home-mvv-card__accent--vision" aria-hidden="true" />
                <h3 className="home-mvv-card__title h5 fw-bold mt-1">Vision</h3>
                <p className="home-mvv-card__text text-muted mb-0 small">
                  A world where everyone can discover volunteer work that fits their life — and where every organization
                  can find the people and passion to power their mission.
                </p>
              </article>
            </div>
            <div className="col-12 col-md-4">
              <article className="home-mvv-card card border h-100 shadow-sm rounded-4 p-4">
                <div className="home-mvv-card__accent home-mvv-card__accent--values" aria-hidden="true" />
                <h3 className="home-mvv-card__title h5 fw-bold mt-1">Values</h3>
                <p className="home-mvv-card__text text-muted mb-0 small">
                  <strong className="text-dark">Community</strong> first — we listen and build together.
                  <br />
                  <strong className="text-dark">Integrity</strong> — transparent, respectful, and fair.
                  <br />
                  <strong className="text-dark">Impact</strong> — we measure success by real outcomes for people and places.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section
        className="home-cta-contact home-section--observe py-5 text-center text-white"
        aria-labelledby="home-cta-contact-heading"
      >
        <div className="container py-3">
          <h2 id="home-cta-contact-heading" className="home-cta-contact__title h3 fw-bold mb-3">
            Are you a nonprofit looking for volunteers?
          </h2>
          <p className="home-cta-contact__subtitle lead mb-4">
            Join Volunteer Connect for free — list opportunities, reach volunteers, and manage your impact in one place.
            Get started by creating an account:
          </p>
          <div className="d-flex flex-wrap gap-3 justify-content-center mb-5">
            <Link to="/login" className="btn btn-light text-primary fw-semibold px-4 py-2 home-cta-contact__btn">
              Login
            </Link>
            <Link to="/register" className="btn btn-outline-light fw-semibold px-4 py-2 home-cta-contact__btn">
              Sign up
            </Link>
          </div>
          <p className="home-cta-contact__subtitle lead mb-0">Get your organization and activity added on our application so that volunteers can connect to you.</p>
          <p className="home-cta-contact__contact-label fw-semibold mb-2">Contact us</p>
          <a
            href="mailto:volunteerconnect.usa@gmail.com"
            className="home-cta-contact__email link-light text-decoration-underline"
          >
            volunteerconnect.usa@gmail.com
          </a>
        </div>
      </section>
    </div>
  );
};

export default Home;
