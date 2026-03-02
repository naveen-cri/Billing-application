import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Save, Upload, Building2, ShieldCheck } from 'lucide-react';

const ROLE_OPTIONS = ['SuperAdmin', 'Admin', 'Accountant', 'Sales'];

export default function SettingsPage() {
    const { api, apiUpload, hasRole, user } = useAuth();
    const { addToast } = useToast();
    const [form, setForm] = useState({ business_name: '', business_address: '', business_city: '', business_state: '', business_pincode: '', business_gstin: '', business_phone: '', business_email: '' });
    const [logo, setLogo] = useState('');
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [permissions, setPermissions] = useState({});

    const isSuperAdmin = hasRole('SuperAdmin');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            await loadSettings();
            if (isSuperAdmin) {
                await Promise.all([loadUsers(), loadPermissions()]);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const loadSettings = async () => {
        const res = await api('/api/settings');
        const data = await res.json();
        setForm({ business_name: data.business_name || '', business_address: data.business_address || '', business_city: data.business_city || '', business_state: data.business_state || '', business_pincode: data.business_pincode || '', business_gstin: data.business_gstin || '', business_phone: data.business_phone || '', business_email: data.business_email || '' });
        setLogo(data.business_logo || '');
    };

    const loadUsers = async () => {
        const res = await api('/api/auth/users');
        const data = await res.json();
        setUsers(data || []);
    };

    const loadPermissions = async () => {
        const res = await api('/api/auth/permissions');
        const data = await res.json();
        setPermissions(data || {});
    };

    const handleSave = async () => {
        try {
            await api('/api/settings', { method: 'PUT', body: JSON.stringify(form) });
            addToast('Settings saved', 'success');
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('logo', file);
        try {
            const res = await apiUpload('/api/settings/logo', formData);
            const data = await res.json();
            setLogo(data.filename);
            addToast('Logo uploaded', 'success');
        } catch (err) {
            addToast('Upload failed', 'error');
        }
    };

    const handleRoleChange = async (userId, role) => {
        try {
            const res = await api(`/api/auth/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update role.');
            }

            setUsers(prev => prev.map(existing => existing.id === userId ? { ...existing, role } : existing));
            addToast('User role updated', 'success');
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>Business Settings</h2>
                <button className="btn btn-primary" onClick={handleSave}><Save size={18} /> Save Settings</button>
            </div>

            <div className="settings-grid">
                <div className="card settings-section">
                    <h3><Building2 size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Business Information</h3>
                    <div className="form-group"><label>Business Name</label><input className="form-control" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} placeholder="Your business name" /></div>
                    <div className="form-group"><label>Address</label><input className="form-control" value={form.business_address} onChange={e => setForm({ ...form, business_address: e.target.value })} placeholder="Street address" /></div>
                    <div className="form-row">
                        <div className="form-group"><label>City</label><input className="form-control" value={form.business_city} onChange={e => setForm({ ...form, business_city: e.target.value })} placeholder="City" /></div>
                        <div className="form-group"><label>State</label><input className="form-control" value={form.business_state} onChange={e => setForm({ ...form, business_state: e.target.value })} placeholder="State" /></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label>Pincode</label><input className="form-control" value={form.business_pincode} onChange={e => setForm({ ...form, business_pincode: e.target.value })} placeholder="Pincode" /></div>
                        <div className="form-group"><label>GSTIN</label><input className="form-control" value={form.business_gstin} onChange={e => setForm({ ...form, business_gstin: e.target.value })} placeholder="22AAAAA0000A1Z5" /></div>
                    </div>
                </div>

                <div className="card settings-section">
                    <h3>Contact & Logo</h3>
                    <div className="form-group"><label>Phone</label><input className="form-control" value={form.business_phone} onChange={e => setForm({ ...form, business_phone: e.target.value })} placeholder="Phone number" /></div>
                    <div className="form-group"><label>Email</label><input type="email" className="form-control" value={form.business_email} onChange={e => setForm({ ...form, business_email: e.target.value })} placeholder="Email address" /></div>

                    <div className="form-group">
                        <label>Business Logo</label>
                        <label className="logo-upload">
                            {logo ? (
                                <img src={`/uploads/${logo}`} alt="Logo" />
                            ) : (
                                <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                            )}
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                {logo ? 'Click to change logo' : 'Click to upload logo'}
                            </p>
                            <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>
            </div>

            {isSuperAdmin && (
                <>
                    <div className="card settings-section" style={{ marginTop: 24 }}>
                        <h3><ShieldCheck size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Super Admin - User Role Control</h3>
                        <div className="table-container" style={{ marginTop: 14 }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Access Control</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(appUser => (
                                        <tr key={appUser.id}>
                                            <td>{appUser.name}</td>
                                            <td>{appUser.email}</td>
                                            <td>
                                                <select
                                                    className="form-control"
                                                    value={appUser.role}
                                                    onChange={(e) => handleRoleChange(appUser.id, e.target.value)}
                                                    disabled={appUser.id === user.id}
                                                >
                                                    {ROLE_OPTIONS.map(role => <option key={role} value={role}>{role}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <span className="badge badge-info">{appUser.id === user.id ? 'Current User (Locked)' : 'Editable by SuperAdmin'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card settings-section" style={{ marginTop: 24 }}>
                        <h3>Role Access Matrix</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: 8, marginBottom: 14 }}>This matrix defines what each role can access across the platform.</p>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Resource</th>
                                        <th>Action</th>
                                        <th>Allowed Roles</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(permissions).flatMap(([resource, actions]) => Object.entries(actions).map(([action, allowedRoles]) => (
                                        <tr key={`${resource}-${action}`}>
                                            <td>{resource}</td>
                                            <td>{action}</td>
                                            <td>{allowedRoles.join(', ')}</td>
                                        </tr>
                                    )))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
