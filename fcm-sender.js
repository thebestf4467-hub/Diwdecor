const admin   = require(‘firebase-admin’);
const webpush = require(‘web-push’);

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const VAPID_PUBLIC  = ‘BNx77VMC0kbW2pdKlcWFdlWvdy29AgohHgDrLGEEqHfoqHBSkkXcLFvQTwxOFfXuC6n13nLVw7rcrAjvbJuGwZQ’;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(‘mailto:admin@iraqdecor.com’, VAPID_PUBLIC, VAPID_PRIVATE);

async function sendPending() {
const snap = await db.collection(‘push_queue’).where(‘sent’,’==’,false).get();
if (snap.empty) { console.log(‘No pending’); process.exit(0); }
for (const d of snap.docs) {
const data = d.data();
try {
const sub = JSON.parse(data.subscription);
await webpush.sendNotification(sub, JSON.stringify({
title: data.title || ‘MD Decor’,
body:  data.body  || ‘إشعار جديد’,
url:   data.url   || ‘/’,
icon:  ‘/app-icon.png’
}));
await d.ref.update({ sent:true, sentAt: admin.firestore.FieldValue.serverTimestamp() });
console.log(‘✅’, data.title);
} catch(e) {
await d.ref.update({ sent:true, error: e.message });
console.log(‘❌’, e.message);
}
}
process.exit(0);
}
sendPending();
