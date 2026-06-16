import { Platform } from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";

let registeredToken: string | null = null;

export async function registerForPushNotifications(getToken: () => Promise<string | null>) {
  try {
    let fcmToken: string | null = null;

    try {
      const messaging = require("@react-native-firebase/messaging").default;
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        fcmToken = await messaging().getToken();
      }
    } catch {
      fcmToken = `dev-${Platform.OS}-${Date.now()}`;
    }

    if (!fcmToken) return;

    registeredToken = fcmToken;
    const authToken = await getToken();
    if (!authToken) return;

    await axios.post(
      `${API_BASE_URL}/notifications/register-token`,
      { token: fcmToken, platform: Platform.OS },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    try {
      const messaging = require("@react-native-firebase/messaging").default;
      messaging().onMessage(async (remoteMessage: any) => {
        console.log("Foreground notification:", remoteMessage.notification?.title);
      });

      messaging().onNotificationOpenedApp((remoteMessage: any) => {
        console.log("Notification opened app:", remoteMessage.notification?.title);
      });

      messaging().getInitialNotification().then((remoteMessage: any) => {
        if (remoteMessage) {
          console.log("App opened from notification:", remoteMessage.notification?.title);
        }
      });
    } catch {
    }
  } catch (err) {
    console.error("Push notification registration failed:", err);
  }
}
