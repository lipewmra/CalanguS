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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
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
    throw new Error(JSON.stringify(errInfo));
  } else {
    // Connection, offline or other transient error: log warning and continue without crashing app flow
    console.warn(`[CALANGUS FIRESTORE ${operationType.toUpperCase()}]: ${errMsg} (path: ${path})`);
  }
}
