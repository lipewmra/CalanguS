import { auth } from "../firebase";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function isQuotaExceededError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes("quota exceeded") ||
    msg.includes("quota limit exceeded") ||
    msg.includes("resource-exhausted") ||
    msg.includes("resource_exhausted") ||
    msg.includes("free daily read units per project") ||
    msg.includes("free tier database")
  );
}

let lastQuotaBroadcast = 0;
function notifyQuotaStatus(msg: string) {
  const now = Date.now();
  if (now - lastQuotaBroadcast > 10000) {
    lastQuotaBroadcast = now;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("calangus_firestore_quota_status", {
        detail: { isQuotaExceeded: true, message: msg }
      }));
    }
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isQuota = isQuotaExceededError(error);

  if (isQuota) {
    console.warn(`[CALANGUS FIRESTORE QUOTA REACHED]: Operating with local cache & persistence. (${operationType.toUpperCase()} on ${path})`);
    notifyQuotaStatus("Cota diária de leitura do Firebase atingida. O aplicativo continua funcionando normalmente através do armazenamento local seguro.");
    return;
  }

  const isPermissionDenied = errMsg.toLowerCase().includes("missing or insufficient permissions") ||
                             errMsg.toLowerCase().includes("permission-denied") ||
                             errMsg.toLowerCase().includes("permission denied");

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  if (isPermissionDenied) {
    console.error('[CALANGUS FIRESTORE ERROR REPORT]: ', JSON.stringify(errInfo, null, 2));
    // Log error report without throwing unhandled exceptions that break the React component tree
  } else {
    // Connection, offline or other transient error: log warning and continue without crashing app flow
    console.warn(`[CALANGUS FIRESTORE ${operationType.toUpperCase()}]: ${errMsg} (path: ${path})`);
  }
}

