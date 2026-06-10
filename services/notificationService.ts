import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

import { API_BASE_URL } from "../src/config";
const TOKEN_STORE_KEY = "constai_push_token";

export async function registerForPushNotificationsAsync(getToken: () => Promise<string | null>): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Mobile push: Failed to get push token for push notification!");
    return null;
  }

  try {
    const expoToken = await Notifications.getExpoPushTokenAsync();
    token = expoToken.data;
    console.log("Mobile push: Retrieved Expo push token:", token);

    // Save token in device secure store
    await SecureStore.setItemAsync(TOKEN_STORE_KEY, token);

    // Sync token with backend
    const bearerToken = await getToken();
    if (bearerToken) {
      await registerDeviceTokenWithBackend(token, bearerToken);
    }
  } catch (err) {
    console.error("Mobile push: Error getting Expo Push Token", err);
  }

  return token;
}

export async function registerDeviceTokenWithBackend(deviceToken: string, authToken: string) {
  try {
    await axios.post(
      `${API_BASE_URL}/notifications/register-token`,
      {
        token: deviceToken,
        platform: Platform.OS,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Mobile push: Registered device token with central backend successfully.");
  } catch (err: any) {
    console.error("Mobile push: Failed to register device token with backend", err?.message);
  }
}
