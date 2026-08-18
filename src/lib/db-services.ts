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
import { handleFirestoreError, OperationType, isQuotaExceededError } from "./firestore-error";
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
// 0. Offline-First & Quota-Safe Local Cache
// ==========================================

export function getLocalCache<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`calangus_v2_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed !== undefined && parsed !== null ? parsed : fallback;
    }
  } catch (e) {
    console.warn(`Error reading local cache for ${key}:`, e);
  }
  return fallback;
}

export function setLocalCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`calangus_v2_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`Error writing local cache for ${key}:`, e);
  }
}

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

// ==========================================
// 1. User Profiles & Auth Service
// ==========================================

export async function getCurrentUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  const cacheKey = `user_${uid}`;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const profile = snap.data() as UserProfile;
      setLocalCache(cacheKey, profile);
      return profile;
    }
    return getLocalCache<UserProfile | null>(cacheKey, null);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return getLocalCache<UserProfile | null>(cacheKey, null);
  }
}

export function subscribeToUserProfile(uid: string, onUpdate: (profile: UserProfile | null) => void) {
  const path = `users/${uid}`;
  const cacheKey = `user_${uid}`;

  const cached = getLocalCache<UserProfile | null>(cacheKey, null);
  if (cached) {
    onUpdate(cached);
  }

  return onSnapshot(doc(db, "users", uid), (docSnap) => {
    if (docSnap.exists()) {
      const profile = docSnap.data() as UserProfile;
      setLocalCache(cacheKey, profile);
      onUpdate(profile);
    } else {
      const currentCache = getLocalCache<UserProfile | null>(cacheKey, null);
      if (!currentCache) onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    const fallback = getLocalCache<UserProfile | null>(cacheKey, null);
    if (fallback) onUpdate(fallback);
  });
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.uid}`;
  const cacheKey = `user_${profile.uid}`;
  const cleaned = cleanUndefined(profile);

  // Optimistically cache locally
  setLocalCache(cacheKey, cleaned);
  const allUsers = getLocalCache<UserProfile[]>("all_users", []);
  const idx = allUsers.findIndex(u => u.uid === profile.uid);
  if (idx >= 0) {
    allUsers[idx] = cleaned;
  } else {
    allUsers.push(cleaned);
  }
  setLocalCache("all_users", allUsers);

  try {
    await setDoc(doc(db, "users", profile.uid), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Subscribe to Users List (for SuperAdmin to configure permissions)
export function subscribeToUsers(onUpdate: (users: UserProfile[]) => void, onError?: (err: any) => void) {
  const path = "users";
  const cacheKey = "all_users";

  const cached = getLocalCache<UserProfile[]>(cacheKey, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const q = query(collection(db, "users"));
  return onSnapshot(q, (snapshot) => {
    const users: UserProfile[] = [];
    snapshot.forEach((doc) => {
      users.push(doc.data() as UserProfile);
    });
    setLocalCache(cacheKey, users);
    onUpdate(users);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    const fallback = getLocalCache<UserProfile[]>(cacheKey, []);
    if (fallback.length > 0) onUpdate(fallback);
    if (onError) onError(error);
  });
}

// Update other user's role (SuperAdmin only)
export async function updateUserRole(uid: string, newRole: any): Promise<void> {
  const path = `users/${uid}`;
  const cachedUser = getLocalCache<UserProfile | null>(`user_${uid}`, null);
  if (cachedUser) {
    cachedUser.role = newRole;
    setLocalCache(`user_${uid}`, cachedUser);
  }
  const allUsers = getLocalCache<UserProfile[]>("all_users", []);
  const idx = allUsers.findIndex(u => u.uid === uid);
  if (idx >= 0) {
    allUsers[idx].role = newRole;
    setLocalCache("all_users", allUsers);
  }

  try {
    await updateDoc(doc(db, "users", uid), { role: newRole });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Update multiple roles and default role
export async function updateUserRoles(uid: string, primaryRole: any, rolesList: any[]): Promise<void> {
  const path = `users/${uid}`;
  const cachedUser = getLocalCache<UserProfile | null>(`user_${uid}`, null);
  if (cachedUser) {
    cachedUser.role = primaryRole;
    cachedUser.roles = rolesList;
    setLocalCache(`user_${uid}`, cachedUser);
  }
  const allUsers = getLocalCache<UserProfile[]>("all_users", []);
  const idx = allUsers.findIndex(u => u.uid === uid);
  if (idx >= 0) {
    allUsers[idx].role = primaryRole;
    allUsers[idx].roles = rolesList;
    setLocalCache("all_users", allUsers);
  }

  try {
    await updateDoc(doc(db, "users", uid), { role: primaryRole, roles: rolesList });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Update user details by SuperAdmin
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

  // Update local cache
  const cachedUser = getLocalCache<UserProfile | null>(`user_${uid}`, null);
  if (cachedUser) {
    Object.assign(cachedUser, sanitized);
    setLocalCache(`user_${uid}`, cachedUser);
  }
  const allUsers = getLocalCache<UserProfile[]>("all_users", []);
  const idx = allUsers.findIndex(u => u.uid === uid);
  if (idx >= 0) {
    Object.assign(allUsers[idx], sanitized);
    setLocalCache("all_users", allUsers);
  }

  try {
    await updateDoc(doc(db, "users", uid), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// Delete user profile
export async function deleteUserProfile(uid: string): Promise<void> {
  const path = `users/${uid}`;
  const allUsers = getLocalCache<UserProfile[]>("all_users", []);
  setLocalCache("all_users", allUsers.filter(u => u.uid !== uid));
  if (typeof window !== "undefined") {
    localStorage.removeItem(`calangus_v2_user_${uid}`);
  }

  try {
    await deleteDoc(doc(db, "users", uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Find user profile by email
export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const path = "users";
  const targetEmail = email.toLowerCase().trim();

  // Try cached users first
  const allCached = getLocalCache<UserProfile[]>("all_users", []);
  const cachedMatch = allCached.find(u => 
    (u.email || "").toLowerCase().trim() === targetEmail || 
    (u.emails || []).some(e => (e || "").toLowerCase().trim() === targetEmail)
  );
  if (cachedMatch) return cachedMatch;

  try {
    const q1 = query(collection(db, "users"), where("email", "==", targetEmail));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const uData = { ...snap1.docs[0].data() } as UserProfile;
      setLocalCache(`user_${uData.uid}`, uData);
      return uData;
    }
    const q2 = query(collection(db, "users"), where("emails", "array-contains", targetEmail));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      const uData = { ...snap2.docs[0].data() } as UserProfile;
      setLocalCache(`user_${uData.uid}`, uData);
      return uData;
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

    // Cache locally
    setLocalCache(`user_${userRef.id}`, cleaned);
    const allUsers = getLocalCache<UserProfile[]>("all_users", []);
    allUsers.push(cleaned);
    setLocalCache("all_users", allUsers);

    await setDoc(userRef, cleaned);
    return userRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return "";
  }
}

// Claim draft profiles on Google Auth login
export async function claimProfileByEmail(email: string, newUid: string): Promise<UserProfile | null> {
  const path = "users";
  const targetEmail = email.toLowerCase().trim();

  // Check local cache first
  const allUsers = getLocalCache<UserProfile[]>("all_users", []);
  const cachedMatch = allUsers.find(u => 
    (u.email || "").toLowerCase().trim() === targetEmail || 
    (u.emails || []).some(e => (e || "").toLowerCase().trim() === targetEmail)
  );

  try {
    let snap = await getDocs(query(collection(db, "users"), where("email", "==", targetEmail)));
    if (snap.empty) {
      snap = await getDocs(query(collection(db, "users"), where("emails", "array-contains", targetEmail)));
    }
    if (!snap.empty) {
      const firstDoc = snap.docs[0];
      const data = firstDoc.data() as UserProfile;
      const oldUid = firstDoc.id;
      
      if (oldUid !== newUid) {
        try {
          await deleteDoc(doc(db, "users", oldUid));
        } catch { /* ignore */ }
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
      setLocalCache(`user_${newUid}`, cleaned);
      await setDoc(doc(db, "users", newUid), cleaned);
      return cleaned;
    }
    if (cachedMatch) {
      const merged: UserProfile = { ...cachedMatch, uid: newUid, hasAccessed: true };
      setLocalCache(`user_${newUid}`, merged);
      return merged;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    if (cachedMatch) {
      const merged: UserProfile = { ...cachedMatch, uid: newUid, hasAccessed: true };
      setLocalCache(`user_${newUid}`, merged);
      return merged;
    }
    return null;
  }
}

// Migrate all CLA data
export async function migrateClaData(oldClaId: string, newClaId: string): Promise<void> {
  if (!oldClaId || !newClaId || oldClaId === newClaId) return;

  try {
    const snap = await getDocs(query(collection(db, "buildings"), where("claId", "==", oldClaId)));
    for (const d of snap.docs) {
      await updateDoc(doc(db, "buildings", d.id), { claId: newClaId });
    }
  } catch (e) {
    console.warn("Could not migrate buildings online, updating local cache:", e);
  }

  try {
    const snap = await getDocs(query(collection(db, "collaborators"), where("claId", "==", oldClaId)));
    for (const d of snap.docs) {
      await updateDoc(doc(db, "collaborators", d.id), { claId: newClaId });
    }
  } catch (e) {
    console.warn("Could not migrate collaborators online:", e);
  }
}

// Seamlessly resolve and synchronize SuperAdmin & CLA master profile
export async function resolveSuperAdminAndClaProfile(user: any): Promise<UserProfile> {
  const currentEmail = (user.email || "").toLowerCase().trim();
  const knownMasterEmails = ["lipewmra@gmail.com", "philippewagnermra@gmail.com"];
  const allMasterEmails = Array.from(new Set([currentEmail, ...knownMasterEmails].filter(Boolean)));

  const cachedProfile = getLocalCache<UserProfile | null>(`user_${user.uid}`, null);
  const cachedBuildings = getLocalCache<BuildingInfo[]>("all_buildings", []);
  let finalCoordCode = cachedProfile?.coordinationCode || cachedBuildings[0]?.coordRoom || "8520";

  const finalName = cachedProfile?.name || user.displayName || "Philippe Wagner";
  const finalPhotoUrl = user.photoURL || cachedProfile?.photoUrl || "";
  const finalEmails = Array.from(new Set([
    ...allMasterEmails,
    ...(cachedProfile?.emails || []),
    currentEmail
  ].filter(Boolean)));

  const roles = Array.from(new Set([
    ...(cachedProfile?.roles || []),
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
  if (cachedProfile?.pingramConfig) {
    resolvedProfile.pingramConfig = cachedProfile.pingramConfig;
  }

  const cleanedProfile = cleanUndefined(resolvedProfile);
  setLocalCache(`user_${user.uid}`, cleanedProfile);

  // Sync to database if quota allows
  try {
    await setDoc(doc(db, "users", user.uid), cleanedProfile);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }

  return cleanedProfile;
}

// Subscribe to users registered under the same parent CLA
export function subscribeToColegas(activeClaId: string, onUpdate: (users: UserProfile[]) => void) {
  const path = "users";
  const cacheKey = `colegas_${activeClaId}`;

  const cached = getLocalCache<UserProfile[]>(cacheKey, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const q = query(collection(db, "users"), where("claId", "==", activeClaId));
  return onSnapshot(q, (snapshot) => {
    const users: UserProfile[] = [];
    snapshot.forEach((doc) => {
      users.push(doc.data() as UserProfile);
    });
    setLocalCache(cacheKey, users);
    onUpdate(users);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    const fallback = getLocalCache<UserProfile[]>(cacheKey, []);
    if (fallback.length > 0) onUpdate(fallback);
  });
}

// ==========================================
// 2. Event Configuration
// ==========================================

export async function getEventConfig(): Promise<EventConfigInfo | null> {
  const path = "eventConfigs";
  const cached = getLocalCache<EventConfigInfo | null>("event_config", null);
  try {
    const q = query(collection(db, "eventConfigs"), orderBy("year", "desc"));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docVal = snap.docs[0];
      const data = { id: docVal.id, ...docVal.data() } as EventConfigInfo;
      setLocalCache("event_config", data);
      return data;
    }
    return cached;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return cached;
  }
}

export async function saveEventConfig(config: Omit<EventConfigInfo, "id"> & { id?: string }): Promise<string> {
  const path = "eventConfigs";
  const cleaned = cleanUndefined(config);
  const cfgId = cleaned.id || "default_event_config";
  const fullData: EventConfigInfo = { id: cfgId, ...cleaned };
  
  setLocalCache("event_config", fullData);

  try {
    if (cleaned.id) {
      await setDoc(doc(db, "eventConfigs", cleaned.id), cleaned);
      return cleaned.id;
    } else {
      const res = await addDoc(collection(db, "eventConfigs"), cleaned);
      fullData.id = res.id;
      setLocalCache("event_config", fullData);
      return res.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return cfgId;
  }
}

export function subscribeToEventConfig(onUpdate: (config: EventConfigInfo | null) => void) {
  const path = "eventConfigs";
  const cacheKey = "event_config";

  const cached = getLocalCache<EventConfigInfo | null>(cacheKey, null);
  if (cached) {
    onUpdate(cached);
  }

  const q = query(collection(db, "eventConfigs"), orderBy("year", "desc"));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const docVal = snapshot.docs[0];
      const data = { id: docVal.id, ...docVal.data() } as EventConfigInfo;
      setLocalCache(cacheKey, data);
      onUpdate(data);
    } else {
      const existing = getLocalCache<EventConfigInfo | null>(cacheKey, null);
      if (!existing) onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    const fallback = getLocalCache<EventConfigInfo | null>(cacheKey, null);
    if (fallback) onUpdate(fallback);
  });
}

// ==========================================
// 3. Buildings / Schools Config
// ==========================================

export function subscribeToBuilding(claId: string, onUpdate: (building: BuildingInfo | null) => void) {
  const path = "buildings";
  const cacheKey = `building_${claId}`;

  const cached = getLocalCache<BuildingInfo | null>(cacheKey, null);
  if (cached) {
    onUpdate(cached);
  }

  const q = query(collection(db, "buildings"), where("claId", "==", claId));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const docVal = snapshot.docs[0];
      const data = { id: docVal.id, ...docVal.data() } as BuildingInfo;
      setLocalCache(cacheKey, data);
      onUpdate(data);
    } else {
      const existing = getLocalCache<BuildingInfo | null>(cacheKey, null);
      if (!existing) onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    const fallback = getLocalCache<BuildingInfo | null>(cacheKey, null);
    if (fallback) onUpdate(fallback);
  });
}

export async function saveBuilding(building: BuildingInfo): Promise<void> {
  const path = "buildings";
  const bId = building.id || (building.claId ? `b_${building.claId}` : `b_${Date.now()}`);
  const data = cleanUndefined({ ...building, id: bId });

  // Update local caches
  if (building.claId) {
    setLocalCache(`building_${building.claId}`, data);
  }
  const allBuildings = getLocalCache<BuildingInfo[]>("all_buildings", []);
  const idx = allBuildings.findIndex(b => (building.id && b.id === building.id) || (building.claId && b.claId === building.claId));
  if (idx >= 0) {
    allBuildings[idx] = data;
  } else {
    allBuildings.push(data);
  }
  setLocalCache("all_buildings", allBuildings);

  try {
    if (building.id) {
      await setDoc(doc(db, "buildings", building.id), data);
    } else {
      const res = await addDoc(collection(db, "buildings"), data);
      data.id = res.id;
      if (building.claId) setLocalCache(`building_${building.claId}`, data);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToAllBuildings(onUpdate: (buildings: BuildingInfo[]) => void) {
  const path = "buildings";
  const cacheKey = "all_buildings";

  const cached = getLocalCache<BuildingInfo[]>(cacheKey, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const q = query(collection(db, "buildings"));
  return onSnapshot(q, (snapshot) => {
    const buildings: BuildingInfo[] = [];
    snapshot.forEach((doc) => {
      buildings.push({ id: doc.id, ...doc.data() } as BuildingInfo);
    });
    setLocalCache(cacheKey, buildings);
    onUpdate(buildings);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    const fallback = getLocalCache<BuildingInfo[]>(cacheKey, []);
    if (fallback.length > 0) onUpdate(fallback);
  });
}

// ==========================================
// 4. Collaborators Module
// ==========================================

export async function findCollaboratorByEmail(email: string): Promise<CollaboratorInfo | null> {
  const path = "collaborators";
  const targetEmail = (email || "").toLowerCase().trim();

  // Search local cache first
  const allCollabs = getLocalCache<CollaboratorInfo[]>("all_collaborators", []);
  const cachedMatch = allCollabs.find(c => (c.email || "").toLowerCase().trim() === targetEmail);
  if (cachedMatch) return cachedMatch;

  try {
    const q = query(collection(db, "collaborators"), where("email", "==", targetEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docVal = snap.docs[0];
      const data = { id: docVal.id, ...docVal.data() } as CollaboratorInfo;
      return data;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return cachedMatch || null;
  }
}

export function subscribeToCollaborators(claId: string, onUpdate: (collabs: CollaboratorInfo[]) => void) {
  const path = "collaborators";
  const cacheKey = `collabs_${claId}`;

  const cached = getLocalCache<CollaboratorInfo[]>(cacheKey, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const q = query(collection(db, "collaborators"), where("claId", "==", claId));
  return onSnapshot(q, (snapshot) => {
    const collabs: CollaboratorInfo[] = [];
    snapshot.forEach((doc) => {
      collabs.push({ id: doc.id, ...doc.data() } as CollaboratorInfo);
    });
    setLocalCache(cacheKey, collabs);
    onUpdate(collabs);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    const fallback = getLocalCache<CollaboratorInfo[]>(cacheKey, []);
    if (fallback.length > 0) onUpdate(fallback);
  });
}

export function subscribeToAllCollaborators(onUpdate: (collabs: CollaboratorInfo[]) => void) {
  const path = "collaborators";
  const cacheKey = "all_collaborators";

  const cached = getLocalCache<CollaboratorInfo[]>(cacheKey, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const q = query(collection(db, "collaborators"));
  return onSnapshot(q, (snapshot) => {
    const collabs: CollaboratorInfo[] = [];
    snapshot.forEach((doc) => {
      collabs.push({ id: doc.id, ...doc.data() } as CollaboratorInfo);
    });
    setLocalCache(cacheKey, collabs);
    onUpdate(collabs);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    const fallback = getLocalCache<CollaboratorInfo[]>(cacheKey, []);
    if (fallback.length > 0) onUpdate(fallback);
  });
}

export async function addCollaborator(collab: Omit<CollaboratorInfo, "id">): Promise<string> {
  const path = "collaborators";
  const tempId = `collab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const fullCollab: CollaboratorInfo = { id: tempId, ...collab };

  // Optimistic cache update
  const allCollabs = getLocalCache<CollaboratorInfo[]>("all_collaborators", []);
  allCollabs.push(fullCollab);
  setLocalCache("all_collaborators", allCollabs);

  if (collab.claId) {
    const claCollabs = getLocalCache<CollaboratorInfo[]>(`collabs_${collab.claId}`, []);
    claCollabs.push(fullCollab);
    setLocalCache(`collabs_${collab.claId}`, claCollabs);
  }

  try {
    const res = await addDoc(collection(db, "collaborators"), cleanUndefined(collab));
    fullCollab.id = res.id;
    setLocalCache("all_collaborators", allCollabs);
    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return tempId;
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

  // Optimistic local cache update
  const allCollabs = getLocalCache<CollaboratorInfo[]>("all_collaborators", []);
  const target = allCollabs.find(c => c.id === id);
  if (target) {
    Object.assign(target, updates);
    setLocalCache("all_collaborators", allCollabs);
    if (target.claId) {
      const claCollabs = getLocalCache<CollaboratorInfo[]>(`collabs_${target.claId}`, []);
      const cIdx = claCollabs.findIndex(c => c.id === id);
      if (cIdx >= 0) {
        Object.assign(claCollabs[cIdx], updates);
        setLocalCache(`collabs_${target.claId}`, claCollabs);
      }
    }
  }

  try {
    const sanitizedUpdates = sanitizeFirestoreUpdates(updates as Record<string, any>);
    await updateDoc(doc(db, "collaborators", id), sanitizedUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCollaborator(id: string): Promise<void> {
  const path = `collaborators/${id}`;

  const allCollabs = getLocalCache<CollaboratorInfo[]>("all_collaborators", []);
  const target = allCollabs.find(c => c.id === id);
  setLocalCache("all_collaborators", allCollabs.filter(c => c.id !== id));

  if (target?.claId) {
    const claCollabs = getLocalCache<CollaboratorInfo[]>(`collabs_${target.claId}`, []);
    setLocalCache(`collabs_${target.claId}`, claCollabs.filter(c => c.id !== id));
  }

  try {
    await deleteDoc(doc(db, "collaborators", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Request release/transfer of a reserve collaborator
export async function requestCollaboratorTransfer(
  collaborator: CollaboratorInfo,
  targetCla: { uid: string; name: string; buildingName?: string; email?: string; phone?: string },
  notes?: string
): Promise<void> {
  if (!collaborator.id) return;
  const path = `collaborators/${collaborator.id}`;
  const request: TransferRequestInfo = {
    requestId: `req_${Date.now()}`,
    targetClaId: targetCla.uid,
    targetClaName: targetCla.name || targetCla.email || "CLA Solicitante",
    targetBuildingName: targetCla.buildingName,
    targetUserEmail: targetCla.email,
    targetClaPhone: targetCla.phone,
    requestedAt: new Date().toISOString(),
    status: "Pendente",
    notes: notes || ""
  };

  await updateCollaborator(collaborator.id, {
    transferRequest: request,
    originalClaId: collaborator.originalClaId || collaborator.claId,
    originalClaName: collaborator.originalClaName || collaborator.claName || "CLA Mantenedor Inicial"
  });
}

// Approve transfer
export async function approveCollaboratorTransfer(
  collaborator: CollaboratorInfo,
  approvedByName?: string
): Promise<void> {
  if (!collaborator.id || !collaborator.transferRequest) return;
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

  await updateCollaborator(collaborator.id, {
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
}

// Reject transfer
export async function rejectCollaboratorTransfer(collaborator: CollaboratorInfo): Promise<void> {
  if (!collaborator.id || !collaborator.transferRequest) return;
  await updateCollaborator(collaborator.id, {
    transferRequest: {
      ...collaborator.transferRequest,
      status: "Recusado",
      respondedAt: new Date().toISOString()
    }
  });
}

// Cancel transfer
export async function cancelCollaboratorTransfer(collaborator: CollaboratorInfo): Promise<void> {
  if (!collaborator.id) return;
  await updateCollaborator(collaborator.id, {
    transferRequest: null
  });
}

// ==========================================
// 5. Catering / Food Manager
// ==========================================

export function subscribeToCatering(claId: string, onUpdate: (catering: CateringInfo | null) => void) {
  const path = "catering";
  const cacheKey = `catering_${claId}`;

  const cached = getLocalCache<CateringInfo | null>(cacheKey, null);
  if (cached) {
    onUpdate(cached);
  }

  const q = query(collection(db, "catering"), where("claId", "==", claId));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const docVal = snapshot.docs[0];
      const data = { id: docVal.id, ...docVal.data() } as CateringInfo;
      setLocalCache(cacheKey, data);
      onUpdate(data);
    } else {
      const existing = getLocalCache<CateringInfo | null>(cacheKey, null);
      if (!existing) onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    const fallback = getLocalCache<CateringInfo | null>(cacheKey, null);
    if (fallback) onUpdate(fallback);
  });
}

export async function saveCatering(catering: CateringInfo): Promise<void> {
  const path = "catering";
  const data = cleanUndefined(catering);
  if (catering.claId) {
    setLocalCache(`catering_${catering.claId}`, data);
  }

  try {
    if (data.id) {
      await setDoc(doc(db, "catering", data.id), data);
    } else {
      const res = await addDoc(collection(db, "catering"), data);
      data.id = res.id;
      if (catering.claId) setLocalCache(`catering_${catering.claId}`, data);
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
  const cacheKey = `photos_${claId}`;

  const cached = getLocalCache<PhotoRecord[]>(cacheKey, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const q = query(collection(db, "photos"), where("claId", "==", claId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const photos: PhotoRecord[] = [];
    snapshot.forEach((doc) => {
      photos.push({ id: doc.id, ...doc.data() } as PhotoRecord);
    });
    setLocalCache(cacheKey, photos);
    onUpdate(photos);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    const fallback = getLocalCache<PhotoRecord[]>(cacheKey, []);
    if (fallback.length > 0) onUpdate(fallback);
  });
}

export async function addPhoto(photo: Omit<PhotoRecord, "id">): Promise<void> {
  const path = "photos";
  const tempPhoto: PhotoRecord = { id: `photo_${Date.now()}`, ...photo };

  if (photo.claId) {
    const cached = getLocalCache<PhotoRecord[]>(`photos_${photo.claId}`, []);
    cached.unshift(tempPhoto);
    setLocalCache(`photos_${photo.claId}`, cached);
  }

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
  const cacheKey = `cla_activities_${claId}`;

  const cached = getLocalCache<ClaActivities | null>(cacheKey, null);
  if (cached) {
    onUpdate(cached);
  }

  const q = query(collection(db, "claActivities"), where("claId", "==", claId));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const docVal = snapshot.docs[0];
      const data = { id: docVal.id, ...docVal.data() } as ClaActivities;
      setLocalCache(cacheKey, data);
      onUpdate(data);
    } else {
      const existing = getLocalCache<ClaActivities | null>(cacheKey, null);
      if (!existing) onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    const fallback = getLocalCache<ClaActivities | null>(cacheKey, null);
    if (fallback) onUpdate(fallback);
  });
}

export async function saveClaActivities(activities: ClaActivities): Promise<void> {
  const path = "claActivities";
  const data = cleanUndefined({ ...activities });
  if (data.id === undefined) {
    delete data.id;
  }
  if (activities.claId) {
    setLocalCache(`cla_activities_${activities.claId}`, data);
  }

  try {
    if (data.id) {
      await setDoc(doc(db, "claActivities", data.id), data);
    } else {
      const res = await addDoc(collection(db, "claActivities"), data);
      data.id = res.id;
      if (activities.claId) setLocalCache(`cla_activities_${activities.claId}`, data);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToAllClaActivities(onUpdate: (activities: ClaActivities[]) => void) {
  const path = "claActivities";
  const cacheKey = "all_cla_activities";

  const cached = getLocalCache<ClaActivities[]>(cacheKey, []);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const q = query(collection(db, "claActivities"));
  return onSnapshot(q, (snapshot) => {
    const activities: ClaActivities[] = [];
    snapshot.forEach((doc) => {
      activities.push({ id: doc.id, ...doc.data() } as ClaActivities);
    });
    setLocalCache(cacheKey, activities);
    onUpdate(activities);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    const fallback = getLocalCache<ClaActivities[]>(cacheKey, []);
    if (fallback.length > 0) onUpdate(fallback);
  });
}
