const App = () => {
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
        const unsubscribe = window.auth.onAuthStateChanged(async u => {
            if (u) {
                setLoading(true);
                try {
                    const access = await window.initializeUserShard(u.uid);
                    if (window.auth.currentUser?.uid !== u.uid) return;
                    if (!access.organizer) throw new Error('A verified organizer account is required. Contact the project owner.');
                    window.portalAccess = access;
                } catch (e) {
                    if (window.auth.currentUser?.uid !== u.uid) return;
                    alert(e.message);
                    await window.auth.signOut();
                    setUser(null); setLoading(false); return;
                }
                setUser(u);
                setLoading(false);
            } else {
                window.portalAccess = null;
                setUser(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-purple-400">Loading...</div>;
    }

    if (!user) {
        return <window.AuthForm onLogin={() => {}} />;
    }

    return <window.Dashboard user={user} onLogout={() => window.auth.signOut()} />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
