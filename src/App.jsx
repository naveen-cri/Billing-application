import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';

function ProtectedRoute({ children, roles }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading"><div className="spinner"></div></div>;
    if (!user) return <Navigate to="/login" />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
    return children;
}

function AppLayout() {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading"><div className="spinner"></div></div>;
    if (!user) return <Navigate to="/login" />;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/payments" element={<ProtectedRoute roles={['Admin', 'Accountant']}><Payments /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute roles={['Admin', 'Accountant']}><Reports /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute roles={['Admin']}><SettingsPage /></ProtectedRoute>} />
                </Routes>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/*" element={<AppLayout />} />
                    </Routes>
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
