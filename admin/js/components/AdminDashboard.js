const AdminDashboard = ({ user, onLogout }) => {
    const [view, setView] = React.useState('overview');
    
    // Overview Metrics
    const [totalUsers, setTotalUsers] = React.useState(0);
    const [totalProjects, setTotalProjects] = React.useState(0);
    
    // Lists
    const [usersList, setUsersList] = React.useState([]);
    const [projectsList, setProjectsList] = React.useState([]);
    const [adminsList, setAdminsList] = React.useState([]);
    const [isRootAdmin, setIsRootAdmin] = React.useState(false);
    
    // Forms
    const [newAdminEmail, setNewAdminEmail] = React.useState('');
    const [actionError, setActionError] = React.useState('');

    // Load Metrics
    React.useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
    }, [view, usersList, projectsList, adminsList]);

    React.useEffect(() => {
        // Check if current user is root
        window.db.collection('admins').where('email', '==', user.email).limit(1).get().then(snap => {
            if (!snap.empty && snap.docs[0].data().role === 'root') setIsRootAdmin(true);
        });

        // Fetch all generic users
        const unsubUsers = window.db.collection('users').onSnapshot(snap => {
            setTotalUsers(snap.size);
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsersList(data);
        });

        // Fetch all projects from all active shards in parallel
        const shardProjectsData = {};
        const shardUnsubs = [];

        Object.entries(window.shardDbs).forEach(([shardName, shardDb]) => {
            try {
                const unsub = shardDb.collection('projects').onSnapshot(snap => {
                    const shardProjectsList = snap.docs.map(doc => ({
                        id: doc.id,
                        shardId: shardName,
                        ...doc.data()
                    }));
                    shardProjectsData[shardName] = shardProjectsList;

                    // Combine all projects from all shards
                    const allProjects = [];
                    Object.values(shardProjectsData).forEach(projects => {
                        allProjects.push(...projects);
                    });

                    // Sort by creation date (newest first)
                    allProjects.sort((a, b) => {
                        const timeA = a.createdAt?.seconds || a.createdAt?.getTime?.() || 0;
                        const timeB = b.createdAt?.seconds || b.createdAt?.getTime?.() || 0;
                        return timeB - timeA;
                    });

                    setProjectsList(allProjects);
                    setTotalProjects(allProjects.length);
                }, err => {
                    console.error(`Failed to watch projects on ${shardName}:`, err);
                });
                shardUnsubs.push(unsub);
            } catch (err) {
                console.error(`Error setting up listener on ${shardName}:`, err);
            }
        });

        // Fetch all admins
        const unsubAdmins = window.db.collection('admins').onSnapshot(snap => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAdminsList(data);
        });

        return () => {
            unsubUsers();
            shardUnsubs.forEach(unsub => unsub());
            unsubAdmins();
        };
    }, []);

    const handleGrantAdmin = async (e) => {
        e.preventDefault();
        if (!newAdminEmail) return;
        try {
            await window.db.collection('admins').add({
                email: newAdminEmail,
                role: 'admin',
                addedAt: new Date(),
                addedBy: user.email
            });
            setNewAdminEmail('');
            alert('Admin cleared! They can now log in securely through the portal.');
        } catch(err) {
            alert(err.message);
        }
    };

    const handleRevokeAdmin = async (adminDocId) => {
        if (!window.confirm("CRITICAL: Strip operational privileges from this admin?")) return;
        try {
            await window.db.collection('admins').doc(adminDocId).delete();
        } catch(err) {
            alert(err.message);
        }
    };

    const handleBanUser = async (targetUid) => {
        if (!window.confirm("Are you sure you want to completely erase this user from the main database?")) return;
        setActionError('');
        try {
            await window.db.collection('users').doc(targetUid).delete();
        } catch(err) {
            console.error('Ban user error:', err);
            setActionError('Delete failed: ' + err.message);
        }
    };

    const handleDestroyProject = async (projectId) => {
        if (!window.confirm("Are you sure you want to mercilessly destroy this active project and all its chats/applications?")) return;
        setActionError('');
        try {
            // Find which shard this project lives in
            const targetProject = projectsList.find(p => p.id === projectId);
            const shardId = targetProject ? targetProject.shardId : 'master';
            const targetDb = window.shardDbs[shardId] || window.shardDbs.master;

            const batch = targetDb.batch();

            // 1. Delete project document
            batch.delete(targetDb.collection('projects').doc(projectId));

            // 2. Delete the team chat thread
            batch.delete(targetDb.collection('threads').doc('team_' + projectId));

            await batch.commit();

            // 3. Delete all applications for this project (can't batch query+delete easily, so run separately)
            const appsSnap = await targetDb.collection('applications').where('projectId', '==', projectId).get();
            const appDeletes = appsSnap.docs.map(doc => doc.ref.delete());
            await Promise.all(appDeletes);

            // 4. Delete all messages inside the team thread
            const messagesSnap = await targetDb.collection('threads').doc('team_' + projectId).collection('messages').get();
            const msgDeletes = messagesSnap.docs.map(doc => doc.ref.delete());
            await Promise.all(msgDeletes);

        } catch(err) {
            console.error('Destroy project error:', err);
            setActionError('Delete failed: ' + err.message);
        }
    };

    return (
        <div className="flex bg-background min-h-screen text-main">
            {/* Sidebar Pipeline */}
            <aside className="w-64 border-r border-divider bg-surface/30 backdrop-blur-3xl flex flex-col h-screen sticky top-0">
                <div className="p-8">
                    <h2 className="text-2xl font-bold tracking-tight mb-8">System<span className="text-red-400">Core</span></h2>
                    <nav className="space-y-4">
                        {['Overview', 'Users', 'Projects', 'Security'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setView(tab.toLowerCase())}
                                className={`w-full text-left font-bold px-4 py-3 rounded-xl transition-all ${
                                    view === tab.toLowerCase() 
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                    : 'text-muted hover:bg-glass hover:text-main border border-transparent'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="mt-auto p-6 border-t border-divider">
                    <div className="text-xs text-muted font-mono mb-4 truncate break-all">Active: {user.email}</div>
                    <button 
                        onClick={onLogout}
                        className="w-full py-3 bg-divider hover:bg-divider-strong transition-colors rounded-xl text-xs font-bold uppercase tracking-wider text-muted hover:text-red-400"
                    >
                        Disconnect Link
                    </button>
                </div>
            </aside>

            {/* Main Visuals */}
            <main className="flex-1 p-10 overflow-y-auto h-screen custom-scrollbar">
                
                {view === 'overview' && (
                    <div className="animate-in fade-in duration-300">
                        <h3 className="text-4xl font-bold mb-8">Architecture Metrics</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-surface border border-divider-strong p-8 rounded-3xl">
                                <p className="text-muted text-sm font-bold uppercase tracking-wider mb-2">Total Connected Civilians</p>
                                <h4 className="text-6xl font-bold text-primary">{totalUsers}</h4>
                            </div>
                            <div className="bg-surface border border-divider-strong p-8 rounded-3xl">
                                <p className="text-muted text-sm font-bold uppercase tracking-wider mb-2">Total Launched Projects</p>
                                <h4 className="text-6xl font-bold text-accent">{totalProjects}</h4>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'users' && (
                    <div className="animate-in fade-in duration-300">
                        <h3 className="text-4xl font-bold mb-8">Civilian Tracking</h3>
                        {actionError && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 font-mono text-sm">[ERROR] {actionError}</div>
                        )}
                        <div className="space-y-4">
                            {usersList.map((u, i) => (
                                <div key={i} className="bg-surface border border-divider rounded-2xl p-4 flex justify-between items-center hover:border-primary/50 transition-colors">
                                    <div>
                                        <h5 className="font-bold">{u.displayName || 'Unnamed User'}</h5>
                                        <p className="text-sm text-muted font-mono">{u.email} • ID: {u.networkId || u.id}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleBanUser(u.id)}
                                        className="px-4 py-2 bg-red-500/10 text-red-500 text-xs font-bold uppercase rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                    >
                                        Erase
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'projects' && (
                    <div className="animate-in fade-in duration-300">
                        <h3 className="text-4xl font-bold mb-8">Project Dominance</h3>
                        {actionError && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 font-mono text-sm">[ERROR] {actionError}</div>
                        )}
                        <div className="space-y-4">
                            {projectsList.map((p, i) => (
                                <div key={i} className="bg-surface border border-divider rounded-2xl p-4 flex justify-between items-center hover:border-accent/50 transition-colors">
                                    <div>
                                        <h5 className="font-bold">{p.title}</h5>
                                        <p className="text-sm text-muted">Author: {p.authorName} • Participants: {p.participants?.length || 0}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleDestroyProject(p.id)}
                                        className="px-4 py-2 bg-red-500/10 text-red-500 text-xs font-bold uppercase rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                    >
                                        Destroy
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'security' && (
                    <div className="animate-in fade-in duration-300">
                        <h3 className="text-4xl font-bold mb-8">System Security & Admins</h3>
                        
                        {isRootAdmin && (
                            <div className="bg-surface border border-red-500/20 rounded-3xl p-8 mb-8 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
                                <h4 className="text-xl font-bold mb-4">Authorize New Admin <span className="text-xs text-red-400 font-mono ml-2 bg-red-500/10 px-2 py-1 rounded-md">ROOT ONLY</span></h4>
                                <p className="text-sm text-muted mb-6 max-w-lg">Grant top-level administrative powers to a specific email address. Once authorized here, they can authenticate into this portal using that email.</p>
                                <form onSubmit={handleGrantAdmin} className="flex gap-4 max-w-lg">
                                    <input 
                                        type="email" required
                                        className="flex-1 bg-background border border-divider-strong rounded-xl p-3 focus:outline-none focus:border-red-400 placeholder:text-muted/50"
                                        placeholder="agent@projectpals.com"
                                        value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)}
                                    />
                                    <button className="px-6 py-3 bg-red-500 hover:bg-red-600 font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all text-white">Authorize</button>
                                </form>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h4 className="font-bold text-muted uppercase tracking-wider text-sm mb-4">Currently Cleared Personnel</h4>
                            {adminsList.map((a, i) => (
                                <div key={i} className="bg-glass border border-divider-strong rounded-2xl p-4 flex justify-between items-center group">
                                    <div>
                                        <h5 className="font-bold flex items-center gap-2">
                                            <window.Icon name="shield-check" size={16} className="text-green-500" />
                                            {a.email}
                                        </h5>
                                        <p className="text-xs text-muted font-mono mt-1">Clearance: {a.role.toUpperCase()}</p>
                                    </div>
                                    {/* Prevent the root admin from deleting themselves roughly */}
                                    {a.email !== user.email && (
                                        <button 
                                            onClick={() => handleRevokeAdmin(a.id)}
                                            className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-red-500/10 text-red-500 text-xs font-bold uppercase rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                        >
                                            Revoke
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

window.AdminDashboard = AdminDashboard;
