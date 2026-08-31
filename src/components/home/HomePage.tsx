import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { LogIn, LayoutDashboard } from 'lucide-react';
import './HomePage.css';

// Import brand and service image assets
import eGraminLogo from '../../assets/images/e-gramin-logo.png';
import banner1 from '../../assets/images/banner-1.jpg';
import banner2 from '../../assets/images/banner-2.jpg';
import sbiLogo from '../../assets/images/sbi.png';
import licLogo from '../../assets/images/LIC-Logo.jpg';
import iciciLogo from '../../assets/images/icici-bank-ne-logo.jpg';
import hdfcLogo from '../../assets/images/hdfc.png';
import nicLogo from '../../assets/images/nicjpg.jpeg';
import aprbLogo from '../../assets/images/aprb.png';
import aboutImg from '../../assets/images/about.png';
import mapImg from '../../assets/images/map.jpg';
import insuranceIcon from '../../assets/images/insurance.png';
import genInsuranceIcon from '../../assets/images/genInsurance.png';
import healthInsuranceIcon from '../../assets/images/healthInsurance.png';
import bankingIcon from '../../assets/images/banking.png';
import posIcon from '../../assets/images/pos.png';
import othersIcon from '../../assets/images/others.png';

// Import gallery thumbnails and full images
import galleryThumb1 from '../../assets/images/gallery-images/thumb/01.jpg';
import galleryThumb2 from '../../assets/images/gallery-images/thumb/02.jpg';
import galleryThumb3 from '../../assets/images/gallery-images/thumb/03.jpg';
import galleryThumb4 from '../../assets/images/gallery-images/thumb/04.jpg';
import galleryThumb5 from '../../assets/images/gallery-images/thumb/05.jpg';

import galleryFull1 from '../../assets/images/gallery-images/full/01.jpg';
import galleryFull2 from '../../assets/images/gallery-images/full/02.jpg';
import galleryFull3 from '../../assets/images/gallery-images/full/03.jpg';
import galleryFull4 from '../../assets/images/gallery-images/full/04.jpg';
import galleryFull5 from '../../assets/images/gallery-images/full/05.jpg';

export const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { goToDashboard } = useApp();

  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [activeNav, setActiveNav] = useState<string>('home');
  const [isNewsModalOpen, setIsNewsModalOpen] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const slides = [
    { src: banner1, alt: 'eGramin Banner 1' },
    { src: banner2, alt: 'eGramin Banner 2' },
  ];

  const galleryItems = [
    { thumb: galleryThumb1, full: galleryFull1, title: 'e-Gramin Event 1' },
    { thumb: galleryThumb2, full: galleryFull2, title: 'e-Gramin Event 2' },
    { thumb: galleryThumb3, full: galleryFull3, title: 'e-Gramin Event 3' },
    { thumb: galleryThumb4, full: galleryFull4, title: 'e-Gramin Event 4' },
    { thumb: galleryThumb5, full: galleryFull5, title: 'e-Gramin Event 5' },
  ];

  // Carousel timer
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleNavClick = (sectionId: string, navName: string) => {
    setActiveNav(navName);
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    } else if (navName === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="egramin-homepage-wrapper">
      {/* -------------------------------------------------------------
          1. TOP BAR
          ------------------------------------------------------------- */}
      <div className="top-bar">
        <div className="eg-container">
          <div>
            <p className="mail-text">Welcome to e-Gramin</p>
          </div>
          <div className="top-nav">
            <span className="top-text">helpdesk[dot]egramin[at]gmail[dot]com</span>
            <span className="top-text">0361-3511441</span>
          </div>
        </div>
      </div>
      {/* end of top-bar */}

      {/* -------------------------------------------------------------
          2. HEADER & NAVIGATION
          ------------------------------------------------------------- */}
      <div className="header">
        <div className="eg-container">
          {/* Logo */}
          <div className="logo">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('home-section', 'home');
              }}
            >
              <img src={eGraminLogo} alt="e-Gramin Logo" />
            </a>
          </div>

          {/* Navigation */}
          <div id="navigation">
            <ul>
              <li className={activeNav === 'home' ? 'active' : ''}>
                <button
                  type="button"
                  className="nav-link-btn"
                  onClick={() => handleNavClick('home-section', 'home')}
                >
                  Home
                </button>
              </li>
              <li className={activeNav === 'about' ? 'active' : ''}>
                <button
                  type="button"
                  className="nav-link-btn"
                  onClick={() => handleNavClick('about-section', 'about')}
                >
                  About us
                </button>
              </li>
              <li className={activeNav === 'services' ? 'active' : ''}>
                <button
                  type="button"
                  className="nav-link-btn"
                  onClick={() => handleNavClick('services-section', 'services')}
                >
                  Services
                </button>
              </li>
              <li className={activeNav === 'gallery' ? 'active' : ''}>
                <button
                  type="button"
                  className="nav-link-btn"
                  onClick={() => handleNavClick('gallery-section', 'gallery')}
                >
                  Gallery
                </button>
              </li>
              <li className={activeNav === 'contact' ? 'active' : ''}>
                <button
                  type="button"
                  className="nav-link-btn"
                  onClick={() => handleNavClick('contact-section', 'contact')}
                >
                  Contact Us
                </button>
              </li>
              <li style={{ marginLeft: '12px' }}>
                <button
                  id="header-login-dashboard-btn"
                  type="button"
                  onClick={goToDashboard}
                  className="btn-login-dashboard"
                >
                  {isAuthenticated ? (
                    <>
                      <LayoutDashboard style={{ width: '16px', height: '16px' }} />
                      <span>Dashboard</span>
                    </>
                  ) : (
                    <>
                      <LogIn style={{ width: '16px', height: '16px' }} />
                      <span>Login</span>
                    </>
                  )}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {/* end of header */}

      {/* -------------------------------------------------------------
          3. NOTIFICATION MARQUEE
          ------------------------------------------------------------- */}
      <div className="notification">
        <div className="eg-container">
          {React.createElement(
            'marquee',
            {
              behavior: 'scroll',
              scrollamount: '5',
              direction: 'left',
            },
            <span>
              <a
                href="#news"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  setIsNewsModalOpen(true);
                }}
              >
                PAN Card services are available
              </a>
            </span>
          )}
        </div>
      </div>
      {/* end of notification */}

      {/* -------------------------------------------------------------
          4. BANNER CAROUSEL
          ------------------------------------------------------------- */}
      <div id="home-section" className="banner">
        <div className="carousel-container">
          <img
            src={eGraminLogo}
            className="banner-logo-img"
            alt="e-Gramin Banner Logo"
          />

          {slides.map((slide, idx) => (
            <div
              key={idx}
              className={`carousel-slide ${activeSlide === idx ? 'active' : ''}`}
            >
              <img src={slide.src} alt={slide.alt} />
            </div>
          ))}

          {/* Carousel Arrows */}
          <button
            type="button"
            className="carousel-control-prev"
            onClick={() => setActiveSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1))}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            className="carousel-control-next"
            onClick={() => setActiveSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1))}
            aria-label="Next"
          >
            ›
          </button>

          {/* Indicators */}
          <div className="carousel-indicators-custom">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={activeSlide === idx ? 'active' : ''}
                onClick={() => setActiveSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
      {/* end of banner */}

      {/* -------------------------------------------------------------
          5. PARTNERS SECTION
          ------------------------------------------------------------- */}
      <div className="partners">
        <div className="eg-container text-center">
          <div className="title">
            <h3>
              Our Banking &amp;<span> Service Partner&apos;s</span>
            </h3>
          </div>
          <div className='d-flex flex-row flex-wrap align-items-center justify-content-center gap-3'>
            <img src={licLogo} alt="LIC" />
            <img src={sbiLogo} alt="SBI" />
            <img src={iciciLogo} alt="ICICI Bank" />
            <img src={hdfcLogo} alt="HDFC" />
            <img src={nicLogo} alt="NIC" />
            <img src={aprbLogo} alt="APRB" />
          </div>
        </div>
      </div>
      {/* end of partners */}

      {/* -------------------------------------------------------------
          6. ABOUT SECTION
          ------------------------------------------------------------- */}
      <div id="about-section" className="about">
        <div className="eg-container">
          <div className="eg-row" style={{ alignItems: 'center' }}>
            <div className="eg-col-6">
              <img src={aboutImg} alt="About e-Gramin" />
            </div>
            <div className="eg-col-6">
              <div className="title" style={{ marginBottom: '15px' }}>
                <h3>
                  About <span>Company</span>
                </h3>
              </div>
              <p>
                E-Gramin Services Pvt Ltd is an ISO Certified Private Limited Organization our Registered office in Dispur, Guwahati with Zonal Office in almost all districts of Assam. Our strong network presence in all the nook and corners of North-Eastern region. Our
                mission is to bring convenience to the consumer&apos;s doorstep, enabling them to access a diversified range of B2C services through a vibrant delivery mechanism by developing rural level entrepreneurs. And also bring inclusive prosperity
                by partnering with government agencies and financial institutions for citizen centric projects.
              </p>
              <p>
                To Promote Financial Inclusion Projects and bring awareness to the Rural Mass providing various Banking and Non-Banking services at their doorsteps. We are also operating with various National and Regional Rural banks as Business correspondent
                (BC) to provide kiosk Banking services in the NE Region.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* end of about */}

      {/* -------------------------------------------------------------
          7. SERVICES SECTION
          ------------------------------------------------------------- */}
      <div id="services-section" className="services">
        <div className="eg-container">
          <div className="title" style={{ textAlign: 'center' }}>
            <h3>
              Our <span>Service&apos;s</span>
            </h3>
            <p>
              <strong>We offer Insurance Services and products like</strong>
            </p>
          </div>

          <div className="eg-row">
            {/* Box 1 */}
            <div className="eg-col-4">
              <div className="boxes">
                <div className="icon">
                  <img src={insuranceIcon} alt="Insurance" />
                </div>
                <div className="text">
                  <h3>Life Insurance Policy</h3>
                  <p>LIC, SBI Life and Birla Sun Life</p>
                </div>
              </div>
            </div>

            {/* Box 2 */}
            <div className="eg-col-4">
              <div className="boxes">
                <div className="icon">
                  <img src={genInsuranceIcon} alt="General Insurance" />
                </div>
                <div className="text">
                  <h3>General Insurance</h3>
                </div>
              </div>
            </div>

            {/* Box 3 */}
            <div className="eg-col-4">
              <div className="boxes">
                <div className="icon">
                  <img src={healthInsuranceIcon} alt="Health Insurance" />
                </div>
                <div className="text">
                  <h3>Health Insurance</h3>
                </div>
              </div>
            </div>

            {/* Box 4 */}
            <div className="eg-col-4">
              <div className="boxes">
                <div className="icon">
                  <img src={bankingIcon} alt="Banking" />
                </div>
                <div className="text">
                  <h3>Banking</h3>
                </div>
              </div>
            </div>

            {/* Box 5 */}
            <div className="eg-col-4">
              <div className="boxes">
                <div className="icon">
                  <img src={posIcon} alt="POS" />
                </div>
                <div className="text">
                  <h3>POS</h3>
                </div>
              </div>
            </div>

            {/* Box 6 */}
            <div className="eg-col-4">
              <div className="boxes">
                <div className="icon">
                  <img src={othersIcon} alt="Others" />
                </div>
                <div className="text">
                  <h3>Other&apos;s</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* end of services */}

      {/* -------------------------------------------------------------
          8. PHOTO GALLERY SECTION
          ------------------------------------------------------------- */}
      <div id="gallery-section" className="gallery-section">
        <div className="eg-container">
          <div className="title" style={{ textAlign: 'center' }}>
            <h3>
              Photo <span>Gallery</span>
            </h3>
          </div>

          <div className="gallery-grid">
            {galleryItems.map((item, idx) => (
              <div key={idx} className="gallery-item">
                <div
                  className="gallery-card"
                  onClick={() => setLightboxIndex(idx)}
                  title="Click to view full image"
                >
                  <img src={item.thumb} alt={item.title} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* end of gallery */}

      {/* -------------------------------------------------------------
          9. CONTACT US SECTION
          ------------------------------------------------------------- */}
      <div id="contact-section" className="contact-section-wrapper">
        <div className="eg-container">
          <div className="title" style={{ marginBottom: '20px' }}>
            <h3>
              Contact <span>Us</span>
            </h3>
          </div>

          <div className="eg-row" style={{ alignItems: 'flex-start' }}>
            {/* Left Column: Contact Details */}
            <div className="eg-col-6">
              <p style={{ color: '#555', fontSize: '15px', marginBottom: '20px' }}>
                You can reach us through below given means.
              </p>

              <div className="contact-info-list">
                <div className="contact-info-item">
                  <div className="contact-info-icon">🏠</div>
                  <div>
                    <strong style={{ color: '#222', display: 'block', marginBottom: '2px' }}>
                      e-Gramin Services Pvt. Ltd
                    </strong>
                    <span>
                      House No. 39, Sapta Swahid Path <br />
                      Dispur, Guwahati - 781006 <br />
                      Assam, India
                    </span>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon">✉</div>
                  <div>
                    <strong style={{ color: '#222', display: 'block', marginBottom: '2px' }}>
                      Email Address
                    </strong>
                    <span>helpdesk[dot]egramin[at]gmail[dot]com</span>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon">📞</div>
                  <div>
                    <strong style={{ color: '#222', display: 'block', marginBottom: '2px' }}>
                      Phone Helpdesk
                    </strong>
                    <span>0361-3511441</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Location Map Image */}
            <div className="eg-col-6">
              <div className="contact-map-card">
                <img src={mapImg} alt="e-Gramin Location Map" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* end of contact us */}

      {/* -------------------------------------------------------------
          10. FOOTER SECTION
          ------------------------------------------------------------- */}
      <footer className="footer">
        <div className="eg-container">
          <div className="eg-row">
            {/* Column 1 */}
            <div className="eg-col-3">
              <h6>Our Company</h6>
              <ul>
                <li>
                  <a
                    href="#home"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick('home-section', 'home');
                    }}
                  >
                    Home
                  </a>
                </li>
                <li>
                  <a
                    href="#about"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick('about-section', 'about');
                    }}
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick('services-section', 'services');
                    }}
                  >
                    Services
                  </a>
                </li>
                <li>
                  <a
                    href="#gallery"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick('gallery-section', 'gallery');
                    }}
                  >
                    Gallery
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick('contact-section', 'contact');
                    }}
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 2 */}
            <div className="eg-col-3">
              <h6>Our Service&apos;s</h6>
              <ul>
                <li>Banking</li>
                <li>General Insurance</li>
                <li>Life Insurance</li>
                <li>Health Insurance</li>
                <li>POS</li>
                <li>Education and IT</li>
              </ul>
            </div>

            {/* Column 3 */}
            <div className="eg-col-6">
              <h6>Reach Us</h6>
              <div className="reach-us-item">
                <span style={{ marginRight: '8px' }}>🏠</span>
                <span>
                  e-Gramin Services Pvt. Ltd <br />
                  House No. 39, Sapta Swahid Path <br />
                  Dispur, Guwahati - 781006 <br />
                  Assam, India
                </span>
              </div>
              <div className="reach-us-item">
                <span style={{ marginRight: '8px' }}>✉</span>
                <span>helpdesk[dot]egramin[at]gmail[dot]com</span>
              </div>
              <div className="reach-us-item">
                <span style={{ marginRight: '8px' }}>📞</span>
                <span>0361-3511441</span>
              </div>
            </div>
          </div>

          <hr />

          <div className="footer-bottom">
            <span>&copy; All Right Reserved. eGramin</span>
            <div>
              <button
                type="button"
                onClick={goToDashboard}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  textDecoration: 'underline',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {isAuthenticated ? 'Dashboard →' : 'Login →'}
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* -------------------------------------------------------------
          11. NEWS DETAIL MODAL
          ------------------------------------------------------------- */}
      {isNewsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewsModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>Notice</span>
              <button
                type="button"
                onClick={() => setIsNewsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              PAN Card services are available across all e-Gramin service points and partner centers.
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-warning"
                onClick={() => setIsNewsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          12. LIGHTBOX MODAL FOR GALLERY
          ------------------------------------------------------------- */}
      {lightboxIndex !== null && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setLightboxIndex(null)}
            >
              ✕
            </button>

            <img
              src={galleryItems[lightboxIndex].full}
              alt={galleryItems[lightboxIndex].title}
            />

            {/* Navigation buttons */}
            <button
              type="button"
              className="lightbox-nav-prev"
              onClick={() =>
                setLightboxIndex(prev => (prev === 0 ? galleryItems.length - 1 : (prev ?? 0) - 1))
              }
            >
              ‹
            </button>
            <button
              type="button"
              className="lightbox-nav-next"
              onClick={() =>
                setLightboxIndex(prev => (prev === galleryItems.length - 1 ? 0 : (prev ?? 0) + 1))
              }
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
