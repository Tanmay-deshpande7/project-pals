const { useState, useEffect } = React;

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
        let presenceInterval = null;

        const unsubscribe = window.auth.onAuthStateChanged(async (u) => {
            if (presenceInterval) {
                clearInterval(presenceInterval);
                presenceInterval = null;
            }

            if (u) {
                setAuthLoading(true);
                try {
                    await window.initializeUserShard(u.uid);
                    
                    // Presence tracking
                    const userRef = window.db.collection('users').doc(u.uid);
                    const updatePresence = () => {
                        userRef.set({
                            isOnline: true,
                            lastSeen: new Date(),
                            displayName: u.displayName || 'User',
                            email: u.email
                        }, { merge: true }).catch(err => console.warn("Presence update failed:", err));
                    };
                    
                    updatePresence();
                    presenceInterval = setInterval(updatePresence, 60000);
                } catch (e) {
                    console.error("Error during authentication bootstrapper:", e);
                }
                setUser(u);
                setAuthLoading(false);
                setShowLanding(false); // Auto-exit landing on login
            } else {
                setUser(null);
                setAuthLoading(false);
            }
        });

        return () => {
            unsubscribe();
            if (presenceInterval) clearInterval(presenceInterval);
        };
    }, []);

    if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted/70">Loading...</div>;

    // If Logged In -> Dashboard
    if (user) {
        return (
            <React.Fragment>
                <window.Background />
                <window.Dashboard
                    user={user}
                    onLogout={() => window.auth.signOut()}
                    theme={theme}
                    onToggleTheme={window.toggleTheme}
                />
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
