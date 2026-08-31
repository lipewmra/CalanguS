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
  ClaActivities,
  DidacticMaterial,
  MaterialAccessLog
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
// 0. Email Normalization & Matching Helpers
// ==========================================

export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  let clean = String(email).toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF]/g, ""); // remove zero-width / hidden chars
  clean = clean.replace(/\s+/g, ""); // remove internal whitespace
  
  if (clean.includes("@")) {
    const [user, domain] = clean.split("@");
    let normDomain = domain;
    if (normDomain === "googlemail.com") normDomain = "gmail.com";
    if (normDomain === "gmail.com") {
      // Remove dots and plus-tag addressing for gmail accounts
      const cleanUser = user.replace(/\./g, "").split("+")[0];
      return `${cleanUser}@${normDomain}`;
    }
    return `${user}@${normDomain}`;
  }
  return clean;
}

export function areEmailsMatching(emailA: string | null | undefined, emailB: string | null | undefined): boolean {
  if (!emailA || !emailB) return false;
  const rawA = String(emailA).toLowerCase().trim();
  const rawB = String(emailB).toLowerCase().trim();
  if (rawA === rawB) return true;
  
  const normA = normalizeEmail(rawA);
  const normB = normalizeEmail(rawB);
  if (normA && normB && normA === normB) return true;
  
  // Check if both are Gmail and the base username matches
  const [userA, domainA] = rawA.split("@");
  const [userB, domainB] = rawB.split("@");
  if (domainA?.includes("gmail") && domainB?.includes("gmail")) {
    const cleanUserA = (userA || "").replace(/[\._\-+]/g, "").replace(/\d+$/, "");
    const cleanUserB = (userB || "").replace(/[\._\-+]/g, "").replace(/\d+$/, "");
    if (cleanUserA && cleanUserB && cleanUserA.length >= 4 && cleanUserA === cleanUserB) return true;
  }
  
  return false;
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
  const targetEmail = (email || "").toLowerCase().trim();
  if (!targetEmail) return null;

  // Try cached users first
  const allCached = getLocalCache<UserProfile[]>("all_users", []);
  const cachedMatch = allCached.find(u => 
    areEmailsMatching(u.email, targetEmail) || 
    (u.emails || []).some(e => areEmailsMatching(e, targetEmail))
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

    // Fallback scan across users collection with flexible matching
    const allUsersSnap = await getDocs(collection(db, "users"));
    for (const docSnap of allUsersSnap.docs) {
      const u = docSnap.data() as UserProfile;
      if (areEmailsMatching(u.email, targetEmail) || (u.emails || []).some(e => areEmailsMatching(e, targetEmail))) {
        setLocalCache(`user_${u.uid}`, u);
        return u;
      }
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
  const targetEmail = (email || "").toLowerCase().trim();
  if (!targetEmail) return null;

  // Check local cache first
  const allUsers = getLocalCache<UserProfile[]>("all_users", []);
  const cachedMatch = allUsers.find(u => 
    areEmailsMatching(u.email, targetEmail) || 
    (u.emails || []).some(e => areEmailsMatching(e, targetEmail))
  );

  try {
    let snap = await getDocs(query(collection(db, "users"), where("email", "==", targetEmail)));
    if (snap.empty) {
      try {
        snap = await getDocs(query(collection(db, "users"), where("emails", "array-contains", targetEmail)));
      } catch { /* ignore */ }
    }
    
    // If not found directly, scan users collection for case-insensitive match
    if (snap.empty) {
      const allUsersSnap = await getDocs(collection(db, "users"));
      const matchedDoc = allUsersSnap.docs.find(d => {
        const u = d.data() as UserProfile;
        if (areEmailsMatching(u.email, targetEmail)) return true;
        return (u.emails || []).some(e => areEmailsMatching(e, targetEmail));
      });
      if (matchedDoc) {
        snap = { empty: false, docs: [matchedDoc] } as any;
      }
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

// Check if email is registered in system (users, collaborators, or SuperAdmin)
export async function checkEmailRegistered(email: string): Promise<{
  isRegistered: boolean;
  name?: string;
  role?: string;
  source?: "superadmin" | "user" | "collaborator";
}> {
  const targetEmail = (email || "").toLowerCase().trim();
  if (!targetEmail) return { isRegistered: false };

  // 1. Check SuperAdmin
  if (areEmailsMatching(targetEmail, "lipewmra@gmail.com") || areEmailsMatching(targetEmail, "philippewagnermra@gmail.com")) {
    return { isRegistered: true, name: "Philippe Wagner", role: "SuperAdmin", source: "superadmin" };
  }

  // 2. Check users collection
  try {
    const userProfile = await getUserProfileByEmail(targetEmail);
    if (userProfile) {
      return { isRegistered: true, name: userProfile.name, role: userProfile.role, source: "user" };
    }
  } catch (e) {
    console.warn("Could not check users collection:", e);
  }

  // 3. Check collaborators collection
  try {
    const collab = await findCollaboratorByEmail(targetEmail);
    if (collab) {
      if (collab.status === "Recusado" || collab.status === "Cancelado" || (collab as any).status === "Desistente") {
        return { isRegistered: false };
      }
      return { isRegistered: true, name: collab.name, role: "Colaborador", source: "collaborator" };
    }
  } catch (e) {
    console.warn("Could not check collaborators collection:", e);
  }

  return { isRegistered: false };
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
      // Ensure exam dates are consistently [08/11/2026, 15/11/2026] if not specified or outdated
      if (!data.examDates || data.examDates.length === 0 || data.examDates[0] === "01/11/2026" || data.examDates[0] === "03/11/2024" || data.examDates[0] === "03/11/2026") {
        data.examDates = ["08/11/2026", "15/11/2026"];
      }
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
  // Ensure examDates are sanitized
  if (!cleaned.examDates || cleaned.examDates.length === 0 || cleaned.examDates[0] === "01/11/2026" || cleaned.examDates[0] === "03/11/2024" || cleaned.examDates[0] === "03/11/2026") {
    cleaned.examDates = ["08/11/2026", "15/11/2026"];
  }
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
    if (!cached.examDates || cached.examDates.length === 0 || cached.examDates[0] === "01/11/2026" || cached.examDates[0] === "03/11/2024" || cached.examDates[0] === "03/11/2026") {
      cached.examDates = ["08/11/2026", "15/11/2026"];
    }
    onUpdate(cached);
  }

  const q = query(collection(db, "eventConfigs"), orderBy("year", "desc"));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const docVal = snapshot.docs[0];
      const data = { id: docVal.id, ...docVal.data() } as EventConfigInfo;
      if (!data.examDates || data.examDates.length === 0 || data.examDates[0] === "01/11/2026" || data.examDates[0] === "03/11/2024" || data.examDates[0] === "03/11/2026") {
        data.examDates = ["08/11/2026", "15/11/2026"];
      }
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
  if (!targetEmail) return null;

  // Search local cache first with flexible email matching
  const allCollabs = getLocalCache<CollaboratorInfo[]>("all_collaborators", []);
  const cachedMatch = allCollabs.find(c => {
    if (areEmailsMatching(c.email, targetEmail)) return true;
    const cEmails: string[] = (c as any).emails || [];
    return cEmails.some(e => areEmailsMatching(e, targetEmail));
  });
  if (cachedMatch) return cachedMatch;

  try {
    // 1. Direct lowercase email match
    let q = query(collection(db, "collaborators"), where("email", "==", targetEmail));
    let snap = await getDocs(q);
    if (!snap.empty) {
      const docVal = snap.docs[0];
      const data = { id: docVal.id, ...docVal.data() } as CollaboratorInfo;
      return postProcessCollabMatch(data, targetEmail);
    }

    // 2. Direct normalized email match
    const normEmail = normalizeEmail(targetEmail);
    if (normEmail && normEmail !== targetEmail) {
      try {
        const qNorm = query(collection(db, "collaborators"), where("email", "==", normEmail));
        const snapNorm = await getDocs(qNorm);
        if (!snapNorm.empty) {
          const docVal = snapNorm.docs[0];
          const data = { id: docVal.id, ...docVal.data() } as CollaboratorInfo;
          return postProcessCollabMatch(data, targetEmail);
        }
      } catch { /* ignore */ }
    }

    // 3. Query where emails array contains targetEmail
    try {
      q = query(collection(db, "collaborators"), where("emails", "array-contains", targetEmail));
      snap = await getDocs(q);
      if (!snap.empty) {
        const docVal = snap.docs[0];
        const data = { id: docVal.id, ...docVal.data() } as CollaboratorInfo;
        return postProcessCollabMatch(data, targetEmail);
      }
    } catch { /* array-contains index fallback */ }

    // 4. Fallback scan across all collaborators to guarantee flexible & trimmed matching
    const allSnap = await getDocs(collection(db, "collaborators"));
    for (const docVal of allSnap.docs) {
      const data = { id: docVal.id, ...docVal.data() } as CollaboratorInfo;
      if (areEmailsMatching(data.email, targetEmail)) {
        return postProcessCollabMatch(data, targetEmail);
      }
      const cEmails: string[] = (data as any).emails || [];
      if (cEmails.some(e => areEmailsMatching(e, targetEmail))) {
        return postProcessCollabMatch(data, targetEmail);
      }
    }

    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return cachedMatch || null;
  }
}

// Helper to auto-upgrade status to Confirmado if allocated and ensure emails list has active login
async function postProcessCollabMatch(data: CollaboratorInfo, activeLoginEmail: string): Promise<CollaboratorInfo> {
  const isAllocatedOrConfirmed = 
    (data.assignedRole && data.assignedRole.trim() !== "") ||
    (data.assignedRoom && data.assignedRoom.trim() !== "") ||
    data.isReserve === true ||
    data.attendanceStatus === "Confirmado" ||
    data.status === "Confirmado" ||
    (data as any).status === "Aprovado";

  let needsSave = false;
  const updates: Partial<CollaboratorInfo> = {};

  if (isAllocatedOrConfirmed && data.status !== "Confirmado" && data.status !== "Recusado") {
    data.status = "Confirmado";
    updates.status = "Confirmado";
    needsSave = true;
  }

  const existingEmails = Array.isArray((data as any).emails) ? (data as any).emails : [];
  if (!existingEmails.some((e: string) => areEmailsMatching(e, activeLoginEmail)) && !areEmailsMatching(data.email, activeLoginEmail)) {
    const updatedEmails = Array.from(new Set([...existingEmails, activeLoginEmail, data.email].filter(Boolean)));
    (data as any).emails = updatedEmails;
    updates.emails = updatedEmails;
    needsSave = true;
  }

  if (needsSave && data.id) {
    try {
      await updateDoc(doc(db, "collaborators", data.id), cleanUndefined(updates));
    } catch { /* ignore non-blocking */ }
  }

  return data;
}

export async function findCollaboratorByCpf(cpf: string): Promise<CollaboratorInfo | null> {
  const path = "collaborators";
  const targetCpf = (cpf || "").replace(/\D/g, "");
  if (!targetCpf || targetCpf.length < 11) return null;

  // Search local cache first
  const allCollabs = getLocalCache<CollaboratorInfo[]>("all_collaborators", []);
  const cachedMatch = allCollabs.find(c => (c.cpf || "").replace(/\D/g, "") === targetCpf);
  if (cachedMatch) return cachedMatch;

  try {
    const allSnap = await getDocs(collection(db, "collaborators"));
    for (const docVal of allSnap.docs) {
      const data = { id: docVal.id, ...docVal.data() } as CollaboratorInfo;
      if ((data.cpf || "").replace(/\D/g, "") === targetCpf) {
        return data;
      }
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
  
  const normalizedEmail = (collab.email || "").toLowerCase().trim();
  const fullCollab: CollaboratorInfo = { 
    id: tempId, 
    ...collab,
    email: normalizedEmail
  };

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
    const toSave = cleanUndefined({
      ...collab,
      email: normalizedEmail
    });
    const res = await addDoc(collection(db, "collaborators"), toSave);
    fullCollab.id = res.id;
    setLocalCache("all_collaborators", allCollabs);
    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return tempId;
  }
}

function sanitizeFirestoreUpdates(updates: Record<string, any>, isRoot = true): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined) {
      if (isRoot) {
        sanitized[key] = deleteField();
      }
    } else if (val === null) {
      if (isRoot) {
        sanitized[key] = deleteField();
      } else {
        sanitized[key] = null;
      }
    } else if (typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      sanitized[key] = sanitizeFirestoreUpdates(val, false);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export async function updateCollaborator(id: string, updates: Partial<CollaboratorInfo>): Promise<void> {
  const path = `collaborators/${id}`;

  const cleanUpdates: Partial<CollaboratorInfo> = { ...updates };
  if (cleanUpdates.email !== undefined) {
    cleanUpdates.email = (cleanUpdates.email || "").toLowerCase().trim();
  }

  // Optimistic local cache update
  const allCollabs = getLocalCache<CollaboratorInfo[]>("all_collaborators", []);
  const target = allCollabs.find(c => c.id === id);
  if (target) {
    const oldClaId = target.claId;
    Object.assign(target, cleanUpdates);
    setLocalCache("all_collaborators", allCollabs);

    // Sync old CLA cache
    if (oldClaId) {
      const oldClaCollabs = getLocalCache<CollaboratorInfo[]>(`collabs_${oldClaId}`, []);
      if (cleanUpdates.claId && cleanUpdates.claId !== oldClaId) {
        setLocalCache(`collabs_${oldClaId}`, oldClaCollabs.filter(c => c.id !== id));
      } else {
        const cIdx = oldClaCollabs.findIndex(c => c.id === id);
        if (cIdx >= 0) {
          Object.assign(oldClaCollabs[cIdx], cleanUpdates);
          setLocalCache(`collabs_${oldClaId}`, oldClaCollabs);
        }
      }
    }

    // Sync new CLA cache
    if (cleanUpdates.claId && cleanUpdates.claId !== oldClaId) {
      const newClaCollabs = getLocalCache<CollaboratorInfo[]>(`collabs_${cleanUpdates.claId}`, []);
      const nIdx = newClaCollabs.findIndex(c => c.id === id);
      if (nIdx >= 0) {
        Object.assign(newClaCollabs[nIdx], target);
      } else {
        newClaCollabs.push(target);
      }
      setLocalCache(`collabs_${cleanUpdates.claId}`, newClaCollabs);
    }
  }

  try {
    const sanitizedUpdates = sanitizeFirestoreUpdates(cleanUpdates as Record<string, any>);
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
  const originClaId = collaborator.originalClaId || collaborator.claId;
  const originClaName = collaborator.originalClaName || collaborator.claName || "CLA Mantenedor Inicial";

  const request: TransferRequestInfo = {
    requestId: `req_${Date.now()}`,
    targetClaId: targetCla.uid,
    targetClaName: targetCla.name || targetCla.email || "CLA Solicitante",
    targetBuildingName: targetCla.buildingName || "",
    targetUserEmail: targetCla.email || "",
    targetClaPhone: targetCla.phone || "",
    requestedAt: new Date().toISOString(),
    status: "Pendente",
    notes: notes || ""
  };

  await updateCollaborator(collaborator.id, {
    transferRequest: request,
    originalClaId: originClaId,
    originalClaName: originClaName
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

// ==========================================
// 8. Reset All Messages Sent from CLA
// ==========================================

export async function resetAllClaMessages(activeClaId?: string): Promise<void> {
  // 1. Clear LocalStorage keys
  try {
    localStorage.removeItem("enem_internal_messages");
    localStorage.removeItem("enem_sent_messages_log");
    localStorage.setItem("enem_internal_messages", JSON.stringify([]));
    localStorage.setItem("enem_sent_messages_log", JSON.stringify([]));
  } catch (e) {
    console.warn("Error clearing message localStorage:", e);
  }

  // 2. Clear local cache for all buildings
  const allBuildings = getLocalCache<BuildingInfo[]>("all_buildings", []);
  const updatedBuildings = allBuildings.map(b => ({
    ...b,
    messages: []
  }));
  setLocalCache("all_buildings", updatedBuildings);

  if (activeClaId) {
    const singleKey = `building_${activeClaId}`;
    const cachedSingle = getLocalCache<BuildingInfo | null>(singleKey, null);
    if (cachedSingle) {
      setLocalCache(singleKey, { ...cachedSingle, messages: [] });
    }
  }

  // Also clean any cache in localStorage starting with building_
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("calangus_v2_building_") || key.startsWith("building_"))) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            if (parsed && parsed.data && Array.isArray(parsed.data.messages)) {
              parsed.data.messages = [];
              localStorage.setItem(key, JSON.stringify(parsed));
            } else if (parsed && Array.isArray(parsed.messages)) {
              parsed.messages = [];
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          } catch { /* ignore */ }
        }
      }
    }
  } catch (e) {
    console.warn(e);
  }

  // 3. Update Firestore documents in buildings collection to empty messages array
  try {
    const snap = await getDocs(collection(db, "buildings"));
    for (const d of snap.docs) {
      await updateDoc(doc(db, "buildings", d.id), { messages: [] });
    }
  } catch (error) {
    console.warn("Could not wipe messages from firestore buildings online:", error);
  }

  // 4. Dispatch custom events so all tabs & components update in real-time
  try {
    window.dispatchEvent(new CustomEvent("calangus_message_sent", { detail: { reset: true } }));
    window.dispatchEvent(new CustomEvent("calangus_response_submitted", { detail: { reset: true } }));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.warn(e);
  }
}

// ==========================================
// 10. Didactic Materials & Training Management
// ==========================================

export function subscribeToDidacticMaterials(
  onUpdate: (materials: DidacticMaterial[]) => void,
  onError?: (err: any) => void
) {
  const cacheKey = "didactic_materials";
  const initial = getLocalCache<DidacticMaterial[]>(cacheKey, []);
  onUpdate(initial);

  const colRef = collection(db, "didactic_materials");
  const q = query(colRef, orderBy("createdAt", "desc"));

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const items: DidacticMaterial[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          title: data.title || "",
          roles: Array.isArray(data.roles) ? data.roles : ["all"],
          accessUrl: data.accessUrl || "",
          instructionText: data.instructionText || "",
          createdAt: data.createdAt || new Date().toISOString(),
          createdBy: data.createdBy,
          updatedAt: data.updatedAt
        });
      });
      setLocalCache(cacheKey, items);
      onUpdate(items);
    },
    (err) => {
      console.warn("Firestore error subscribing to didactic materials (fallback to local cache):", err);
      if (onError) onError(err);
    }
  );

  return unsub;
}

export async function saveDidacticMaterial(material: Omit<DidacticMaterial, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<string> {
  const cacheKey = "didactic_materials";
  const current = getLocalCache<DidacticMaterial[]>(cacheKey, []);
  const now = new Date().toISOString();

  let targetId = material.id;
  if (!targetId) {
    targetId = `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  const completeMaterial: DidacticMaterial = {
    id: targetId,
    title: material.title.trim(),
    roles: material.roles && material.roles.length > 0 ? material.roles : ["all"],
    accessUrl: material.accessUrl.trim(),
    instructionText: material.instructionText.trim(),
    createdAt: material.createdAt || now,
    createdBy: material.createdBy,
    updatedAt: now
  };

  const updatedList = [
    completeMaterial,
    ...current.filter((m) => m.id !== targetId)
  ];
  setLocalCache(cacheKey, updatedList);

  try {
    const docRef = doc(db, "didactic_materials", targetId);
    await setDoc(docRef, completeMaterial, { merge: true });
  } catch (err) {
    console.warn("Firestore error saving didactic material (saved locally):", err);
  }

  try {
    window.dispatchEvent(new CustomEvent("calangus_materials_updated", { detail: completeMaterial }));
  } catch {}

  return targetId;
}

export async function deleteDidacticMaterial(materialId: string): Promise<void> {
  const cacheKey = "didactic_materials";
  const current = getLocalCache<DidacticMaterial[]>(cacheKey, []);
  const updatedList = current.filter((m) => m.id !== materialId);
  setLocalCache(cacheKey, updatedList);

  try {
    const docRef = doc(db, "didactic_materials", materialId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore error deleting didactic material (removed locally):", err);
  }

  try {
    window.dispatchEvent(new CustomEvent("calangus_materials_updated", { detail: { deletedId: materialId } }));
  } catch {}
}

export async function recordCollaboratorMaterialAccess(
  collaboratorId: string,
  materialId: string,
  materialTitle: string
): Promise<void> {
  if (!collaboratorId || !materialId) return;

  const now = new Date().toISOString();
  const newLog: MaterialAccessLog = {
    materialId,
    materialTitle,
    accessedAt: now
  };

  try {
    // 1. Update in collaborator document if exists in firestore
    const collabRef = doc(db, "collaborators", collaboratorId);
    const snap = await getDoc(collabRef);
    if (snap.exists()) {
      const data = snap.data();
      const existingLogs: MaterialAccessLog[] = Array.isArray(data.materialsAccessed) ? data.materialsAccessed : [];
      // avoid duplicate spam on same day/minute or just append
      const alreadyHas = existingLogs.some(l => l.materialId === materialId && (new Date(l.accessedAt).toDateString() === new Date().toDateString()));
      if (!alreadyHas) {
        await updateDoc(collabRef, {
          materialsAccessed: [newLog, ...existingLogs]
        });
      }
    }
  } catch (err) {
    console.warn("Error updating collaborator material access log in firestore:", err);
  }

  // 2. Broadcast and local cache update
  try {
    window.dispatchEvent(new CustomEvent("calangus_material_accessed", { detail: { collaboratorId, ...newLog } }));
  } catch {}
}

