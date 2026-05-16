const MessagesView = ({ user, onOpenChat }) => {
    const [threads, setThreads] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        const unsubscribe = window.db.collection('threads')
            .where('participants', 'array-contains', user.uid)
            .onSnapshot(async snapshot => {
                const rawThreads = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // For team threads, verify the linked project still exists
                const validationChecks = rawThreads.map(async thread => {
                    if (!thread.id.startsWith('team_')) return thread; // keep non-project threads as-is
                    const projectId = thread.id.replace('team_', '');
                    try {
                        const projectDoc = await window.db.collection('projects').doc(projectId).get();
                        if (!projectDoc.exists) {
                            // Project deleted — silently clean up this orphaned thread
                            window.db.collection('threads').doc(thread.id).delete().catch(() => {});
                            return null; // mark for removal
                        }
                    } catch(e) {
                        return null; // if check fails, hide it
                    }
                    return thread;
                });

                const results = await Promise.all(validationChecks);
                const validThreads = results.filter(t => t !== null);

                // Client-side sort by most recent
                validThreads.sort((a, b) => {
                    const tA = a.lastUpdated ? a.lastUpdated.seconds : 0;
                    const tB = b.lastUpdated ? b.lastUpdated.seconds : 0;
                    return tB - tA;
                });

                setThreads(validThreads);
                setLoading(false);
            }, err => {
                console.error("Error fetching threads:", err);
                setError("Failed to load messages: " + err.message);
                setLoading(false);
            });
        return () => unsubscribe();
    }, [user]);

    if (loading) return <div className="text-center py-20 text-muted/70 animate-pulse">Loading transmissions...</div>;

    if (error) {
        return (
            <div className="text-center py-20 bg-glass backdrop-blur-xl border border-red-500/20 rounded-2xl shadow-xl">
                <window.Icon name="alert-triangle" size={48} className="text-red-500 mb-4" />
                <h4 className="text-xl font-bold mb-2 text-red-400">Signal Interrupted</h4>
                <p className="text-muted max-w-md mx-auto">{error}</p>
            </div>
        );
    }

    if (threads.length === 0) {
        return (
            <div className="text-center py-20 bg-glass backdrop-blur-xl border border-divider-strong rounded-2xl shadow-xl">
                <window.Icon name="message-square" size={48} className="text-slate-600 mb-4" />
                <h4 className="text-xl font-bold mb-2">No active frequencies</h4>
                <p className="text-muted">Start a conversation from a project page!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Transmissions</h2>
            {threads.map(thread => {
                const title = thread.projectTitle || "Project Chat";
                const lastMsg = thread.lastMessage || "No messages yet";
                const initial = title[0] || '?';

                return (
                    <div
                        key={thread.id}
                        onClick={() => onOpenChat(thread)}
                        className="bg-glass backdrop-blur-md border border-divider-strong rounded-2xl p-4 cursor-pointer hover:bg-glass hover:brightness-110 hover:border-primary/30 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-divider-strong flex items-center justify-center text-primary font-bold text-lg group-hover:scale-110 transition-transform">
                                {initial}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-main group-hover:text-primary transition-colors truncate">{title}</h4>
                                <p className="text-sm text-muted truncate group-hover:text-main">{lastMsg}</p>
                            </div>
                        </div>

                        <div className="text-xs text-muted/70 whitespace-nowrap pl-4">
                            {thread.lastUpdated && thread.lastUpdated.seconds ? new Date(thread.lastUpdated.seconds * 1000).toLocaleDateString() : ''}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

window.MessagesView = MessagesView;
