const EventsView = ({ user }) => {
    const [events, setEvents] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedEvent, setSelectedEvent] = React.useState(null); // For modal

    React.useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
    });

    React.useEffect(() => {
        const unsub = window.db.collection('events').orderBy('createdAt', 'desc').onSnapshot(snap => {
            const allEvents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Only show active events
            setEvents(allEvents.filter(ev => !ev.isArchived));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const openEvent = (ev) => {
        setSelectedEvent(ev);
    };

    return (
        <div className="bg-glass backdrop-blur-xl border border-divider-strong rounded-3xl overflow-hidden shadow-xl max-w-6xl mx-auto min-h-[80vh] flex flex-col">
            <div className="h-48 w-full relative">
                <img src="/assets/events_banner.png" alt="Events" className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
                <div className="absolute bottom-6 left-8 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-black/50 flex items-center justify-center backdrop-blur-md border border-white/20 overflow-hidden shadow-lg p-3">
                        <img src="/assets/events_logo.png" alt="Events Logo" className="w-full h-full object-contain" />
                    </div>
                    <h2 className="text-4xl font-bold text-white drop-shadow-lg">College Events</h2>
                </div>
            </div>
            
            <div className="p-8 flex-1">
                {loading ? (
                <div className="text-center py-20 text-muted animate-pulse">Loading events...</div>
            ) : events.length === 0 ? (
                <div className="text-center py-20">
                    <window.Icon name="calendar-clock" size={64} className="text-slate-600 mb-6 mx-auto opacity-50" />
                    <h3 className="text-2xl font-bold text-main mb-3">No Upcoming Events</h3>
                    <p className="text-muted text-lg max-w-xl mx-auto">Check back later for exciting college events, hackathons, and cultural fests!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(ev => (
                        <div key={ev.id} onClick={() => openEvent(ev)} className="bg-background/50 border border-divider-strong rounded-3xl hover:bg-glass hover:border-primary/50 transition-all cursor-pointer group flex flex-col h-full shadow-lg hover:shadow-primary/10 overflow-hidden relative">
                            <div className="h-32 w-full relative">
                                {ev.bannerBase64 ? (
                                    <img src={ev.bannerBase64} alt="Banner" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-r from-primary/30 to-purple-500/30"></div>
                                )}
                            </div>
                            
                            <div className="px-6 pb-6 pt-12 flex-1 relative flex flex-col">
                                <div className="absolute -top-10 left-6 w-20 h-20 rounded-full border-4 border-background bg-black overflow-hidden flex items-center justify-center shadow-lg">
                                    {ev.pfpBase64 ? (
                                        <img src={ev.pfpBase64} alt="PFP" className="w-full h-full object-cover" />
                                    ) : (
                                        <window.Icon name="calendar" size={32} className="text-primary" />
                                    )}
                                </div>
                                
                                <div className="absolute top-3 right-6">
                                    <div className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${ev.requiresRegistration ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {ev.requiresRegistration ? 'Registration Open' : 'Informational'}
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold text-main mb-2 group-hover:text-primary transition-colors line-clamp-2">{ev.title}</h3>
                                <p className="text-muted text-sm line-clamp-3 mb-6 flex-1">{ev.description}</p>
                                
                                <div className="space-y-2 pt-4 border-t border-divider">
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <window.Icon name="calendar" size={16} className="text-primary/70" /> {ev.date} {ev.endDate && `to ${ev.endDate}`}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <window.Icon name="clock" size={16} className="text-primary/70" /> {ev.time}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <window.Icon name="map-pin" size={16} className="text-primary/70" /> <span className="truncate">{ev.location}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedEvent && <EventRegistrationModal event={selectedEvent} user={user} onClose={() => setSelectedEvent(null)} />}
            </div>
        </div>
    );
};

const EventRegistrationModal = ({ event, user, onClose }) => {
    const [answers, setAnswers] = React.useState({});
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [hasRegistered, setHasRegistered] = React.useState(false);
    const [checkingStatus, setCheckingStatus] = React.useState(true);

    React.useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
        
        // Check if already registered
        if (event.requiresRegistration) {
            window.db.collection('events').doc(event.id).collection('registrations').where('userId', '==', user.uid).get().then(snap => {
                if (!snap.empty) setHasRegistered(true);
                setCheckingStatus(false);
            });
        } else {
            setCheckingStatus(false);
        }
    }, [event.id, user.uid]);

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await window.db.collection('events').doc(event.id).collection('registrations').add({
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                userEmail: user.email,
                customAnswers: answers,
                registeredAt: new Date()
            });
            setHasRegistered(true);
        } catch (err) {
            alert("Registration failed: " + err.message);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-background/90 backdrop-blur-xl border border-divider-strong rounded-3xl shadow-2xl p-0 w-full max-w-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                
                {/* Modal Header with Banner */}
                <div className="h-48 w-full relative flex-shrink-0">
                    {event.bannerBase64 ? (
                        <img src={event.bannerBase64} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-primary/30 to-purple-500/30"></div>
                    )}
                    
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors z-10 backdrop-blur-md border border-white/20">
                        <window.Icon name="x" size={24} />
                    </button>
                    
                    <div className="absolute -bottom-12 left-8 w-24 h-24 rounded-full border-4 border-background bg-black overflow-hidden flex items-center justify-center shadow-lg">
                        {event.pfpBase64 ? (
                            <img src={event.pfpBase64} alt="PFP" className="w-full h-full object-cover" />
                        ) : (
                            <window.Icon name="calendar" size={40} className="text-primary" />
                        )}
                    </div>
                </div>

                <div className="px-8 pt-16 pb-8 overflow-y-auto flex-1">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-3xl font-bold text-main leading-tight">{event.title}</h2>
                        <div className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex-shrink-0 ml-4 ${event.requiresRegistration ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'}`}>
                            {event.requiresRegistration ? 'Registration Required' : 'Informational'}
                        </div>
                    </div>
                    
                    <p className="text-lg text-slate-300 mb-8 whitespace-pre-wrap mt-4">{event.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-glass border border-divider-strong p-6 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><window.Icon name="calendar" className="text-primary" /></div>
                            <div><p className="text-xs text-muted font-bold uppercase">Date</p><p className="text-main font-medium">{event.date}</p></div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><window.Icon name="clock" className="text-primary" /></div>
                            <div><p className="text-xs text-muted font-bold uppercase">Time</p><p className="text-main font-medium">{event.time}</p></div>
                        </div>
                        <div className="flex items-center gap-3 md:col-span-2">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><window.Icon name="map-pin" className="text-primary" /></div>
                            <div><p className="text-xs text-muted font-bold uppercase">Location</p><p className="text-main font-medium">{event.location}</p></div>
                        </div>
                    </div>

                    {checkingStatus ? (
                        <div className="text-center py-4 text-muted animate-pulse">Checking registration status...</div>
                    ) : event.requiresRegistration ? (
                        hasRegistered ? (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <window.Icon name="check" size={32} className="text-green-400" />
                                </div>
                                <h3 className="text-xl font-bold text-green-400 mb-2">You are registered!</h3>
                                <p className="text-green-400/70 text-sm">We've saved your spot for this event. See you there!</p>
                            </div>
                        ) : (
                            <form onSubmit={handleRegister} className="bg-background/50 border border-divider-strong rounded-2xl p-6">
                                <h3 className="text-xl font-bold text-main mb-6 border-b border-divider pb-4">Registration Form</h3>
                                <div className="space-y-4 mb-6">
                                    {event.customFields && event.customFields.map(field => (
                                        <div key={field.id}>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                                {field.label} {field.required && <span className="text-red-400">*</span>}
                                            </label>
                                            {field.type === 'text' && (
                                                <input 
                                                    type="text" 
                                                    required={field.required}
                                                    onChange={e => setAnswers({...answers, [field.id]: e.target.value})}
                                                    className="w-full bg-background border border-divider-strong rounded-xl px-4 py-3 text-main focus:border-primary/50 focus:outline-none"
                                                />
                                            )}
                                            {field.type === 'dropdown' && (
                                                <select 
                                                    required={field.required}
                                                    onChange={e => setAnswers({...answers, [field.id]: e.target.value})}
                                                    className="w-full bg-background border border-divider-strong rounded-xl px-4 py-3 text-main focus:border-primary/50 focus:outline-none"
                                                >
                                                    <option value="">Select an option</option>
                                                    {field.options && field.options.split(',').map(opt => (
                                                        <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    ))}
                                    {(!event.customFields || event.customFields.length === 0) && (
                                        <p className="text-sm text-muted">No additional details required. Just click Register below!</p>
                                    )}
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/25 disabled:opacity-50 text-lg">
                                    {isSubmitting ? 'Registering...' : 'Complete Registration'}
                                </button>
                            </form>
                        )
                    ) : (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 text-center">
                            <window.Icon name="info" size={32} className="text-blue-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-blue-400 mb-2">No Registration Required</h3>
                            <p className="text-blue-400/70 text-sm">Just show up at the specified time and location!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

window.EventsView = EventsView;
