import axios from "axios";
import * as Battery from "expo-battery";
import { Platform } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";

import { API_BASE_URL } from "../src/config";
const MOBILE_TELEMETRY_TASK = "BACKGROUND_TELEMETRY_FETCH";

export interface TelemetryEvent {
  sync_latency_ms: number;
  upload_failures: number;
  retry_count: number;
  offline_duration_seconds: number;
  battery_level: number;
  queue_size: number;
  device_platform: string;
}

let uploadFailuresCount = 0;
let retryFrequencyCount = 0;
let lastSyncDurationMs = 0;
let appOfflineStartTime: number | null = null;
let totalOfflineDurationSec = 0;

export function incrementUploadFailure() {
  uploadFailuresCount++;
}

export function incrementRetryCount() {
  retryFrequencyCount++;
}

export function setLastSyncDuration(ms: number) {
  lastSyncDurationMs = ms;
}

export function recordOfflineStart() {
  if (appOfflineStartTime === null) {
    appOfflineStartTime = Date.now();
  }
}

export function recordOfflineEnd() {
  if (appOfflineStartTime !== null) {
    const elapsed = (Date.now() - appOfflineStartTime) / 1000;
    totalOfflineDurationSec += elapsed;
    appOfflineStartTime = null;
  }
}

export async function captureDeviceTelemetry(queueSize: number): Promise<TelemetryEvent> {
  const batteryLevel = await Battery.getBatteryLevelAsync();
  return {
    sync_latency_ms: lastSyncDurationMs,
    upload_failures: uploadFailuresCount,
    retry_count: retryFrequencyCount,
    offline_duration_seconds: totalOfflineDurationSec,
    battery_level: batteryLevel,
    queue_size: queueSize,
    device_platform: Platform.OS,
  };
}

export async function submitTelemetryReport(queueSize: number) {
  try {
    const payload = await captureDeviceTelemetry(queueSize);
    
    await axios.post(`${API_BASE_URL}/logs/mobile-telemetry`, payload, {
      timeout: 5000,
    });
    
    // Clear counts on successful post
    uploadFailuresCount = 0;
    retryFrequencyCount = 0;
    totalOfflineDurationSec = 0;
    console.log("Telemetry: Diagnostic metrics uploaded successfully.");
  } catch (err: any) {
    console.warn("Telemetry: Failed to submit logs to backend", err?.message);
  }
}

// Background Task registration
export function registerBackgroundTelemetryTask(getQueueSize: () => Promise<number>) {
  if (Platform.OS === "web") return;

  TaskManager.defineTask(MOBILE_TELEMETRY_TASK, async () => {
    try {
      const qSize = await getQueueSize();
      await submitTelemetryReport(qSize);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });

  BackgroundFetch.registerTaskAsync(MOBILE_TELEMETRY_TASK, {
    minimumInterval: 15 * 60, // Submit telemetry every 15 minutes in background
    stopOnTerminate: false,
    startOnBoot: true,
  }).catch((err: any) => {
    console.log("Telemetry: Task registration deferred.", err?.message);
  });
}
