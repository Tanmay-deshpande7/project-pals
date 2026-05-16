const Icon = ({ name, size = 24, className = "" }) => {
    const customIcons = {
        'layout-grid': 'assets/icons/dashboard.svg',
        'folder': 'assets/icons/projects.svg',
        'message-square': 'assets/icons/messages.svg',
        'settings': 'assets/icons/settings.svg',
        'plus': 'assets/icons/plus.svg',
        'sparkles': 'assets/icons/explore.svg',
        'layers': 'assets/icons/logo.svg',
        'ghost': 'assets/icons/ghost.svg',
        'user': 'assets/icons/user.svg',
        'sliders': 'assets/icons/sliders.svg',
        'shield': 'assets/icons/shield.svg',
        'trash-2': 'assets/icons/trash-2.svg',
        'google': 'assets/icons/google.svg'
    };

    if (customIcons[name]) {
        return <img src={customIcons[name]} alt={name} className={className} style={{ width: size, height: size, display: 'inline-block' }} />;
    }

    const svgProps = {
        xmlns: "http://www.w3.org/2000/svg",
        width: size, height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: className,
        style: { display: 'inline-block' }
    };

    if (name === 'x') return (
        <svg {...svgProps}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    );

    if (name === 'arrow-right') return (
        <svg {...svgProps}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
    );

    if (name === 'arrow-left') return (
        <svg {...svgProps}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
    );

    if (name === 'edit') return (
        <svg {...svgProps}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
    );

    if (name === 'users') return (
        <svg {...svgProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
    );

    if (name === 'inbox') return (
        <svg {...svgProps}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
    );

    if (name === 'check-circle') return (
        <svg {...svgProps}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    );

    if (name === 'alert-triangle') return (
        <svg {...svgProps}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
    );

    if (name === 'loader') return (
        <svg {...svgProps}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
    );

    if (name === 'user-plus') return (
        <svg {...svgProps}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
    );

    if (name === 'user-minus') return (
        <svg {...svgProps}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="22" y1="11" x2="16" y2="11"></line></svg>
    );

    if (name === 'copy') return (
        <svg {...svgProps}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
    );

    if (name === 'shield-check') return (
        <svg {...svgProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
    );

    if (name === 'loader-2') return (
        <svg {...svgProps}><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
    );

    if (name === 'send') return (
        <svg {...svgProps}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
    );

    if (name === 'bell') return (
        <svg {...svgProps}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
    );

    if (name === 'network') return (
        <svg {...svgProps}><rect x="16" y="16" width="6" height="6" rx="1"></rect><rect x="2" y="16" width="6" height="6" rx="1"></rect><rect x="9" y="2" width="6" height="6" rx="1"></rect><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"></path><line x1="12" y1="12" x2="12" y2="8"></line></svg>
    );

    if (name === 'trash') return (
        <svg {...svgProps}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
    );

    if (name === 'check') return (
        <svg {...svgProps}><polyline points="20 6 9 17 4 12"></polyline></svg>
    );

    if (name === 'message-circle') return (
        <svg {...svgProps}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    );

    if (name === 'log-out') return (
        <svg {...svgProps}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
    );

    if (name === 'search') return (
        <svg {...svgProps}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
    );

    // Final fallback — render nothing rather than a broken box
    return null;
};

window.Icon = Icon;
