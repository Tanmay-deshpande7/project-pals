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

        // 2. Dispatch to EmailJS API
        if (sendEmail && email) {
            const EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send";
            
            const payload = {
                service_id: "service_5wncowy",
                template_id: "template_yzu2scl",
                user_id: "0j9iihpWE8FEyxJZt",
                template_params: {
                    to_email: email,
                    title: title,
                    body: body,
                    type: type,
                    // If you want to use the student's name in the email, you can map it in your EmailJS template as {{to_email}}
                }
            };

            // Non-blocking fetch to EmailJS API (fire and forget)
            fetch(EMAILJS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }).then(response => {
                if (!response.ok) {
                    console.warn("EmailJS dispatch failed with status:", response.status);
                }
            }).catch(err => console.warn("EmailJS network error:", err));
        }
    } catch (err) {
        // Silently fail — notifications are non-critical
        console.warn('sendNotification failed:', err.message);
    }
};

window.sendNotification = sendNotification;
