import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  deleteField,
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  orderBy
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { handleFirestoreError, OperationType } from "./firestore-error";
import { 
  UserProfile, 
  UserRole,
  BuildingInfo, 
  CollaboratorInfo, 
  TransferRequestInfo,
  CateringInfo, 
  PhotoRecord, 
  EventConfigInfo,
  ClaActivities
} from "../types";

// ==========================================
// 1. User Profiles & Simulated Auth Service
// ==========================================

export function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      continue;
    }
    if (val !== null && typeof val === "object" && !(val instanceof Date)) {
      result[key] = cleanUndefined(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

export async function getCurrentUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export function subscribeToUserProfile(uid: string, onUpdate: (profile: UserProfile | null) => void) {
  const path = `users/${uid}`;
  return onSnapshot(doc(db, "users", uid), (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as UserProfile);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    const cleaned = cleanUndefined(profile);
    await setDoc(doc(db, "users", profile.uid), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Subscribe to Users List (for SuperAdmin to configure permissions)
export function subscribeToUsers(onUpdate: (users: UserProfile[]) => void, onError?: (err: any) => void) {
  const path = "users";
  const q = query(collection(db, "users"));
  return onSnapshot(q, (snapshot) => {
    const users: UserProfile[] = [];
    snapshot.forEach((doc) => {
      users.push(doc.data() as UserProfile);
    });
    onUpdate(users);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    if (onError) onError(error);
  });
}

// Update other user's role (SuperAdmin only)
export async function updateUserRole(uid: string, newRole: any): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, "users", uid), { role: newRole });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Update multiple roles and default role
export async function updateUserRoles(uid: string, primaryRole: any, rolesList: any[]): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, "users", uid), { role: primaryRole, roles: rolesList });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Update user details (Name, Email, Emails list, Coordination Code) by SuperAdmin
export async function updateUserDetails(
  uid: string, 
  details: { 
    name: string; 
    email: string; 
    emails?: string[];
    coordinationCode?: string;
    role?: UserRole;
    roles?: UserRole[];
  }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const primary = details.email.trim().toLowerCase();
    const allEmails = Array.from(new Set([
      primary,
      ...(details.emails || []).map(e => e.trim().toLowerCase())
    ].filter(Boolean)));

    const sanitized: Record<string, any> = {
      name: details.name.trim(),
      email: primary,
      emails: allEmails,
    };
    if (details.coordinationCode !== undefined) {
      sanitized.coordinationCode = details.coordinationCode.trim();
    }
    if (details.role !== undefined) {
      sanitized.role = details.role;
    }
    if (details.roles !== undefined) {
      sanitized.roles = details.roles;
    }
    await updateDoc(doc(db, "users", uid), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// Delete user profile
export async function deleteUserProfile(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await deleteDoc(doc(db, "users", uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Find user profile by email (primary or secondary)
export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const path = "users";
  const targetEmail = email.toLowerCase().trim();
  try {
    // 1. Check primary email
    const q1 = query(collection(db, "users"), where("email", "==", targetEmail));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      return { ...snap1.docs[0].data() } as UserProfile;
    }
    // 2. Check secondary emails array
    const q2 = query(collection(db, "users"), where("emails", "array-contains", targetEmail));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      return { ...snap2.docs[0].data() } as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Pre-register user profiles
export async function createPreRegisteredUser(profile: Omit<UserProfile, "uid"> & { uid?: string }): Promise<string> {
  const path = "users";
  try {
    const userRef = doc(collection(db, "users"));
    const primary = (profile.email || "").toLowerCase().trim();
    const allEmails = Array.from(new Set([
      primary,
      ...(profile.emails || []).map(e => (e || "").toLowerCase().trim())
    ].filter(Boolean)));

    const finalProfile: UserProfile = { 
      ...profile, 
      uid: userRef.id,
      email: primary,
      emails: allEmails
    };
    const cleaned = cleanUndefined(finalProfile);
    await setDoc(userRef, cleaned);
    return userRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return "";
  }
}

// Claim draft profiles on Google Auth login (checks primary or secondary emails)
export async function claimProfileByEmail(email: string, newUid: string): Promise<UserProfile | null> {
  const path = "users";
  const targetEmail = email.toLowerCase().trim();
  try {
    let snap = await getDocs(query(collection(db, "users"), where("email", "==", targetEmail)));
    if (snap.empty) {
      snap = await getDocs(query(collection(db, "users"), where("emails", "array-contains", targetEmail)));
    }
    if (!snap.empty) {
      const firstDoc = snap.docs[0];
      const data = firstDoc.data() as UserProfile;
      const oldUid = firstDoc.id;
      
      // If the preregistered user doc has a different id from newUid, clean up the old one and migrate all CLA data
      if (oldUid !== newUid) {
        await deleteDoc(doc(db, "users", oldUid));
        await migrateClaData(oldUid, newUid);
      }
      
      const allEmails = Array.from(new Set([
        ...(data.emails || []),
        data.email,
        targetEmail
      ].filter(Boolean)));

      const mergedProfile: UserProfile = { 
        ...data, 
        uid: newUid, 
        hasAccessed: true,
        emails: allEmails
      };
      const cleaned = cleanUndefined(mergedProfile);
      await setDoc(doc(db, "users", newUid), cleaned);
      return cleaned;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Migrate all CLA data (buildings, collaborators, catering, photos, activities, team) from an old UID to a new UID
export async function migrateClaData(oldClaId: string, newClaId: string): Promise<void> {
  if (!oldClaId || !newClaId || oldClaId === newClaId) return;

  // 1. Buildings
  try {
    const snap = await getDocs(query(collection(db, "buildings"), where("claId", "==", oldClaId)));
    for (const d of snap.docs) {
      await updateDoc(doc(db, "buildings", d.id), { claId: newClaId });
    }
  } catch (e) {
    console.error("Error migrating buildings claId:", e);
  }

  // 2. Collaborators
  try {
    const snap = await getDocs(query(collection(db, "collaborators"), where("claId", "==", oldClaId)));
    for (const d of snap.docs) {
      await updateDoc(doc(db, "collaborators", d.id), { claId: newClaId });
    }
  } catch (e) {
    console.error("Error migrating collaborators claId:", e);
  }

  // 3. Catering
  try {
    const snap = await getDocs(query(collection(db, "catering"), where("claId", "==", oldClaId)));
    for (const d of snap.docs) {
      await updateDoc(doc(db, "catering", d.id), { claId: newClaId });
    }
  } catch (e) {
    console.error("Error migrating catering claId:", e);
  }

  // 4. Photos
  try {
    const snap = await getDocs(query(collection(db, "photos"), where("claId", "==", oldClaId)));
    for (const d of snap.docs) {
      await updateDoc(doc(db, "photos", d.id), { claId: newClaId });
    }
  } catch (e) {
    console.error("Error migrating photos claId:", e);
  }

  // 5. ClaActivities
  try {
    const snap = await getDocs(query(collection(db, "claActivities"), where("claId", "==", oldClaId)));
    for (const d of snap.docs) {
      await updateDoc(doc(db, "claActivities", d.id), { claId: newClaId });
    }
  } catch (e) {
    console.error("Error migrating claActivities claId:", e);
  }

  // 6. Users (ALAs / Colaboradores linked to this CLA)
  try {
    const snap = await getDocs(query(collection(db, "users"), where("claId", "==", oldClaId)));
    for (const d of snap.docs) {
      await updateDoc(doc(db, "users", d.id), { claId: newClaId });
    }
  } catch (e) {
    console.error("Error migrating users claId:", e);
  }
}

// Seamlessly resolve and synchronize SuperAdmin & CLA master profile across linked accounts (philippewagnermra@gmail.com and lipewmra@gmail.com)
export async function resolveSuperAdminAndClaProfile(user: any): Promise<UserProfile> {
  const currentEmail = (user.email || "").toLowerCase().trim();
  const knownMasterEmails = ["lipewmra@gmail.com", "philippewagnermra@gmail.com"];
  const allMasterEmails = Array.from(new Set([currentEmail, ...knownMasterEmails].filter(Boolean)));

  // 1. Fetch current profile if exists
  let existingProfile: UserProfile | null = await getCurrentUserProfile(user.uid);

  // 2. Search for any existing profile matching either email or in users collection
  let oldUidToMigrate: string | null = null;
  try {
    const allUsersSnap = await getDocs(collection(db, "users"));
    let bestDocData: UserProfile | null = null;
    let bestDocId: string | null = null;

    allUsersSnap.forEach((d) => {
      const u = d.data() as UserProfile;
      const uEmail = (u.email || "").toLowerCase().trim();
      const uEmails = (u.emails || []).map(e => (e || "").toLowerCase().trim());
      const matchesMaster = allMasterEmails.includes(uEmail) || uEmails.some(e => allMasterEmails.includes(e));

      if (matchesMaster) {
        if (d.id === user.uid) {
          existingProfile = u;
        } else {
          // Found doc with different UID
          if (!bestDocData || (u.coordinationCode && !bestDocData.coordinationCode) || (u.roles?.includes("CLA") && !bestDocData.roles?.includes("CLA"))) {
            bestDocData = u;
            bestDocId = d.id;
          }
        }
      }
    });

    if (bestDocData && bestDocId && bestDocId !== user.uid) {
      oldUidToMigrate = bestDocId;
      existingProfile = {
        ...(existingProfile || {}),
        ...bestDocData,
        uid: user.uid
      };
    }
  } catch (err) {
    console.warn("Could not query users collection for master profile search:", err);
  }

  // 3. Migrate data from old UID if present
  if (oldUidToMigrate && oldUidToMigrate !== user.uid) {
    await migrateClaData(oldUidToMigrate, user.uid);
    try {
      await deleteDoc(doc(db, "users", oldUidToMigrate));
    } catch (dErr) {
      console.warn("Could not delete old master user doc:", dErr);
    }
  }

  // 4. Resolve coordination code and building ownership
  let finalCoordCode = existingProfile?.coordinationCode || "";
  try {
    const bSnap = await getDocs(query(collection(db, "buildings"), where("claId", "==", user.uid)));
    if (bSnap.empty) {
      // Check if there are any buildings in the system
      const allBSnap = await getDocs(collection(db, "buildings"));
      if (!allBSnap.empty) {
        const firstB = allBSnap.docs[0];
        const bData = firstB.data() as BuildingInfo;
        await updateDoc(doc(db, "buildings", firstB.id), { claId: user.uid });
        if (bData.coordRoom) {
          finalCoordCode = bData.coordRoom;
        }
      }
    } else {
      const bData = bSnap.docs[0].data() as BuildingInfo;
      if (bData.coordRoom && !finalCoordCode) {
        finalCoordCode = bData.coordRoom;
      }
    }
  } catch (bErr) {
    console.warn("Error resolving building for SuperAdmin/CLA:", bErr);
  }

  if (!finalCoordCode) {
    finalCoordCode = "8520";
  }

  const finalName = existingProfile?.name || user.displayName || "Philippe Wagner";
  const finalPhotoUrl = user.photoURL || existingProfile?.photoUrl || "";
  const finalEmails = Array.from(new Set([
    ...allMasterEmails,
    ...(existingProfile?.emails || []),
    currentEmail
  ].filter(Boolean)));

  const roles = Array.from(new Set([
    ...(existingProfile?.roles || []),
    "SuperAdmin",
    "CLA"
  ] as UserRole[]));

  const resolvedProfile: UserProfile = {
    uid: user.uid,
    email: currentEmail,
    emails: finalEmails,
    name: finalName,
    role: "SuperAdmin",
    roles: roles,
    coordinationCode: finalCoordCode,
    hasAccessed: true,
  };

  if (finalPhotoUrl) {
    resolvedProfile.photoUrl = finalPhotoUrl;
  }
  if (existingProfile?.pingramConfig) {
    resolvedProfile.pingramConfig = existingProfile.pingramConfig;
  }

  const cleanedProfile = cleanUndefined(resolvedProfile);
  await setDoc(doc(db, "users", user.uid), cleanedProfile);
  return cleanedProfile;
}

// Subscribe to users registered under the same parent CLA (where claId == activeClaId)
export function subscribeToColegas(activeClaId: string, onUpdate: (users: UserProfile[]) => void) {
  const path = "users";
  const q = query(collection(db, "users"), where("claId", "==", activeClaId));
  return onSnapshot(q, (snapshot) => {
    const users: UserProfile[] = [];
    snapshot.forEach((doc) => {
      users.push(doc.data() as UserProfile);
    });
    onUpdate(users);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}


// ==========================================
// 2. Event Configuration (SuperAdmin control)
// ==========================================

export async function getEventConfig(): Promise<EventConfigInfo | null> {
  const path = "eventConfigs";
  try {
    const q = query(collection(db, "eventConfigs"), orderBy("year", "desc"));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docVal = snap.docs[0];
      return { id: docVal.id, ...docVal.data() } as EventConfigInfo;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveEventConfig(config: Omit<EventConfigInfo, "id"> & { id?: string }): Promise<string> {
  const path = "eventConfigs";
  try {
    const cleaned = cleanUndefined(config);
    if (cleaned.id) {
      await setDoc(doc(db, "eventConfigs", cleaned.id), cleaned);
      return cleaned.id;
    } else {
      const res = await addDoc(collection(db, "eventConfigs"), cleaned);
      return res.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return "";
  }
}

export function subscribeToEventConfig(onUpdate: (config: EventConfigInfo | null) => void) {
  const path = "eventConfigs";
  const q = query(collection(db, "eventConfigs"), orderBy("year", "desc"));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const docVal = snapshot.docs[0];
      onUpdate({ id: docVal.id, ...docVal.data() } as EventConfigInfo);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

// ==========================================
// 3. Buildings / Schools Config
// ==========================================

export function subscribeToBuilding(claId: string, onUpdate: (building: BuildingInfo | null) => void) {
  const path = "buildings";
  const q = query(collection(db, "buildings"), where("claId", "==", claId));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const docVal = snapshot.docs[0];
      onUpdate({ id: docVal.id, ...docVal.data() } as BuildingInfo);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function saveBuilding(building: BuildingInfo): Promise<void> {
  const path = "buildings";
  try {
    const data = cleanUndefined({ ...building });
    if (data.id === undefined) {
      delete data.id;
    }
    if (data.id) {
      await setDoc(doc(db, "buildings", data.id), data);
    } else {
      await addDoc(collection(db, "buildings"), data);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}


// ==========================================
// 4. Collaborators Module
// ==========================================

export async function findCollaboratorByEmail(email: string): Promise<CollaboratorInfo | null> {
  const path = "collaborators";
  try {
    const q = query(collection(db, "collaborators"), where("email", "==", email.toLowerCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docVal = snap.docs[0];
      return { id: docVal.id, ...docVal.data() } as CollaboratorInfo;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export function subscribeToCollaborators(claId: string, onUpdate: (collabs: CollaboratorInfo[]) => void) {
  const path = "collaborators";
  const q = query(collection(db, "collaborators"), where("claId", "==", claId));
  return onSnapshot(q, (snapshot) => {
    const collabs: CollaboratorInfo[] = [];
    snapshot.forEach((doc) => {
      collabs.push({ id: doc.id, ...doc.data() } as CollaboratorInfo);
    });
    onUpdate(collabs);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

// Allows looking up all collaborators for a collaborator check-in login view
export function subscribeToAllCollaborators(onUpdate: (collabs: CollaboratorInfo[]) => void) {
  const path = "collaborators";
  const q = query(collection(db, "collaborators"));
  return onSnapshot(q, (snapshot) => {
    const collabs: CollaboratorInfo[] = [];
    snapshot.forEach((doc) => {
      collabs.push({ id: doc.id, ...doc.data() } as CollaboratorInfo);
    });
    onUpdate(collabs);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function addCollaborator(collab: Omit<CollaboratorInfo, "id">): Promise<string> {
  const path = "collaborators";
  try {
    const res = await addDoc(collection(db, "collaborators"), collab);
    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return "";
  }
}

function sanitizeFirestoreUpdates(updates: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined) {
      sanitized[key] = deleteField();
    } else if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      sanitized[key] = sanitizeFirestoreUpdates(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export async function updateCollaborator(id: string, updates: Partial<CollaboratorInfo>): Promise<void> {
  const path = `collaborators/${id}`;
  try {
    const sanitizedUpdates = sanitizeFirestoreUpdates(updates as Record<string, any>);
    await updateDoc(doc(db, "collaborators", id), sanitizedUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCollaborator(id: string): Promise<void> {
  const path = `collaborators/${id}`;
  try {
    await deleteDoc(doc(db, "collaborators", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Request release/transfer of a reserve collaborator from another CLA
export async function requestCollaboratorTransfer(
  collaborator: CollaboratorInfo,
  targetCla: { uid: string; name: string; buildingName?: string; email?: string; phone?: string },
  notes?: string
): Promise<void> {
  if (!collaborator.id) return;
  const path = `collaborators/${collaborator.id}`;
  const request: TransferRequestInfo = {
    requestId: doc(collection(db, "collaborators")).id,
    targetClaId: targetCla.uid,
    targetClaName: targetCla.name || targetCla.email || "CLA Solicitante",
    targetBuildingName: targetCla.buildingName,
    targetUserEmail: targetCla.email,
    targetClaPhone: targetCla.phone,
    requestedAt: new Date().toISOString(),
    status: "Pendente",
    notes: notes || ""
  };

  try {
    await updateDoc(doc(db, "collaborators", collaborator.id), {
      transferRequest: request,
      // Ensure origin CLA is recorded if not already set
      originalClaId: collaborator.originalClaId || collaborator.claId,
      originalClaName: collaborator.originalClaName || collaborator.claName || "CLA Mantenedor Inicial"
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Maintainer CLA approves the release and transfers the collaborator to the requesting CLA
export async function approveCollaboratorTransfer(
  collaborator: CollaboratorInfo,
  approvedByName?: string
): Promise<void> {
  if (!collaborator.id || !collaborator.transferRequest) return;
  const path = `collaborators/${collaborator.id}`;
  const req = collaborator.transferRequest;

  const originClaId = collaborator.originalClaId || collaborator.claId;
  const originClaName = collaborator.originalClaName || collaborator.claName || "CLA Mantenedor";

  const historyItem = {
    fromClaId: collaborator.claId,
    fromClaName: originClaName,
    toClaId: req.targetClaId,
    toClaName: req.targetClaName,
    date: new Date().toISOString(),
    approvedBy: approvedByName || "CLA Mantenedor"
  };

  const updatedHistory = [...(collaborator.transferHistory || []), historyItem];

  try {
    await updateDoc(doc(db, "collaborators", collaborator.id), {
      claId: req.targetClaId,
      claName: req.targetClaName,
      originalClaId: originClaId,
      originalClaName: originClaName,
      isReserve: true,
      assignedRoom: "",
      assignedRole: "",
      transferRequest: {
        ...req,
        status: "Aprovado",
        respondedAt: new Date().toISOString()
      },
      transferHistory: updatedHistory
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Maintainer CLA rejects the release request
export async function rejectCollaboratorTransfer(
  collaborator: CollaboratorInfo
): Promise<void> {
  if (!collaborator.id || !collaborator.transferRequest) return;
  const path = `collaborators/${collaborator.id}`;
  try {
    await updateDoc(doc(db, "collaborators", collaborator.id), {
      transferRequest: {
        ...collaborator.transferRequest,
        status: "Recusado",
        respondedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Requester CLA cancels the request
export async function cancelCollaboratorTransfer(
  collaborator: CollaboratorInfo
): Promise<void> {
  if (!collaborator.id) return;
  const path = `collaborators/${collaborator.id}`;
  try {
    await updateDoc(doc(db, "collaborators", collaborator.id), {
      transferRequest: null
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}


// ==========================================
// 5. Catering / Food Manager
// ==========================================

export function subscribeToCatering(claId: string, onUpdate: (catering: CateringInfo | null) => void) {
  const path = "catering";
  const q = query(collection(db, "catering"), where("claId", "==", claId));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const docVal = snapshot.docs[0];
      onUpdate({ id: docVal.id, ...docVal.data() } as CateringInfo);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function saveCatering(catering: CateringInfo): Promise<void> {
  const path = "catering";
  try {
    const data = cleanUndefined(catering);
    if (data.id) {
      await setDoc(doc(db, "catering", data.id), data);
    } else {
      await addDoc(collection(db, "catering"), data);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}


// ==========================================
// 6. Photographic Records
// ==========================================

export function subscribeToPhotos(claId: string, onUpdate: (photos: PhotoRecord[]) => void) {
  const path = "photos";
  const q = query(collection(db, "photos"), where("claId", "==", claId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const photos: PhotoRecord[] = [];
    snapshot.forEach((doc) => {
      photos.push({ id: doc.id, ...doc.data() } as PhotoRecord);
    });
    onUpdate(photos);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function addPhoto(photo: Omit<PhotoRecord, "id">): Promise<void> {
  const path = "photos";
  try {
    await addDoc(collection(db, "photos"), cleanUndefined(photo));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePhoto(id: string): Promise<void> {
  const path = `photos/${id}`;
  try {
    await deleteDoc(doc(db, "photos", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// 7. CLA Activities (Atividades do CLA)
// ==========================================

export function subscribeToClaActivities(claId: string, onUpdate: (activities: ClaActivities | null) => void) {
  const path = "claActivities";
  const q = query(collection(db, "claActivities"), where("claId", "==", claId));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const docVal = snapshot.docs[0];
      onUpdate({ id: docVal.id, ...docVal.data() } as ClaActivities);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function saveClaActivities(activities: ClaActivities): Promise<void> {
  const path = "claActivities";
  try {
    const data = cleanUndefined({ ...activities });
    if (data.id === undefined) {
      delete data.id;
    }
    if (data.id) {
      await setDoc(doc(db, "claActivities", data.id), data);
    } else {
      await addDoc(collection(db, "claActivities"), data);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToAllBuildings(onUpdate: (buildings: BuildingInfo[]) => void) {
  const path = "buildings";
  const q = query(collection(db, "buildings"));
  return onSnapshot(q, (snapshot) => {
    const buildings: BuildingInfo[] = [];
    snapshot.forEach((doc) => {
      buildings.push({ id: doc.id, ...doc.data() } as BuildingInfo);
    });
    onUpdate(buildings);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export function subscribeToAllClaActivities(onUpdate: (activities: ClaActivities[]) => void) {
  const path = "claActivities";
  const q = query(collection(db, "claActivities"));
  return onSnapshot(q, (snapshot) => {
    const activities: ClaActivities[] = [];
    snapshot.forEach((doc) => {
      activities.push({ id: doc.id, ...doc.data() } as ClaActivities);
    });
    onUpdate(activities);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

