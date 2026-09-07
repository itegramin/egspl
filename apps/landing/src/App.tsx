import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { PricingPage } from './pages/PricingPage';
import { ContactPage } from './pages/ContactPage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

const AUTH_BASE = import.meta.env.VITE_AUTH_URL || 'https://auth.egraminservices.com';

const AuthRedirect = ({ to }: { to: 'login' | 'signup' }) => (
  <Navigate to={`${AUTH_BASE}/${to}`} replace />
);

export default function App() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<AuthRedirect to="login" />} />
        <Route path="/signup" element={<AuthRedirect to="signup" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </div>
  );
}
