const App = () => {
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
        const unsubscribe = window.auth.onAuthStateChanged(u => {
            setUser(u);
            setLoading(false);
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
