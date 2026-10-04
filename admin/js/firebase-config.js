// Firebase Configuration - Master Database
const firebaseConfig = {
    apiKey: "AIzaSyCF9kGEKBk6L5btxclVsfyeHA3TNYGw_0U",
    authDomain: "projectpals-66223.firebaseapp.com",
    projectId: "projectpals-66223",
    storageBucket: "projectpals-66223.firebasestorage.app",
    messagingSenderId: "755356209640",
    appId: "1:755356209640:web:9da5a884f57c734d22945d",
    measurementId: "G-MNCC9NQ114"
};

// Security: no direct database apps, public shards, or persistent Firestore caches.
const masterApp = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(masterApp);
const dataClient = window.createSecureDataClient(auth);
window.auth = auth;
window.db = dataClient.db;
window.masterDb = dataClient.masterDb;
window.shardDbs = dataClient.shardDbs;
window.secureFieldValue = dataClient.secureFieldValue;
window.secureApi = dataClient.requestApi;
window.getPortalAccess = () => dataClient.requestApi({kind: 'access'});
// Earlier versions wrote origin-local IndexedDB caches. Remove only this app's
// Firestore databases; ask the user to close old tabs if a connection blocks cleanup.
const cacheCleanup = (async () => {
    if (!window.indexedDB || !window.indexedDB.databases) return;
    const projects = ['projectpals-66223', 'projectpals-shard-1', 'projectpals-shard-2', 'projectpals-shard-3', 'projectpals-shard-4'];
    const databases = await window.indexedDB.databases();
    for (const {name} of databases) if (name && name.startsWith('firestore/') && projects.some(id => name.includes('/' + id + '/'))) {
        await new Promise((resolve, reject) => {
            const request = window.indexedDB.deleteDatabase(name);
            request.onsuccess = resolve;
            request.onerror = () => reject(new Error('Unable to clear earlier private-data cache.'));
            request.onblocked = () => reject(new Error('Close other ProjectPals tabs, then reload to clear the earlier private-data cache.'));
        });
    }
})();
cacheCleanup.catch(() => {}); // Handled by each portal's authentication bootstrap.
window.initializeUserShard = async () => {
    await cacheCleanup;
    const access = await dataClient.initializeUserShard();
    window.userShardId = access.shard;
    return access;
};

window.db = dataClient.masterDb; // Administration explicitly chooses a database.
