const EventForm = ({ onSaved }) => {
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [date, setDate] = React.useState('');
    const [time, setTime] = React.useState('');
    const [location, setLocation] = React.useState('');
    const [requiresRegistration, setRequiresRegistration] = React.useState(false);
    const [customFields, setCustomFields] = React.useState([]);
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
    }, [customFields]);

    const addField = () => {
        setCustomFields([...customFields, { id: Date.now().toString(), label: '', type: 'text', required: true }]);
    };

    const updateField = (id, key, value) => {
        setCustomFields(customFields.map(f => f.id === id ? { ...f, [key]: value } : f));
    };

    const removeField = (id) => {
        setCustomFields(customFields.filter(f => f.id !== id));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const eventData = {
                title,
                description,
                date,
                time,
                location,
                requiresRegistration,
                customFields: requiresRegistration ? customFields : [],
                createdAt: new Date()
            };
            await window.db.collection('events').add(eventData);
            alert("Event Created Successfully!");
            onSaved();
        } catch (err) {
            alert("Error creating event: " + err.message);
        }
        setIsSaving(false);
    };

    return (
        <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 border-b border-white/10 pb-4">Create New Event</h2>
            
            <form onSubmit={handleSave} className="space-y-6 bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Event Title</label>
                        <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500" placeholder="e.g. Annual Tech Symposium" />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea required value={description} onChange={e => setDescription(e.target.value)} rows="4" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500" placeholder="Details about the event..."></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                        <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Time</label>
                        <input type="time" required value={time} onChange={e => setTime(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500" />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Location (or Link)</label>
                        <input type="text" required value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500" placeholder="Room 101 or Zoom Link" />
                    </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                    <label className="flex items-center gap-3 cursor-pointer p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                        <div className="relative">
                            <input type="checkbox" className="sr-only" checked={requiresRegistration} onChange={e => setRequiresRegistration(e.target.checked)} />
                            <div className={`block w-14 h-8 rounded-full transition-colors ${requiresRegistration ? 'bg-purple-500' : 'bg-gray-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${requiresRegistration ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                        <div>
                            <div className="font-bold text-white">Require Registration</div>
                            <div className="text-sm text-gray-400">Turn this on to collect student details via a custom form.</div>
                        </div>
                    </label>
                </div>

                {requiresRegistration && (
                    <div className="space-y-4 p-6 bg-black/30 border border-white/10 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">Custom Registration Form</h3>
                            <button type="button" onClick={addField} className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                                <window.Icon name="plus" size={16} /> Add Field
                            </button>
                        </div>

                        {customFields.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No custom fields added. Just standard registration will be used.</p>}

                        {customFields.map((field, index) => (
                            <div key={field.id} className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                                <div className="flex-1 space-y-4">
                                    <input type="text" value={field.label} onChange={e => updateField(field.id, 'label', e.target.value)} placeholder="Field Label (e.g. Roll Number)" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" required />
                                    <div className="flex gap-4">
                                        <select value={field.type} onChange={e => updateField(field.id, 'type', e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
                                            <option value="text">Short Answer</option>
                                            <option value="dropdown">Dropdown (Year/Branch)</option>
                                        </select>
                                        <label className="flex items-center gap-2 text-sm text-gray-300">
                                            <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, 'required', e.target.checked)} className="rounded border-gray-600 bg-gray-800" />
                                            Required
                                        </label>
                                    </div>
                                    {field.type === 'dropdown' && (
                                        <input type="text" value={field.options || ''} onChange={e => updateField(field.id, 'options', e.target.value)} placeholder="Comma-separated options (e.g. First Year, Second Year)" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" required />
                                    )}
                                </div>
                                <button type="button" onClick={() => removeField(field.id)} className="text-red-400 hover:bg-red-500/20 p-2 rounded-lg">
                                    <window.Icon name="trash-2" size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <button type="submit" disabled={isSaving} className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50">
                        {isSaving ? 'Publishing...' : 'Publish Event'}
                    </button>
                </div>
            </form>
        </div>
    );
};

window.EventForm = EventForm;
