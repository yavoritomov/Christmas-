import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from 'sonner';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import QuotesPage from './pages/QuotesPage';
import QuoteFormPage from './pages/QuoteFormPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceFormPage from './pages/InvoiceFormPage';
import UnpaidInvoicesPage from './pages/UnpaidInvoicesPage';
import CrewsPage from './pages/CrewsPage';
import SchedulePage from './pages/SchedulePage';
import CrewPortalPage from './pages/CrewPortalPage';
import SettingsPage from './pages/SettingsPage';

// Layout
import DashboardLayout from './components/DashboardLayout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const register = async (userData) => {
    const response = await axios.post(`${API}/auth/register`, userData);
    return response.data;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-heading text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// City Context
const CityContext = createContext(null);

export const useCity = () => useContext(CityContext);

export const CityProvider = ({ children }) => {
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchCities = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/cities`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCities(response.data);
        } catch (error) {
          console.error('Failed to fetch cities:', error);
        }
      }
    };
    fetchCities();
  }, [token]);

  const refreshCities = async () => {
    if (token) {
      const response = await axios.get(`${API}/cities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCities(response.data);
    }
  };

  return (
    <CityContext.Provider value={{ cities, selectedCity, setSelectedCity, refreshCities }}>
      {children}
    </CityContext.Provider>
  );
};

function App() {
  return (
    <AuthProvider>
      <CityProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            {/* Crew Portal - separate route */}
            <Route path="/crew-portal" element={
              <ProtectedRoute allowedRoles={['crew']}>
                <CrewPortalPage />
              </ProtectedRoute>
            } />

            {/* Admin/Staff Routes */}
            <Route path="/" element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="quotes/new" element={<QuoteFormPage />} />
              <Route path="quotes/:id/edit" element={<QuoteFormPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/new" element={<InvoiceFormPage />} />
              <Route path="invoices/:id" element={<InvoiceFormPage />} />
              <Route path="invoices/unpaid" element={<UnpaidInvoicesPage />} />
              <Route path="crews" element={<CrewsPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CityProvider>
    </AuthProvider>
  );
}

export default App;
