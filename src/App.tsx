import React, { useState, useEffect, useMemo } from "react";
import { 
  UserProfile, 
  BuildingInfo, 
  CollaboratorInfo, 
  CateringInfo, 
  PhotoRecord, 
  EventConfigInfo,
  UserRole,
  ClaActivities
} from "./types";
import { 
  subscribeToEventConfig, 
  subscribeToBuilding, 
  subscribeToCollaborators, 
  subscribeToAllCollaborators,
  subscribeToAllBuildings,
  subscribeToUsers,
  subscribeToCatering, 
  subscribeToPhotos,
  saveEventConfig,
  saveBuilding,
  saveCatering,
  addPhoto,
  deletePhoto,
  addCollaborator,
  updateCollaborator,
  deleteCollaborator,
  saveUserProfile,
  deleteUserProfile,
  getCurrentUserProfile,
  getUserProfileByEmail,
  claimProfileByEmail,
  findCollaboratorByEmail,
  subscribeToColegas,
  subscribeToUserProfile,
  subscribeToClaActivities,
  requestCollaboratorTransfer,
  approveCollaboratorTransfer,
  rejectCollaboratorTransfer,
  cancelCollaboratorTransfer,
  resolveSuperAdminAndClaProfile,
  resetAllClaMessages,
  normalizeEmail,
  areEmailsMatching,
  checkEmailRegistered
} from "./lib/db-services";

import SuperAdminDash from "./components/SuperAdminDash";
import BuildingConfigView from "./components/BuildingConfigView";
import CollaboratorManager from "./components/CollaboratorManager";
import CateringView from "./components/CateringView";
import PhotoRecordLogsView from "./components/PhotoRecordLogsView";
import RoomPlatesPrint from "./components/RoomPlatesPrint";
import DragAndDropReserves from "./components/DragAndDropReserves";
import AssociationView from "./components/AssociationView";
import CollaboratorDashboard from "./components/CollaboratorDashboard";
import AccessManagementView from "./components/AccessManagementView";
import ClaActivitiesView from "./components/ClaActivitiesView";
import ExportAllocationsView from "./components/ExportAllocationsView";
import CombinedPrintExportView from "./components/CombinedPrintExportView";
import PublicRegisterForm from "./components/PublicRegisterForm";
import SettingsModal, { FontSizeOption, ColorThemeOption } from "./components/SettingsModal";
import FiscalAvatar from "./components/FiscalAvatar";
import CollaboratorSettingsView from "./components/CollaboratorSettingsView";
import MessagingCenter from "./components/MessagingCenter";
import AttendanceListView from "./components/AttendanceListView";
import SimulateCollaboratorModal from "./components/SimulateCollaboratorModal";
import CalangusIaView from "./components/CalangusIaView";

import { 
  ShieldAlert, Landmark, Users, Coffee, Camera, Layers, 
  Printer, Sun, Moon, Sparkles, HelpCircle, MapPin,
  Navigation, CheckCircle2, AlertTriangle, Play, LogOut, CheckSquare, UserCheck,
  ChevronLeft, ChevronRight, ChevronDown, FileSpreadsheet, MessageSquare,
  Activity, Calendar, PlusCircle, Trash2, Settings, ClipboardCheck, Clock,
  SlidersHorizontal, Eye, EyeOff, ArrowRightLeft, BookOpen, Bot, ExternalLink,
  Lock, Mail, ArrowRight, RefreshCw, AlertCircle, KeyRound, Check
} from "lucide-react";
import { 
  GoogleAuthProvider, 
  OAuthProvider,
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { auth } from "./firebase";

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark" >(() => {
    const stored = localStorage.getItem("enem_app_theme");
    return (stored as "light" | "dark") || "dark";
  });

  // Font size state (6 predefined sizes: 5pt, 8pt, 12pt, 14pt, 18pt, 24pt)
  const [fontSize, setFontSize] = useState<FontSizeOption>(() => {
    const stored = localStorage.getItem("calangus_font_size");
    return (stored as FontSizeOption) || "12pt";
  });

  // Color theme state (6 themes: emerald, ocean, amethyst, amber, crimson, monochrome)
  const [colorTheme, setColorTheme] = useState<ColorThemeOption>(() => {
    const stored = localStorage.getItem("calangus_color_theme");
    return (stored as ColorThemeOption) || "emerald";
  });

  // Settings modal visibility state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sidebar collapsible state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("enem_sidebar_collapsed") === "true";
  });

  // Startup splash animation state
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSplash(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    localStorage.setItem("enem_app_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("calangus_font_size", fontSize);
    document.documentElement.style.fontSize = fontSize;
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem("calangus_color_theme", colorTheme);
    document.documentElement.setAttribute("data-color-theme", colorTheme);
  }, [colorTheme]);

  // Authentication & Connection readiness state
  const [authInitialized, setAuthInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Derive the active operating role strictly when currentUser exists
  const effectiveRole: UserRole | null = currentUser ? (selectedRole || currentUser.role || "Colaborador") : null;
  const effectiveUser = (currentUser && effectiveRole) ? { ...currentUser, role: effectiveRole } : null;

  // Sync selectedRole with currentUser.role when currentUser changes, but keep if within their roles array
  useEffect(() => {
    if (currentUser) {
      const roles = currentUser.roles || [currentUser.role];
      if (selectedRole && !roles.includes(selectedRole)) {
        setSelectedRole(currentUser.role);
      } else if (!selectedRole) {
        setSelectedRole(currentUser.role);
      }
    } else {
      setSelectedRole(null);
    }
  }, [currentUser]);

  // Teammates / Colegas list for CLA/ALA Access Management
  const [colegas, setColegas] = useState<UserProfile[]>([]);

  // Database States
  const [eventConfig, setEventConfig] = useState<EventConfigInfo | null>(null);
  const [building, setBuilding] = useState<BuildingInfo | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [allCollaborators, setAllCollaborators] = useState<CollaboratorInfo[]>([]);
  const [allBuildings, setAllBuildings] = useState<BuildingInfo[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [catering, setCatering] = useState<CateringInfo | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [claActivities, setClaActivities] = useState<ClaActivities | null>(null);

  // CLA and SuperAdmin UI Active Section
  const [activeTab, setActiveTab] = useState<string>("");

  // Secondary Authentication (Apple & Email/Password) States
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFlowStep, setEmailFlowStep] = useState<"check" | "login" | "register">("check");
  const [emailFlowLoading, setEmailFlowLoading] = useState(false);
  const [emailFlowError, setEmailFlowError] = useState("");
  const [emailFlowSuccess, setEmailFlowSuccess] = useState("");
  const [identifiedName, setIdentifiedName] = useState("");

  // Public recruitment form bypass state (supports route query parameters of Vercel production)
  const [isPublicForm, setIsPublicForm] = useState<boolean>(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    return (
      path === "/cadastro" ||
      path === "/fiscais" ||
      path === "/recrutamento" ||
      hash.startsWith("#/cadastro") ||
      hash.startsWith("#/fiscais") ||
      hash.startsWith("#/recrutamento") ||
      path.includes("/cadastro") ||
      path.includes("/fiscais") ||
      path.includes("/recrutamento")
    );
  });

  // Memoized human-readable CLA name for reports and views
  const resolvedClaName = useMemo(() => {
    if (effectiveRole === "CLA" && (effectiveUser?.name || currentUser?.name)) {
      return (effectiveUser?.name || currentUser?.name || "").trim();
    }
    const targetClaId = building?.claId || (effectiveUser?.claId || effectiveUser?.uid);
    if (targetClaId) {
      const userMatch = allUsers.find(u => u.uid === targetClaId || u.claId === targetClaId);
      if (userMatch?.name && userMatch.name.trim() !== "") {
        return userMatch.name.trim();
      }
      const colegaMatch = colegas.find(c => c.uid === targetClaId || c.role === "CLA" || (c.roles || []).includes("CLA"));
      if (colegaMatch?.name && colegaMatch.name.trim() !== "") {
        return colegaMatch.name.trim();
      }
    }
    if (effectiveUser?.name && effectiveUser.name.trim() !== "") return effectiveUser.name.trim();
    if (currentUser?.name && currentUser.name.trim() !== "") return currentUser.name.trim();
    return "Coordenação de Local de Aplicação (CLA)";
  }, [effectiveRole, effectiveUser, currentUser, building?.claId, allUsers, colegas]);

  // Colaborador simulation states
  const [individualConfirmationStatus, setIndividualConfirmationStatus] = useState<"Pendente" | "Confirmado" | "Recusado">("Pendente");
  const [simulatedCollaborator, setSimulatedCollaborator] = useState<CollaboratorInfo | null>(null);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);

  // Unregistered user redirection states for public fiscal form
  const [publicFormPrefill, setPublicFormPrefill] = useState<{ email?: string; name?: string }>({});
  const [unregisteredNotice, setUnregisteredNotice] = useState<string>("");

  // CLA registration and edit states
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCoordCode, setRegCoordCode] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isQuotaMode, setIsQuotaMode] = useState(false);

  // Listen to Firestore quota status
  useEffect(() => {
    const handleQuotaEvent = (e: any) => {
      setIsQuotaMode(true);
    };
    window.addEventListener("calangus_firestore_quota_status", handleQuotaEvent);
    return () => {
      window.removeEventListener("calangus_firestore_quota_status", handleQuotaEvent);
    };
  }, []);

  // One-time clean reset requested by CLA: clear old sent messages so collaborator inboxes are completely clean
  useEffect(() => {
    const hasReset = localStorage.getItem("enem_messages_reset_v1");
    if (!hasReset) {
      resetAllClaMessages(effectiveUser?.uid || currentUser?.uid);
      localStorage.setItem("enem_messages_reset_v1", "true");
    }
  }, [effectiveUser?.uid, currentUser?.uid]);

  // Sync registration fields when currentUser overrides
  useEffect(() => {
    if (currentUser) {
      setRegName(currentUser.name || "");
      setRegEmail(currentUser.email || "");
      setRegCoordCode(currentUser.coordinationCode || "");
      setRegError("");
    }
  }, [currentUser]);

  // Adjust active tab when switching roles or entering as SuperAdmin
  useEffect(() => {
    if (effectiveRole === "SuperAdmin") {
      setActiveTab((prev) => (prev && prev.startsWith("admin-")) ? prev : "");
    } else {
      setActiveTab((prev) => (prev && !prev.startsWith("admin-")) ? prev : "");
    }
  }, [effectiveRole]);

  const handleClaRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (!regName.trim()) {
      setRegError("O nome completo é obrigatório.");
      return;
    }
    if (!regEmail.trim()) {
      setRegError("O e-mail é obrigatório.");
      return;
    }
    if (!regCoordCode.trim()) {
      setRegError("O código de coordenação é obrigatório.");
      return;
    }

    // Validate only digits
    if (!/^\d+$/.test(regCoordCode)) {
      setRegError("O código de coordenação deve conter apenas números.");
      return;
    }

    setRegLoading(true);
    try {
      if (currentUser) {
        const updatedProfile: UserProfile = {
          ...currentUser,
          name: regName,
          email: regEmail,
          coordinationCode: regCoordCode,
        };
        await saveUserProfile(updatedProfile);
        setCurrentUser(updatedProfile);

        if (building) {
          const updatedBuilding = { ...building, coordRoom: regCoordCode };
          await saveBuilding(updatedBuilding);
          setBuilding(updatedBuilding);
        }

        setIsEditingProfile(false);
      }
    } catch (err) {
      console.error(err);
      setRegError("Erro ao salvar cadastro. Tente novamente.");
    } finally {
      setRegLoading(false);
    }
  };

  // Handler to save building and keep coordination code synchronized with user profile
  const handleSaveBuildingAndSyncUser = async (bData: BuildingInfo) => {
    await saveBuilding(bData);
    setBuilding(bData);
    if (currentUser && bData.coordRoom && bData.coordRoom !== currentUser.coordinationCode) {
      const updatedProfile = { ...currentUser, coordinationCode: bData.coordRoom };
      await saveUserProfile(updatedProfile);
      setCurrentUser(updatedProfile);
    }
  };

  // Helper to determine if a collaborator is authorized to access the system
  const isCollaboratorAuthorized = (collab: CollaboratorInfo | null | undefined): boolean => {
    if (!collab) return false;
    if (collab.status === "Recusado" || collab.status === "Cancelado" || (collab as any).status === "Desistente") {
      return false;
    }
    const statusLower = (collab.status || "").toLowerCase().trim();
    if (
      statusLower === "confirmado" || 
      statusLower === "aprovado" || 
      statusLower === "homologado" || 
      statusLower === "alocado" || 
      statusLower === "convocado" || 
      statusLower === "ativo" || 
      statusLower === "autorizado" ||
      statusLower === "atribuído"
    ) {
      return true;
    }
    // Has an assigned role (alocado em função)
    if (collab.assignedRole && collab.assignedRole.trim() !== "") {
      return true;
    }
    // Has an assigned room (alocado em sala)
    if (collab.assignedRoom && collab.assignedRoom.trim() !== "") {
      return true;
    }
    // Is designated as reserve
    if (collab.isReserve === true) {
      return true;
    }
    // Attendance confirmed
    if (collab.attendanceStatus === "Confirmado") {
      return true;
    }
    // Has claId and building association while not being purely pending without any assignment
    if (collab.claId && collab.claId.trim() !== "" && statusLower !== "pendente") {
      return true;
    }
    return false;
  };

  // Helper to strictly validate and resolve authorized profiles
  const validateAndResolveUser = async (user: any): Promise<UserProfile | null> => {
    if (!user || !user.email) return null;
    const email = (user.email || "").toLowerCase().trim();

    // 1. SuperAdmin hardcoded authorized emails
    const isSuperAdminEmail = areEmailsMatching(email, "lipewmra@gmail.com") || areEmailsMatching(email, "philippewagnermra@gmail.com");
    if (isSuperAdminEmail) {
      try {
        const profile = await resolveSuperAdminAndClaProfile(user);
        if (profile) return profile;
      } catch (err) {
        console.error("Error resolving master SuperAdmin & CLA profile:", err);
      }
      // Guaranteed offline/quota fallback for SuperAdmin
      const fallbackMaster: UserProfile = {
        uid: user.uid,
        email: email,
        emails: [email, "lipewmra@gmail.com", "philippewagnermra@gmail.com"],
        name: user.displayName || "Philippe Wagner",
        role: "SuperAdmin",
        roles: ["SuperAdmin", "CLA"],
        coordinationCode: "8520",
        hasAccessed: true,
      };
      return fallbackMaster;
    }

    // 3. Look up if there is a pre-registered profile by email in users collection
    let profile: UserProfile | null = null;
    try {
      profile = await claimProfileByEmail(email, user.uid);
    } catch (err) {
      console.warn("Error claiming profile by email:", err);
    }

    // 4. Look up existing profile document in users/{uid}
    if (!profile) {
      try {
        profile = await getCurrentUserProfile(user.uid);
      } catch (err) {
        console.warn("Error fetching profile by uid:", err);
      }
    }

    // 5. If a profile was found in users collection, verify that it was legitimately registered
    if (profile) {
      // SuperAdmin or CLA are valid
      if (profile.role === "SuperAdmin" || profile.role === "CLA") {
        if (!profile.hasAccessed) {
          profile.hasAccessed = true;
          await saveUserProfile(profile);
        }
        return profile;
      }

      // ALA is valid if it has an assigned claId
      if (profile.role === "ALA" && profile.claId) {
        if (!profile.hasAccessed) {
          profile.hasAccessed = true;
          await saveUserProfile(profile);
        }
        return profile;
      }

      // Colaborador verification
      if (profile.role === "Colaborador") {
        const collab = await findCollaboratorByEmail(email);
        const isApproved = isCollaboratorAuthorized(collab);
        if (collab && isApproved) {
          if (!profile.hasAccessed || !profile.claId || (collab.claId && profile.claId !== collab.claId)) {
            profile.hasAccessed = true;
            profile.claId = collab.claId || profile.claId || "";
            await saveUserProfile(profile);
          }
          return profile;
        }
        if (profile.claId) {
          return profile;
        }
      }

      profile = null;
    }

    // 6. Check if registered in collaborators collection
    const collabRecord = await findCollaboratorByEmail(email);
    const isApprovedCollab = isCollaboratorAuthorized(collabRecord);
    
    if (collabRecord && isApprovedCollab) {
      if (collabRecord.status !== "Confirmado" && collabRecord.id) {
        try {
          await updateCollaborator(collabRecord.id, { status: "Confirmado" });
        } catch { /* ignore non-blocking */ }
      }

      const allCollabEmails = Array.from(new Set([
        email,
        collabRecord.email,
        ...(Array.isArray((collabRecord as any).emails) ? (collabRecord as any).emails : [])
      ].filter(Boolean)));

      profile = {
        uid: user.uid,
        email: email,
        emails: allCollabEmails,
        name: collabRecord.name || user.displayName || "Colaborador ENEM",
        role: "Colaborador",
        roles: ["Colaborador"],
        claId: collabRecord.claId || "",
        hasAccessed: true,
      };
      await saveUserProfile(profile);
      return profile;
    }

    // 7. If collaborator exists but is still Pending approval by CLA (no allocation, no role)
    if (collabRecord && collabRecord.status === "Pendente") {
      await signOut(auth);
      setCurrentUser(null);
      setSelectedRole(null);
      setUnregisteredNotice(
        `Cadastro em Análise: Olá, ${collabRecord.name}! Sua inscrição foi registrada e está aguardando homologação e autorização pela Coordenação (CLA). Assim que for aprovada pelo CLA, seu acesso ao ambiente do Colaborador será liberado com este mesmo e-mail Google (${email}).`
      );
      setIsPublicForm(false);
      return null;
    }

    // 8. USER IS UNREGISTERED: block access, sign out, and redirect to public fiscal form
    await signOut(auth);
    setCurrentUser(null);
    setSelectedRole(null);
    setPublicFormPrefill({ email, name: user.displayName || "" });
    setUnregisteredNotice(
      `Acesso Restrito: O e-mail "${email}" não possui cadastro ativo ou homologado no sistema CalanguS. Se você deseja fazer parte da equipe de fiscais do ENEM 2026, realize sua pré-inscrição no formulário abaixo.`
    );
    setIsPublicForm(true);
    return null;
  };

  // Google Login popup authentication (Primary & Default)
  const handleGmailLogin = async () => {
    setEmailFlowError("");
    setEmailFlowSuccess("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account"
    });
    
    try {
      const result = await signInWithPopup(auth, provider);
      const profile = await validateAndResolveUser(result.user);
      if (profile) {
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
        setSelectedRole(null);
      }
    } catch (err: any) {
      console.error("Google login popup failed:", err);
      if (err?.code !== "auth/popup-closed-by-user" && err?.code !== "auth/cancelled-popup-request") {
        setEmailFlowError("Não foi possível autenticar com o Google. Tente novamente.");
      }
    }
  };

  // Apple Login popup authentication (Secondary)
  const handleAppleLogin = async () => {
    setEmailFlowError("");
    setEmailFlowSuccess("");
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    
    try {
      const result = await signInWithPopup(auth, provider);
      const profile = await validateAndResolveUser(result.user);
      if (profile) {
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
        setSelectedRole(null);
      }
    } catch (err: any) {
      console.error("Apple login failed:", err);
      if (err?.code === "auth/operation-not-allowed" || err?.code === "auth/configuration-not-found") {
        setEmailFlowError("O provedor Apple precisa estar ativado no console do Firebase (Authentication > Sign-in method > Apple).");
      } else if (err?.code !== "auth/popup-closed-by-user" && err?.code !== "auth/cancelled-popup-request") {
        setEmailFlowError(err?.message || "Não foi possível autenticar com a Apple. Tente novamente ou use E-mail e Senha.");
      }
    }
  };

  // Email/Password Step 1: Verify if email is registered in system
  const handleCheckEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = authEmail.trim().toLowerCase();
    setEmailFlowError("");
    setEmailFlowSuccess("");

    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setEmailFlowError("Por favor, informe um endereço de e-mail válido.");
      return;
    }

    setEmailFlowLoading(true);
    try {
      // 1. Check if email is in database (users, collaborators, or superadmin)
      const regStatus = await checkEmailRegistered(cleanEmail);
      if (!regStatus.isRegistered) {
        setEmailFlowLoading(false);
        setPublicFormPrefill({ email: cleanEmail, name: "" });
        setUnregisteredNotice(
          `E-mail não localizado: O endereço "${cleanEmail}" não possui cadastro ativo na equipe do ENEM 2026. Preencha o formulário de inscrição abaixo para solicitar seu cadastro.`
        );
        setIsPublicForm(true);
        return;
      }

      setIdentifiedName(regStatus.name || "");

      // 2. Check if user already created credentials / password in Firebase Auth
      let methods: string[] = [];
      try {
        methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
      } catch (methodsErr) {
        console.warn("fetchSignInMethodsForEmail warning:", methodsErr);
      }

      if (methods.includes("password") || methods.length > 0) {
        setEmailFlowStep("login");
        setEmailFlowSuccess(`Olá, ${regStatus.name || "Colaborador"}! Digite sua senha cadastrada para entrar.`);
      } else {
        setEmailFlowStep("register");
        setEmailFlowSuccess(`Cadastro localizado para ${regStatus.name || cleanEmail}! Como este é seu primeiro acesso com senha, crie uma senha de acesso abaixo.`);
      }
    } catch (err: any) {
      console.error("Error checking email:", err);
      setEmailFlowError("Erro ao verificar o e-mail no sistema. Verifique a conexão e tente novamente.");
    } finally {
      setEmailFlowLoading(false);
    }
  };

  // Email/Password Step 2A: Login with existing password
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = authEmail.trim().toLowerCase();
    setEmailFlowError("");
    setEmailFlowSuccess("");

    if (!authPassword) {
      setEmailFlowError("Por favor, digite sua senha de acesso.");
      return;
    }

    setEmailFlowLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, cleanEmail, authPassword);
      const profile = await validateAndResolveUser(result.user);
      if (profile) {
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
        setSelectedRole(null);
      }
    } catch (err: any) {
      console.error("Password login error:", err);
      if (err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential") {
        setEmailFlowError("Senha incorreta. Verifique os dados digitados ou redefina sua senha.");
      } else if (err?.code === "auth/user-not-found") {
        setEmailFlowStep("register");
        setEmailFlowError("Ainda não há senha cadastrada para este e-mail. Crie sua senha de acesso abaixo.");
      } else if (err?.code === "auth/too-many-requests") {
        setEmailFlowError("Muitas tentativas sem sucesso. Aguarde alguns instantes ou utilize a redefinição de senha.");
      } else {
        setEmailFlowError(err?.message || "Erro ao efetuar login com senha.");
      }
    } finally {
      setEmailFlowLoading(false);
    }
  };

  // Email/Password Step 2B: First Access - Create password
  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = authEmail.trim().toLowerCase();
    setEmailFlowError("");
    setEmailFlowSuccess("");

    if (authPassword.length < 6) {
      setEmailFlowError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setEmailFlowError("As senhas digitadas não coincidem. Digite a mesma senha em ambos os campos.");
      return;
    }

    setEmailFlowLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, cleanEmail, authPassword);
      const profile = await validateAndResolveUser(result.user);
      if (profile) {
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
        setSelectedRole(null);
      }
    } catch (err: any) {
      console.error("Create password error:", err);
      if (err?.code === "auth/email-already-in-use") {
        setEmailFlowStep("login");
        setEmailFlowError("Este e-mail já possui uma conta no sistema. Digite sua senha existente para entrar.");
      } else if (err?.code === "auth/weak-password") {
        setEmailFlowError("A senha é muito fraca. Utilize uma combinação de letras e números.");
      } else {
        setEmailFlowError(err?.message || "Erro ao registrar senha de acesso.");
      }
    } finally {
      setEmailFlowLoading(false);
    }
  };

  // Forgot password handler
  const handleForgotPassword = async () => {
    const cleanEmail = authEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setEmailFlowError("Informe o e-mail acima para receber o link de redefinição de senha.");
      return;
    }
    setEmailFlowLoading(true);
    setEmailFlowError("");
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setEmailFlowSuccess(`Link de redefinição de senha enviado para "${cleanEmail}". Verifique sua caixa de entrada e pasta de spam.`);
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setEmailFlowError("Não foi possível enviar o e-mail de redefinição. Verifique o endereço e tente novamente.");
    } finally {
      setEmailFlowLoading(false);
    }
  };

  const handleResetEmailFlow = () => {
    setEmailFlowStep("check");
    setAuthPassword("");
    setAuthConfirmPassword("");
    setEmailFlowError("");
    setEmailFlowSuccess("");
    setIdentifiedName("");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setSelectedRole(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Initialize Auth Sync Loop with doc subscribers to update whenever role/roles are changed by Superadmin
  useEffect(() => {
    let active = true;
    let unsubUserProfileList = () => {};

    const syncUser = async (user: any) => {
      if (!user) {
        if (active) {
          setCurrentUser(null);
          setSelectedRole(null);
          setAuthInitialized(true);
        }
        return;
      }

      try {
        const profile = await validateAndResolveUser(user);
        if (!profile) {
          if (active) {
            setCurrentUser(null);
            setSelectedRole(null);
            setAuthInitialized(true);
          }
          return;
        }

        if (active) {
          setCurrentUser(profile);
          setAuthInitialized(true);

          // Subscribe to dynamic database updates for this user profile document
          unsubUserProfileList = subscribeToUserProfile(user.uid, async (updatedProfile) => {
            if (active) {
              if (updatedProfile) {
                // If the profile role is Colaborador, verify if explicitly revoked
                if (updatedProfile.role === "Colaborador") {
                  const collab = await findCollaboratorByEmail(user.email);
                  if (collab && (collab.status === "Recusado" || collab.status === "Cancelado" || (collab as any).status === "Desistente")) {
                    await signOut(auth);
                    setCurrentUser(null);
                    setSelectedRole(null);
                    setUnregisteredNotice(
                      `Acesso revogado: Seu cadastro foi marcado como recusado ou cancelado pela Coordenação.`
                    );
                    setIsPublicForm(false);
                    return;
                  }
                }
                setCurrentUser(updatedProfile);
              } else {
                setCurrentUser(profile);
              }
            }
          });
        }
      } catch (err) {
        console.error("Error signing in user session:", err);
        if (active) {
          setCurrentUser(null);
          setSelectedRole(null);
          setAuthInitialized(true);
        }
      }
    };

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubUserProfileList();
      await syncUser(user);
    });

    return () => {
      active = false;
      unsubAuth();
      unsubUserProfileList();
    };
  }, []);

  // Subscribe to Global Event Config
  useEffect(() => {
    if (!authInitialized) return;

    const unsubEvent = subscribeToEventConfig((cfg) => {
      if (cfg) {
        setEventConfig(cfg);
      } else {
        const defaultCfg: Omit<EventConfigInfo, "id"> = {
          year: 2026,
          examDates: ["08/11/2026", "15/11/2026"],
          trainingDates: ["07/11/2026"],
          generalInstructions: "Garantir rigidez absoluta de horários. Abertura dos portões às 12:00h, fechamento improrrogável às 13:00h (horário de Brasília).",
          initialClaTasks: [
            "Conferir integridade física dos portões de entrada",
            "Sinalizar rotas das salas comuns com setas de lousa",
            "Ativar sala de atendimento prioritário no andar térreo",
            "Iniciar cotação e orçamento do almoço de fiscais"
          ]
        };
        saveEventConfig(defaultCfg);
      }
    });

    return () => unsubEvent();
  }, [authInitialized]);

  // Global pool subscriptions (network-wide pool for general reserves exchange, CLA buildings, and users)
  useEffect(() => {
    if (!authInitialized) return;

    const unsubAllCollabs = subscribeToAllCollaborators((allList) => {
      setAllCollaborators(allList);
    });

    const unsubAllBuildings = subscribeToAllBuildings((allB) => {
      setAllBuildings(allB);
    });

    const unsubAllUsers = subscribeToUsers((allU) => {
      setAllUsers(allU);
    });

    return () => {
      unsubAllCollabs();
      unsubAllBuildings();
      unsubAllUsers();
    };
  }, [authInitialized]);

  // Subscribe to CLA data structures
  useEffect(() => {
    if (!authInitialized || !effectiveUser?.uid) return;

    const activeClaId = (effectiveUser.role === "ALA" || effectiveUser.role === "Colaborador") ? (effectiveUser.claId || effectiveUser.uid) : effectiveUser.uid;

    const unsubBuilding = subscribeToBuilding(activeClaId, (b) => {
      if (b) {
        setBuilding(b);
      } else {
        setBuilding(null);
      }
    });

    let unsubCollab = () => {};
    let unsubCatering = () => {};
    let unsubPhotos = () => {};
    let unsubColegas = () => {};
    let unsubActivities = () => {};

    if (effectiveUser.role === "CLA" || effectiveUser.role === "ALA" || effectiveUser.role === "Colaborador") {
      unsubCollab = subscribeToCollaborators(activeClaId, (collabs) => {
        setCollaborators(collabs);
      });

      unsubCatering = subscribeToCatering(activeClaId, (cat) => {
        setCatering(cat);
      });

      unsubPhotos = subscribeToPhotos(activeClaId, (p) => {
        setPhotos(p);
      });
      
      unsubColegas = subscribeToColegas(activeClaId, (teamList) => {
        setColegas(teamList);
      });

      unsubActivities = subscribeToClaActivities(activeClaId, (act) => {
        setClaActivities(act);
      });
    }

    return () => {
      unsubBuilding();
      unsubCollab();
      unsubCatering();
      unsubPhotos();
      unsubColegas();
      unsubActivities();
    };
  }, [authInitialized, effectiveUser?.uid, effectiveUser?.role, effectiveUser?.claId]);

  // Sync individual status statically from DB state
  useEffect(() => {
    if (effectiveUser && effectiveUser.role === "Colaborador" && (collaborators.length > 0 || allCollaborators.length > 0)) {
      const activeEmail = (effectiveUser.email || "").toLowerCase().trim();
      const rec = 
        collaborators.find(c => areEmailsMatching(c.email, activeEmail) || ((c as any).emails || []).some((e: string) => areEmailsMatching(e, activeEmail))) ||
        allCollaborators.find(c => areEmailsMatching(c.email, activeEmail) || ((c as any).emails || []).some((e: string) => areEmailsMatching(e, activeEmail)));
      if (rec) {
        const actualStatus = rec.attendanceStatus || (rec.status === "Confirmado" && rec.assignedRole ? "Confirmado" : rec.status);
        if (actualStatus !== individualConfirmationStatus) {
          setIndividualConfirmationStatus(actualStatus as any);
        }
      }
    }
  }, [effectiveUser?.role, effectiveUser?.email, collaborators, allCollaborators, individualConfirmationStatus]);

  // Handler to update individual confirmation status
  const handleUpdateConfirmationStatus = async (status: "Pendente" | "Confirmado" | "Recusado", roleNameToRefuse?: string) => {
    if (!currentUser) return;
    setIndividualConfirmationStatus(status);
    const activeEmail = (currentUser.email || "").toLowerCase().trim();
    const rec = 
      collaborators.find(c => areEmailsMatching(c.email, activeEmail) || ((c as any).emails || []).some((e: string) => areEmailsMatching(e, activeEmail))) ||
      allCollaborators.find(c => areEmailsMatching(c.email, activeEmail) || ((c as any).emails || []).some((e: string) => areEmailsMatching(e, activeEmail)));
    if (rec?.id) {
      if (status === "Recusado") {
        const refusedRoleName = roleNameToRefuse || rec.assignedRole || "Função Designada";
        const dateStr = new Date().toLocaleDateString("pt-BR") + " às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        await updateCollaborator(rec.id, {
          assignedRole: "",
          assignedRoom: "",
          isReserve: true,
          status: "Confirmado", // keeps registration authorized so they remain an active collaborator in reserve pool
          attendanceStatus: "Recusado",
          refusedRole: refusedRoleName,
          refusalTag: `Recusa de trabalho na função ${refusedRoleName}`,
          refusedRoleDate: dateStr
        });
      } else if (status === "Confirmado") {
        await updateCollaborator(rec.id, {
          status: "Confirmado",
          attendanceStatus: "Confirmado",
          attendanceConfirmedAt: new Date().toISOString(),
          // Clear any previous refusal since the collaborator accepted this role
          refusedRole: "",
          refusalTag: "",
          refusedRoleDate: ""
        });
      } else {
        await updateCollaborator(rec.id, {
          attendanceStatus: "Pendente"
        });
      }
    }
  };

  // Handler to update collaborator details
  const handleUpdateCollaboratorProfile = async (updates: Partial<CollaboratorInfo>) => {
    if (!currentUser) return;
    const activeEmail = (currentUser.email || "").toLowerCase().trim();
    const rec = collaborators.find(c => (c.email || "").toLowerCase().trim() === activeEmail) ||
                allCollaborators.find(c => (c.email || "").toLowerCase().trim() === activeEmail);
    if (rec?.id) {
      await updateCollaborator(rec.id, updates);
    }
    // Also synchronize user profile photo and name if changed
    if (updates.photoUrl !== undefined || updates.name !== undefined) {
      const updatedUser: UserProfile = {
        ...currentUser,
        ...(updates.photoUrl !== undefined ? { photoUrl: updates.photoUrl } : {}),
        ...(updates.name !== undefined ? { name: updates.name } : {}),
      };
      setCurrentUser(updatedUser);
      await saveUserProfile(updatedUser);
    }
  };

  // Handler to update current user's profile photo (SuperAdmin, CLA, ALA, or Colaborador)
  const handleUpdateUserProfilePhoto = async (newPhotoUrl: string) => {
    if (!currentUser) return;
    const updatedUser: UserProfile = {
      ...currentUser,
      photoUrl: newPhotoUrl,
    };
    setCurrentUser(updatedUser);
    await saveUserProfile(updatedUser);

    // If user has a collaborator record, synchronize it as well
    const rec = collaborators.find(c => c.email === currentUser.email);
    if (rec?.id) {
      await updateCollaborator(rec.id, { photoUrl: newPhotoUrl });
    }
  };

  // Handle Drag Move promotions
  const handleDragAllocationMove = async (collabId: string, isReserve: boolean, assignedRoom: string, updatedRole?: string) => {
    try {
      const updates: any = { 
        isReserve, 
        assignedRoom: isReserve ? "" : assignedRoom 
      };
      if (updatedRole !== undefined) {
        updates.assignedRole = updatedRole;
      }
      await updateCollaborator(collabId, updates);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Collaborator Substitution
  const handleSubstituteCollaborator = async (replacedId: string, replacementId: string, roomNumber: string, targetRole?: string) => {
    try {
      const replaced = collaborators.find(c => c.id === replacedId);
      const replacement = collaborators.find(c => c.id === replacementId);
      if (!replaced || !replacement) return;

      const role = targetRole || replaced.assignedRole || "Aplicador (Fiscal de Sala)";
      const now = new Date().toISOString();

      // 1. Replaced collaborator X returns to reserve with tag
      await updateCollaborator(replacedId, {
        assignedRoom: "",
        isReserve: true,
        isSubstituted: true,
        substitutedBy: replacement.name,
        substitutedById: replacement.id,
        substitutedAt: now,
        substitutionTag: `Substituído por ${replacement.name}`
      });

      // 2. Replacement collaborator Y takes room & role
      await updateCollaborator(replacementId, {
        assignedRoom: roomNumber,
        isReserve: false,
        assignedRole: role,
        substitutedFor: replaced.name,
        isSubstituted: false,
        substitutionTag: `Substituto de ${replaced.name}`
      });
    } catch (err) {
      console.error("Erro ao substituir colaborador:", err);
    }
  };

  const isDarkMode = theme === "dark";


  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070b13] flex flex-col items-center justify-center select-none transition-all duration-500 overflow-y-auto px-0 py-6">
        <div className="absolute inset-0 bg-radial from-emerald-500/10 via-[#070b13]/80 to-[#070b13] pointer-events-none" />
        
        {/* Full-width lateral 16:9 video animation without borders/card container */}
        <div className="relative w-full flex justify-center items-center overflow-hidden px-0">
          <div className="w-full max-w-5xl aspect-video relative flex items-center justify-center">
            <video
              src="/StartCalanguS.mp4"
              autoPlay
              muted
              playsInline
              onEnded={() => setShowSplash(false)}
              onError={() => {
                console.log("Intro video load failed, fallback will transition");
              }}
              className="w-full h-full object-contain aspect-video"
            />
          </div>
        </div>

        {/* Brand logo and loader text below the animation */}
        <div className="mt-8 flex flex-col items-center gap-3 animate-pulse px-4">
          <img 
            src="/CalanguS-logo-Noname.png" 
            referrerPolicy="no-referrer"
            alt="CalanguS" 
            className="w-24 h-24 object-contain"
          />
          <div className="flex items-center gap-2">
            <h2 className="font-display font-black text-2xl tracking-wide bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent uppercase">
              CalanguS
            </h2>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-black shadow-xs">
              v2.5
            </span>
          </div>
          <span className="text-[10px] uppercase font-extrabold text-slate-450 tracking-widest font-mono">
            Iniciando o Sistema...
          </span>
        </div>

        {/* Skip Animation Tactile Action */}
        <button
          onClick={() => setShowSplash(false)}
          className="mt-6 cursor-pointer px-6 py-2.5 rounded-xl font-mono font-black text-xs uppercase tracking-wider bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-750 text-slate-350 hover:text-white transition-all duration-200 active:translate-y-[2px] shadow-lg flex items-center gap-2"
        >
          <span style={{ color: "#fffefe" }}>Pular Animação</span>
          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-400">ESC</span>
        </button>
      </div>
    );
  }

  if (isPublicForm) {
    const isDarkModeActive = theme === "dark";
    return (
      <div className={`min-h-screen ${isDarkModeActive ? "dark bg-[#070b13] text-slate-100" : "bg-slate-50 text-slate-800"} font-sans transition duration-200 pb-16 relative overflow-x-hidden`}>
        {isDarkModeActive && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-radial from-emerald-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
        )}
        <div className="no-print pt-6 pb-2 max-w-3xl mx-auto px-4 flex justify-between items-center gap-2">
          {!currentUser ? (
            <button
              onClick={() => {
                setIsPublicForm(false);
                setUnregisteredNotice("");
              }}
              className={`p-2 px-3 rounded-xl transition cursor-pointer border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] flex items-center gap-1.5 font-bold text-xs ${isDarkModeActive ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"}`}
              title="Voltar ao Portal de Acesso"
            >
              <span>← Voltar ao Login</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-xl transition cursor-pointer border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] flex items-center gap-1.5 ${isDarkModeActive ? "bg-slate-900 border-slate-700 text-emerald-400 hover:bg-slate-800" : "bg-slate-100 border-slate-300 text-emerald-700 hover:bg-slate-200"}`}
              title="Configurações do Sistema"
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Configuração</span>
            </button>
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className={`p-2 rounded-xl transition cursor-pointer border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] ${isDarkModeActive ? "bg-slate-900 border-slate-700 text-yellow-400 hover:bg-slate-800" : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"}`}
              title="Alternar Tema Claro/Escuro"
            >
              {isDarkModeActive ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto">
          <PublicRegisterForm 
            onBackToApp={currentUser ? () => setIsPublicForm(false) : () => { setIsPublicForm(false); setUnregisteredNotice(""); }} 
            initialEmail={publicFormPrefill.email}
            initialName={publicFormPrefill.name}
            unregisteredNotice={unregisteredNotice}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark bg-[#070b13] text-slate-100" : "bg-slate-50 text-slate-800"} font-sans transition duration-200 pb-16 relative overflow-x-hidden`}>
      
      {/* 3D Cosmic ambient lighting background nodes */}
      {isDarkMode && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-radial from-emerald-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
      )}

      {/* CASE A: STILL LOADING AUTH */}
      {!authInitialized ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-14 h-14 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <span className="text-xs uppercase font-extrabold text-slate-450 tracking-wider">Verificando credenciais do Google, aguarde...</span>
        </div>
      ) : !currentUser ? (
        /* CASE B: LOGIN PORTAL (EXCLUSIVELY VIA GMAIL) */
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="max-w-md w-full bg-white dark:bg-[#0c1220]/95 p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-[8px_8px_0px_0px_#e2e8f0] dark:shadow-[8px_8px_0px_0px_var(--color-emerald-500)]/20 space-y-8 text-center transition-all duration-300">
            
            {/* Logo/Branding */}
            <div className="flex flex-col items-center space-y-3">
              <img 
                src="/CalanguS-logo-Noname.png" 
                referrerPolicy="no-referrer"
                alt="Logo CalanguS" 
                className="w-24 h-24 object-contain hover:scale-105 transition-transform duration-300 pointer-events-none"
              />
              <div>
                <div className="flex items-center justify-center gap-2">
                  <h1 className="font-display font-black text-3xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">CalanguS</h1>
                  <span className="text-[11px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-black shadow-xs">
                    v2.5
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-extrabold block mt-0.5">TACTILE TEAM DISPATCHER</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Portal de Acesso unificado</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Acesso exclusivo para membros cadastrados na coordenação e aplicação do ENEM.
              </p>
            </div>

            {/* Primary & Default: Google Gmail Login Button */}
            <button
              onClick={handleGmailLogin}
              className="w-full btn-3d btn-3d-primary py-3.5 rounded-xl flex items-center justify-center gap-3 font-mono font-black text-xs uppercase cursor-pointer text-white tracking-wider border-b-4 border-emerald-800 shadow-md transition active:scale-[0.98]"
            >
              <svg className="w-5 h-5 fill-current text-white shrink-0" viewBox="0 0 24 24">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.73 5.73 0 018.2 12.8a5.73 5.73 0 015.791-5.714c2.53 0 4.218 1.064 5.102 1.912l3.227-3.235C20.252 3.794 17.382 2.4 13.992 2.4c-5.897 0-10.79 4.885-10.79 10.4s4.893 10.4 10.79 10.4c6.155 0 11.134-4.7 11.134-10.4 0-.69-.074-1.353-.223-2.115H12.24z"/>
              </svg>
              <span>Entrar com Gmail (Padrão)</span>
            </button>

            {/* Secondary: Apple Login Button */}
            <button
              type="button"
              onClick={handleAppleLogin}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-black text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2.5 shadow-sm border border-slate-800 dark:border-slate-200 active:scale-[0.98]"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.79-11.73-14.25-5.87-9.35-10.48-19.78-13.82-31.31-3.34-11.52-5.01-22.38-5.01-32.57 0-14.13 3.58-25.76 10.74-34.88 7.16-9.13 16.27-13.79 27.33-13.99 4.35 0 9.27 1.16 14.76 3.48 5.49 2.32 9.27 3.53 11.35 3.63 1.85 0 5.79-1.29 11.83-3.88 6.04-2.58 11.27-3.72 15.7-3.41 12.33.64 22.09 5.34 29.28 14.1-10.76 6.53-16.03 15.54-15.82 27.05.21 9.03 3.53 16.59 9.97 22.68 6.43 6.09 14.19 9.54 23.27 10.36-2.07 6.31-4.7 12.63-7.89 18.96zM119.22 31.86c0-6.74 2.45-13.06 7.36-18.96 4.91-5.9 10.97-9.49 18.17-10.76.22 1.52.33 2.93.33 4.24 0 6.63-2.61 13.05-7.83 19.27-5.22 6.22-11.41 9.77-18.57 10.65-.22-1.3-.33-2.63-.33-4.44z"/>
              </svg>
              <span>Entrar com Apple</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-[#0c1220] px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                ou com E-mail e Senha
              </span>
            </div>

            {/* Email & Password Interactive Flow */}
            <div className="text-left bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              {/* Alert Feedback Messages */}
              {emailFlowError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-tight">{emailFlowError}</span>
                </div>
              )}

              {emailFlowSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-start gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <span className="leading-tight">{emailFlowSuccess}</span>
                </div>
              )}

              {/* STEP 1: Verify Email */}
              {emailFlowStep === "check" && (
                <form onSubmit={handleCheckEmail} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      E-mail Cadastrado (Outlook, Hotmail, Gmail, etc.)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="seu-email@outlook.com ou @gmail.com"
                        required
                        className="w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={emailFlowLoading || !authEmail.trim()}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                  >
                    {emailFlowLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verificando cadastro...</span>
                      </>
                    ) : (
                      <>
                        <span>Avançar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2A: Login with Existing Password */}
              {emailFlowStep === "login" && (
                <form onSubmit={handlePasswordLogin} className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between bg-white dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="min-w-0 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {authEmail}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetEmailFlow}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 ml-2"
                    >
                      Trocar
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Sua Senha de Acesso
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Digite sua senha"
                        required
                        className="w-full pl-9 pr-9 py-2.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={emailFlowLoading}
                      className="text-[11px] font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 underline transition cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={emailFlowLoading || !authPassword}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                  >
                    {emailFlowLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Entrando...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Entrar no Sistema</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2B: First Access - Create Password */}
              {emailFlowStep === "register" && (
                <form onSubmit={handleCreatePassword} className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between bg-white dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="min-w-0 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {authEmail}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetEmailFlow}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 ml-2"
                    >
                      Trocar
                    </button>
                  </div>

                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-[11px] font-medium leading-relaxed">
                    ✨ <strong>Primeiro acesso com este e-mail:</strong> Crie uma senha segura (mínimo 6 dígitos) para acessar seu ambiente de colaborador/coordenação.
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Criar Nova Senha (mín. 6 dígitos)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Mínimo de 6 caracteres"
                        required
                        minLength={6}
                        className="w-full pl-9 pr-9 py-2.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={authConfirmPassword}
                        onChange={(e) => setAuthConfirmPassword(e.target.value)}
                        placeholder="Repita a mesma senha"
                        required
                        minLength={6}
                        className="w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={emailFlowLoading || !authPassword || !authConfirmPassword}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                  >
                    {emailFlowLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Registrando senha...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Criar Senha e Acessar</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Inscription redirect section for new fiscais */}
            <div className="pt-4 border-t-2 border-slate-100 dark:border-slate-800/80 space-y-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                Ainda não possui cadastro ou deseja atuar como fiscal?
              </p>
              <button
                type="button"
                onClick={() => {
                  setUnregisteredNotice("");
                  setPublicFormPrefill({});
                  setIsPublicForm(true);
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 shadow-xs"
              >
                <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Formulário de Inscrição de Fiscais</span>
              </button>
            </div>

          </div>
        </div>
      ) : (
        /* CASE C: REAL LOGGED-IN WORKSPACE */
        <>
          {/* OFFLINE / QUOTA RESILIENCE BANNER */}
          {isQuotaMode && (
            <div className="no-print bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                <span>
                  <strong>Modo de Cota / Persistência Local Ativo:</strong> Seus dados de salas, fiscais, fotos e configurações continuam 100% salvos e funcionais no navegador através do cache persistente offline.
                </span>
              </div>
            </div>
          )}

          {/* PRIMARY REAL NAVBAR (GLOWING 3D GLASS DESIGN) */}
          <header className={`no-print border-b-4 transition mb-2 py-3 px-4 md:py-0 md:px-6 md:h-20 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0 ${isDarkMode ? "bg-[#0c1220]/80 backdrop-blur-md border-slate-900 sticky top-0 z-40" : "bg-white border-slate-200 sticky top-0 z-40"}`}>
            <div className="w-full px-2 sm:px-4 lg:px-6 xl:px-8 flex flex-col md:flex-row md:items-center justify-between h-full gap-3 md:gap-4">
              {/* ROW 1: CALANGUS LOGO & TITLE */}
              <div className="flex items-center gap-3 shrink-0">
                {/* CalanguS Program Logo Image */}
                <img 
                  src="/CalanguS-logo-Noname.png" 
                  referrerPolicy="no-referrer"
                  alt="CalanguS" 
                  className="h-10 md:h-16 w-auto object-contain hover:scale-105 transition-transform duration-300 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-extrabold text-2xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">CalanguS</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-black shadow-xs">
                      v2.5
                    </span>
                  </div>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-extrabold block">TACTILE TEAM DISPATCHER</span>
                </div>
              </div>

              {/* ROW 2 (ON MOBILE): PHOTO & ACTION BUTTONS IN A LINE BELOW THE TITLE */}
              <div className="flex items-center justify-between md:justify-end gap-2.5 sm:gap-4 w-full md:w-auto pt-2.5 md:pt-0 border-t border-slate-100 dark:border-slate-800/80 md:border-t-0">
                {/* Active Profile Info & Avatar with direct photo click */}
                <div 
                  onClick={() => {
                    if (effectiveRole !== "Colaborador") {
                      setIsSettingsOpen(true);
                    }
                  }}
                  className={`flex items-center gap-2.5 min-w-0 ${effectiveRole !== "Colaborador" ? "cursor-pointer group hover:opacity-90" : ""}`}
                  title={effectiveRole !== "Colaborador" ? "Clique para gerenciar foto e configurações" : "Meu Perfil"}
                >
                  <FiscalAvatar
                    photoUrl={effectiveUser?.photoUrl || currentUser?.photoUrl}
                    name={effectiveUser?.name || currentUser?.name}
                    role={effectiveRole}
                    size="md"
                    className="shadow-sm group-hover:scale-105 transition-transform shrink-0"
                  />
                  <div className="text-left md:text-right min-w-0 truncate">
                    <span className="text-xs sm:text-sm font-extrabold block leading-tight text-slate-800 dark:text-white group-hover:text-emerald-500 transition truncate">
                      {effectiveUser?.name}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-emerald-500 dark:text-emerald-400 tracking-wider truncate block">
                      {effectiveRole}{(effectiveUser?.coordinationCode || building?.coordRoom) ? ` - Coord: ${effectiveUser?.coordinationCode || building?.coordRoom}` : ""}
                    </span>
                  </div>
                </div>

                {/* Action Buttons cluster */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Simular Colaborador Button for CLA / Admin */}
                  {effectiveRole !== "Colaborador" && (
                    <button
                      onClick={() => setIsSimulateModalOpen(true)}
                      className="p-2 sm:px-3 rounded-xl transition cursor-pointer border-2 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-[2px_2px_0px_0px_rgba(16,185,129,0.2)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-y-[1px] active:translate-x-[1px] flex items-center gap-1.5"
                      title="Simular ambiente de um colaborador alocado"
                    >
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="hidden sm:inline text-xs font-black uppercase tracking-wider">Simular Colaborador</span>
                    </button>
                  )}

                  {/* Configuration Settings Button */}
                  {effectiveRole !== "Colaborador" && (
                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className={`p-2 sm:px-3 rounded-xl transition cursor-pointer border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-y-[1px] active:translate-x-[1px] active:shadow-0 flex items-center gap-1.5 ${isDarkMode ? "bg-slate-900 border-slate-700 text-emerald-400 hover:bg-slate-800" : "bg-slate-100 border-slate-300 text-emerald-700 hover:bg-slate-200"}`}
                      title="Abrir Configurações do Sistema"
                    >
                      <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline text-xs font-black uppercase tracking-wider">Configuração</span>
                    </button>
                  )}

                  {/* Light / Dark Mode Toggle Button */}
                  <button
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className={`p-2 rounded-xl transition cursor-pointer border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-y-[1px] active:translate-x-[1px] active:shadow-0 ${isDarkMode ? "bg-slate-900 border-slate-700 text-yellow-400 hover:bg-slate-800" : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"}`}
                    title="Alternar Tema Claro/Escuro"
                  >
                    {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>

                  {/* Sair (Logout) Button */}
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-xl transition cursor-pointer border-2 bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20 shadow-[2px_2px_0px_0px_rgba(244,63,94,0.1)] active:translate-y-[1px] active:translate-x-[1px]"
                    title="Sair do CalanguS"
                  >
                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* MULTI_PROFILE TOP BANNER DROPDOWN MENU */}
          {currentUser && (currentUser.roles || [currentUser.role]).includes("SuperAdmin") && (currentUser.roles || [currentUser.role]).includes("CLA") && (
            <div 
              className="bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white px-4 py-2 flex flex-wrap items-center justify-center gap-2 text-xs font-bold shadow-xs no-print"
            >
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px] sm:text-xs">Operar Painel como:</span>
                <div className="flex flex-wrap items-center justify-center bg-slate-200 dark:bg-slate-950 p-1 rounded-xl border border-slate-300 dark:border-slate-800 gap-1 animate-fade-in">
                  {(currentUser.roles || [currentUser.role]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRole(r)}
                      className={`px-3 sm:px-4 py-1.5 rounded-lg transition-all duration-155 text-[10px] font-black font-mono border uppercase cursor-pointer ${
                        effectiveRole === r
                           ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                           : "bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

      {/* SIMULATION MODE STICKY TOP BANNER */}
      {simulatedCollaborator && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-950 text-white px-4 py-3 shadow-2xl border-b-2 border-emerald-400/50 flex flex-wrap items-center justify-between gap-3 animate-fade-in no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 backdrop-blur-md flex items-center justify-center text-amber-300 border border-emerald-400/40 shrink-0 shadow-inner">
              <Eye className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-mono font-black tracking-widest bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md shadow-xs">
                  MODO DE SIMULAÇÃO ATIVO
                </span>
                <span className="text-xs text-emerald-200 font-bold hidden sm:inline">
                  (Ambiente visualizado pelo colaborador)
                </span>
              </div>
              <p className="text-xs font-black text-white mt-0.5">
                Colaborador: <span className="text-amber-300">{simulatedCollaborator.name}</span> • Função: <span className="text-emerald-300">{simulatedCollaborator.assignedRole || "Não associada"}</span> • Sala: <span className="text-sky-300">{simulatedCollaborator.assignedRoom || "Coordenação"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSimulateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-emerald-300 hover:text-emerald-200 text-xs font-black border border-emerald-500/30 transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Escolher outro colaborador alocado"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Trocar Colaborador</span>
            </button>
            <button
              onClick={() => setSimulatedCollaborator(null)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black shadow-md border border-rose-400 transition cursor-pointer flex items-center gap-1.5"
              title="Encerrar simulação e voltar ao painel da coordenação"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Encerrar Simulação</span>
            </button>
          </div>
        </div>
      )}

      {/* CORE DISPLAY MAIN BOARD */}
      <main 
        className="w-full px-2 sm:px-4 lg:px-6 xl:px-8 mt-4 md:mt-6"
      >
        {simulatedCollaborator ? (
          <div className="animate-fade-in pb-12">
            <CollaboratorDashboard
              currentUser={{
                uid: simulatedCollaborator.id || `sim-${simulatedCollaborator.cpf}`,
                name: simulatedCollaborator.name,
                email: simulatedCollaborator.email || `${simulatedCollaborator.cpf}@enem.calangus`,
                role: "Colaborador",
                photoUrl: simulatedCollaborator.photoUrl,
                coordinationCode: building?.coordRoom,
                assignedBuildingId: building?.id
              }}
              building={building}
              catering={catering}
              collaboratorRecord={simulatedCollaborator}
              individualConfirmationStatus={
                simulatedCollaborator.status === "Confirmado" 
                  ? "Confirmado" 
                  : simulatedCollaborator.status === "Recusado" 
                  ? "Recusado" 
                  : "Pendente"
              }
              onUpdateConfirmationStatus={(status, roleNameToRefuse) => {
                if (simulatedCollaborator.id) {
                  updateCollaborator(simulatedCollaborator.id, {
                    status,
                    refusedRole: roleNameToRefuse
                  });
                  setSimulatedCollaborator(prev => prev ? { ...prev, status, refusedRole: roleNameToRefuse } : null);
                }
              }}
              onUpdateProfile={async (updates) => {
                if (simulatedCollaborator.id) {
                  await updateCollaborator(simulatedCollaborator.id, updates);
                  setSimulatedCollaborator(prev => prev ? { ...prev, ...updates } : null);
                }
              }}
              onSaveBuilding={saveBuilding}
              eventConfig={eventConfig}
              claName={resolvedClaName}
            />
          </div>
        ) : (
          <>
        {/* EVENT TICKER BRIEF INSTRUCTIONS CARD (glowing 3D warning/announcement design) */}
        {eventConfig && (
          <div className={`no-print p-5 rounded-2xl mb-8 border-2 flex flex-col md:flex-row md:items-center justify-between gap-5 transition ${isDarkMode ? "bg-[#0f172a]/90 border-emerald-500/30 shadow-[4px_4px_0px_0px_var(--color-emerald-700)] glow-emerald" : "bg-emerald-50/90 border-emerald-300/80 shadow-[4px_4px_0px_0px_var(--color-emerald-500)]"}`}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/15 px-2 py-0.5 rounded-md">Diretiva Geral ENEM {eventConfig.year}</span>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full font-mono border border-indigo-400/30">Sincronizado Cebraspe</span>
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed font-sans font-semibold">{eventConfig.generalInstructions}</p>
            </div>
            <div className="flex gap-4 text-xs shrink-0 font-bold text-slate-600 dark:text-slate-400 border-l-2 border-slate-300 dark:border-slate-800 pl-4">
              <div>
                <span className="block text-[8px] text-slate-500 dark:text-gray-400 uppercase font-extrabold tracking-wider">1ª Prova:</span>
                <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">{eventConfig.examDates[0]}</span>
              </div>
              <div>
                <span className="block text-[8px] text-slate-500 dark:text-gray-400 uppercase font-extrabold tracking-wider">2ª Prova:</span>
                <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">{eventConfig.examDates[1]}</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CASE 1: UNIFIED SCREEN WITH SIDEBAR (SUPERADMIN / CLA / ALA) */}
        {/* ========================================================= */}
        {(effectiveRole === "CLA" || effectiveRole === "ALA" || effectiveRole === "SuperAdmin") && (
          (effectiveRole === "CLA" && (!effectiveUser?.coordinationCode || isEditingProfile)) ? (
            /* CLA REGISTRATION / EDIT PROFILE PORTAL */
            <div className="max-w-xl mx-auto w-full animate-fade-in py-6">
              <div className="bg-white dark:bg-[#0c1220]/95 p-6 md:p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/25 transition-all duration-300 space-y-6">
                
                {/* Header branding */}
                <div className="flex items-center gap-3.5 pb-4 border-b-2 border-slate-100 dark:border-slate-800">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-md transform rotate-3 shrink-0">
                    <Sparkles className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <h2 className="font-display font-black text-slate-800 dark:text-white text-lg">
                      {isEditingProfile ? "Atualizar Cadastro de CLA" : "Cadastro de Coordenador (CLA)"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {isEditingProfile ? "Atualize suas credenciais de coordenação do ENEM." : "Preencha os dados obrigatórios para habilitar seu painel de controle do ENEM."}
                    </p>
                  </div>
                </div>

                {regError && (
                  <div className="p-3 bg-rose-500/10 border-2 border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                {/* Form fields */}
                <form onSubmit={handleClaRegistration} className="space-y-4 text-xs font-bold">
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1.5">Seu Nome Completo</label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Ex: Dr. Felipe Calango"
                      className="w-full border-2 border-slate-250 dark:border-slate-850 rounded-xl px-4 py-3 bg-white dark:bg-[#070b13]/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 text-sm font-semibold transition focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1.5">Seu E-mail de Contato</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="Ex: coordenador.cla@enem.org"
                      className="w-full border-2 border-slate-250 dark:border-slate-850 rounded-xl px-4 py-3 bg-white dark:bg-[#070b13]/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 text-sm font-semibold transition focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Código de Números da Coordenação</span>
                      <span className="text-[9px] text-[#10b981] font-mono lowercase tracking-normal font-bold">Apenas números</span>
                    </label>
                    <input
                      type="text"
                      value={regCoordCode}
                      onChange={(e) => setRegCoordCode(e.target.value.replace(/\D/g, ''))} // Strips non-numerical characters dynamically
                      placeholder="Ex: 8520"
                      maxLength={12}
                      className="w-full border-2 border-slate-250 dark:border-slate-855 rounded-xl px-4 py-3 bg-white dark:bg-[#070b13]/60 text-slate-900 dark:text-white font-mono text-base focus:ring-2 focus:ring-emerald-500/50 text-sm font-semibold transition focus:outline-hidden"
                      required
                    />
                  </div>

                  <div className="p-4 bg-amber-500/5 border-2 border-amber-500/10 text-slate-600 dark:text-slate-400 rounded-xl font-normal leading-relaxed text-[11px] mb-2">
                    💡 <strong>O que é o código de números?</strong> Um código recebido pelo CLA que identifica exclusivamente a sua coordenação. O sistema ENEM o exige no cadastro para garantir a separação autônoma de dados e faturamento de fiscais por prédio.
                  </div>

                  <div className="flex gap-3">
                    {isEditingProfile && (
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="w-1/3 border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-extrabold text-xs py-3.5 rounded-xl transition cursor-pointer active:scale-95 text-center font-sans"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={regLoading}
                      className={`btn-3d ${regLoading ? "bg-slate-600 border-slate-700" : "btn-3d-primary"} rounded-xl ${isEditingProfile ? "w-2/3" : "w-full"} py-3.5 flex items-center justify-center gap-2 font-black text-xs cursor-pointer shadow-md text-white`}
                    >
                      <Play className="w-4 h-4 text-white shrink-0 fill-current" />
                      <span>{regLoading ? "SALVANDO..." : isEditingProfile ? "ATUALIZAR DADOS" : "CADASTRAR E ACESSAR PAINEL"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            (() => {
              const currentMenuItems = effectiveRole === "SuperAdmin" ? [
                { id: "admin-dashboard", label: "0. Painel Operacional", icon: Activity, iconColor: "text-emerald-450" },
                { id: "building", label: "1. Local de Aplicação", icon: Landmark, iconColor: "text-emerald-400" },
                { id: "admin-directives", label: "2. Diretivas Gerais", icon: Calendar, iconColor: "text-sky-400" },
                { id: "admin-agenda", label: "3. Agenda & Itinerário", icon: Clock, iconColor: "text-amber-400" },
                { id: "admin-profiles", label: "4. Gestão de Perfis", icon: Users, iconColor: "text-indigo-400" },
                { id: "admin-register", label: "5. Cadastrar CLA/Admin", icon: PlusCircle, iconColor: "text-emerald-400" },
                { id: "admin-metrics", label: "6. Métricas de Colaborador", icon: SlidersHorizontal, iconColor: "text-teal-400" },
                { id: "admin-materials", label: "7. Material Didático & Capacitação", icon: BookOpen, iconColor: "text-indigo-400" }
              ] : [
                { id: "building", label: "1. Local de Aplicação", icon: Landmark, iconColor: "text-emerald-400" },
                { id: "staff", label: "2. Fiscais e Inscrições", icon: Users, iconColor: "text-sky-400" },
                ...((effectiveRole === "CLA" || effectiveRole === "ALA") ? [
                  { id: "association", label: "3. Associação de Função", icon: UserCheck, iconColor: "text-emerald-450" },
                  { id: "alloc", label: "4. Alocação e Reservas", icon: Layers, iconColor: "text-indigo-400" },
                  { id: "attendance", label: "5. Lista de Presença", icon: ClipboardCheck, iconColor: "text-emerald-400" }
                ] : []),
                { id: "team", label: "6. Gestão de Equipe", icon: Users, iconColor: "text-emerald-450" },
                { id: "catering", label: "7. Alimentação", icon: Coffee, iconColor: "text-amber-400" },
                { id: "plates", label: "8. Impressão", icon: Printer, iconColor: "text-pink-400" },
                { id: "activities", label: "9. Atividades do CLA", icon: CheckSquare, iconColor: "text-emerald-450" },
                { id: "collab-settings", label: "10. Dados Colaboradores", icon: Calendar, iconColor: "text-emerald-400" },
                { id: "messages", label: "11. Mensagens & Comunicação", icon: MessageSquare, iconColor: "text-teal-400" },
                { id: "calangusia", label: "12. CalangusIA", icon: Sparkles, iconColor: "text-amber-400", externalUrl: "https://notebook.google.com/notebook/c3e64642-72e2-4ced-9d2c-685fcb910084" }
              ];

              const renderTabContent = (tabId: string) => {
                switch (tabId) {
                  case "admin-dashboard":
                    return effectiveRole === "SuperAdmin" ? (
                      <div className="animate-fade-in">
                        <SuperAdminDash initialConfig={eventConfig} onSaveConfig={saveEventConfig} activeSubTab="dashboard" />
                      </div>
                    ) : null;
                  case "admin-directives":
                    return effectiveRole === "SuperAdmin" ? (
                      <div className="animate-fade-in">
                        <SuperAdminDash initialConfig={eventConfig} onSaveConfig={saveEventConfig} activeSubTab="directives" />
                      </div>
                    ) : null;
                  case "admin-agenda":
                    return effectiveRole === "SuperAdmin" ? (
                      <div className="animate-fade-in">
                        <SuperAdminDash initialConfig={eventConfig} onSaveConfig={saveEventConfig} activeSubTab="agenda" />
                      </div>
                    ) : null;
                  case "admin-profiles":
                    return effectiveRole === "SuperAdmin" ? (
                      <div className="animate-fade-in">
                        <SuperAdminDash initialConfig={eventConfig} onSaveConfig={saveEventConfig} activeSubTab="profiles" />
                      </div>
                    ) : null;
                  case "admin-register":
                    return effectiveRole === "SuperAdmin" ? (
                      <div className="animate-fade-in">
                        <SuperAdminDash initialConfig={eventConfig} onSaveConfig={saveEventConfig} activeSubTab="register" />
                      </div>
                    ) : null;
                  case "admin-metrics":
                    return effectiveRole === "SuperAdmin" ? (
                      <div className="animate-fade-in">
                        <SuperAdminDash initialConfig={eventConfig} onSaveConfig={saveEventConfig} activeSubTab="metrics" />
                      </div>
                    ) : null;
                  case "admin-materials":
                    return effectiveRole === "SuperAdmin" ? (
                      <div className="animate-fade-in">
                        <SuperAdminDash initialConfig={eventConfig} onSaveConfig={saveEventConfig} activeSubTab="materials" />
                      </div>
                    ) : null;
                  case "building":
                    return (
                      <div className="animate-fade-in">
                        {effectiveRole === "SuperAdmin" ? (
                          <SuperAdminDash initialConfig={eventConfig} onSaveConfig={saveEventConfig} activeSubTab="building" />
                        ) : (
                          <BuildingConfigView 
                            initialBuilding={building} 
                            claId={effectiveUser?.uid || currentUser.uid} 
                            onSave={handleSaveBuildingAndSyncUser} 
                            userRole={effectiveRole}
                            readOnly={effectiveRole === "ALA"}
                          />
                        )}
                      </div>
                    );
                  case "staff":
                    return (
                      <div className="animate-fade-in">
                        <CollaboratorManager 
                          collaborators={collaborators} 
                          allCollaborators={allCollaborators}
                          claId={effectiveUser?.uid || currentUser.uid} 
                          currentUserName={currentUser?.name}
                          currentUserEmail={currentUser?.email}
                          buildingName={building?.name}
                          allBuildings={allBuildings}
                          allUsers={allUsers}
                          onAdd={addCollaborator} 
                          onUpdate={updateCollaborator} 
                          onDelete={deleteCollaborator} 
                          onRequestTransfer={requestCollaboratorTransfer}
                          onApproveTransfer={approveCollaboratorTransfer}
                          onRejectTransfer={rejectCollaboratorTransfer}
                          onCancelTransfer={cancelCollaboratorTransfer}
                          onSimulatePublicRecruit={() => setIsPublicForm(true)}
                        />
                      </div>
                    );
                  case "association":
                    return (effectiveRole === "CLA" || effectiveRole === "ALA") ? (
                      <div className="animate-fade-in">
                        <AssociationView 
                          collaborators={collaborators} 
                          onUpdate={updateCollaborator}
                          readOnly={false}
                          building={building}
                          onSaveBuilding={saveBuilding}
                          eventConfig={eventConfig}
                        />
                      </div>
                    ) : null;
                  case "alloc":
                    return (effectiveRole === "CLA" || effectiveRole === "ALA") ? (
                      <div className="animate-fade-in">
                        <DragAndDropReserves 
                          collaborators={collaborators} 
                          rooms={[
                            ...(building?.rooms && building.rooms.length > 0
                              ? building.rooms
                              : Array.from({ length: building?.roomsCount || 0 }, (_, i) => ({
                                  number: `Sala ${i + 1}`,
                                  capacity: building?.virtualCapacity || 30,
                                  floor: "Térreo"
                                }))),
                            ...(building?.specialRooms || []),
                            ...(building?.extraRooms || [])
                          ]} 
                          building={building}
                          claName={resolvedClaName}
                          onMove={handleDragAllocationMove} 
                          onUpdateCollaborator={updateCollaborator}
                          onSubstitute={handleSubstituteCollaborator}
                          eventConfig={eventConfig}
                          onSaveBuilding={saveBuilding}
                        />
                      </div>
                    ) : null;
                  case "attendance":
                    return (effectiveRole === "CLA" || effectiveRole === "ALA") ? (
                      <div className="animate-fade-in">
                        <AttendanceListView 
                          collaborators={collaborators} 
                          building={building}
                          eventConfig={eventConfig}
                          onUpdateCollaborator={updateCollaborator}
                          readOnly={effectiveRole === "ALA"}
                        />
                      </div>
                    ) : null;
                  case "team":
                    return (
                      <div className="animate-fade-in">
                        <AccessManagementView 
                          currentUser={effectiveUser || currentUser} 
                          colegas={colegas} 
                          activeClaId={effectiveRole === "ALA" ? (effectiveUser?.claId || effectiveUser?.uid || currentUser.uid) : (effectiveUser?.uid || currentUser.uid)} 
                          readOnly={effectiveRole === "ALA"}
                        />
                      </div>
                    );
                  case "catering":
                    return (
                      <div className="animate-fade-in">
                        <CateringView 
                          initialCatering={catering} 
                          claId={effectiveUser?.uid || currentUser.uid} 
                          collaborators={collaborators} 
                          onSave={saveCatering} 
                          readOnly={effectiveRole === "ALA"}
                        />
                      </div>
                    );
                  case "plates":
                    return (
                      <div className="animate-fade-in">
                        <CombinedPrintExportView 
                          collaborators={collaborators}
                          rooms={[
                            ...(building?.rooms && building.rooms.length > 0
                              ? building.rooms
                              : Array.from({ length: building?.roomsCount || 0 }, (_, i) => ({
                                  number: `Sala ${i + 1}`,
                                  capacity: building?.virtualCapacity || 30,
                                  floor: "Térreo"
                                }))),
                            ...(building?.specialRooms || []),
                            ...(building?.extraRooms || [])
                          ]}
                          building={building}
                          claName={resolvedClaName}
                          readOnly={effectiveRole === "ALA"}
                        />
                      </div>
                    );
                  case "activities":
                    return (
                      <div className="animate-fade-in">
                        <ClaActivitiesView 
                          activeClaId={effectiveRole === "ALA" ? (effectiveUser?.claId || effectiveUser?.uid || currentUser.uid) : (effectiveUser?.uid || currentUser.uid)} 
                          activities={claActivities} 
                          readOnly={effectiveRole === "ALA"}
                        />
                      </div>
                    );
                  case "collab-settings":
                    return (
                      <div className="animate-fade-in">
                        <CollaboratorSettingsView 
                          building={building} 
                          onSaveBuilding={saveBuilding} 
                          readOnly={effectiveRole === "ALA"}
                        />
                      </div>
                    );
                  case "messages":
                    return (
                      <div className="animate-fade-in">
                        <MessagingCenter 
                          collaborators={collaborators}
                          building={building}
                          currentUserName={effectiveUser?.name || currentUser.name}
                          currentUserRole={effectiveRole || "CLA"}
                          onSaveBuilding={saveBuilding}
                        />
                      </div>
                    );
                  case "calangusia":
                    return (
                      <div className="animate-fade-in">
                        <CalangusIaView notebookUrl="https://notebook.google.com/notebook/c3e64642-72e2-4ced-9d2c-685fcb910084" />
                      </div>
                    );
                  default:
                    return null;
                }
              };

              return (
                <div className="w-full">
                  {/* MOBILE NAVIGATION VIEW (ACCORDION STYLE - CONTENT EXPANDS RIGHT BELOW CLICKED MENU) */}
                  <div className="block lg:hidden w-full space-y-3 no-print">
                    <div className="flex items-center justify-between px-2 mb-2">
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-extrabold tracking-widest px-1">
                        Painel do Local (Toque no menu para expandir)
                      </span>
                    </div>

                    {effectiveRole === "ALA" && (
                      <div className="p-3 bg-indigo-500/10 border-2 border-indigo-500/30 text-indigo-300 rounded-2xl text-[10px] font-bold leading-relaxed font-sans shadow-sm mb-3">
                        🚨 OBS (ALA): Você tem acesso para visualizar todos os menus do CLA, mas possui permissão de edição e alteração apenas nos menus: 2 (Fiscais e Inscrições), 3 (Associação de Função) e 4 (Alocação e Reservas).
                      </div>
                    )}

                    {currentMenuItems.map((item) => {
                      const IconComp = item.icon;
                      const isActive = activeTab === item.id;
                      const pendingTransfers = item.id === "staff" ? (collaborators || []).filter(c => c.transferRequest && c.transferRequest.status === "Pendente").length : 0;

                      return (
                        <div key={item.id} className="w-full space-y-3">
                          <button
                            onClick={() => {
                              if ((item as any).externalUrl) {
                                window.open((item as any).externalUrl, "_blank", "noopener,noreferrer");
                              }
                              setActiveTab((prev) => (prev === item.id ? "" : item.id));
                            }}
                            className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center justify-between px-4 py-3.5 cursor-pointer border-2 transition-all duration-150 ${
                              isActive
                                ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.01]"
                                : isDarkMode
                                ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]"
                                : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <IconComp className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : item.iconColor}`} />
                              <span>{item.label}</span>
                              {(item as any).externalUrl && (
                                <ExternalLink className="w-3 h-3 text-amber-400 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {pendingTransfers > 0 && (
                                <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                                  {pendingTransfers} {pendingTransfers === 1 ? "pedido" : "pedidos"}
                                </span>
                              )}
                              <ChevronDown className={`w-4 h-4 transition-transform duration-200 shrink-0 ${isActive ? "rotate-180 text-white" : "text-slate-400"}`} />
                            </div>
                          </button>

                          {isActive && (
                            <div className="animate-fade-in p-3 md:p-5 bg-white dark:bg-[#0c1220]/95 rounded-2xl border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-lg my-2">
                              {renderTabContent(item.id)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* DESKTOP NAVIGATION VIEW (SIDEBAR + CONTENT PANEL) */}
                  {(() => {
                    const desktopActiveTab = activeTab || currentMenuItems[0]?.id || "building";
                    const pendingTransfersCount = (collaborators || []).filter(c => c.transferRequest && c.transferRequest.status === "Pendente").length;

                    return (
                      <div className="hidden lg:flex lg:flex-row gap-6 items-start w-full">
                        <div className={`no-print shrink-0 space-y-3 transition-all duration-300 ${isSidebarCollapsed ? "w-16" : "w-64"}`}>
                          <div className="flex items-center justify-between px-2 mb-2">
                            {!isSidebarCollapsed && (
                              <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-extrabold tracking-widest px-1">
                                Painel do Local
                              </span>
                            )}
                            <button
                              onClick={() => {
                                const next = !isSidebarCollapsed;
                                setIsSidebarCollapsed(next);
                                localStorage.setItem("enem_sidebar_collapsed", String(next));
                              }}
                              title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
                              className={`p-1.5 rounded-lg bg-slate-100 dark:bg-[#101726]/90 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-emerald-555 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-center ${isSidebarCollapsed ? "mx-auto" : ""}`}
                            >
                              {isSidebarCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronLeft className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {currentMenuItems.map((item) => {
                            const IconComp = item.icon;
                            const isActive = desktopActiveTab === item.id;
                            const isStaffMenuWithTransfers = item.id === "staff" && pendingTransfersCount > 0;
                            const hasExternalUrl = Boolean((item as any).externalUrl);

                            return (
                              <button
                                key={item.id}
                                onClick={() => {
                                  if ((item as any).externalUrl) {
                                    window.open((item as any).externalUrl, "_blank", "noopener,noreferrer");
                                  }
                                  setActiveTab(item.id);
                                }}
                                title={item.label}
                                className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3 relative" : "justify-between px-4 py-3.5"} ${
                                  isActive
                                    ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]"
                                    : isDarkMode
                                    ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]"
                                    : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"
                                }`}
                              >
                                <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                                  <IconComp className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : item.iconColor}`} />
                                  {!isSidebarCollapsed && <span>{item.label}</span>}
                                </div>
                                {!isSidebarCollapsed && hasExternalUrl && (
                                  <ExternalLink className="w-3 h-3 text-amber-400 shrink-0" />
                                )}
                                {isStaffMenuWithTransfers && (
                                  isSidebarCollapsed ? (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                                  ) : (
                                    <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                                      {pendingTransfersCount}
                                    </span>
                                  )
                                )}
                              </button>
                            );
                          })}

                          {effectiveRole === "ALA" && !isSidebarCollapsed && (
                            <div className="p-4 bg-indigo-500/10 border-2 border-indigo-500/30 text-indigo-900 dark:text-indigo-300 rounded-2xl text-[10px] mt-4 font-bold leading-relaxed font-sans shadow-xs">
                              🚨 OBS (ALA): Você tem acesso para visualizar todos os menus do CLA, mas possui permissão de edição e alteração apenas nos menus: 2 (Fiscais e Inscrições), 3 (Associação de Função) e 4 (Alocação e Reservas).
                            </div>
                          )}

                          {effectiveRole === "CLA" && (effectiveUser?.coordinationCode || building?.coordRoom) && !isSidebarCollapsed && (
                            <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-950 dark:text-emerald-300 rounded-2xl text-[10px] mt-4 font-bold leading-relaxed font-sans shadow-xs">
                              🏢 <strong className="uppercase">Sua Coordenação</strong>
                              <div className="mt-1 font-mono font-bold text-slate-800 dark:text-emerald-300">Código: {effectiveUser?.coordinationCode || building?.coordRoom}</div>
                              <div className="text-slate-600 dark:text-slate-400 mt-1 font-medium">Coordenador do local de aplicação do ENEM.</div>
                              
                              <button
                                onClick={() => setIsSimulateModalOpen(true)}
                                className="mt-3 w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 border border-emerald-400/40 font-black py-2 px-2.5 rounded-xl text-[10px] cursor-pointer text-white tracking-wider uppercase transition active:scale-95 flex items-center justify-center gap-1.5 shadow-xs"
                              >
                                <Eye className="w-3.5 h-3.5 text-amber-300" />
                                <span>Simular Colaborador</span>
                              </button>

                              <button 
                                onClick={() => setIsEditingProfile(true)}
                                className="mt-2 w-full bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-300 dark:border-emerald-500/20 font-extrabold py-1.5 rounded-lg text-[9px] cursor-pointer text-slate-800 dark:text-slate-300 tracking-wider uppercase transition active:scale-95"
                              >
                                📝 Editar Cadastro
                              </button>
                            </div>
                          )}
                        </div>

                        {/* DESKTOP TAB CONTENT PANEL */}
                        <div className="flex-1 min-w-0 w-full space-y-6">
                          {pendingTransfersCount > 0 && desktopActiveTab !== "staff" && (
                            <div className="no-print p-4 bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-300 rounded-2xl flex items-center justify-between gap-4 text-xs font-bold shadow-xs">
                              <div className="flex items-center gap-2.5">
                                <Clock className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
                                <span>
                                  Você possui <strong>{pendingTransfersCount}</strong> pedido(s) de liberação/transferência de colaboradores de outros CLAs aguardando resposta no Menu 2 (Fiscais e Inscrições).
                                </span>
                              </div>
                              <button
                                onClick={() => setActiveTab("staff")}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black shrink-0 cursor-pointer shadow-xs active:scale-95 transition"
                              >
                                Ver e Responder Pedidos
                              </button>
                            </div>
                          )}
                          {renderTabContent(desktopActiveTab)}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()
          )
        )}

        {/* ========================================================= */}
        {/* CASE 3: CANDIDATE COLLABORATOR INDIVIDUAL PORTAL          */}
        {/* ========================================================= */}
        {effectiveRole === "Colaborador" && (() => {
          const activeCollabEmail = ((effectiveUser || currentUser)?.email || "").toLowerCase().trim();
          const resolvedCollabRecord = 
            collaborators.find(c => areEmailsMatching(c.email, activeCollabEmail) || ((c as any).emails || []).some((e: string) => areEmailsMatching(e, activeCollabEmail))) ||
            allCollaborators.find(c => areEmailsMatching(c.email, activeCollabEmail) || ((c as any).emails || []).some((e: string) => areEmailsMatching(e, activeCollabEmail))) ||
            null;
          const effectiveBuildingForCollab = building || allBuildings.find(b => b.claId === resolvedCollabRecord?.claId || b.id === resolvedCollabRecord?.buildingId) || null;
          const effectiveClaNameForCollab = resolvedClaName || effectiveBuildingForCollab?.claName || resolvedCollabRecord?.claName || "Coordenação do Local (CLA)";

          return (
            <CollaboratorDashboard
              currentUser={effectiveUser || currentUser}
              building={effectiveBuildingForCollab}
              catering={catering}
              collaboratorRecord={resolvedCollabRecord}
              individualConfirmationStatus={individualConfirmationStatus}
              onUpdateConfirmationStatus={handleUpdateConfirmationStatus}
              onUpdateProfile={handleUpdateCollaboratorProfile}
              onSaveBuilding={saveBuilding}
              eventConfig={eventConfig}
              claName={effectiveClaNameForCollab}
            />
          );
        })()}
          </>
        )}

      </main>
    </>
   )}

      {/* SIMULATE COLLABORATOR MODAL */}
      <SimulateCollaboratorModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        collaborators={collaborators}
        building={building}
        onSelectCollaborator={(collab) => {
          setSimulatedCollaborator(collab);
          setIsSimulateModalOpen(false);
        }}
      />

      {/* GLOBAL CONFIGURATION SETTINGS MODAL */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        fontSize={fontSize}
        setFontSize={setFontSize}
        colorTheme={colorTheme}
        setColorTheme={setColorTheme}
        themeMode={theme}
        setThemeMode={setTheme}
        currentUser={effectiveUser || currentUser}
        onUpdatePhoto={handleUpdateUserProfilePhoto}
      />
  </div>
  );
}
