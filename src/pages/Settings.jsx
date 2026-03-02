import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Save, Upload, Building2 } from 'lucide-react';

export default function SettingsPage() {
    const { api, apiUpload } = useAuth();
    const { addToast } = useToast();
    const [form, setForm] = useState({ business_name: '', business_address: '', business_city: '', business_state: '', business_pincode: '', business_gstin: '', business_phone: '', business_email: '' });
    const [logo, setLogo] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadSettings(); }, []);

    const loadSettings = async () => {
        try {
            const res = await api('/api/settings');
            const data = await res.json();
            setForm({ business_name: data.business_name || '', business_address: data.business_address || '', business_city: data.business_city || '', business_state: data.business_state || '', business_pincode: data.business_pincode || '', business_gstin: data.business_gstin || '', business_phone: data.business_phone || '', business_email: data.business_email || '' });
            setLogo(data.business_logo || '');
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleSave = async () => {
        try {
            await api('/api/settings', { method: 'PUT', body: JSON.stringify(form) });
            addToast('Settings saved', 'success');
        } catch (err) { addToast(err.message, 'error'); }
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
        } catch (err) { addToast('Upload failed', 'error'); }
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
        </div>
    );
}
