import { Platform } from "react-native";
import { API_BASE_URL } from "../config";

let isInitialized = false;

export function initErrorMonitor() {
  if (isInitialized) return;
  isInitialized = true;

  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    logError({
      type: isFatal ? "fatal" : "unhandled_error",
      message: error.message,
      stack: error.stack,
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    });
    originalHandler(error, isFatal);
  });
}

interface ErrorReport {
  type: string;
  message: string;
  stack?: string;
  platform: string;
  timestamp: string;
}

export function logError(report: ErrorReport) {
  try {
    fetch(`${API_BASE_URL}/logs/error`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    }).catch(() => {});
  } catch {
  }
}
