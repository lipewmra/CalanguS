import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
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
  BuildingInfo, 
  CollaboratorInfo, 
  CateringInfo, 
  PhotoRecord, 
  EventConfigInfo,
  ClaActivities
} from "../types";

// ==========================================
// 1. User Profiles & Simulated Auth Service
// ==========================================

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
    await setDoc(doc(db, "users", profile.uid), profile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Subscribe to Users List (for SuperAdmin to configure permissions)
export function subscribeToUsers(onUpdate: (users: UserProfile[]) => void, onError: (err: any) => void) {
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
    onError(error);
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

// Find user profile by email
export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const path = "users";
  try {
    const q = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docVal = snap.docs[0];
      return { ...docVal.data() } as UserProfile;
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
    const finalProfile = { ...profile, uid: userRef.id };
    await setDoc(userRef, finalProfile);
    return userRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return "";
  }
}

// Claim draft profiles on Google Auth login
export async function claimProfileByEmail(email: string, newUid: string): Promise<UserProfile | null> {
  const path = "users";
  try {
    const q = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const firstDoc = snap.docs[0];
      const data = firstDoc.data() as UserProfile;
      
      // If the preregistered user doc has a different id from newUid, clean up the old one
      if (firstDoc.id !== newUid) {
        await deleteDoc(doc(db, "users", firstDoc.id));
      }
      
      const mergedProfile = { ...data, uid: newUid };
      await setDoc(doc(db, "users", newUid), mergedProfile);
      return mergedProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
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
    if (config.id) {
      await setDoc(doc(db, "eventConfigs", config.id), config);
      return config.id;
    } else {
      const res = await addDoc(collection(db, "eventConfigs"), config);
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
    const data = { ...building };
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

export async function updateCollaborator(id: string, updates: Partial<CollaboratorInfo>): Promise<void> {
  const path = `collaborators/${id}`;
  try {
    await updateDoc(doc(db, "collaborators", id), updates);
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
    if (catering.id) {
      await setDoc(doc(db, "catering", catering.id), catering);
    } else {
      await addDoc(collection(db, "catering"), catering);
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
    await addDoc(collection(db, "photos"), photo);
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
    const data = { ...activities };
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

// ==========================================
// 8. MASTER RESET (Cebraspe Central only)
// ==========================================
export async function masterResetDatabase(): Promise<void> {
  const collections = ["users", "eventConfigs", "buildings", "collaborators", "catering", "photos", "claActivities"];
  try {
    for (const colName of collections) {
      const snap = await getDocs(collection(db, colName));
      const deletePromises = snap.docs.map(async (docVal) => {
        const path = `${colName}/${docVal.id}`;
        try {
          await deleteDoc(doc(db, colName, docVal.id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      });
      await Promise.all(deletePromises);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, "master-reset");
    throw error;
  }
}

