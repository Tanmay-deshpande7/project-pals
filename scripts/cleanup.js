const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin using the Service Account JSON stored in GitHub Secrets
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    console.error("Missing FIREBASE_SERVICE_ACCOUNT environment variable.");
    process.exit(1);
  }
} catch (error) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON. Please check the secret format.", error);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function performCleanup() {
  console.log("Starting automated Event Lifecycle Cleanup...");
  const now = new Date();
  
  try {
    const eventsSnapshot = await db.collection('events').get();
    
    if (eventsSnapshot.empty) {
      console.log("No events found in the database.");
      return;
    }

    let archivedCount = 0;
    let deletedCount = 0;

    for (const doc of eventsSnapshot.docs) {
      const event = doc.data();
      if (!event.endDate) continue; // Skip legacy events

      const endDateObj = new Date(event.endDate);
      
      const archiveDate = new Date(endDateObj);
      archiveDate.setDate(archiveDate.getDate() + 1);
      
      const deleteDate = new Date(endDateObj);
      deleteDate.setDate(deleteDate.getDate() + 30);

      if (now > deleteDate) {
        // Hard Delete
        console.log(`[Lifecycle] Hard deleting expired event (30+ days): ${event.title} (${doc.id})`);
        
        // 1. Delete all registrations inside the subcollection
        const regSnapshot = await db.collection('events').doc(doc.id).collection('registrations').get();
        const batch = db.batch();
        regSnapshot.forEach(regDoc => batch.delete(regDoc.ref));
        
        // 2. Delete the event document itself
        batch.delete(doc.ref);
        
        await batch.commit();
        deletedCount++;
        
      } else if (now > archiveDate && !event.isArchived) {
        // Archive
        console.log(`[Lifecycle] Archiving event (1+ days): ${event.title} (${doc.id})`);
        
        await db.collection('events').doc(doc.id).update({
          isArchived: true,
          bannerBase64: admin.firestore.FieldValue.delete(),
          pfpBase64: admin.firestore.FieldValue.delete()
        });
        archivedCount++;
      }
    }

    console.log("Cleanup completed successfully.");
    console.log(`Summary: ${archivedCount} archived, ${deletedCount} deleted.`);
  } catch (error) {
    console.error("Error during cleanup process:", error);
    process.exit(1);
  }
}

performCleanup();
