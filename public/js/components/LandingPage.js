const LandingPage = ({ onGetStarted }) => {
    React.useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
    }, []);

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
            {/* Background handled globally by App/Background component */}

            <header className="absolute top-0 w-full p-6 flex justify-between items-center z-10 container mx-auto">
                <window.Logo size="md" showText={true} textClassName="text-2xl" />
                <button onClick={onGetStarted} className="px-6 py-2 rounded-full border border-white/20 bg-glass hover:bg-glass hover:brightness-110 transition-all font-medium backdrop-blur-md">
                    Login / Join
                </button>
            </header>

            <main className="text-center z-10 max-w-4xl mx-auto mt-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary-200 text-sm font-medium mb-8 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-accent"></span>
                    The Future of Collaboration
                </div>

                <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight tracking-tight">
                    Build the <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent text-glow">
                        Impossible
                    </span>
                </h1>

                <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                    Connect with visionaries, developers, and creators. Turn your wildest ideas into reality with a team that matches your passion.
                </p>

                <button onClick={onGetStarted} className="group relative px-8 py-4 bg-white text-background rounded-full font-bold text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-105 transition-all">
                    Start Collaborating
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary to-accent scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-full"></span>
                </button>
            </main>
        </div>
    );
};

window.LandingPage = LandingPage;
