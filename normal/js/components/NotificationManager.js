// ── Global Audio Context Singleton ──────────────────────────────────────────
let globalAudioCtx = null;

const initGlobalAudio = () => {
    if (!globalAudioCtx) {
        try {
            globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn("AudioContext not supported", e);
        }
    }
    return globalAudioCtx;
};

const unlockGlobalAudio = () => {
    const ctx = initGlobalAudio();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => console.log("Global AudioContext resumed"));
    }
    document.removeEventListener('click', unlockGlobalAudio);
    document.removeEventListener('keydown', unlockGlobalAudio);
    document.removeEventListener('touchstart', unlockGlobalAudio);
};

// Bind early to catch the very first user interaction
if (typeof document !== 'undefined') {
    document.addEventListener('click', unlockGlobalAudio);
    document.addEventListener('keydown', unlockGlobalAudio);
    document.addEventListener('touchstart', unlockGlobalAudio);
}

// Global play function accessible anywhere, anytime
window.playNotificationSound = () => {
    const ctx = globalAudioCtx;
    if (!ctx) {
        console.log("AudioContext not initialized yet. Skipping sound.");
        return;
    }

    const doPlay = () => {
        try {
            console.log("Playing message notification chime!");
            const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 chord
            frequencies.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                const t = ctx.currentTime + i * 0.13;
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.3, t + 0.02); // Louder
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
                osc.start(t);
                osc.stop(t + 0.5);
            });
        } catch (e) {
            console.warn("Chime play failed:", e);
        }
    };

    if (ctx.state === 'suspended') {
        ctx.resume().then(doPlay).catch(e => console.warn("AudioContext resume failed:", e));
    } else {
        doPlay();
    }
};

const NotificationManager = ({ user }) => {
    const [notifications, setNotifications] = React.useState([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [panelOpen, setPanelOpen] = React.useState(false);
    const [permissionGranted, setPermissionGranted] = React.useState(false);
    // Panel position (computed from button rect so it's always on-screen)
    const [panelPos, setPanelPos] = React.useState({ top: 0, right: 0 });
    const isInitialLoad = React.useRef(true);
    const panelRef = React.useRef(null);
    const bellRef = React.useRef(null);
    // No longer handling AudioContext here, it's global now!

    // ── Request browser notification permission ──────────────────────────────
    React.useEffect(() => {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                setPermissionGranted(true);
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(perm => {
                    setPermissionGranted(perm === 'granted');
                });
            }
        }
    }, []);

    // ── Subscribe to Firestore notifications ─────────────────────────────────
    React.useEffect(() => {
        if (!user) return;

        const unsub = window.db
            .collection('users').doc(user.uid)
            .collection('notifications')
            .orderBy('createdAt', 'desc')
            .limit(30)
            .onSnapshot(snapshot => {
                const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                const unread = docs.filter(n => !n.read).length;
                setNotifications(docs);
                setUnreadCount(unread);

                // Skip everything on initial page load
                if (isInitialLoad.current) {
                    isInitialLoad.current = false;
                    return;
                }

                // Fire on genuinely NEW unread notifications
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added' && !change.doc.data().read) {
                        const n = change.doc.data();
                        if (permissionGranted && 'Notification' in window) {
                            try {
                                const desktop = new Notification(`ProjectPals — ${n.title}`, {
                                    body: n.body,
                                    icon: '/assets/icons/logo.svg',
                                    tag: change.doc.id,
                                });
                                desktop.onclick = () => {
                                    window.focus();
                                    setPanelOpen(true);
                                    desktop.close();
                                };
                            } catch (e) { /* Notification API blocked */ }
                        }
                    }
                });
            }, err => console.warn('Notification listener error:', err));

        return () => unsub();
    }, [user, permissionGranted]);

    // ── Close panel on outside click ─────────────────────────────────────────
    React.useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target) &&
                bellRef.current && !bellRef.current.contains(e.target)) {
                setPanelOpen(false);
            }
        };
        if (panelOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [panelOpen]);

    // ── Compute panel position from bell button rect (fixed, always on-screen) ─
    const openPanel = () => {
        if (bellRef.current) {
            const rect = bellRef.current.getBoundingClientRect();
            const panelWidth = 360;
            const viewportWidth = window.innerWidth;

            // Place below the bell, flush right of it — but clamp so it stays on screen
            let left = rect.right - panelWidth;
            if (left < 8) left = 8; // too far left
            if (left + panelWidth > viewportWidth - 8) left = viewportWidth - panelWidth - 8;

            setPanelPos({ top: rect.bottom + 8, left });
        }
        setPanelOpen(prev => !prev);
    };

    // ── Mark all as read ─────────────────────────────────────────────────────
    const markAllRead = async () => {
        const batch = window.db.batch();
        notifications
            .filter(n => !n.read)
            .forEach(n => {
                batch.update(
                    window.db.collection('users').doc(user.uid)
                        .collection('notifications').doc(n.id),
                    { read: true }
                );
            });
        await batch.commit().catch(() => {});
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const iconFor = (type) => {
        if (type === 'crew_request') return 'user-plus';
        if (type === 'hired') return 'check-circle';
        if (type === 'application_update') return 'inbox';
        return 'bell';
    };
    const colorFor = (type) => {
        if (type === 'crew_request') return 'text-primary';
        if (type === 'hired') return 'text-green-400';
        if (type === 'application_update') return 'text-accent';
        return 'text-muted';
    };
    const timeAgo = (ts) => {
        if (!ts || !ts.seconds) return '';
        const diff = Math.floor((Date.now() / 1000) - ts.seconds);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <>
            {/* Bell Button — ref used to compute dropdown position */}
            <button
                id="notif-bell-btn"
                ref={bellRef}
                onClick={() => { openPanel(); if (!panelOpen) markAllRead(); }}
                className="relative p-2 rounded-xl hover:bg-glass hover:brightness-110 transition-all"
                aria-label="Notifications"
            >
                <window.Icon name="bell" size={22} className="text-muted hover:text-main transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel — rendered in a portal via fixed position so it's never clipped */}
            {panelOpen && ReactDOM.createPortal(
                <div
                    ref={panelRef}
                    style={{ position: 'fixed', top: panelPos.top, left: panelPos.left, zIndex: 9999, width: 360 }}
                    className="max-h-[480px] bg-surface border border-divider-strong rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-divider flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <window.Icon name="bell" size={14} className="text-primary" />
                            <h4 className="font-bold text-main text-sm">Notifications</h4>
                            {unreadCount > 0 && (
                                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">{unreadCount} new</span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={(e) => { e.stopPropagation(); window.playNotificationSound(); }} 
                                className="text-[10px] text-muted hover:text-primary transition-colors flex items-center gap-1"
                                title="Test Notification Sound"
                            >
                                <window.Icon name="volume-2" size={12} />
                                Test Sound
                            </button>
                            {unreadCount > 0 && (
                                <button onClick={markAllRead} className="text-xs text-primary hover:text-primary/70 font-medium transition-colors">
                                    Mark all read
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                                <window.Icon name="bell" size={36} className="text-muted/30 mb-3" />
                                <p className="text-sm font-medium text-main">All clear!</p>
                                <p className="text-xs text-muted mt-1">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} className={`flex gap-3 px-5 py-4 border-b border-divider last:border-0 hover:bg-glass transition-colors ${!n.read ? 'bg-primary/5' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${!n.read ? 'bg-primary/15' : 'bg-glass'}`}>
                                        <window.Icon name={iconFor(n.type)} size={15} className={colorFor(n.type)} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold leading-tight ${!n.read ? 'text-main' : 'text-muted'}`}>{n.title}</p>
                                        <p className="text-xs text-muted mt-0.5 leading-relaxed">{n.body}</p>
                                        <p className="text-[10px] text-muted/50 mt-1">{timeAgo(n.createdAt)}</p>
                                    </div>
                                    {!n.read && (
                                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2 animate-pulse" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

window.NotificationManager = NotificationManager;
