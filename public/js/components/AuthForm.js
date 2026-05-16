const AuthForm = ({ type, onSwitch, onLoginSuccess }) => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [name, setName] = React.useState('');
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            if (type === 'signup') {
                const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
                // Update profile with name
                await userCredential.user.updateProfile({ displayName: name });
                const shortId = userCredential.user.uid.substring(0, 8).toUpperCase();
                // Create user document in Firestore (optional but good practice)
                await window.db.collection('users').doc(userCredential.user.uid).set({
                    displayName: name,
                    email: email,
                    networkId: shortId,
                    createdAt: new Date()
                });
            } else {
                await window.auth.signInWithEmailAndPassword(email, password);
            }
            onLoginSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        setLoading(true);
        try {
            const provider = new window.firebase.auth.GoogleAuthProvider();
            const result = await window.auth.signInWithPopup(provider);
            
            // If new user, create their document in firestore (optional check)
            const userDoc = await window.db.collection('users').doc(result.user.uid).get();
            if (!userDoc.exists) {
                const shortId = result.user.uid.substring(0, 8).toUpperCase();
                await window.db.collection('users').doc(result.user.uid).set({
                    displayName: result.user.displayName,
                    email: result.user.email,
                    networkId: shortId,
                    createdAt: new Date()
                });
            }
            onLoginSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background handled globally by App/Background component */}

            <div className="bg-glass backdrop-blur-xl border border-divider-strong rounded-2xl shadow-xl p-8 w-full max-w-md z-10 relative">
                {/* Glow effect behind card */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur opacity-20 pointer-events-none"></div>

                <div className="relative">
                    <div className="flex justify-center mb-6">
                        <window.Logo size="lg" />
                    </div>
                    <h2 className="text-2xl font-bold text-center mb-6">{type === 'login' ? 'Welcome Back' : 'Join ProjectPals'}</h2>

                    {error && <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded-lg mb-4 text-sm">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {type === 'signup' && (
                            <div>
                                <label className="block text-sm text-muted mb-1">Display Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-background border border-divider-strong rounded-lg p-3 text-main focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                    placeholder="Your Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm text-muted mb-1">Email</label>
                            <input
                                type="email"
                                required
                                className="w-full bg-background border border-divider-strong rounded-lg p-3 text-main focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-muted mb-1">Password</label>
                            <input
                                type="password"
                                required
                                className="w-full bg-background border border-divider-strong rounded-lg p-3 text-main focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : (type === 'login' ? 'Log In' : 'Sign Up')}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-divider-strong"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-surface px-2 text-muted backdrop-blur-xl">Or continue with</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full bg-glass hover:bg-glass hover:brightness-110 text-main font-medium py-3 rounded-lg transition-all shadow-lg border border-divider-strong disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <window.Icon name="google" size={20} />
                        Google
                    </button>

                    <p className="mt-6 text-center text-sm text-muted">
                        {type === 'login' ? "Don't have an account?" : "Already have an account?"}
                        <button onClick={onSwitch} className="ml-2 text-primary hover:text-main font-medium hover:underline">
                            {type === 'login' ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                    <div className="mt-4 text-center">
                        <button onClick={() => window.location.reload()} className="text-xs text-muted/70 hover:text-main">Return to Home</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.AuthForm = AuthForm;
