const AdminAuth = () => {
    const [loading, setLoading] = React.useState(true);
    const [authStatus, setAuthStatus] = React.useState('loading'); // loading, admin, rejected, logged_out
    const [adminDbEmpty, setAdminDbEmpty] = React.useState(false);
    const [authStep, setAuthStep] = React.useState(1); // Step 1: Email, Step 2: Password
    
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');

    // Pre-flight check: is the admins collection totally empty?
    React.useEffect(() => {
        window.db.collection('admins').limit(1).get().then(snap => {
            setAdminDbEmpty(snap.empty);
        }).catch(err => {
            console.error("Error checking root admins:", err);
            // If permissions fail, assume it's not empty and enforce strict auth
            setAdminDbEmpty(false); 
        });
    }, []);

    // Firebase Auth State Listener
    React.useEffect(() => {
        const unsubscribe = window.auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    // Check if they are listed in the admins database BY EMAIL
                    const adminDoc = await window.db.collection('admins').where('email', '==', user.email).limit(1).get();
                    if (!adminDoc.empty) {
                        setAuthStatus('admin');
                    } else {
                        // User exists but has no admin privileges. Evict them!
                        await window.auth.signOut();
                        setError('ACCESS DENIED: You do not have Administrative Privileges on this layer.');
                        setAuthStatus('rejected');
                    }
                } catch(err) {
                    console.error(err);
                    await window.auth.signOut();
                    setAuthStatus('rejected');
                    setError('Authentication failure while validating root privileges.');
                }
            } else {
                setAuthStatus('logged_out');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLoginStep1 = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Check if this specific email is currently whitelisted as an active Admin
            const snap = await window.db.collection('admins').where('email', '==', email.trim()).limit(1).get();
            if (snap.empty) {
                setError('ACCESS DENIED: This email address has not been explicitly authorized by Root.');
                setLoading(false);
                return;
            }
            // Clearance check passed! Move to password step.
            setAuthStep(2);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleLoginStep2 = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Attempt standard login first
            await window.auth.signInWithEmailAndPassword(email, password);
        } catch (err) {
            // In modern Firebase, invalid-credential means EITHER wrong password OR User doesn't exist yet!
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
                try {
                    // Because they passed Step 1, we aggressively KNOW they are allowed here.
                    // If they don't have an auth shell yet, simply create it for them silently right now using the password they just typed.
                    await window.auth.createUserWithEmailAndPassword(email, password);
                    // The auth listener will intercept and grant power
                } catch(creationErr) {
                    // If email already in use thrown here, it means they DO exist but just typed wrong password
                    if (creationErr.code === 'auth/email-already-in-use') {
                        setError('Incorrect credentials. Access denied.');
                    } else {
                        setError(creationErr.message);
                    }
                    setLoading(false);
                }
            } else {
                setError(err.message);
                setLoading(false);
            }
        }
    };

    const handleInitialRootSignup = async (e) => {
        e.preventDefault();
        if (!adminDbEmpty) return; // Failsafe
        setError('');
        setLoading(true);
        try {
            // First ever root admin setup
            const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Register them in the admins database IMMEDIATELY
            await window.db.collection('admins').doc(user.uid).set({
                email: user.email,
                role: 'root',
                addedAt: new Date()
            });
            // The auth listener handles routing to dashboard
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (loading && authStatus === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <window.Icon name="loader-2" size={48} className="text-primary animate-spin mb-4" />
                <p className="text-muted tracking-widest uppercase text-sm font-bold">Verifying Layer Security</p>
            </div>
        );
    }

    if (authStatus === 'admin') {
        return <window.AdminDashboard user={window.auth.currentUser} onLogout={() => { window.auth.signOut(); window.location.reload(); }} />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-surface/60 backdrop-blur-xl border border-divider-strong p-10 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
                
                <h2 className="text-3xl font-bold mb-2 text-main text-center">
                    ProjectPals <span className="text-red-400">Administrative Base</span>
                </h2>
                <p className="text-center text-muted mb-8 text-sm">
                    {adminDbEmpty 
                        ? "WARNING: No existing root administrators detected. The first user to authenticate will be permanently locked as ROOT." 
                        : "Encrypted connection required."}
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm font-mono break-words">
                        [ERROR] {error}
                    </div>
                )}

                <form onSubmit={adminDbEmpty ? handleInitialRootSignup : (authStep === 1 ? handleLoginStep1 : handleLoginStep2)} className="space-y-4">
                    {authStep === 1 || adminDbEmpty ? (
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wider text-xs">Auth Email</label>
                            <input 
                                type="email" 
                                required 
                                className="w-full bg-background/50 border border-divider-strong rounded-xl p-3 text-main focus:border-red-400 focus:outline-none transition-all placeholder:text-muted/30"
                                placeholder="agent@projectpals.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div className="flex justify-between items-center bg-background/50 border border-divider p-3 rounded-xl">
                            <span className="text-muted font-mono">{email}</span>
                            <button type="button" onClick={() => setAuthStep(1)} className="text-xs text-red-400 font-bold uppercase hover:underline">Change</button>
                        </div>
                    )}

                    {(authStep === 2 || adminDbEmpty) && (
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wider text-xs">
                                {adminDbEmpty ? 'Secure Password Configuration' : 'Clearance Code / Set New Password'}
                            </label>
                            <p className="text-xs text-muted/50 mb-2 leading-tight">
                                {adminDbEmpty ? '' : "If this is your first time connecting as an Administrator, the password you type below will be permanently bound to your account."}
                            </p>
                            <input 
                                type="password" 
                                required 
                                minLength="6"
                                className="w-full bg-background/50 border border-divider-strong rounded-xl p-3 text-main focus:border-red-400 focus:outline-none transition-all placeholder:text-muted/30"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-500/20 mt-4 disabled:opacity-50"
                    >
                        {loading ? 'Authenticating...' : (adminDbEmpty ? 'INITIALIZE ROOT ADMIN' : (authStep === 1 ? 'VERIFY CLEARANCE' : 'INITIATE OVERRIDE SEQUENCE'))}
                    </button>
                </form>
            </div>
        </div>
    );
};

window.AdminAuth = AdminAuth;
