const Dashboard = ({ user, onLogout }) => {
    const [view, setView] = React.useState('list'); // 'list' | 'create'
    const [selectedEventId, setSelectedEventId] = React.useState(null);

    return (
        <div className="flex h-screen bg-[#0B0B15] text-white">
            {/* Sidebar */}
            <div className="w-64 bg-[#11111E] border-r border-white/10 flex flex-col">
                <div className="p-6 border-b border-white/10">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">ProjectPals Events</h1>
                    <p className="text-xs text-gray-400 mt-1">Admin Portal</p>
                </div>
                <nav className="p-4 flex-1 space-y-2">
                    <button 
                        onClick={() => { setView('list'); setSelectedEventId(null); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'list' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}`}
                    >
                        <window.Icon name="list" size={18} />
                        All Events
                    </button>
                    <button 
                        onClick={() => { setView('create'); setSelectedEventId(null); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'create' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}`}
                    >
                        <window.Icon name="plus-circle" size={18} />
                        Create Event
                    </button>
                </nav>
                <div className="p-4 border-t border-white/10">
                    <div className="text-sm text-gray-400 mb-4 px-2 truncate">{user.email}</div>
                    <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <window.Icon name="log-out" size={16} /> Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {view === 'create' && <window.EventForm onSaved={() => setView('list')} />}
                {view === 'list' && !selectedEventId && <window.EventMonitor onSelectEvent={(id) => setSelectedEventId(id)} />}
                {view === 'list' && selectedEventId && <window.EventMonitor eventId={selectedEventId} onBack={() => setSelectedEventId(null)} />}
            </div>
        </div>
    );
};

window.Dashboard = Dashboard;
