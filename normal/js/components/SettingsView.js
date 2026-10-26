const SettingsView = ({ user }) => {
    const [activeTab, setActiveTab] = React.useState('profile');
    const [name, setName] = React.useState(user.displayName || '');
    const [isSaving, setIsSaving] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const shortId = user.uid.substring(0, 8).toUpperCase();

    React.useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
    }, [user.uid]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage('');
        try {
            await user.updateProfile({
                displayName: name
            });
            // Update the display name in Firestore
            await window.db.collection('users').doc(user.uid).set({ 
                displayName: name 
            }, { merge: true });
            
            // Also notify dashboard to re-render or let it rely on reload. We can mock for now.
            setMessage('Profile updated successfully! Refresh to see changes globally.');
        } catch (error) {
            setMessage('Failed to update profile: ' + error.message);
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handlePasswordReset = async () => {
        try {
            await firebase.auth().sendPasswordResetEmail(user.email);
            alert('Password reset email sent!');
        } catch (error) {
            alert('Error sending reset email: ' + error.message);
        }
    };

    const tabs = [
        { id: 'profile', icon: 'user', label: 'Profile' },
        { id: 'preferences', icon: 'sliders', label: 'Preferences' },
        { id: 'security', icon: 'shield', label: 'Security' }
    ];

    return (
        <div className="max-w-5xl mx-auto h-full flex flex-col w-full">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-main mb-2">Settings</h2>
                <p className="text-muted">Manage your account and preferences.</p>
            </header>

            <div className="flex flex-col md:flex-row gap-8 flex-1 pb-10">
                {/* Settings Sidebar */}
                <div className="w-full md:w-64 space-y-2 shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                activeTab === tab.id
                                    ? 'bg-primary/20 border border-primary/30 text-primary dark:text-white shadow-lg shadow-primary/10'
                                    : 'text-muted hover:bg-glass hover:text-main border border-transparent'
                            }`}
                        >
                            <window.Icon name={tab.icon} size={18} className={activeTab === tab.id ? 'text-primary' : 'text-muted/70'} />
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Settings Content */}
                <div className="flex-1 bg-glass backdrop-blur-xl border border-divider-strong rounded-3xl p-6 md:p-8 min-h-[500px]">
                    {activeTab === 'profile' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-xl font-bold text-main mb-6 border-b border-divider-strong pb-4">Profile Information</h3>
                            
                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-accent to-purple-500 flex items-center justify-center text-3xl font-bold shadow-xl border-4 border-[#1A1A2E]">
                                    {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                                </div>
                                <div>
                                    <button className="px-4 py-2 bg-glass hover:brightness-110 hover:bg-white/20 text-main rounded-lg text-sm font-medium transition-colors mb-2">
                                        Change Avatar
                                    </button>
                                    <p className="text-xs text-muted">JPG, GIF or PNG. Max size of 800K</p>
                                </div>
                            </div>

                            <form onSubmit={handleSaveProfile} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Display Name</label>
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-background/50 border border-divider-strong text-main rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={user.email}
                                        disabled
                                        className="w-full bg-black/20 border border-divider text-muted rounded-xl px-4 py-3 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-muted/70 mt-2">Email cannot be changed directly here.</p>
                                </div>

                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="flex items-center justify-between relative z-10">
                                        <div>
                                            <h4 className="text-sm font-bold text-main mb-1 flex items-center gap-2"><window.Icon name="fingerprint" size={14} className="text-primary"/> Network ID</h4>
                                            <p className="text-xl text-primary font-mono tracking-widest">{shortId}</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => { navigator.clipboard.writeText(shortId); alert("Copied Network ID!"); }}
                                            className="px-4 py-2 bg-glass hover:bg-white/10 border border-divider-strong rounded-lg text-sm font-medium text-main transition-colors flex items-center gap-2"
                                        >
                                            <window.Icon name="copy" size={16} /> Copy
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-muted/70 mt-2 relative z-10">Share this short ID with other makers to connect with them faster.</p>
                                </div>
                                <div className="pt-4 border-t border-divider-strong flex items-center justify-between">
                                    <span className={`text-sm ${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                                        {message}
                                    </span>
                                    <button 
                                        type="submit" 
                                        disabled={isSaving}
                                        className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSaving ? <><window.Icon name="loader" className="animate-spin" size={16} /> Saving...</> : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-xl font-bold text-main mb-6 border-b border-divider-strong pb-4">Application Preferences</h3>
                            
                            <div className="space-y-6">
                                {/* Theme toggle mockup */}
                                <div className="flex items-center justify-between p-4 bg-glass rounded-xl border border-divider hover:border-divider-strong transition-colors">
                                    <div>
                                        <h4 className="text-main font-medium mb-1">Theme</h4>
                                        <p className="text-sm text-muted">Customize the appearance of the application.</p>
                                    </div>
                                    <div className="flex bg-background rounded-lg p-1 border border-divider-strong">
                                        <button onClick={() => window.currentTheme !== 'dark' && window.toggleTheme()} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${window.currentTheme === 'dark' ? 'bg-glass text-main shadow-sm' : 'text-muted hover:text-main'}`}>Dark</button>
                                        <button onClick={() => window.currentTheme === 'dark' && window.toggleTheme()} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${window.currentTheme !== 'dark' ? 'bg-glass text-main shadow-sm' : 'text-muted hover:text-main'}`}>Light</button>
                                    </div>
                                </div>
                                
                                {/* Notification toggle mockups */}
                                <div className="flex items-center justify-between p-4 bg-glass rounded-xl border border-divider hover:border-divider-strong transition-colors">
                                    <div>
                                        <h4 className="text-main font-medium mb-1">Email Notifications</h4>
                                        <p className="text-sm text-muted">Receive emails about activity in your projects.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-glass rounded-xl border border-divider hover:border-divider-strong transition-colors">
                                    <div>
                                        <h4 className="text-main font-medium mb-1">Chat Notifications</h4>
                                        <p className="text-sm text-muted">Receive alerts when someone sends you a message.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-xl font-bold text-main mb-6 border-b border-divider-strong pb-4">Security Settings</h3>
                            
                            <div className="space-y-6">
                                <div className="p-4 bg-glass rounded-xl border border-divider">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="text-main font-medium mb-1">Change Password</h4>
                                            <p className="text-sm text-muted">Ensure your account is using a long, random password to stay secure.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handlePasswordReset}
                                        className="bg-glass hover:brightness-110 hover:bg-white/20 text-main px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Send Password Reset Email
                                    </button>
                                </div>

                                <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20">
                                    <h4 className="text-red-400 font-medium mb-1">Danger Zone</h4>
                                    <p className="text-sm text-red-400/70 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                                    <button className="bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 px-4 py-2 rounded-lg text-sm font-medium transition-colors group flex items-center gap-2">
                                        <window.Icon name="trash-2" size={16} className="group-hover:animate-pulse" />
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

window.SettingsView = SettingsView;
