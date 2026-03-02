import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Receipt } from 'lucide-react';

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Sales');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signup(name, email, password, role);
            navigate('/');
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-card animate-in">
                <div className="auth-logo">
                    <Receipt size={40} style={{ color: 'var(--accent)', marginBottom: 8 }} />
                    <h1>BillFlow</h1>
                    <p>Create your account</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" required />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" required minLength={6} />
                    </div>
                    <div className="form-group">
                        <label>Role</label>
                        <select className="form-control" value={role} onChange={e => setRole(e.target.value)}>
                            <option value="Sales">Sales</option>
                            <option value="Accountant">Accountant</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to="/login">Sign In</Link>
                </div>
            </div>
        </div>
    );
}
