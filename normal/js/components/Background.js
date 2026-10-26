const Background = () => {
    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Base Background */}
            <div className="absolute inset-0 bg-background transition-colors duration-500"></div>

            {/* Soft Ambient Radial Glows for gentle depth without harshness */}
            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary/5 dark:bg-primary/10 blur-[120px] transition-all duration-700"></div>
            <div className="absolute top-1/3 -right-32 w-[450px] h-[450px] rounded-full bg-secondary/5 dark:bg-secondary/10 blur-[130px] transition-all duration-700"></div>
            <div className="absolute -bottom-32 left-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 dark:bg-accent/10 blur-[120px] transition-all duration-700"></div>

            {/* Toned Down Soft Pattern Overlay */}
            <svg className="absolute inset-0 w-full h-full text-slate-400/25 dark:text-white/[0.08] transition-colors duration-500" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="tech-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.35"/>
                        <circle cx="0" cy="0" r="1" fill="currentColor" opacity="0.5"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#tech-grid)"></rect>
            </svg>
        </div>
    );
};

window.Background = Background;
