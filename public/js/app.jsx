const { useState, useEffect } = React;

const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authView, setAuthView] = useState('login'); // login or signup


    useEffect(() => {
        const unsubscribe = window.auth.onAuthStateChanged((u) => {
            setUser(u);
            setLoading(false);

            if (u) {
                // Presence Logic
                const userRef = window.db.collection('users').doc(u.uid);

                // Set online status
                const updatePresence = () => {
                    userRef.set({
                        isOnline: true,
                        lastSeen: new Date(),
                        displayName: u.displayName || 'User',
                        email: u.email
                    }, { merge: true });
                };

                updatePresence();

                // Update periodically
                const interval = setInterval(updatePresence, 60000); // Every minute

                // Cleanup on unmount or logout
                return () => {
                    clearInterval(interval);
                    // Optional: Set offline on rigorous cleanup, but simple interval is safer for now
                    // userRef.update({ isOnline: false }); 
                };
            }
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="min-h-screen bg-background flex items-center justify-center text-muted/70 animate-pulse">Initializing connection...</div>;
    }

    return (
        <div className="bg-background text-main font-sans min-h-screen relative">
            {/* Global Background */}
            <window.Background />

            {!user ? (
                authView === 'landing' ? (
                    <window.LandingPage onGetStarted={() => setAuthView('login')} />
                ) : (
                    <window.AuthForm
                        type={authView}
                        onSwitch={() => setAuthView(authView === 'login' ? 'signup' : 'login')}
                        onLoginSuccess={() => { }}
                    />
                )
            ) : (
                <window.Dashboard user={user} onLogout={() => window.auth.signOut()} />
            )}
        </div>
    );
};


// Initial state handling for Landing vs Auth
// For simplicity, we default to Landing if not logged in, but the AuthForm logic in previous code
// toggled between Landing and Auth. 
// Let's refine:
// If no user: Show Landing. Landing "Get Started" -> Show Auth (Login).
// Auth "Return to Home" (reload) -> Show Landing.

// Let's wrap App with a slightly smarter state for the "Landing" view.
const Root = () => {
    const [showLanding, setShowLanding] = useState(true);
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authType, setAuthType] = useState('login');

    // Theme Management Logic
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    window.toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    window.currentTheme = theme;

    useEffect(() => {
        const unsubscribe = window.auth.onAuthStateChanged((u) => {
            setUser(u);
            setAuthLoading(false);
            if (u) setShowLanding(false); // Auto-exit landing on login
        });
        return () => unsubscribe();
    }, []);

    if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted/70">Loading...</div>;

    // If Logged In -> Dashboard
    if (user) {
        return (
            <React.Fragment>
                <window.Background />
                <window.Dashboard user={user} onLogout={() => window.auth.signOut()} />
            </React.Fragment>
        );
    }

    // If Logged Out
    return (
        <React.Fragment>
            <window.Background />
            {showLanding ? (
                <window.LandingPage onGetStarted={() => setShowLanding(false)} />
            ) : (
                <window.AuthForm
                    type={authType}
                    onSwitch={() => setAuthType(authType === 'login' ? 'signup' : 'login')}
                    onLoginSuccess={() => { }} // Auth state change handles redirection
                />
            )}
        </React.Fragment>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
