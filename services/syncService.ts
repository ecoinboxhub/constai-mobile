import NetInfo from "@react-native-community/netinfo";
import axios from "axios";
import { getDbConnection, getPendingSyncItems, markSyncItemCompleted, queueSyncItem, getAllAsync } from "./dbService";
import { SyncQueueItem } from "../shared/types";
import {
  recordOfflineStart,
  recordOfflineEnd,
  incrementRetryCount,
  setLastSyncDuration,
  submitTelemetryReport
} from "./telemetryService";

let isSyncing = false;

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
              timeout: 10000,
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
            console.error(`Sync engine: Schema validation error for item ${item.client_uuid}. Discarding task.`, error?.response?.data);
            await markSyncItemCompleted(item.client_uuid);
            success = true;
          } else {
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
    
    const syncDuration = Date.now() - startTime;
    setLastSyncDuration(syncDuration);
    await submitTelemetryReport(pendingItems.length);
  } catch (error) {
    console.error("Sync engine: Fatal synchronization queue error", error);
  } finally {
    isSyncing = false;
  }
}

export async function performOfflineWrite(
  table: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  clientUuid: string,
  data: Record<string, any>
) {
  const db = await getDbConnection();
  const columns = Object.keys(data).join(", ");
  const placeholders = Object.keys(data).map(() => "?").join(", ");
  const values = Object.values(data);

  if (action === 'INSERT') {
    await db.executeSql(
      `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders});`,
      values
    );
  } else if (action === 'UPDATE') {
    const sets = Object.keys(data).map((col) => `${col} = ?`).join(", ");
    await db.executeSql(
      `UPDATE ${table} SET ${sets} WHERE id = ?;`,
      [...values, data.id]
    );
  } else if (action === 'DELETE') {
    await db.executeSql(`DELETE FROM ${table} WHERE id = ?;`, [data.id]);
  }

  await queueSyncItem({
    client_uuid: clientUuid,
    table_name: table,
    action: action,
    payload: JSON.stringify(data),
  });

  console.log(`Sync engine: Transaction queued offline inside SQLite [${table} - ${action}]`);
}

export function startSyncListener(getToken: () => Promise<string | null>) {
  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      console.log("Sync engine: Network connection active. Triggering reconciliation.");
      processSyncQueue(getToken).catch(console.error);
    }
  });
}
