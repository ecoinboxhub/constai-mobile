import NetInfo from "@react-native-community/netinfo";
import axios from "axios";
import { getDbConnection, getPendingSyncItems, markSyncItemCompleted, queueSyncItem } from "./dbService";
import { SyncQueueItem } from "../shared/types";
import {
  recordOfflineStart,
  recordOfflineEnd,
  incrementRetryCount,
  setLastSyncDuration,
  submitTelemetryReport
} from "./telemetryService";

let isSyncing = false;

// Configurable API base URL matching local and production configurations
import { API_BASE_URL } from "../src/config"; 

export async function checkInternetConnection(): Promise<boolean> {
  const state = await NetInfo.fetch();
  const isConnected = !!state.isConnected && !!state.isInternetReachable;
  if (!isConnected) {
    recordOfflineStart();
  } else {
    recordOfflineEnd();
  }
  return isConnected;
}

export async function processSyncQueue(getToken: () => Promise<string | null>) {
  if (isSyncing) return;
  
  const connected = await checkInternetConnection();
  if (!connected) {
    console.log("Sync engine: Device is offline. Sync deferred.");
    return;
  }

  const pendingItems = await getPendingSyncItems();
  if (pendingItems.length === 0) {
    return;
  }

  isSyncing = true;
  const startTime = Date.now();
  console.log(`Sync engine: Starting synchronization for ${pendingItems.length} items.`);

  const token = await getToken();
  if (!token) {
    console.warn("Sync engine: Authentication token is missing. Sync skipped.");
    isSyncing = false;
    return;
  }

  const db = await getDbConnection();

  try {
    for (const item of pendingItems) {
      let success = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!success && retryCount < maxRetries) {
        try {
          // Reconcile single transaction with backend sync API
          const response = await axios.post(
            `${API_BASE_URL}/sync/reconcile`,
            {
              client_uuid: item.client_uuid,
              table_name: item.table_name,
              action: item.action,
              payload: JSON.parse(item.payload),
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              timeout: 10000, // 10 second timeout for flaky connections
            }
          );

          if (response.status === 200 || response.status === 201) {
            success = true;
            await markSyncItemCompleted(item.client_uuid);
            console.log(`Sync engine: item ${item.client_uuid} synchronized successfully.`);
          }
        } catch (error: any) {
          retryCount++;
          incrementRetryCount();
          const status = error?.response?.status;
          
          if (status === 400 || status === 422) {
            // Invalid data schema payload - discard or quarantine to prevent blocking the queue
            console.error(`Sync engine: Schema validation error for item ${item.client_uuid}. Discarding task.`, error?.response?.data);
            await markSyncItemCompleted(item.client_uuid);
            success = true; // Set to true to exit loop and continue queue
          } else {
            // Flaky connection - exponential backoff before retry
            const delay = Math.pow(2, retryCount) * 1000;
            console.warn(`Sync engine: Network issue syncing ${item.client_uuid}. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      if (!success) {
        console.error(`Sync engine: Max retries exceeded for item ${item.client_uuid}. Halting queue processing.`);
        break;
      }
    }
    
    // Register sync telemetry metrics
    const syncDuration = Date.now() - startTime;
    setLastSyncDuration(syncDuration);
    await submitTelemetryReport(pendingItems.length);
  } catch (error) {
    console.error("Sync engine: Fatal synchronization queue error", error);
  } finally {
    isSyncing = false;
  }
}

// Queue offline transaction helper
export async function performOfflineWrite(
  table: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  clientUuid: string,
  data: Record<string, any>
) {
  // 1. Write immediately to local database table
  const db = await getDbConnection();
  const columns = Object.keys(data).join(", ");
  const placeholders = Object.keys(data).map(() => "?").join(", ");
  const values = Object.values(data);

  if (action === 'INSERT') {
    await db.runAsync(
      `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders});`,
      values
    );
  } else if (action === 'UPDATE') {
    const sets = Object.keys(data).map((col) => `${col} = ?`).join(", ");
    await db.runAsync(
      `UPDATE ${table} SET ${sets} WHERE id = ?;`,
      [...values, data.id]
    );
  } else if (action === 'DELETE') {
    await db.runAsync(`DELETE FROM ${table} WHERE id = ?;`, [data.id]);
  }

  // 2. Insert transaction task into sync_queue
  await queueSyncItem({
    client_uuid: clientUuid,
    table_name: table,
    action: action,
    payload: JSON.stringify(data),
  });

  console.log(`Sync engine: Transaction queued offline inside SQLite [${table} - ${action}]`);
}

// Start Network Monitoring listener
export function startSyncListener(getToken: () => Promise<string | null>) {
  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      console.log("Sync engine: Network connection active. Triggering reconciliation.");
      processSyncQueue(getToken).catch(console.error);
    }
  });
}
