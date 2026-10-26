const CreateProjectModal = ({ isOpen, onClose, user }) => {
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [roles, setRoles] = React.useState([{ title: '', description: '', assigneeId: null }]);
    const [loading, setLoading] = React.useState(false);
    const [myCrew, setMyCrew] = React.useState([]);

    React.useEffect(() => {
        if (isOpen && user) {
            const unsub = window.db.collection('users').doc(user.uid).onSnapshot(async doc => {
                let connections = [];
                if (doc.exists && doc.data().connections) connections = doc.data().connections;
                if (connections.length > 0) {
                     try {
                         const connectionsQuery = [];
                         for(let i=0; i < connections.length; i+=10) {
                             const chunk = connections.slice(i, i+10);
                             const snap = await window.db.collection('users').where(window.firebase.firestore.FieldPath.documentId(), 'in', chunk).get();
                             snap.forEach(d => connectionsQuery.push({id: d.id, ...d.data()}));
                         }
                         setMyCrew(connectionsQuery);
                     } catch(e) {}
                }
            });
            return () => unsub();
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Filter out empty roles before saving
            const validRoles = roles.filter(r => r.title.trim() !== '');
            
            // Collect any pre-assigned crew members to inject into project participants immediately
            const preAssignedParticipants = validRoles
                .filter(r => r.assigneeId && r.assigneeId !== 'pending')
                .map(r => r.assigneeId);

            await window.db.collection('projects').add({
                title,
                description,
                roles: validRoles,
                authorId: user.uid,
                authorName: user.displayName || 'Anonymous',
                participants: preAssignedParticipants,
                createdAt: new Date(),
                status: 'active'
            });
            onClose();
            // Clear form
            setTitle('');
            setDescription('');
            setRoles([{ title: '', description: '', assigneeId: null }]);
        } catch (err) {
            alert("Error creating project: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-divider-strong rounded-2xl shadow-2xl p-6 w-full max-w-lg relative">
                {/* Subtle gradient accent top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent rounded-t-2xl"></div>

                <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-main transition-colors"><window.Icon name="x" /></button>

                <div className="flex items-center gap-3 mb-6 mt-1">
                    <window.Logo size="md" />
                    <h2 className="text-2xl font-bold text-main">Start New Project</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1.5">Project Title</label>
                        <input
                            type="text" required
                            className="w-full bg-background border border-divider-strong rounded-xl p-3 text-main placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="e.g., Quantum AI Visualizer"
                            value={title} onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1.5">Description</label>
                        <textarea
                            required rows="4"
                            className="w-full bg-background border border-divider-strong rounded-xl p-3 text-main placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                            placeholder="Describe your vision..."
                            value={description} onChange={e => setDescription(e.target.value)}
                        ></textarea>
                    </div>
                    <div className="pt-2">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-muted">Roles Needed</label>
                            <button
                                type="button"
                                onClick={() => setRoles([...roles, { title: '', description: '', assigneeId: null }])}
                                className="text-xs text-primary hover:text-primary-400 font-medium flex items-center gap-1"
                            >
                                <window.Icon name="plus" size={12} /> Add Role
                            </button>
                        </div>
                        <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                            {roles.map((role, idx) => (
                                <div key={idx} className="bg-glass border border-divider p-3 rounded-xl relative group">
                                    <div className="flex gap-2">
                                        <div className="flex-1 space-y-2">
                                            <input
                                                type="text"
                                                placeholder="Role Title (e.g., UI Designer)"
                                                className="w-full bg-background border border-divider-strong rounded-lg p-2 text-sm text-main focus:border-primary focus:outline-none transition-all placeholder:text-muted/50"
                                                value={role.title}
                                                onChange={e => {
                                                    const newRoles = [...roles];
                                                    newRoles[idx].title = e.target.value;
                                                    setRoles(newRoles);
                                                }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Brief description of responsibilities..."
                                                className="w-full bg-background border border-divider-strong rounded-lg p-2 text-sm text-main focus:border-primary focus:outline-none transition-all placeholder:text-muted/50"
                                                value={role.description}
                                                onChange={e => {
                                                    const newRoles = [...roles];
                                                    newRoles[idx].description = e.target.value;
                                                    setRoles(newRoles);
                                                }}
                                            />
                                            {/* Role Assignment UI */}
                                            <div className="flex gap-4 items-center pt-2">
                                                <label className="flex items-center gap-2 text-xs text-muted font-medium hover:text-main transition-colors cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        checked={role.assigneeId === null} 
                                                        onChange={() => { const r = [...roles]; r[idx].assigneeId = null; setRoles(r); }}
                                                        className="accent-primary"
                                                    />
                                                    Hire for this role
                                                </label>
                                                <label className="flex items-center gap-2 text-xs text-muted font-medium hover:text-main transition-colors cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        checked={role.assigneeId !== null} 
                                                        onChange={() => { const r = [...roles]; r[idx].assigneeId = 'pending'; setRoles(r); }}
                                                        className="accent-primary"
                                                    />
                                                    Assign to Crew Member
                                                </label>
                                            </div>
                                            {role.assigneeId !== null && (
                                                <select 
                                                    className="w-full bg-background border border-divider-strong rounded-lg p-2 text-sm text-main focus:border-primary focus:outline-none transition-all mt-1 appearance-none"
                                                    value={role.assigneeId === 'pending' ? '' : role.assigneeId}
                                                    onChange={e => { const r = [...roles]; r[idx].assigneeId = e.target.value; setRoles(r); }}
                                                >
                                                    <option value="" disabled className="bg-background text-muted">-- Select a Crew Member --</option>
                                                    {myCrew.map(c => (
                                                        <option key={c.id} value={c.id} className="bg-background text-main">{c.displayName} (ID: {c.networkId || 'Unknown'})</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                        {roles.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setRoles(roles.filter((_, i) => i !== idx))}
                                                className="text-muted hover:text-red-400 transition-colors mt-2"
                                                title="Remove Role"
                                            >
                                                <window.Icon name="trash-2" size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-divider">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-divider-strong text-muted hover:text-main hover:border-primary/30 transition-all font-medium">Cancel</button>
                        <button
                            type="submit" disabled={loading}
                            className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Launch Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

window.CreateProjectModal = CreateProjectModal;
