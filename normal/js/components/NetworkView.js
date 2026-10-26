const NetworkView = ({ user }) => {
    const [activeTab, setActiveTab] = React.useState('mycrew'); // mycrew, add, requests
    const [searchId, setSearchId] = React.useState('');
    const [myCrew, setMyCrew] = React.useState([]);
    const [requests, setRequests] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [actionLoading, setActionLoading] = React.useState(false);

    // Load User's Connections & Requests
    React.useEffect(() => {
        if (!user) return;
        setLoading(true);

        // 1. Fetch Current User's Document to get connections array
        const unsubUser = window.db.collection('users').doc(user.uid)
            .onSnapshot(async doc => {
                let connections = [];
                if (doc.exists && doc.data().connections) {
                    connections = doc.data().connections;
                }
                
                // Fetch full user data for those connections
                if (connections.length > 0) {
                    try {
                        const connectionsQuery = [];
                        // Firestore only allows 'in' queries with up to 10 items. For simplicity padding:
                        for(let i = 0; i < connections.length; i+=10) {
                            const chunk = connections.slice(i, i+10);
                            const snap = await window.db.collection('users').where(window.firebase.firestore.FieldPath.documentId(), 'in', chunk).get();
                            snap.forEach(d => connectionsQuery.push({id: d.id, ...d.data()}));
                        }
                        setMyCrew(connectionsQuery);
                    } catch (e) {
                         console.error("Error fetching crew data", e);
                    }
                } else {
                    setMyCrew([]);
                }
                setLoading(false);
            });

        // 2. Fetch Incoming Requests
        const unsubReqs = window.db.collection('requests')
            .where('receiverId', '==', user.uid)
            .where('status', '==', 'pending')
            .onSnapshot(snapshot => {
                const reqs = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
                setRequests(reqs);
            });

        return () => {
            unsubUser();
            unsubReqs();
        };
    }, [user]);

    const handleSendRequest = async (e) => {
        e.preventDefault();
        const trimmedId = searchId.trim();
        if (!trimmedId) return;
        if (trimmedId === user.uid || trimmedId.toUpperCase() === user.uid.substring(0, 8).toUpperCase()) {
            alert("You cannot add yourself.");
            return;
        }
        
        setActionLoading(true);
        try {
            let targetDocId = null;
            let targetName = 'Unknown User';

            // 1. Try resolving as short Network ID
            const shortQuery = await window.db.collection('users').where('networkId', '==', trimmedId.toUpperCase()).limit(1).get();
            if (!shortQuery.empty) {
                targetDocId = shortQuery.docs[0].id;
                targetName = shortQuery.docs[0].data().displayName || targetName;
            } else {
                // 2. Fallback: try raw Firebase UID
                const targetDoc = await window.db.collection('users').doc(trimmedId).get();
                if (targetDoc.exists) {
                    targetDocId = trimmedId;
                    targetName = targetDoc.data().displayName || targetName;
                } else {
                    // Try fallback legacy application logic
                    const legacySearch = await window.db.collection('applications').where('applicantId','==', trimmedId).limit(1).get();
                    if (legacySearch.empty) {
                         alert("User not found via Network ID or Long ID.");
                         setActionLoading(false);
                         return;
                    } else {
                         targetDocId = trimmedId;
                         targetName = legacySearch.docs[0].data().applicantName || targetName;
                    }
                }
            }

            // Check if already friends
            const myDoc = await window.db.collection('users').doc(user.uid).get();
            if (myDoc.exists && myDoc.data().connections && myDoc.data().connections.includes(targetDocId)) {
                alert("This user is already in your Crew.");
                setActionLoading(false);
                return;
            }

            // Create Request
            await window.db.collection('requests').add({
                type: 'crew_request',
                senderId: user.uid,
                senderName: user.displayName || 'Unknown User',
                receiverId: targetDocId,
                status: 'pending',
                createdAt: new Date()
            });

            // Notify the recipient
            const recipientDoc = await window.db.collection('users').doc(targetDocId).get();
            const recipientEmail = recipientDoc.exists ? recipientDoc.data().email : null;
            if (window.sendNotification) {
                window.sendNotification(
                    targetDocId, recipientEmail,
                    'New Crew Request',
                    `${user.displayName || 'Someone'} wants to add you to their crew. Check your Network tab to accept or decline.`,
                    'crew_request'
                );
            }

            alert('Connection Request sent successfully!');
            setSearchId('');
            setActiveTab('mycrew');
        } catch (err) {
            console.error(err);
            alert("Error sending request: " + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestAction = async (request, action) => {
        try {
            if (action === 'accepted') {
                if (request.type === 'crew_request') {
                    // Update both users' connections arrays
                    await window.db.collection('users').doc(user.uid).set({
                        connections: window.firebase.firestore.FieldValue.arrayUnion(request.senderId)
                    }, { merge: true });

                    await window.db.collection('users').doc(request.senderId).set({
                        connections: window.firebase.firestore.FieldValue.arrayUnion(user.uid)
                    }, { merge: true });
                } else if (request.type === 'project_invite') {
                    // Project Invite Acceptance: add to project.participants
                    if (request.projectId) {
                        await window.db.collection('projects').doc(request.projectId).update({
                            participants: window.firebase.firestore.FieldValue.arrayUnion(user.uid)
                        });
                    }
                }
                alert("Request Accepted!");
            }
            
            // Delete or mark resolved
            await window.db.collection('requests').doc(request.id).update({
                status: action,
                updatedAt: new Date()
            });

        } catch(err) {
            console.error(err);
            alert("Failed to process request");
        }
    };

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                <div>
                    <h2 className="text-4xl font-bold mb-2 text-main">My Crew</h2>
                    <p className="text-muted">Manage your connections and project invitations.</p>
                </div>
            </header>

            <div className="flex gap-6 border-b border-divider mb-8 overflow-x-auto custom-scrollbar pb-2">
                {['mycrew', 'add', 'requests'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-2 font-bold capitalize whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === tab ? 'text-primary border-primary' : 'text-muted border-transparent hover:text-main hover:border-divider-strong'}`}
                    >
                        {tab === 'mycrew' ? 'Already Connected' : tab === 'add' ? 'Add Connection' : 'Requests'}
                        {tab === 'requests' && requests.length > 0 && (
                            <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">{requests.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-center py-20 text-muted/70 animate-pulse">Loading data...</div>
            ) : (() => {
                if (activeTab === 'add') {
                    return (
                        <div className="max-w-xl mx-auto bg-glass backdrop-blur-xl border border-divider-strong rounded-3xl p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                                    <window.Icon name="user-plus" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-main">Invite by User ID</h3>
                                    <p className="text-sm text-muted">Ask your teammate for their network ID from their Settings Page.</p>
                                </div>
                            </div>
                            <form onSubmit={handleSendRequest} className="space-y-4">
                                <div>
                                    <input 
                                        type="text" 
                                        value={searchId}
                                        onChange={(e) => setSearchId(e.target.value)}
                                        required
                                        placeholder="Paste accurate User ID..."
                                        className="w-full bg-background border border-divider-strong rounded-xl p-4 text-main font-mono placeholder:font-sans focus:border-primary focus:outline-none transition-colors"
                                    />
                                </div>
                                <button disabled={actionLoading} type="submit" className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50">
                                    {actionLoading ? 'Locating User...' : 'Send Crew Request'}
                                </button>
                            </form>
                        </div>
                    );
                }

                if (activeTab === 'requests') {
                    if (requests.length === 0) {
                        return (
                            <div className="text-center py-20 bg-glass backdrop-blur-xl border border-divider-strong rounded-3xl opacity-80">
                                <window.Icon name="inbox" size={48} className="text-slate-600 mb-4 mx-auto" />
                                <h4 className="text-xl font-bold text-main mb-1">No incoming alerts</h4>
                                <p className="text-muted text-sm">When someone adds you or invites you to a project, it appears here.</p>
                            </div>
                        );
                    }
                    return (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {requests.map(req => (
                                <div key={req.id} className="bg-glass backdrop-blur-xl border border-divider-strong rounded-2xl p-6 flex flex-col hover:border-primary/40 transition-colors">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="font-bold text-main text-lg">{req.senderName || 'A user'}</h4>
                                            <p className="text-sm text-primary">
                                                {req.type === 'project_invite' ? `Invited you to project: ${req.projectTitle}` : 'Sent you a Crew request.'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-auto pt-4 border-t border-divider">
                                        <button onClick={() => handleRequestAction(req, 'rejected')} className="flex-1 py-2.5 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 text-sm font-bold transition-colors">Decline</button>
                                        <button onClick={() => handleRequestAction(req, 'accepted')} className="flex-1 py-2.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 text-sm font-bold transition-colors">Accept</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (activeTab === 'mycrew') {
                    if (myCrew.length === 0) {
                        return (
                            <div className="text-center py-20 bg-glass backdrop-blur-xl border border-divider-strong rounded-3xl opacity-80">
                                <window.Icon name="users" size={48} className="text-slate-600 mb-4 mx-auto" />
                                <h4 className="text-xl font-bold text-main mb-1">Your crew list is empty</h4>
                                <p className="text-muted text-sm">Add makers to your network by pasting their ID in the "Add Connection" tab.</p>
                            </div>
                        );
                    }
                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myCrew.map(member => (
                                <div key={member.id} className="bg-glass border border-divider-strong rounded-2xl p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-accent to-purple-500 text-white font-bold flex items-center justify-center text-lg">{member.displayName ? member.displayName[0].toUpperCase() : '?'}</div>
                                    <div className="overflow-hidden flex-1">
                                        <h4 className="font-bold text-main truncate">{member.displayName}</h4>
                                        <p className="text-xs text-muted font-mono truncate">{member.id}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }
            })()}
        </div>
    );
};

window.NetworkView = NetworkView;
