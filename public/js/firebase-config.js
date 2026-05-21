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

// Initialize Master App (Default App)
const masterApp = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(masterApp);
const masterDb = firebase.firestore(masterApp);

// Enable Offline Persistence on Master DB
try {
    masterDb.enablePersistence({ synchronizeTabs: true })
        .then(() => console.log("Offline persistence enabled for masterDb"))
        .catch(err => console.warn("Error enabling persistence for masterDb", err));
} catch (e) {
    console.warn("Exception enabling persistence for masterDb", e);
}

// Shard Configurations
const SHARD_CONFIGS = {
    "shard-1": {
        apiKey: "AIzaSyA2RnYS2G3Z4Twh8U9lo2vnTECvCZcJvbA",
        authDomain: "projectpals-shard-1.firebaseapp.com",
        projectId: "projectpals-shard-1",
        storageBucket: "projectpals-shard-1.firebasestorage.app",
        messagingSenderId: "899174051000",
        appId: "1:899174051000:web:ae16818ab51109c715184d",
        measurementId: "G-FTZFTSV9WR"
    },
    "shard-2": {
        apiKey: "AIzaSyCADg56owNILQY_hr6H7f9jYheWW5dHjfI",
        authDomain: "projectpals-shard-2.firebaseapp.com",
        projectId: "projectpals-shard-2",
        storageBucket: "projectpals-shard-2.firebasestorage.app",
        messagingSenderId: "935924727855",
        appId: "1:935924727855:web:277855a8adf311431806da",
        measurementId: "G-N3KJ45CZEZ"
    },
    "shard-3": {
        apiKey: "AIzaSyB-wSKCH9e9OnjiRvklcNVI01VqAEWKbII",
        authDomain: "projectpals-shard-3.firebaseapp.com",
        projectId: "projectpals-shard-3",
        storageBucket: "projectpals-shard-3.firebasestorage.app",
        messagingSenderId: "179641790566",
        appId: "1:179641790566:web:886b85396d21b12ff6fda7",
        measurementId: "G-BGBJ8NECB1"
    },
    "shard-4": {
        apiKey: "AIzaSyBpZ51nBS38vxdNklb1cYxSpPFrwslGwqg",
        authDomain: "projectpals-shard-4.firebaseapp.com",
        projectId: "projectpals-shard-4",
        storageBucket: "projectpals-shard-4.firebasestorage.app",
        messagingSenderId: "604965415098",
        appId: "1:604965415098:web:5a95a71564c58d9a437a83",
        measurementId: "G-9DH5ZH6YH8"
    }
};

// Global active database pointer
window.activeShardDb = null;
window.userShardId = null;

// Dynamic User Shard Connector
window.initializeUserShard = async (uid) => {
    try {
        console.log(`Connecting user ${uid} to shard...`);
        // 1. Fetch user document from Master Registry
        const userDocRef = masterDb.collection('users').doc(uid);
        const userDoc = await userDocRef.get();
        let shardId = userDoc.exists ? userDoc.data().shardId : null;

        if (!shardId) {
            // New user registration. Check if user is an admin.
            const adminSnap = await masterDb.collection('admins')
                .where('email', '==', auth.currentUser?.email || '')
                .limit(1)
                .get();
            
            if (!adminSnap.empty) {
                shardId = 'master'; // Admins default to master database
            } else {
                // Round-Robin or random distribution across shards 1 to 4
                const shardIds = ["shard-1", "shard-2", "shard-3", "shard-4"];
                shardId = shardIds[Math.floor(Math.random() * shardIds.length)];
            }

            // Save the selection in the Master Registry
            await userDocRef.set({
                shardId: shardId
            }, { merge: true });
        }

        window.userShardId = shardId;
        console.log(`User ${uid} mapped to Shard: ${shardId}`);

        // 2. Resolve database instance for the shard
        let shardDb;
        if (shardId === 'master') {
            shardDb = masterDb;
        } else {
            const appName = `shardApp_${shardId}`;
            let shardApp = firebase.apps.find(app => app.name === appName);
            if (!shardApp) {
                shardApp = firebase.initializeApp(SHARD_CONFIGS[shardId], appName);
                // Enable Offline Caching for the shard database
                try {
                    await shardApp.firestore().enablePersistence({ synchronizeTabs: true });
                    console.log(`Offline persistence enabled for shard ${shardId}`);
                } catch (err) {
                    console.warn(`Shard persistence warning for ${shardId}:`, err.message);
                }
            }
            shardDb = shardApp.firestore();
        }

        window.activeShardDb = shardDb;
        console.log(`Successfully connected active database shard: ${shardId}`);
    } catch (err) {
        console.error("Failed to initialize user shard database, falling back to master:", err);
        window.activeShardDb = masterDb;
        window.userShardId = 'master';
    }
};

// Custom ProxyBatch class to handle multi-db transactions seamlessly
class ProxyBatch {
    constructor() {
        this.batches = new Map();
    }

    getBatchForDoc(docRef) {
        const docDb = docRef.firestore;
        if (!this.batches.has(docDb)) {
            this.batches.set(docDb, docDb.batch());
        }
        return this.batches.get(docDb);
    }

    set(docRef, data, options) {
        const batch = this.getBatchForDoc(docRef);
        if (options) {
            batch.set(docRef, data, options);
        } else {
            batch.set(docRef, data);
        }
        return this;
    }

    update(docRef, ...args) {
        const batch = this.getBatchForDoc(docRef);
        batch.update(docRef, ...args);
        return this;
    }

    delete(docRef) {
        const batch = this.getBatchForDoc(docRef);
        batch.delete(docRef);
        return this;
    }

    commit() {
        const promises = Array.from(this.batches.values()).map(b => b.commit());
        return Promise.all(promises);
    }
}

// Collections partition config
const heavyCollections = new Set(['projects', 'events', 'applications', 'threads', 'messages', 'requests']);

function getDbForCollection(collectionPath) {
    const rootCollection = collectionPath.split('/')[0];
    if (heavyCollections.has(rootCollection)) {
        return window.activeShardDb || masterDb;
    }
    return masterDb;
}

// Proxied window.db to route reads/writes to correct database transparently
const dbProxy = new Proxy(masterDb, {
    get(target, prop, receiver) {
        if (prop === 'collection') {
            return function(collectionPath) {
                const targetDb = getDbForCollection(collectionPath);
                return targetDb.collection(collectionPath);
            };
        }
        if (prop === 'doc') {
            return function(documentPath) {
                const collectionPath = documentPath.split('/')[0];
                const targetDb = getDbForCollection(collectionPath);
                return targetDb.doc(documentPath);
            };
        }
        if (prop === 'batch') {
            return function() {
                return new ProxyBatch();
            };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
    }
});

// Optional: Analytics
if (firebase.analytics) {
    try {
        firebase.analytics();
    } catch (e) {
        console.warn("Analytics failed to load:", e);
    }
}

// Make services available globally for app.jsx
window.auth = auth;
window.db = dbProxy;
window.masterDb = masterDb; // In case we need raw master DB access (like in admin dashboard)

console.log("Firebase initialized with ProjectPals sharding load balancer");
