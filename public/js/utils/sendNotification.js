/**
 * sendNotification — Shared utility
 * Writes to users/{uid}/notifications AND optionally queues an email via mail collection.
 *
 * @param {string} uid         - Recipient Firebase UID
 * @param {string} email       - Recipient email address (for email delivery)
 * @param {string} title       - Short notification title
 * @param {string} body        - Longer description
 * @param {string} type        - 'crew_request' | 'hired' | 'application_update' | 'system'
 * @param {boolean} sendEmail  - Whether to also send an email (default true)
 */
const sendNotification = async (uid, email, title, body, type = 'system', sendEmail = true) => {
    try {
        // 1. Write in-app notification
        await window.db.collection('users').doc(uid).collection('notifications').add({
            title,
            body,
            type,
            read: false,
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Dispatch to Make.com Webhook for Email
        const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/3uy6lemvnh16c5bcrfixueckdyx89rol"; 
        
        if (sendEmail && email) {
            const payload = {
                uid: uid,
                email: email,
                title: title,
                body: body,
                type: type
            };

            // Non-blocking fetch (fire and forget)
            fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }).catch(err => console.warn("Webhook dispatch failed:", err));
        }
    } catch (err) {
        // Silently fail — notifications are non-critical
        console.warn('sendNotification failed:', err.message);
    }
};

window.sendNotification = sendNotification;
