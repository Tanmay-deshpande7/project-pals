const AdminAuth = () => {
    const [loading, setLoading] = React.useState(true);
    const [authorized, setAuthorized] = React.useState(false);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [needsVerification, setNeedsVerification] = React.useState(false);

    React.useEffect(() => window.auth.onAuthStateChanged(async user => {
        setAuthorized(false); setNeedsVerification(false); setLoading(true);
        if (user) {
            try {
                // Only the backend can resolve the verified UID's current privileges.
                const access = await window.initializeUserShard(user.uid);
                if (window.auth.currentUser?.uid !== user.uid) return;
                setAuthorized(access.admin);
                setNeedsVerification(!access.emailVerified);
                if (!access.admin) setError(access.emailVerified ? 'This account has no administrator access. Contact the project owner.' : 'Verify your email, then sign in again.');
            } catch (err) { if (window.auth.currentUser?.uid !== user.uid) return; setError(err.message); }
        }
        setLoading(false);
    }), []);

    const login = async e => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            // Failed login never creates an account or claims an email invitation.
            await window.auth.signInWithEmailAndPassword(email.trim(), password);
        } catch (err) { setError('Unable to sign in. Check your existing account credentials.'); setLoading(false); }
    };
    if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-main">Checking administrator access...</div>;
    if (authorized) return <window.AdminDashboard user={window.auth.currentUser} onLogout={() => window.auth.signOut()} />;
    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-main p-6">
            <div className="w-full max-w-md bg-surface border border-divider-strong rounded-2xl p-8">
                <h1 className="text-2xl font-bold mb-4">Administrator sign in</h1>
                <p className="text-muted text-sm mb-6">Use an existing account authorized by the project owner.</p>
                {error && <p role="alert" className="text-red-400 mb-4">{error}</p>}
                {!window.auth.currentUser ? <form onSubmit={login} className="space-y-4">
                    <label className="block">Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} className="block w-full bg-background border border-divider-strong p-3 rounded-lg" /></label>
                    <label className="block">Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="block w-full bg-background border border-divider-strong p-3 rounded-lg" /></label>
                    <button type="submit" className="w-full bg-primary p-3 rounded-lg font-bold">Sign in</button>
                    <button type="button" onClick={async () => { try { await window.auth.sendPasswordResetEmail(email.trim()); setError('If an account exists, check its inbox for recovery instructions.'); } catch (err) { setError('Enter your account email to request a reset.'); } }} className="text-sm text-muted">Forgot password?</button>
                </form> : <div className="space-y-3">
                    {needsVerification && <button onClick={async () => { try { await window.auth.currentUser.sendEmailVerification(); setError('Verification email sent. Follow the link, then sign out and sign in again.'); } catch (err) { setError(err.message); } }} className="w-full bg-primary p-3 rounded-lg">Send verification email</button>}
                    <button onClick={() => window.auth.signOut()} className="w-full border border-divider-strong p-3 rounded-lg">Sign out</button>
                </div>}
            </div>
        </div>
    );
};
window.AdminAuth = AdminAuth;
