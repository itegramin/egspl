import { Routes, Route, Navigate } from 'react-router-dom';

import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ServicesPage } from './pages/ServicesPage';
import { GalleryPage } from './pages/GalleryPage';
import { ContactPage } from './pages/ContactPage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

const AUTH_BASE =
  import.meta.env.VITE_AUTH_URL || 'https://auth.egraminservices.com';

const AuthRedirect = ({ to }: { to: 'login' | 'signup' }) => (
  <Navigate to={`${AUTH_BASE}/${to}`} replace />
);

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<AuthRedirect to="login" />} />
        <Route path="/signup" element={<AuthRedirect to="signup" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </>
  );
}