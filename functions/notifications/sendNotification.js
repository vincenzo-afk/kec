const { onCall } = require('firebase-functions/v2/https');
const { getMessaging } = require('firebase-admin/messaging');

const messaging = getMessaging();

exports.sendNotification = onCall(async (request) => {
  if (!request.auth) throw new Error('Unauthenticated');
  const { token, title, body, data } = request.data;
  if (!token || !title) throw new Error('Missing token or title');

  try {
    const response = await messaging.send({
      token,
      notification: { title, body },
      data: data || {},
    });
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Push notification failed:', error);
    throw new Error('Push failed: ' + error.message);
  }
});
