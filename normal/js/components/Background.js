const Background = () => {
    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Deep Space Base */}
            <div className="absolute inset-0 bg-background transition-colors duration-500"></div>

            {/* Geometric SVG Pattern Overlay */}
            <svg className="absolute inset-0 w-full h-full text-primary/40 dark:text-white/10 transition-colors duration-500" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="tech-grid" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
                        <path d="M 30 0 L 30 60 M 0 30 L 60 30" stroke="currentColor" strokeWidth="1.5" strokeOpacity="1"/>
                        <circle cx="30" cy="30" r="3" fill="currentColor"/>
                        <path d="M 0 0 L 60 0 M 0 60 L 60 60 M 0 0 L 0 60 M 60 0 L 60 60" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.5"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#tech-grid)"></rect>
            </svg>
        </div>
    );
};

window.Background = Background;
