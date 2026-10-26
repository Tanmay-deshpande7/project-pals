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

// Initialize all Shard Firestore Databases
const shardDbs = {
    master: masterDb
};

Object.entries(SHARD_CONFIGS).forEach(([shardId, config]) => {
    try {
        const appName = `shardApp_${shardId}`;
        let shardApp = firebase.apps.find(app => app.name === appName);
        if (!shardApp) {
            shardApp = firebase.initializeApp(config, appName);
        }
        shardDbs[shardId] = shardApp.firestore();
    } catch (e) {
        console.error(`Failed to initialize ${shardId}:`, e);
    }
});

// Primary active database pointer: Shared Master Database for unified multi-user visibility
window.activeShardDb = masterDb;
window.userShardId = 'master';
window.shardDbs = shardDbs;

// Dynamic User Connector: maps all users to the master database so all IDs see each other's data
window.initializeUserShard = async (uid) => {
    window.userShardId = 'master';
    window.activeShardDb = masterDb;
    try {
        const userDocRef = masterDb.collection('users').doc(uid);
        await userDocRef.set({ shardId: 'master' }, { merge: true });
        console.log(`User ${uid} connected to Shared Master Database`);
    } catch (err) {
        console.warn("User registry sync:", err);
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

// All active social and project collections resolve to the shared master database
function getDbForCollection(collectionPath) {
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
window.firebase = firebase;
window.auth = auth;
window.db = dbProxy;
window.masterDb = masterDb;
window.secureFieldValue = firebase.firestore.FieldValue;

console.log("Firebase initialized with ProjectPals shared database and shard connectors");
