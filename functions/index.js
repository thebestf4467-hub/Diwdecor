// =============================================
// functions/index.js
// Firebase Cloud Function — ترسل إشعارات Push تلقائياً
//
// طريقة الرفع:
// 1. npm install -g firebase-tools
// 2. firebase login
// 3. firebase init functions (اختر JavaScript)
// 4. انسخ هذا الملف إلى functions/index.js
// 5. firebase deploy –only functions
// =============================================

const functions = require(“firebase-functions”);
const admin = require(“firebase-admin”);
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// =============================================
// عند إضافة إشعار جديد في Firestore — أرسله عبر FCM
// =============================================
exports.sendPushNotification = functions.firestore
.document(“notifications/{notifId}”)
.onCreate(async (snap, context) => {
const data = snap.data();
const { toUid, title, body, icon, url } = data;

```
    if (!toUid) return null;

    try {
        // احصل على FCM Token للمستخدم المستهدف
        const userDoc = await db.collection("users").doc(toUid).get();
        if (!userDoc.exists) return null;

        const fcmToken = userDoc.data().fcmToken;
        if (!fcmToken) {
            console.log(`No FCM token for user ${toUid}`);
            return null;
        }

        // أرسل الإشعار
        const message = {
            token: fcmToken,
            data: {
                title: title || "MD Decor",
                body: body || "لديك إشعار جديد",
                icon: icon || "🔔",
                url: url || "/"
            },
            webpush: {
                notification: {
                    title: title || "MD Decor",
                    body: body || "لديك إشعار جديد",
                    icon: "/app-icon.png",
                    badge: "/app-icon.png",
                    vibrate: [200, 100, 200],
                    requireInteraction: false
                },
                fcmOptions: {
                    link: url || "/"
                }
            }
        };

        const response = await messaging.send(message);
        console.log(`✅ FCM sent to ${toUid}: ${response}`);
        return null;

    } catch (error) {
        if (error.code === "messaging/registration-token-not-registered") {
            // Token انتهت صلاحيته — احذفها
            await db.collection("users").doc(toUid).update({
                fcmToken: admin.firestore.FieldValue.delete()
            });
            console.log(`Deleted expired token for ${toUid}`);
        } else {
            console.error("FCM error:", error.message);
        }
        return null;
    }
});
```

// =============================================
// تنظيف الإشعارات القديمة (أكثر من 7 أيام)
// تعمل كل يوم الساعة 3 صباحاً
// =============================================
exports.cleanOldNotifications = functions.pubsub
.schedule(“0 3 * * *”)
.timeZone(“Asia/Baghdad”)
.onRun(async (context) => {
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

```
    const oldNotifs = await db.collection("notifications")
        .where("createdAt", "<", sevenDaysAgo)
        .get();

    const batch = db.batch();
    oldNotifs.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`🗑️ Deleted ${oldNotifs.size} old notifications`);
    return null;
});
```
