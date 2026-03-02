import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FileText, Users, Package, CreditCard, BarChart3, Settings, LogOut, Receipt } from 'lucide-react';

export default function Sidebar() {
    const { user, logout, hasRole } = useAuth();
    const location = useLocation();

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['Admin', 'Accountant', 'Sales'] },
        { to: '/invoices', icon: FileText, label: 'Invoices', roles: ['Admin', 'Accountant', 'Sales'] },
        { to: '/customers', icon: Users, label: 'Customers', roles: ['Admin', 'Accountant', 'Sales'] },
        { to: '/products', icon: Package, label: 'Products', roles: ['Admin', 'Accountant', 'Sales'] },
        { to: '/payments', icon: CreditCard, label: 'Payments', roles: ['Admin', 'Accountant'] },
        { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['Admin', 'Accountant'] },
        { to: '/settings', icon: Settings, label: 'Settings', roles: ['Admin'] },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <Receipt size={22} />
                    </div>
                    <h1>BillFlow</h1>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section">
                    <div className="nav-section-label">Menu</div>
                    {navItems.filter(item => hasRole(...item.roles)).map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            end={item.to === '/'}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </NavLink>
                    ))}
                </div>
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="name">{user?.name}</div>
                        <div className="role">{user?.role}</div>
                    </div>
                    <button className="sidebar-logout" onClick={logout} title="Logout">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
