const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function sendPending() {
    const snap = await db.collection('push_queue')
        .where('sent', '==', false)
        .get();
    
    for (const doc of snap.docs) {
        const data = doc.data();
        try {
            await admin.messaging().send({
                token: data.token,
                notification: { title: data.title, body: data.body },
                webpush: {
                    notification: {
                        icon: 'https://iraqdecor.com/app-icon.png',
                        badge: 'https://iraqdecor.com/app-icon.png',
                        dir: 'rtl'
                    },
                    fcmOptions: { link: 'https://iraqdecor.com' }
                }
            });
            await doc.ref.update({ sent: true });
            console.log('✅ Sent:', data.title);
        } catch(e) {
            await doc.ref.update({ sent: true, error: e.message });
            console.log('❌', e.message);
        }
    }
    process.exit(0);
}

sendPending();
