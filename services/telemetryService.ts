import axios from "axios";
import { Platform } from "react-native";

import { API_BASE_URL } from "../src/config";

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
  return {
    sync_latency_ms: lastSyncDurationMs,
    upload_failures: uploadFailuresCount,
    retry_count: retryFrequencyCount,
    offline_duration_seconds: totalOfflineDurationSec,
    battery_level: 0,
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
    
    uploadFailuresCount = 0;
    retryFrequencyCount = 0;
    totalOfflineDurationSec = 0;
    console.log("Telemetry: Diagnostic metrics uploaded successfully.");
  } catch (err: any) {
    console.warn("Telemetry: Failed to submit logs to backend", err?.message);
  }
}
