const Dashboard = ({ user, onLogout }) => {
    const [view, setView] = React.useState('dashboard'); // dashboard, messages, etc.
    const [projectsTab, setProjectsTab] = React.useState('applied');
    const [appliedProjectIds, setAppliedProjectIds] = React.useState(new Set());
    const [hiredProjectIds, setHiredProjectIds] = React.useState(new Set());
    const [projects, setProjects] = React.useState([]);
    const [selectedProject, setSelectedProject] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [totalUnreadCount, setTotalUnreadCount] = React.useState(0);
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);


    React.useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
    }, [projects]);

    React.useEffect(() => {
        const unsubscribe = window.db.collection('projects')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const fetchedProjects = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setProjects(fetchedProjects);
                setLoading(false);
            }, err => {
                console.error("Error fetching projects:", err);
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    React.useEffect(() => {
        if (!user) return;
        const unsubscribe = window.db.collection('applications')
            .where('applicantId', '==', user.uid)
            .onSnapshot(snapshot => {
                const ids = new Set();
                const hiredIds = new Set();
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.projectId) {
                        if (data.status !== 'hired' && data.status !== 'rejected') {
                            ids.add(data.projectId);
                        }
                        if (data.status === 'hired') hiredIds.add(data.projectId);
                    }
                });
                setAppliedProjectIds(ids);
                setHiredProjectIds(hiredIds);
            }, err => console.error("Error fetching applications:", err));
        return () => unsubscribe();
    }, [user]);

    // Unread Messages Listener
    const prevUnreadRef = React.useRef(0);
    const isFirstUnreadLoad = React.useRef(true);
    
    React.useEffect(() => {
        if (!user) return;
        const unsubscribe = window.db.collection('threads')
            .where('participants', 'array-contains', user.uid)
            .onSnapshot(snapshot => {
                let unread = 0;
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const count = data[`unreadCount_${user.uid}`] || 0;
                    unread += count;
                });
                
                // Play sound if unread count increased (and not initial load)
                if (!isFirstUnreadLoad.current && unread > prevUnreadRef.current) {
                    if (typeof window.playNotificationSound === 'function') {
                        window.playNotificationSound();
                    }
                }
                
                isFirstUnreadLoad.current = false;
                prevUnreadRef.current = unread;
                setTotalUnreadCount(unread);
            }, err => console.error("Error fetching threads for unread:", err));
        return () => unsubscribe();
    }, [user]);


    // Create Project Modal
    const renderCreateModal = () => (
        <window.CreateProjectModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            user={user}
        />
    );

    // Project Details / Chat Modal
    const renderDetailsModal = () => (
        <window.ProjectDetailsModal
            isOpen={!!selectedProject}
            onClose={() => setSelectedProject(null)}
            user={user}
            project={selectedProject}
            initialView={selectedProject?.chatId ? 'chat' : 'details'}
        />
    );

    return (
        <div className="min-h-screen flex flex-col md:flex-row relative z-10">
            {/* Mobile Header (Shows Profile/Logout) */}
            <div className="md:hidden w-full bg-glass backdrop-blur-xl border-b border-divider p-4 flex justify-between items-center sticky top-0 z-40">
                <window.Logo size="sm" showText={true} textClassName="text-lg" />
                <div className="flex items-center gap-3">
                    <window.NotificationManager user={user} />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-accent to-purple-500 flex items-center justify-center text-xs font-bold shadow-lg">
                        {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                    </div>
                    <button onClick={onLogout} className="text-xs text-red-400 font-medium">Logout</button>
                </div>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-72 bg-glass backdrop-blur-2xl border-r border-divider m-0 flex-col h-screen sticky top-0 md:bg-background/50">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-10">
                        <window.Logo size="md" showText={true} textClassName="text-xl" />
                        <window.NotificationManager user={user} />
                    </div>

                    <nav className="space-y-3">
                        {['Dashboard', 'Projects', 'Events', 'Network', 'Messages', 'Settings'].map((item) => (
                            <a
                                key={item}
                                href="#"
                                onClick={(e) => { e.preventDefault(); setView(item.toLowerCase()); }}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group relative ${view === item.toLowerCase()
                                    ? 'bg-primary/20 text-primary dark:text-white border border-primary/30 shadow-lg shadow-primary/10'
                                    : 'text-muted hover:bg-glass hover:text-main border border-transparent'
                                    }`}
                            >
                                {item === 'Events' ? (
                                    <img src="/assets/events_logo.png" alt="Events" style={{ width: 20, height: 20 }} className={`flex-shrink-0 object-contain ${view === 'events' ? '' : 'opacity-70 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all'}`} />
                                ) : (
                                    <window.Icon name={item === 'Dashboard' ? 'layout-grid' : item === 'Projects' ? 'folder' : item === 'Network' ? 'users' : item === 'Messages' ? 'message-square' : 'settings'} size={20} className={view === item.toLowerCase() ? 'text-primary dark:text-main' : 'text-muted/70 group-hover:text-main'} />
                                )}
                                <span className="font-medium flex-1">{item}</span>
                                {item === 'Messages' && totalUnreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-red-500/50">
                                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                                    </span>
                                )}
                            </a>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-divider mx-4 mb-4">
                    <div className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-glass border border-divider">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-accent to-purple-500 flex items-center justify-center text-sm font-bold shadow-lg">
                            {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="font-bold text-sm truncate text-main">{user.displayName || 'User'}</p>
                            <p className="text-xs text-muted truncate">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full py-2.5 rounded-xl border border-divider-strong hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-xs text-muted transition-all font-medium">
                        Log Out
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-2xl border-t border-divider-strong z-50 flex justify-around items-center p-3 px-6 pb-6">
                {['Dashboard', 'Projects', 'Events', 'Network', 'Messages', 'Settings'].map((item) => (
                    <a
                        key={item}
                        href="#"
                        onClick={(e) => { e.preventDefault(); setView(item.toLowerCase()); }}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === item.toLowerCase()
                            ? 'text-primary scale-110'
                            : 'text-muted/70 hover:text-main'
                            }`}
                    >
                        <window.Icon name={item === 'Dashboard' ? 'layout-grid' : item === 'Projects' ? 'folder' : item === 'Events' ? 'calendar' : item === 'Network' ? 'users' : item === 'Messages' ? 'message-square' : 'settings'} size={24} className={view === item.toLowerCase() ? 'text-primary' : 'text-muted/70'} />
                        <span className="text-[10px] font-medium">{item}</span>
                    </a>
                ))}
            </nav>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-10 pb-32 md:pb-10 overflow-y-auto h-screen custom-scrollbar">
                {(view === 'dashboard' || view === 'projects') && (
                    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                            <div>
                                <h2 className="text-4xl font-bold mb-2 text-main">
                                    {view === 'dashboard' ? `Welcome back, ${user.displayName ? user.displayName.split(' ')[0] : 'Traveler'}` : 'My Projects'}
                                </h2>
                                <p className="text-muted">
                                    {view === 'dashboard' ? "Here's what's happening in your universe today." : "Manage your applications and creations."}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white px-6 py-3 rounded-full font-bold transition-all shadow-lg shadow-primary/25 hover:scale-105 active:scale-95"
                            >
                                <window.Icon name="plus" size={18} />
                                New Project
                            </button>
                        </header>

                        {view === 'dashboard' && (
                            <>
                                {/* Stats Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                    {[
                                        { label: 'Total Projects', val: projects.length, color: 'text-primary' },
                                        { label: 'My Projects', val: projects.filter(p => p.authorId === user.uid).length, color: 'text-accent' },
                                        { label: 'Applied Roles', val: appliedProjectIds.size, color: 'text-secondary' }
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-glass backdrop-blur-xl border border-divider-strong rounded-3xl p-8 hover:border-white/20 transition-colors">
                                            <p className="text-muted text-sm font-medium mb-2 uppercase tracking-wider">{stat.label}</p>
                                            <h3 className={`text-5xl font-bold ${stat.color} text-glow`}>{stat.val}</h3>
                                        </div>
                                    ))}
                                </div>

                                {/* Projects Grid */}
                                <div className="mb-8 flex items-center gap-3">
                                    <window.Icon name="sparkles" className="text-yellow-400" size={24} />
                                    <h3 className="text-2xl font-bold text-main">Explore Universe</h3>
                                </div>
                            </>
                        )}

                        {view === 'projects' && (
                            <div className="flex gap-6 border-b border-divider mb-8 overflow-x-auto custom-scrollbar pb-2">
                                {['applied', 'created', 'ongoing', 'completed'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setProjectsTab(tab)}
                                        className={`py-2 font-bold capitalize whitespace-nowrap transition-colors border-b-2 ${projectsTab === tab ? 'text-primary border-primary' : 'text-muted border-transparent hover:text-main hover:border-divider-strong'}`}
                                    >
                                        {tab} Projects
                                    </button>
                                ))}
                            </div>
                        )}

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-glass animate-pulse"></div>)}
                            </div>
                        ) : (() => {
                            const filteredProjects = view === 'dashboard' ? projects : projects.filter(p => {
                                if (projectsTab === 'applied') return appliedProjectIds.has(p.id);
                                if (projectsTab === 'created') return p.authorId === user.uid || (p.participants && p.participants.includes(user.uid));
                                if (projectsTab === 'ongoing') return p.status === 'ongoing' && (p.authorId === user.uid || hiredProjectIds.has(p.id) || (p.participants && p.participants.includes(user.uid)));
                                if (projectsTab === 'completed') return p.status === 'completed' && (p.authorId === user.uid || hiredProjectIds.has(p.id) || (p.participants && p.participants.includes(user.uid)));
                                return false;
                            });

                            if (filteredProjects.length === 0) {
                                return (
                                    <div className="text-center py-32 bg-glass backdrop-blur-xl border border-divider-strong rounded-3xl">
                                        <window.Icon name="ghost" size={64} className="text-slate-600 mb-6 mx-auto opacity-50" />
                                        <h4 className="text-2xl font-bold mb-2 text-main">
                                            {view === 'dashboard' ? 'No signals detected' : `No ${projectsTab} projects found`}
                                        </h4>
                                        <p className="text-muted mb-8">
                                            {view === 'dashboard' ? 'Be the first to create a new world.' : 'Try exploring the universe to find more.'}
                                        </p>
                                        {view === 'dashboard' && (
                                            <button
                                                onClick={() => setIsCreateModalOpen(true)}
                                                className="text-primary hover:text-main font-medium hover:underline transition-colors"
                                            >
                                                Launch a Project
                                            </button>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                                    {filteredProjects.map((project) => (
                                    <div key={project.id}
                                        onClick={() => setSelectedProject(project)}
                                        className="bg-surface/40 backdrop-blur-xl border border-divider-strong rounded-3xl overflow-hidden hover:border-primary/50 transition-all duration-300 flex flex-col h-full cursor-pointer hover:scale-[1.02] group shadow-xl">
                                        <div className="h-40 bg-gradient-to-br from-slate-800 to-slate-900 group-hover:from-primary/20 group-hover:to-secondary/20 transition-all relative p-6 flex flex-col justify-end">
                                            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono border border-divider-strong uppercase tracking-wider text-slate-300">
                                                {project.status || 'Active'}
                                            </div>

                                        </div>
                                        <div className="p-6 flex-1 flex flex-col">
                                            <h4 className="text-xl font-bold mb-3 text-main group-hover:text-primary transition-colors leading-tight">{project.title}</h4>
                                            <p className="text-muted text-sm mb-6 line-clamp-3 leading-relaxed flex-1">{project.description}</p>

                                            <div className="pt-4 border-t border-divider flex justify-between items-center text-xs text-muted/70">
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span> {project.authorName}</span>
                                                <span>{new Date(project.createdAt.seconds * 1000).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            );
                        })()}
                    </div>
                )}

                {view === 'messages' && (
                    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
                        <window.MessagesView
                            user={user}
                            onOpenChat={(thread) => setSelectedProject(thread)}
                        />
                    </div>
                )}

                {/* Events View */}
                {view === 'events' && (
                    <div className="w-full animate-in fade-in duration-500">
                        <window.EventsView user={user} />
                    </div>
                )}

                {/* Network View */}
                {view === 'network' && (
                    <div className="w-full animate-in fade-in duration-500">
                        <window.NetworkView user={user} />
                    </div>
                )}

                {/* Settings View */}
                {view === 'settings' && (
                    <div className="w-full animate-in fade-in duration-500">
                        <window.SettingsView user={user} />
                    </div>
                )}
            </main>

            {renderCreateModal()}
            {renderDetailsModal()}
        </div>
    );
};

window.Dashboard = Dashboard;
