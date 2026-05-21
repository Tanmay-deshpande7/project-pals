const App = () => {
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
        const unsubscribe = window.auth.onAuthStateChanged(async u => {
            if (u) {
                setLoading(true);
                try {
                    await window.initializeUserShard(u.uid);
                } catch (e) {
                    console.error("Error bootstrapping user shard in events portal:", e);
                }
                setUser(u);
                setLoading(false);
            } else {
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
