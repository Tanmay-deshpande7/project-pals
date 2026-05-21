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
        const shardApp = firebase.initializeApp(config, appName);
        shardDbs[shardId] = shardApp.firestore();
    } catch (e) {
        console.error(`Failed to initialize ${shardId} in Admin panel:`, e);
    }
});

// For admin panel operations, window.db will point to masterDb by default
window.auth = auth;
window.db = masterDb;
window.shardDbs = shardDbs;

console.log("Firebase initialized for Admin with 5 parallel database connectors");
