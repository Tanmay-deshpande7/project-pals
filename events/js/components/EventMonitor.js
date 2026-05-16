const EventMonitor = ({ eventId, onBack, onSelectEvent }) => {
    const [events, setEvents] = React.useState([]);
    const [event, setEvent] = React.useState(null);
    const [registrations, setRegistrations] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
    });

    React.useEffect(() => {
        setLoading(true);
        if (!eventId) {
            // Fetch all events
            const unsub = window.db.collection('events').orderBy('createdAt', 'desc').onSnapshot(snap => {
                setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });
            return () => unsub();
        } else {
            // Fetch specific event and its registrations
            const unsubEvent = window.db.collection('events').doc(eventId).onSnapshot(doc => {
                if (doc.exists) setEvent({ id: doc.id, ...doc.data() });
            });
            
            const unsubReg = window.db.collection('events').doc(eventId).collection('registrations').onSnapshot(snap => {
                setRegistrations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });
            return () => { unsubEvent(); unsubReg(); };
        }
    }, [eventId]);

    const handleRemoveRegistration = async (regId) => {
        if (confirm("Are you sure you want to remove this student's registration?")) {
            await window.db.collection('events').doc(eventId).collection('registrations').doc(regId).delete();
        }
    };

    const handleDeleteEvent = async (id) => {
        if (confirm("Delete this event entirely?")) {
            await window.db.collection('events').doc(id).delete();
            if (eventId === id) onBack();
        }
    };

    if (loading) return <div className="text-purple-400">Loading data...</div>;

    if (!eventId) {
        return (
            <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-8 border-b border-white/10 pb-4">All Active Events</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.length === 0 && <p className="text-gray-500">No events found.</p>}
                    {events.map(ev => (
                        <div key={ev.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors cursor-pointer group flex flex-col h-full" onClick={() => onSelectEvent(ev.id)}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-purple-500/20 text-purple-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    {ev.requiresRegistration ? 'Registration' : 'Info Only'}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id); }} className="text-gray-500 hover:text-red-400 transition-colors">
                                    <window.Icon name="trash-2" size={16} />
                                </button>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{ev.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                                <window.Icon name="calendar" size={14} /> {ev.date} at {ev.time}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400 flex-1">
                                <window.Icon name="map-pin" size={14} /> <span className="truncate">{ev.location}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!event) return null;

    return (
        <div className="max-w-5xl mx-auto">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
                <window.Icon name="arrow-left" size={20} /> Back to Events
            </button>
            
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">{event.title}</h2>
                <p className="text-gray-400 mb-6">{event.description}</p>
                <div className="flex flex-wrap gap-6 text-sm text-gray-300">
                    <span className="flex items-center gap-2"><window.Icon name="calendar" size={16} className="text-purple-400" /> {event.date}</span>
                    <span className="flex items-center gap-2"><window.Icon name="clock" size={16} className="text-purple-400" /> {event.time}</span>
                    <span className="flex items-center gap-2"><window.Icon name="map-pin" size={16} className="text-purple-400" /> {event.location}</span>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Registered Students ({registrations.length})</h3>
                <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <window.Icon name="download" size={16} /> Export CSV
                </button>
            </div>

            {!event.requiresRegistration ? (
                <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                    <window.Icon name="info" size={48} className="text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">This event does not collect registrations.</p>
                </div>
            ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="p-4 text-sm font-semibold text-gray-300">Name</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300">Email</th>
                                    {event.customFields && event.customFields.map(f => (
                                        <th key={f.id} className="p-4 text-sm font-semibold text-gray-300">{f.label}</th>
                                    ))}
                                    <th className="p-4 text-sm font-semibold text-gray-300 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {registrations.length === 0 && (
                                    <tr><td colSpan="100%" className="p-8 text-center text-gray-500">No students registered yet.</td></tr>
                                )}
                                {registrations.map(reg => (
                                    <tr key={reg.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-sm text-white font-medium">{reg.userName || 'Unknown'}</td>
                                        <td className="p-4 text-sm text-gray-400">{reg.userEmail || 'Unknown'}</td>
                                        {event.customFields && event.customFields.map(f => (
                                            <td key={f.id} className="p-4 text-sm text-gray-300">{reg.customAnswers ? reg.customAnswers[f.id] : '-'}</td>
                                        ))}
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleRemoveRegistration(reg.id)} className="text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition-colors" title="Remove Registration">
                                                <window.Icon name="user-minus" size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

window.EventMonitor = EventMonitor;
