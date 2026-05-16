const ProjectDetailsModal = ({ isOpen, onClose, user, project, initialView = 'details' }) => {
    const [view, setView] = React.useState(initialView); // details, apply, chat
    const [loading, setLoading] = React.useState(false);

    // Form states
    const [selectedRole, setSelectedRole] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [skills, setSkills] = React.useState('');
    const [chatPartner, setChatPartner] = React.useState(null);
    const [existingApplication, setExistingApplication] = React.useState(null);
    const [projectApplications, setProjectApplications] = React.useState([]);
    const [isEditingApp, setIsEditingApp] = React.useState(false);
    const [isEditingProject, setIsEditingProject] = React.useState(false);
    const [editTitle, setEditTitle] = React.useState('');
    const [editDescription, setEditDescription] = React.useState('');
    const [editRoles, setEditRoles] = React.useState([]);
    const [editStatus, setEditStatus] = React.useState('active');

    // Chat states
    const [chatMessages, setChatMessages] = React.useState([]);
    const [chatInput, setChatInput] = React.useState('');
    const chatEndRef = React.useRef(null);

    // Invite states
    const [myCrew, setMyCrew] = React.useState([]);
    const [invitingId, setInvitingId] = React.useState(null);

    // Manage Crew states
    const [projectCrew, setProjectCrew] = React.useState([]);
    
    React.useEffect(() => {
        if (isOpen) {
            setView(initialView);
        } else {
            setChatMessages([]);
            setMessage('');
            setSkills('');
            setSelectedRole('');
            setExistingApplication(null);
            setIsEditingApp(false);
            setIsEditingProject(false);
        }
    }, [isOpen, initialView]);

    // Application Listener
    React.useEffect(() => {
        if (isOpen && project && user) {
            const projectId = project.id || project.projectId;
            const unsubscribe = window.db.collection('applications')
                .where('projectId', '==', projectId)
                .where('applicantId', '==', user.uid)
                .onSnapshot(snapshot => {
                    if (!snapshot.empty) {
                        const appDoc = snapshot.docs[0];
                        const appData = appDoc.data();
                        setExistingApplication({ id: appDoc.id, ...appData });
                        if (!isEditingApp) {
                            setSelectedRole(appData.role);
                            setSkills(appData.skills);
                            setMessage(appData.message);
                        }
                    } else {
                        setExistingApplication(null);
                        if (!isEditingApp) {
                            setSkills('');
                            setMessage('');
                            setSelectedRole('');
                        }
                    }
                });
            return () => unsubscribe();
        }
    }, [isOpen, project, user, isEditingApp]);

    // Project Owner Applications & Crew Listener
    React.useEffect(() => {
        if (isOpen && project && user && user.uid === project.authorId) {
            const projectId = project.id || project.projectId;
            const unsubscribeApps = window.db.collection('applications')
                .where('projectId', '==', projectId)
                .onSnapshot(snapshot => {
                    const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setProjectApplications(apps);
                });

            // If we're on the invite view, load crew
            let unsubscribeUser = () => {};
            if (view === 'invite') {
                unsubscribeUser = window.db.collection('users').doc(user.uid).onSnapshot(async doc => {
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
                            // Filter out people already in project
                            const filtered = connectionsQuery.filter(c => !project.participants?.includes(c.id));
                            setMyCrew(filtered);
                        } catch(e) {}
                    }
                });
            }

            return () => { unsubscribeApps(); unsubscribeUser(); };
        } else {
            setProjectApplications([]);
        }
    }, [isOpen, project, user, view]);

    // Fetch Project Crew specific info when opening Manage Crew
    React.useEffect(() => {
        if (isOpen && project && view === 'manage_crew') {
            const fetchCrew = async () => {
                if (!project.participants || project.participants.length === 0) {
                    setProjectCrew([]); return;
                }
                const crewDocs = [];
                for (let i = 0; i < project.participants.length; i += 10) {
                    const chunk = project.participants.slice(i, i + 10);
                    const snap = await window.db.collection('users').where(window.firebase.firestore.FieldPath.documentId(), 'in', chunk).get();
                    snap.forEach(d => crewDocs.push({ id: d.id, ...d.data() }));
                }
                setProjectCrew(crewDocs);
            };
            fetchCrew();
        }
    }, [isOpen, project, view]);

    // Scroll to bottom of chat
    React.useEffect(() => {
        if (view === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, view]);

    // Chat Listener
    React.useEffect(() => {
        if (view === 'chat' && project) {
            let chatId;
            if (project.chatId) {
                chatId = project.chatId;
            } else {
                if (user.uid && project.authorId) {
                    const projectId = project.id || project.projectId;
                    chatId = 'team_' + projectId;
                }
            }

            if (chatId) {
                // Reset my unread count when opening chat
                window.db.collection('threads').doc(chatId).set({
                    [`unreadCount_${user.uid}`]: 0
                }, { merge: true }).catch(err => console.error("Error resetting unread count:", err));

                const isChatInitialLoad = { current: true };
                const unsubscribe = window.db.collection('messages')
                    .where('chatId', '==', chatId)
                    .onSnapshot(snapshot => {
                        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        // Client-side sort
                        msgs.sort((a, b) => {
                            const tA = a.createdAt ? a.createdAt.seconds : 0;
                            const tB = b.createdAt ? b.createdAt.seconds : 0;
                            return tA - tB; // Ascending
                        });
                        setChatMessages(msgs);

                        // Play sound for new incoming messages (not on initial load, not own messages)
                        if (isChatInitialLoad.current) {
                            isChatInitialLoad.current = false;
                            return;
                        }
                        snapshot.docChanges().forEach(change => {
                            if (change.type === 'added' && change.doc.data().senderId !== user.uid) {
                                if (typeof window.playNotificationSound === 'function') {
                                    window.playNotificationSound();
                                }
                            }
                        });
                    });
                return () => unsubscribe();

            }
        }
    }, [view, project, user]);

    // Fetch Chat Partner Info
    React.useEffect(() => {
        if (view === 'chat' && isOpen && project) {
            let partnerId = null;

            // Case 1: Existing Thread (has participants) -> Not 1on1 anymore, but for legacy chats this works
            if (project.participants && project.participants.length === 2 && project.chatId && !project.chatId.startsWith('team_')) {
                partnerId = project.participants.find(p => p !== user.uid);
            } else {
                // Team chat scenario or fallback: partner isn't a single person anymore for team chats!
                // But for the sake of the UI displaying a "Team", we can just mock it.
                if (project.chatId && project.chatId.startsWith('team_')) {
                     // Leave partnerId null, the UI explicitly defaults to "Team Chat"
                } else if (project.authorId && project.authorId !== user.uid) {
                     partnerId = project.authorId;
                }
            }

            if (partnerId) {
                const unsubscribe = window.db.collection('users').doc(partnerId)
                    .onSnapshot(async doc => {
                        if (doc.exists) {
                            setChatPartner({ id: doc.id, ...doc.data() });
                        } else {
                            // Fallback if user doc doesn't exist (e.g. legacy data)
                            let fallbackName = project.authorName || project.senderName || 'Unknown User';
                            
                            try {
                                // Try to find name from their previous messages
                                const msgSnap = await window.db.collection('messages').where('senderId', '==', partnerId).limit(1).get();
                                if (!msgSnap.empty && msgSnap.docs[0].data().senderName) {
                                    fallbackName = msgSnap.docs[0].data().senderName;
                                } else {
                                    // Try to find from applications
                                    const appSnap = await window.db.collection('applications').where('applicantId', '==', partnerId).limit(1).get();
                                    if (!appSnap.empty && appSnap.docs[0].data().applicantName) {
                                        fallbackName = appSnap.docs[0].data().applicantName;
                                    }
                                }
                            } catch (e) {
                                console.error("Could not fetch fallback name", e);
                            }

                            setChatPartner({
                                id: partnerId,
                                displayName: fallbackName,
                                isOnline: false
                            });
                        }
                    });
                return () => unsubscribe();
            }
        } else {
            setChatPartner(null);
        }
    }, [view, isOpen, project, user]);

    if (!isOpen || !project) return null;

    const handleApply = async (e) => {
        e.preventDefault();
        if (project.roles && project.roles.length > 0 && !selectedRole) {
            alert("Please select a role to apply for.");
            return;
        }
        setLoading(true);
        try {
            if (isEditingApp && existingApplication) {
                await window.db.collection('applications').doc(existingApplication.id).update({
                    role: selectedRole || 'General Application',
                    message,
                    skills,
                    updatedAt: new Date()
                });
                alert("Application updated successfully!");
                setIsEditingApp(false);
                setView('details');
            } else {
                await window.db.collection('applications').add({
                    projectId: project.id || project.projectId,
                    applicantId: user.uid,
                    applicantName: user.displayName,
                    role: selectedRole || 'General Application',
                    message,
                    skills,
                    createdAt: new Date(),
                    status: 'pending'
                });

                // Notify the project author
                const authorId = project.authorId;
                if (authorId && authorId !== user.uid) {
                    const authorDoc = await window.db.collection('users').doc(authorId).get();
                    const authorEmail = authorDoc.exists ? authorDoc.data().email : null;
                    if (window.sendNotification) {
                        window.sendNotification(
                            authorId, 
                            authorEmail,
                            'New Project Application',
                            `${user.displayName} applied for "${selectedRole || 'General Application'}" on your project "${project.title || project.projectTitle}".`,
                            'application'
                        );
                    }
                }

                alert("Application submitted successfully!");
                setView('details');
            }
        } catch (err) {
            alert("Error applying: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEditProjectClick = () => {
        setEditTitle(project.title || project.projectTitle || '');
        setEditDescription(project.description || '');
        setEditRoles(project.roles ? [...project.roles] : []);
        setEditStatus(project.status || 'active');
        setIsEditingProject(true);
    };

    const handleSaveProject = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const validRoles = editRoles.filter(r => r.title.trim() !== '');
            const projectId = project.id || project.projectId;
            await window.db.collection('projects').doc(projectId).update({
                title: editTitle,
                description: editDescription,
                roles: validRoles,
                status: editStatus,
                updatedAt: new Date()
            });
            project.title = editTitle; 
            project.description = editDescription; 
            project.roles = validRoles; 
            project.status = editStatus;
            setIsEditingProject(false);
        } catch (err) {
            alert("Error updating project: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApplicationAction = async (appId, applicantId, action) => {
        try {
            // Update application status
            await window.db.collection('applications').doc(appId).update({
                status: action,
                updatedAt: new Date()
            });

            // If hired, add to project participants for chat enablement and mark role as filled if applicable
            if (action === 'hired') {
                const projectId = project.id || project.projectId;
                
                const projectDoc = await window.db.collection('projects').doc(projectId).get();
                if (projectDoc.exists) {
                    const projData = projectDoc.data();
                    let updatedRoles = projData.roles || [];
                    
                    const appDoc = await window.db.collection('applications').doc(appId).get();
                    if (appDoc.exists) {
                         const appliedRoleTitle = appDoc.data().role;
                         const appliedRoleIdx = updatedRoles.findIndex(r => r.title === appliedRoleTitle && !r.assigneeId);
                         if (appliedRoleIdx !== -1) {
                             updatedRoles[appliedRoleIdx].assigneeId = applicantId;
                         }
                    }

                    await window.db.collection('projects').doc(projectId).update({
                        participants: window.firebase.firestore.FieldValue.arrayUnion(applicantId),
                        roles: updatedRoles
                    });
                    
                    if (project.roles) {
                         const idx = project.roles.findIndex(r => !r.assigneeId);
                         if (idx !== -1) project.roles[idx].assigneeId = applicantId;
                    }
                }
                
                // Update Team Chat participants if it exists
                await window.db.collection('threads').doc('team_' + projectId).set({
                    participants: window.firebase.firestore.FieldValue.arrayUnion(applicantId)
                }, { merge: true });
                
                // Add to project object locally so UI updates immediately
                if (!project.participants) project.participants = [];
                if (!project.participants.includes(applicantId)) project.participants.push(applicantId);

                // Notify the hired person
                const hiredUserDoc = await window.db.collection('users').doc(applicantId).get();
                const hiredEmail = hiredUserDoc.exists ? hiredUserDoc.data().email : null;
                if (window.sendNotification) {
                    window.sendNotification(
                        applicantId, hiredEmail,
                        'You were hired! 🎉',
                        `Congratulations! You have been hired for the project "${project.title || project.projectTitle}". Head to your projects to access the team chat.`,
                        'hired'
                    );
                }
            } else if (action === 'rejected') {
                // Notify the rejected applicant
                const rejectedUserDoc = await window.db.collection('users').doc(applicantId).get();
                const rejectedEmail = rejectedUserDoc.exists ? rejectedUserDoc.data().email : null;
                if (window.sendNotification) {
                    window.sendNotification(
                        applicantId, rejectedEmail,
                        'Application update',
                        `Your application for "${project.title || project.projectTitle}" was not selected this time. Keep building!`,
                        'application_update'
                    );
                }
            }
        } catch (err) {
            console.error("Error updating application:", err);
            alert("Failed to update application status.");
        }
    };

    const handleSendProjectInvite = async (crewMemberId, crewMemberName) => {
        setInvitingId(crewMemberId);
        try {
            const projectId = project.id || project.projectId;
            // Check if already invited (status pending)
            const existSnap = await window.db.collection('requests')
                 .where('projectId', '==', projectId)
                 .where('receiverId', '==', crewMemberId)
                 .where('status', '==', 'pending')
                 .limit(1).get();
            if (!existSnap.empty) {
                 alert("An invitation is already pending for this user.");
                 setInvitingId(null);
                 return;
            }

            await window.db.collection('requests').add({
                type: 'project_invite',
                projectId: projectId,
                projectTitle: project.title || project.projectTitle,
                senderId: user.uid,
                senderName: user.displayName || 'Maker',
                receiverId: crewMemberId,
                status: 'pending',
                createdAt: new Date()
            });

            // Notify the invited person
            const invitedDoc = await window.db.collection('users').doc(crewMemberId).get();
            const invitedEmail = invitedDoc.exists ? invitedDoc.data().email : null;
            if (window.sendNotification) {
                window.sendNotification(
                    crewMemberId, invitedEmail,
                    'Project Invitation',
                    `${user.displayName || 'A maker'} invited you to join "${project.title || project.projectTitle}". Check your Network tab to respond.`,
                    'crew_request'
                );
            }
            alert(`Project invite sent to ${crewMemberName}!`);
        } catch(e) {
            alert("Error sending invite");
        }
        setInvitingId(null);
    };

    const handleRemoveCrewMember = async (memberId) => {
        if (!window.confirm("Are you sure you want to remove this member from the project? This will remove their chat access and free up any roles they held.")) return;
        try {
            const projectId = project.id || project.projectId;
            
            // 1. Unassign from roles
            let updatedRoles = project.roles ? [...project.roles] : [];
            let rolesChanged = false;
            updatedRoles.forEach(r => {
                if (r.assigneeId === memberId) {
                    r.assigneeId = null;
                    rolesChanged = true;
                }
            });

            // 2. Remove from project participants array & update roles if changed
            await window.db.collection('projects').doc(projectId).update({
                participants: window.firebase.firestore.FieldValue.arrayRemove(memberId),
                ...(rolesChanged ? { roles: updatedRoles } : {})
            });

            // 3. Update team chat thread to remove access
            await window.db.collection('threads').doc('team_' + projectId).set({
                participants: window.firebase.firestore.FieldValue.arrayRemove(memberId)
            }, { merge: true });

            // 4. Optionally mark application as released/removed if they were hired via application
            const appSnap = await window.db.collection('applications')
                 .where('projectId', '==', projectId)
                 .where('applicantId', '==', memberId)
                 .limit(1).get();
            if (!appSnap.empty) {
                 await window.db.collection('applications').doc(appSnap.docs[0].id).update({
                     status: 'removed',
                     updatedAt: new Date()
                 });
            }

            alert("Member successfully removed from the project.");
            
            // Local fallback update for instant UI response without full reload
            if (project.participants) {
                project.participants = project.participants.filter(id => id !== memberId);
            }
            if (rolesChanged) project.roles = updatedRoles;
            
            // Remove from the local list so the UI immediately drops them
            setProjectCrew(prev => prev.filter(c => c.id !== memberId));
            
        } catch(e) {
            alert("Error removing member: " + e.message);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        let chatId, projectId, authorId, projectTitle;

        try {
            if (project.chatId) {
                chatId = project.chatId;
                projectId = project.projectId;
                projectTitle = project.projectTitle;
            } else {
                if (!project.authorId) throw new Error("Cannot start chat: Project author ID is missing.");

                chatId = 'team_' + project.id;
                projectId = project.id;
                authorId = project.authorId;
                projectTitle = project.title;
            }

            if (!chatId) throw new Error("Chat ID could not be generated.");

            const messageData = {
                chatId,
                text: chatInput,
                senderId: user.uid,
                senderName: user.displayName || 'Anonymous',
                createdAt: new Date()
            };

            await window.db.collection('messages').add(messageData);

            const threadRef = window.db.collection('threads').doc(chatId);
            const threadDoc = await threadRef.get();
            const currentData = threadDoc.exists ? threadDoc.data() : {};

            // Thread Update Logic
            const threadData = {
                lastMessage: chatInput,
                lastUpdated: new Date()
            };

            // Increment unread count for everyone in the chat
            let chatMembers = [];
            if (project.chatId && !project.chatId.startsWith('team_')) {
                if (chatPartner) chatMembers = [chatPartner.id];
            } else {
                chatMembers = [...new Set([project.authorId, ...(project.participants || [])])];
            }
            
            chatMembers.forEach(memberId => {
                if (memberId !== user.uid) {
                    threadData[`unreadCount_${memberId}`] = window.firebase.firestore.FieldValue.increment(1);
                    
                    // Trigger notification exactly on the 10th unread message
                    const currentUnread = currentData[`unreadCount_${memberId}`] || 0;
                    if (currentUnread === 9 && window.sendNotification) {
                        window.db.collection('users').doc(memberId).get().then(doc => {
                            if (doc.exists) {
                                window.sendNotification(
                                    memberId,
                                    doc.data().email,
                                    'New Unread Messages',
                                    `You have 10 unread messages in the "${projectTitle}" chat. Log in to catch up!`,
                                    'chat'
                                );
                            }
                        }).catch(e => console.warn("Could not fetch user to notify", e));
                    }
                }
            });

            if (!project.chatId) {
                // First time chat creation from Card
                if (!user.uid || !authorId) throw new Error("Missing participant IDs");
                threadData.chatId = chatId;
                threadData.projectId = projectId;
                threadData.projectTitle = projectTitle + " (Team Chat)";
                threadData.participants = [...new Set([authorId, user.uid, ...(project.participants || [])])];
            }

            await threadRef.set(threadData, { merge: true });

            setChatInput('');
        } catch (err) {
            console.error("Error sending message:", err);
            alert("Failed to send message: " + err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-background/90 backdrop-blur-xl border border-divider-strong rounded-3xl shadow-2xl p-0 w-full max-w-2xl relative flex flex-col max-h-[90vh] h-[600px] overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-white/10">

                {/* Header - Sticky */}
                <div className="p-6 border-b border-divider bg-glass backdrop-blur-md sticky top-0 z-10 flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 text-primary text-xs font-bold uppercase tracking-wider">
                            <window.Icon name="layers" size={14} />
                            {(project.status || 'Active')}
                        </div>
                        <h2 className="text-2xl font-bold text-main leading-tight">{project.title || project.projectTitle}</h2>
                        {project.authorName && <p className="text-muted text-sm mt-1">Created by <span className="text-slate-200">{project.authorName}</span></p>}
                    </div>
                    <div className="flex items-center gap-2">
                        {project.authorId === user.uid && !isEditingProject && view === 'details' && (
                            <button onClick={handleEditProjectClick} className="px-3 py-1.5 bg-glass hover:bg-glass hover:brightness-110 rounded-xl text-primary transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-primary/20 hover:border-primary/50"><window.Icon name="edit" size={14} /> Edit</button>
                        )}
                        <button onClick={onClose} className="p-2 bg-glass hover:bg-glass hover:brightness-110 rounded-full text-muted hover:text-main transition-all"><window.Icon name="x" size={20} /></button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-black/20">

                    {/* DETAILS VIEW */}
                    {view === 'details' && !isEditingProject && (
                        <div className="p-6 space-y-8">
                            <div>
                                <h3 className="text-xs font-bold text-muted/70 uppercase tracking-wider mb-3">About this Concept</h3>
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-lg font-light">{project.description || "Details not available."}</p>
                            </div>

                            {project.roles && project.roles.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-muted/70 uppercase tracking-wider mb-3">Roles Available</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {project.roles.map((role, idx) => (
                                            <div key={idx} className={`bg-glass border border-divider rounded-xl p-4 flex flex-col transition-colors ${role.assigneeId ? 'opacity-70' : 'hover:border-primary/30'}`}>
                                                <h4 className="font-bold text-main text-lg mb-1 flex items-center justify-between">
                                                    {role.title}
                                                    {role.assigneeId && <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Filled</span>}
                                                </h4>
                                                <p className="text-sm text-muted leading-relaxed">{role.description || "No description provided."}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Footer Actions nested in Details */}
                            <div className="pt-8 mt-4 border-t border-divider">
                                {(!project.authorId || user.uid !== project.authorId) ? (
                                    project.participants && project.participants.includes(user.uid) ? (
                                        <div className="flex flex-col gap-4">
                                             <div className="flex-1 text-center py-4 text-muted font-medium bg-glass rounded-xl border border-divider flex items-center justify-center gap-2">
                                                 <window.Icon name="check-circle" size={18} className="text-green-400" /> You are an active core member of this project
                                             </div>
                                             <button onClick={() => setView('chat')} className="w-full bg-glass hover:bg-glass hover:brightness-110 border border-divider-strong text-main py-4 rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-95">
                                                 Project Team Chat
                                             </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                        {existingApplication ? (
                                            <div className="bg-glass border border-primary/30 rounded-xl p-4 flex flex-col items-center">
                                                <div className="text-primary font-bold mb-1 flex items-center gap-2">
                                                    <window.Icon name="check-circle" size={16} />
                                                    Application Submitted
                                                </div>
                                                <p className="text-sm text-muted mb-3">Role: {existingApplication.role} <span className="uppercase text-[10px] ml-2 px-2 py-0.5 rounded-full bg-black/30 border border-divider-strong">{existingApplication.status || 'Pending'}</span></p>
                                                <div className="flex gap-4 w-full">
                                                    <button onClick={() => { setIsEditingApp(true); setView('apply'); }} className="flex-1 bg-surface hover:brightness-110 border border-primary/50 text-main py-3 rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-95 text-sm">
                                                        Edit Application
                                                    </button>
                                                    <button onClick={() => setView('chat')} className="flex-1 bg-glass hover:bg-glass hover:brightness-110 border border-divider-strong text-main py-3 rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-95 text-sm">
                                                        Project Team Chat
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => { setIsEditingApp(false); setView('apply'); }}
                                                    disabled={!project.roles || project.roles.filter(r=>!r.assigneeId).length === 0}
                                                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                                                >
                                                    {(!project.roles || project.roles.filter(r=>!r.assigneeId).length === 0) ? 'No Open Roles' : 'Apply for Role'}
                                                </button>
                                                <button
                                                    onClick={() => setView('chat')}
                                                    className="flex-1 bg-glass hover:bg-glass hover:brightness-110 border border-divider-strong text-main py-4 rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-95"
                                                >
                                                    Chat with Maker
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    )
                                ) : (
                                    <>
                                        <div className="flex gap-4">
                                            <div className="flex-1 text-center py-4 text-muted font-medium bg-glass rounded-xl border border-divider flex items-center justify-center gap-2">
                                                <window.Icon name="shield" size={18} className="text-primary" /> You manage this project
                                            </div>
                                        </div>
                                        <div className="flex gap-4 mt-4">
                                            <button onClick={() => setView('invite')} className="flex-1 bg-glass hover:bg-glass hover:brightness-110 border border-divider-strong text-main py-3 rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-95 text-xs flex items-center justify-center gap-2">
                                                <window.Icon name="user-plus" size={16} className="text-primary" /> Invite Crew
                                            </button>
                                            <button onClick={() => setView('manage_crew')} className="flex-1 bg-glass hover:bg-glass hover:brightness-110 border border-divider-strong text-main py-3 rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-95 text-xs flex items-center justify-center gap-2">
                                                <window.Icon name="users" size={16} className="text-primary" /> Manage Crew
                                            </button>
                                            <button onClick={() => setView('applications')} className="flex-1 bg-surface hover:brightness-110 border border-primary/50 text-main py-3 rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-95 text-xs flex items-center justify-center gap-2 relative group">
                                                <window.Icon name="inbox" size={16} className="group-hover:text-primary transition-colors" /> Review Apps
                                                {projectApplications.filter(a => a.status === 'pending').length > 0 && (
                                                    <span className="absolute top-2 right-2 flex h-3 w-3">
                                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {view === 'details' && isEditingProject && (
                        <div className="p-6 animate-in fade-in duration-300">
                            <form onSubmit={handleSaveProject} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1.5">Project Title</label>
                                    <input
                                        type="text" required
                                        className="w-full bg-background border border-divider-strong rounded-xl p-3 text-main placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        value={editTitle} onChange={e => setEditTitle(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1.5">Description</label>
                                    <textarea
                                        required rows="4"
                                        className="w-full bg-background border border-divider-strong rounded-xl p-3 text-main placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                        value={editDescription} onChange={e => setEditDescription(e.target.value)}
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1.5">Project Status</label>
                                    <select
                                        className="w-full bg-background border border-divider-strong rounded-xl p-3 text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                                        value={editStatus} onChange={e => setEditStatus(e.target.value)}
                                    >
                                        <option value="active" className="bg-background text-main">Active & Recruiting</option>
                                        <option value="ongoing" className="bg-background text-main">Ongoing</option>
                                        <option value="completed" className="bg-background text-main">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-muted">Roles Needed</label>
                                        <button type="button" onClick={() => setEditRoles([...editRoles, { title: '', description: '' }])} className="text-xs text-primary hover:text-primary-400 font-medium flex items-center gap-1">
                                            <window.Icon name="plus" size={12} /> Add Role
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {editRoles.map((role, idx) => (
                                            <div key={idx} className="bg-glass border border-divider p-3 rounded-xl flex gap-2">
                                                <div className="flex-1 space-y-2">
                                                    <input type="text" placeholder="Role Title" className="w-full bg-background border border-divider-strong rounded-lg p-2 text-sm text-main focus:border-primary focus:outline-none" value={role.title} onChange={e => { const newRoles = [...editRoles]; newRoles[idx].title = e.target.value; setEditRoles(newRoles); }} />
                                                    <input type="text" placeholder="Description" className="w-full bg-background border border-divider-strong rounded-lg p-2 text-sm text-main focus:border-primary focus:outline-none" value={role.description} onChange={e => { const newRoles = [...editRoles]; newRoles[idx].description = e.target.value; setEditRoles(newRoles); }} />
                                                </div>
                                                <button type="button" onClick={() => setEditRoles(editRoles.filter((_, i) => i !== idx))} className="text-muted hover:text-red-400 mt-2">
                                                    <window.Icon name="trash-2" size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-divider">
                                    <button type="button" onClick={() => setIsEditingProject(false)} className="px-5 py-2.5 rounded-xl border border-divider-strong text-muted hover:text-main hover:border-primary/30 font-medium">Cancel</button>
                                    <button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-primary/25 disabled:opacity-50">
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* APPLY VIEW */}
                    {view === 'apply' && (
                        <div className="p-6 animate-in slide-in-from-right duration-300">
                            <button onClick={() => { setIsEditingApp(false); setView('details'); }} className="mb-6 text-sm text-muted hover:text-main flex items-center gap-2 transition-colors group">
                                <window.Icon name="arrow-left" size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Details
                            </button>
                            <h3 className="text-xl font-bold mb-6 text-main">{isEditingApp ? 'Edit Application' : 'Join the Team'}</h3>
                            <form onSubmit={handleApply} className="space-y-6">
                                {project.roles && project.roles.length > 0 && (
                                    <div>
                                        <label className="block text-sm text-muted mb-2 font-medium">Select a Role</label>
                                        <select
                                            className="w-full bg-glass border border-divider-strong rounded-xl p-4 text-main focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all appearance-none"
                                            value={selectedRole}
                                            onChange={e => setSelectedRole(e.target.value)}
                                            required
                                        >
                                            <option value="" disabled className="bg-background text-muted">-- Choose a role to apply for --</option>
                                            {project.roles.filter(r => !r.assigneeId).map((role, idx) => (
                                                <option key={idx} value={role.title} className="bg-background text-main">{role.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm text-muted mb-2 font-medium">Your Skills & Experience</label>
                                    <input
                                        type="text" required
                                        className="w-full bg-glass border border-divider-strong rounded-xl p-4 text-main focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-600"
                                        placeholder="React, Node.js, Design..."
                                        value={skills} onChange={e => setSkills(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-muted mb-2 font-medium">Why do you want to join?</label>
                                    <textarea
                                        required rows="5"
                                        className="w-full bg-glass border border-divider-strong rounded-xl p-4 text-main focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-600"
                                        placeholder="I share the vision because..."
                                        value={message} onChange={e => setMessage(e.target.value)}
                                    ></textarea>
                                </div>
                                <button
                                    type="submit" disabled={loading}
                                    className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 mt-4"
                                >
                                    {loading ? (isEditingApp ? 'Updating Application...' : 'Sending Application...') : (isEditingApp ? 'Update Application' : 'Submit Application')}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* APPLICATIONS VIEW (OWNER ONLY) */}
                    {view === 'applications' && (
                        <div className="p-6 animate-in slide-in-from-right duration-300">
                            <button onClick={() => setView('details')} className="mb-6 text-sm text-muted hover:text-main flex items-center gap-2 transition-colors group">
                                <window.Icon name="arrow-left" size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Details
                            </button>
                            <h3 className="text-xl font-bold mb-6 text-main flex items-center gap-3">
                                <window.Icon name="inbox" size={24} className="text-primary" /> Received Applications
                            </h3>

                            {projectApplications.length === 0 ? (
                                <div className="text-center py-12 bg-glass border border-divider-strong rounded-2xl">
                                    <window.Icon name="inbox" size={48} className="text-slate-600 mb-4 mx-auto opacity-50" />
                                    <h4 className="text-lg font-bold text-main mb-1">No applications yet</h4>
                                    <p className="text-sm text-muted">When users apply for your roles, they'll appear here.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {projectApplications.map(app => (
                                        <div key={app.id} className="bg-glass border border-divider-strong rounded-2xl p-5 hover:border-primary/30 transition-all group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-bold text-main text-lg">{app.applicantName}</h4>
                                                    <p className="text-sm text-primary font-medium">Applied for: {app.role}</p>
                                                </div>
                                                <span className={`uppercase text-[10px] px-2.5 py-1 rounded-full font-bold border ${app.status === 'hired' ? 'bg-green-500/10 text-green-400 border-green-500/30' : app.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-slate-500/10 text-slate-400 border-slate-500/30'}`}>
                                                    {app.status || 'Pending'}
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-3 mb-5">
                                                <div>
                                                    <span className="text-xs uppercase font-bold text-muted/70 block mb-1">Skills & Experience</span>
                                                    <p className="text-sm text-slate-300">{app.skills}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs uppercase font-bold text-muted/70 block mb-1">Message</span>
                                                    <p className="text-sm text-slate-300 italic">"{app.message}"</p>
                                                </div>
                                            </div>

                                            {(!app.status || app.status === 'pending') && (
                                                <div className="flex gap-3 pt-4 border-t border-divider">
                                                    <button onClick={() => handleApplicationAction(app.id, app.applicantId, 'rejected')} className="flex-1 py-2.5 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 text-sm font-bold transition-colors">
                                                        Reject Applicant
                                                    </button>
                                                    <button onClick={() => handleApplicationAction(app.id, app.applicantId, 'hired')} className="flex-1 py-2.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 text-sm font-bold transition-colors">
                                                        Hire Applicant
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* INVITE VIEW (OWNER ONLY) */}
                    {view === 'invite' && (
                        <div className="p-6 animate-in slide-in-from-right duration-300">
                            <button onClick={() => setView('details')} className="mb-6 text-sm text-muted hover:text-main flex items-center gap-2 transition-colors group">
                                <window.Icon name="arrow-left" size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Details
                            </button>
                            <h3 className="text-xl font-bold mb-6 text-main flex items-center gap-3">
                                <window.Icon name="user-plus" size={24} className="text-primary" /> Invite Crew Members
                            </h3>

                            {myCrew.length === 0 ? (
                                <div className="text-center py-12 bg-glass border border-divider-strong rounded-2xl">
                                    <window.Icon name="users" size={48} className="text-slate-600 mb-4 mx-auto opacity-50" />
                                    <h4 className="text-lg font-bold text-main mb-1">No crew available to invite</h4>
                                    <p className="text-sm text-muted">Makers already in the project are hidden. Add more people to your network first!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {myCrew.map(member => (
                                        <div key={member.id} className="bg-glass border border-divider-strong rounded-2xl p-5 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-accent to-purple-500 text-white font-bold flex items-center justify-center text-lg">{member.displayName ? member.displayName[0].toUpperCase() : '?'}</div>
                                            <div className="overflow-hidden flex-1">
                                                <h4 className="font-bold text-main truncate">{member.displayName}</h4>
                                                <p className="text-xs text-muted font-mono truncate">{member.id}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleSendProjectInvite(member.id, member.displayName)}
                                                disabled={invitingId === member.id}
                                                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50"
                                            >
                                                {invitingId === member.id ? 'Sending...' : 'Invite'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MANAGE CREW VIEW (OWNER ONLY) */}
                    {view === 'manage_crew' && (
                        <div className="p-6 animate-in slide-in-from-right duration-300">
                            <button onClick={() => setView('details')} className="mb-6 text-sm text-muted hover:text-main flex items-center gap-2 transition-colors group">
                                <window.Icon name="arrow-left" size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Details
                            </button>
                            <h3 className="text-xl font-bold mb-6 text-main flex items-center gap-3">
                                <window.Icon name="users" size={24} className="text-primary" /> Manage Active Crew
                            </h3>

                            {projectCrew.length === 0 ? (
                                <div className="text-center py-12 bg-glass border border-divider-strong rounded-2xl">
                                    <window.Icon name="users" size={48} className="text-slate-600 mb-4 mx-auto opacity-50" />
                                    <h4 className="text-lg font-bold text-main mb-1">No crew members yet</h4>
                                    <p className="text-sm text-muted">Invite friends or hire applicants to build your team.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {projectCrew.map(member => (
                                        <div key={member.id} className="bg-glass border border-divider-strong rounded-2xl p-5 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-accent to-purple-500 text-white font-bold flex items-center justify-center text-lg">{member.displayName ? member.displayName[0].toUpperCase() : '?'}</div>
                                            <div className="overflow-hidden flex-1">
                                                <h4 className="font-bold text-main truncate">{member.displayName}</h4>
                                                <p className="text-xs text-muted font-mono truncate">{member.networkId || member.id}</p>
                                                
                                                {/* Find out if they hold a specific role */}
                                                {(project.roles && project.roles.find(r => r.assigneeId === member.id)) && (
                                                     <span className="inline-block mt-2 text-[10px] bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                                         {project.roles.find(r => r.assigneeId === member.id).title}
                                                     </span>
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveCrewMember(member.id)}
                                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-sm font-bold rounded-xl transition-all"
                                                title="Remove from Project"
                                            >
                                                <window.Icon name="user-minus" size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* CHAT VIEW */}
                    {view === 'chat' && (
                        <div className="flex flex-col h-full animate-in slide-in-from-right duration-300 relative">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')]"></div>

                            <div className="px-6 py-4 border-b border-divider flex items-center bg-glass sticky top-0 z-10 backdrop-blur-md shadow-sm">
                                <button onClick={() => initialView === 'chat' ? onClose() : setView('details')} className="w-8 h-8 flex items-center justify-center rounded-full bg-glass hover:bg-glass hover:brightness-110 text-muted hover:text-main transition-all mr-4 group">
                                    <window.Icon name="arrow-left" size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                                </button>
                                <div>
                                    <span className="block text-sm font-bold text-main">
                                        { (!project.chatId || project.chatId.startsWith('team_')) ? `${project.title || project.projectTitle} (Team Chat)` : (chatPartner ? chatPartner.displayName : 'Live Channel') }
                                    </span>
                                    {(!project.chatId || project.chatId.startsWith('team_')) ? (
                                        <span className="block text-xs text-primary flex items-center gap-1">
                                            <window.Icon name="users" size={10} /> Active Team Communications
                                        </span>
                                    ) : ( chatPartner ? (
                                        (() => {
                                            // Calculate Online Status based on lastSeen heartbeat (2 min threshold)
                                            let isOnline = false;
                                            if (chatPartner.lastSeen) {
                                                const lastSeen = chatPartner.lastSeen.toDate ? chatPartner.lastSeen.toDate() : new Date(chatPartner.lastSeen);
                                                const now = new Date();
                                                const diffMinutes = (now - lastSeen) / 1000 / 60;
                                                isOnline = diffMinutes < 2;
                                            } else if (chatPartner.isOnline) {
                                                // Fallback to boolean if lastSeen is missing
                                                isOnline = true;
                                            }

                                            return (
                                                <span className={`block text-xs flex items-center gap-1 ${isOnline ? 'text-green-400' : 'text-muted/70'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`}></span>
                                                    {isOnline ? 'Online' : 'Offline'}
                                                </span>
                                            );
                                        })()
                                    ) : (
                                        <span className="block text-xs text-green-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Connecting...
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 p-6 space-y-6 overflow-y-auto pb-28 custom-scrollbar">
                                {chatMessages.length === 0 ? (
                                    <div className="h-64 flex flex-col items-center justify-center text-muted/70 text-sm opacity-60">
                                        <div className="w-16 h-16 rounded-full bg-glass flex items-center justify-center mb-4">
                                            <window.Icon name="message-square" size={32} />
                                        </div>
                                        <p>Initialize communication sequence...</p>
                                    </div>
                                ) : (
                                    chatMessages.map((msg, idx) => {
                                        const isMe = msg.senderId === user.uid;
                                        // Check if previous message was from same sender
                                        const isSequence = idx > 0 && chatMessages[idx - 1].senderId === msg.senderId;

                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                                {!isMe && !isSequence && (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex-shrink-0 mr-3 flex items-center justify-center text-xs font-bold text-main shadow-lg mt-1">
                                                        {msg.senderName ? msg.senderName[0].toUpperCase() : '?'}
                                                    </div>
                                                )}
                                                {!isMe && isSequence && <div className="w-8 mr-3"></div>}

                                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                                     <div className={`px-5 py-3 text-sm leading-relaxed shadow-lg backdrop-blur-md transition-all hover:shadow-xl ${isMe
                                                        ? 'bg-gradient-to-tr from-primary via-[#7c3aed] to-secondary text-white rounded-2xl rounded-tr-sm'
                                                        : 'bg-glass hover:brightness-110 border border-divider text-main rounded-2xl rounded-tl-sm'
                                                        } ${isSequence ? 'mt-1' : ''}`}>
                                                        {msg.text}
                                                    </div>

                                                    {!isSequence && (
                                                        <span className={`text-[10px] text-muted/70 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                                            {msg.senderName || 'Unknown'} • {msg.createdAt && msg.createdAt.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                                        </span>
                                                    )}
                                                </div>

                                                {isMe && !isSequence && (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex-shrink-0 ml-3 flex items-center justify-center text-xs font-bold text-main shadow-lg mt-1">
                                                        {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                                                    </div>
                                                )}
                                                {isMe && isSequence && <div className="w-8 ml-3"></div>}
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Floating Input Area */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-surface via-surface/90 to-transparent pt-12">
                                <form onSubmit={handleSendMessage} className="flex gap-3 relative max-w-2xl mx-auto bg-glass backdrop-blur-xl border border-divider-strong p-2 rounded-full shadow-2xl ring-1 ring-white/5">
                                    <button type="button" className="p-3 rounded-full text-muted hover:text-main hover:bg-glass hover:brightness-110 transition-colors">
                                        <window.Icon name="plus" size={20} />
                                    </button>
                                    <input
                                        type="text"
                                        className="flex-1 bg-transparent border-none text-main focus:ring-0 placeholder:text-muted/70"
                                        placeholder="Type your message..."
                                        value={chatInput} onChange={e => setChatInput(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="bg-primary hover:bg-primary/90 text-white p-3 rounded-full shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95"
                                    >
                                        <window.Icon name="arrow-right" size={20} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

window.ProjectDetailsModal = ProjectDetailsModal;
