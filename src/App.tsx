import React, { useState, useEffect } from "react";
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
  getCurrentUserProfile,
  getUserProfileByEmail,
  claimProfileByEmail,
  subscribeToColegas,
  subscribeToUserProfile,
  subscribeToClaActivities
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

import { 
  ShieldAlert, Landmark, Users, Coffee, Camera, Layers, 
  Printer, Sun, Moon, Sparkles, HelpCircle, MapPin,
  Navigation, CheckCircle2, AlertTriangle, Play, LogOut, CheckSquare, UserCheck,
  ChevronLeft, ChevronRight, FileSpreadsheet,
  Activity, Calendar, PlusCircle, Trash2
} from "lucide-react";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark" >(() => {
    const stored = localStorage.getItem("enem_app_theme");
    return (stored as "light" | "dark") || "dark";
  });

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
  }, [theme]);

  // Authentication & Connection readiness state
  const [authInitialized, setAuthInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Derive the active operacionando role of multiple roles
  const effectiveRole = selectedRole || currentUser?.role || "Colaborador";
  const effectiveUser = currentUser ? { ...currentUser, role: effectiveRole } : null;

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
  const [catering, setCatering] = useState<CateringInfo | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [claActivities, setClaActivities] = useState<ClaActivities | null>(null);

  // CLA and SuperAdmin UI Active Section
  const [activeTab, setActiveTab] = useState<string>("building");

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

  // Colaborador simulation states
  const [individualConfirmationStatus, setIndividualConfirmationStatus] = useState<"Pendente" | "Confirmado" | "Recusado">("Pendente");

  // CLA registration and edit states
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCoordCode, setRegCoordCode] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

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
      setActiveTab((prev) => prev.startsWith("admin-") ? prev : "admin-dashboard");
    } else {
      setActiveTab((prev) => prev !== "building" && (prev.startsWith("admin-") || prev === "dashboard") ? "building" : prev);
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
        setIsEditingProfile(false);
      }
    } catch (err) {
      console.error(err);
      setRegError("Erro ao salvar cadastro. Tente novamente.");
    } finally {
      setRegLoading(false);
    }
  };

  // Google Login popup authentication
  const handleGmailLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account"
    });
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      if (!user.email) {
        alert("E-mail não pôde ser resgatado do login do Google.");
        return;
      }
      
      const email = user.email.toLowerCase();
      
      // Enforce ONLY gmail.com domain login
      if (!email.endsWith("@gmail.com")) {
        await signOut(auth);
        alert("Apenas contas de e-mail do Gmail (@gmail.com) são permitidas para acessar o sistema.");
        return;
      }

      // Check for Superadmin override
      const isSuperAdminEmail = email === "lipewmra@gmail.com";

      // Look up existing session profile
      let profile = await getCurrentUserProfile(user.uid);
      if (!profile) {
        profile = await claimProfileByEmail(email, user.uid);
      }

      if (!profile) {
        profile = {
          uid: user.uid,
          email: email,
          name: user.displayName || "Coordenador/Fiscal",
          role: isSuperAdminEmail ? "SuperAdmin" : "Colaborador",
          hasAccessed: true,
        };
        await saveUserProfile(profile);
      } else {
        let changed = false;
        let nextProfile = { ...profile };
        if (isSuperAdminEmail && nextProfile.role !== "SuperAdmin") {
          nextProfile.role = "SuperAdmin";
          changed = true;
        }
        if (!nextProfile.hasAccessed) {
          nextProfile.hasAccessed = true;
          changed = true;
        }
        if (changed) {
          profile = nextProfile;
          await saveUserProfile(profile);
        }
      }

      setCurrentUser(profile);
    } catch (err) {
      console.error("Login popup failed:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
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
          setAuthInitialized(true);
        }
        return;
      }

      const email = user.email ? user.email.toLowerCase() : "";
      if (!email || !email.endsWith("@gmail.com")) {
        if (active) {
          setCurrentUser(null);
          setAuthInitialized(true);
        }
        return;
      }

      try {
        let profile = await getCurrentUserProfile(user.uid);
        if (!profile) {
          profile = await claimProfileByEmail(email, user.uid);
        }

        const isSuperAdminEmail = email === "lipewmra@gmail.com";
        if (!profile) {
          profile = {
            uid: user.uid,
            email: email,
            name: user.displayName || "Usuário CalanguS",
            role: isSuperAdminEmail ? "SuperAdmin" : "Colaborador",
            roles: isSuperAdminEmail ? ["SuperAdmin"] : ["Colaborador"],
            hasAccessed: true
          };
          await saveUserProfile(profile);
        } else {
          // Verify if isSuperAdminEmail and lacks SuperAdmin role/roles
          let changed = false;
          let nextProfile = { ...profile };
          const roles = nextProfile.roles || [nextProfile.role];
          if (isSuperAdminEmail && !roles.includes("SuperAdmin")) {
            nextProfile.role = "SuperAdmin";
            nextProfile.roles = [...roles, "SuperAdmin"];
            changed = true;
          }
          if (!nextProfile.hasAccessed) {
            nextProfile.hasAccessed = true;
            changed = true;
          }
          if (changed) {
            profile = nextProfile;
            await saveUserProfile(profile);
          }
        }

        if (active) {
          // Subscribe to dynamic database updates for this user profile document
          unsubUserProfileList = subscribeToUserProfile(user.uid, (updatedProfile) => {
            if (active) {
              if (updatedProfile) {
                setCurrentUser(updatedProfile);
              } else {
                setCurrentUser(profile);
              }
              setAuthInitialized(true);
            }
          });
        }
      } catch (err) {
        console.error("Error signing in user session:", err);
        if (active) {
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

  // Sync individual status tatically from DB state
  useEffect(() => {
    if (effectiveUser && effectiveUser.role === "Colaborador" && collaborators.length > 0) {
      const rec = collaborators.find(c => c.email === effectiveUser.email);
      if (rec && rec.status && rec.status !== individualConfirmationStatus) {
        setIndividualConfirmationStatus(rec.status as any);
      }
    }
  }, [effectiveUser?.role, effectiveUser?.email, collaborators, individualConfirmationStatus]);

  // Handler to update individual confirmation status
  const handleUpdateConfirmationStatus = async (status: "Pendente" | "Confirmado" | "Recusado") => {
    if (!currentUser) return;
    setIndividualConfirmationStatus(status);
    const rec = collaborators.find(c => c.email === currentUser.email);
    if (rec?.id) {
      await updateCollaborator(rec.id, { status });
    }
  };

  // Handler to update collaborator details
  const handleUpdateCollaboratorProfile = async (updates: Partial<CollaboratorInfo>) => {
    if (!currentUser) return;
    const rec = collaborators.find(c => c.email === currentUser.email);
    if (rec?.id) {
      await updateCollaborator(rec.id, updates);
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

  const isDarkMode = theme === "dark";


  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070b13] flex flex-col items-center justify-center p-6 select-none transition-all duration-500 overflow-y-auto">
        <div className="absolute inset-0 bg-radial from-[#10b981]/10 via-[#070b13]/80 to-[#070b13] pointer-events-none" />
        
        <div className="relative w-full max-w-2xl aspect-video rounded-3xl overflow-hidden border-4 border-slate-800 dark:border-slate-900 shadow-[0_0_60px_rgba(16,185,129,0.2)] bg-slate-950 flex flex-col justify-center items-center">
          <video
            src="/StartCalanguS.mp4"
            autoPlay
            muted
            playsInline
            onEnded={() => setShowSplash(false)}
            onError={() => {
              console.log("Intro video load failed, fallback will transition");
            }}
            className="h-full object-cover"
            style={{ width: "450px" }}
          />
        </div>

        {/* Brand logo and loader text below the animation container */}
        <div className="mt-8 flex flex-col items-center gap-3 animate-pulse">
          <img 
            src="/CalanguS-logo-Noname.png" 
            referrerPolicy="no-referrer"
            alt="CalanguS" 
            className="w-24 h-24 object-contain"
          />
          <h2 className="font-display font-black text-2xl tracking-wide bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent uppercase">
            CalanguS
          </h2>
          <span className="text-[10px] uppercase font-extrabold text-slate-450 tracking-widest font-mono">
            Iniciando o Sistema...
          </span>
        </div>

        {/* Skip Animation Tactile Action */}
        <button
          onClick={() => setShowSplash(false)}
          className="mt-6 cursor-pointer px-6 py-2.5 rounded-xl font-mono font-black text-xs uppercase tracking-wider bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-750 text-slate-350 hover:text-white transition-all duration-200 active:translate-y-[2px] shadow-lg flex items-center gap-2"
        >
          <span>Pular Animação</span>
          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-400">ESC</span>
        </button>
      </div>
    );
  }

  if (isPublicForm) {
    const isDarkModeActive = theme === "dark";
    return (
      <div className={`min-h-screen ${isDarkModeActive ? "bg-[#070b13] text-slate-100" : "bg-slate-50 text-slate-800"} font-sans transition duration-200 pb-16 relative overflow-x-hidden`}>
        {isDarkModeActive && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-radial from-emerald-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
        )}
        <div className="no-print pt-6 pb-2 max-w-3xl mx-auto px-4 flex justify-end">
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className={`p-2 rounded-xl transition cursor-pointer border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] ${isDarkModeActive ? "bg-slate-900 border-slate-700 text-yellow-400 hover:bg-slate-800" : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"}`}
            title="Alternar Tema Claro/Escuro"
          >
            {isDarkModeActive ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
        <div className="max-w-4xl mx-auto">
          <PublicRegisterForm onBackToApp={currentUser ? () => setIsPublicForm(false) : undefined} />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-[#070b13] text-slate-100" : "bg-slate-50 text-slate-800"} font-sans transition duration-200 pb-16 relative overflow-x-hidden`}>
      
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
          <div className="max-w-md w-full bg-white dark:bg-[#0c1220]/95 p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-[8px_8px_0px_0px_#e2e8f0] dark:shadow-[8px_8px_0px_0px_#10b981]/20 space-y-8 text-center transition-all duration-300">
            
            {/* Logo/Branding */}
            <div className="flex flex-col items-center space-y-3">
              <img 
                src="/CalanguS-logo-Noname.png" 
                referrerPolicy="no-referrer"
                alt="Logo CalanguS" 
                className="w-24 h-24 object-contain hover:scale-105 transition-transform duration-300 pointer-events-none"
              />
              <div>
                <h1 className="font-display font-black text-3xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">CalanguS</h1>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-extrabold block mt-0.5">TACTILE TEAM DISPATCHER</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Portal de Acesso unificado</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Para ingressar na coordenação de locais de aplicação do ENEM, efetue login utilizando exclusivamente sua conta do Gmail autorizada.
              </p>
            </div>

            {/* Google Gmail Login Button */}
            <button
              onClick={handleGmailLogin}
              className="w-full btn-3d btn-3d-primary py-4 rounded-xl flex items-center justify-center gap-3 font-mono font-black text-xs uppercase cursor-pointer text-white tracking-wider border-b-4 border-emerald-800"
            >
              <svg className="w-5 h-5 fill-current text-white shrink-0" viewBox="0 0 24 24">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.73 5.73 0 018.2 12.8a5.73 5.73 0 015.791-5.714c2.53 0 4.218 1.064 5.102 1.912l3.227-3.235C20.252 3.794 17.382 2.4 13.992 2.4c-5.897 0-10.79 4.885-10.79 10.4s4.893 10.4 10.79 10.4c6.155 0 11.134-4.7 11.134-10.4 0-.69-.074-1.353-.223-2.115H12.24z"/>
              </svg>
              <span>Entrar com Gmail</span>
            </button>


          </div>
        </div>
      ) : (
        /* CASE C: REAL LOGGED-IN WORKSPACE */
        <>
          {/* PRIMARY REAL NAVBAR (GLOWING 3D GLASS DESIGN) */}
          <header className={`no-print h-20 py-0 px-6 border-b-4 transition mb-2 flex items-center ${isDarkMode ? "bg-[#0c1220]/80 backdrop-blur-md border-slate-900 sticky top-0 z-40" : "bg-white border-slate-200 sticky top-0 z-40"}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between w-full h-full">
              <div className="flex items-center gap-3 h-full">
                {/* CalanguS Program Logo Image */}
                <img 
                  src="/CalanguS-logo-Noname.png" 
                  referrerPolicy="no-referrer"
                  alt="CalanguS" 
                  className="h-full w-auto object-contain hover:scale-105 transition-transform duration-300"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-extrabold text-2xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">CalanguS</span>
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-extrabold block">TACTILE TEAM DISPATCHER</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Active Profile Info */}
                <div className="hidden md:block text-right">
                  <span className="text-sm font-extrabold block leading-none text-slate-800 dark:text-white">{effectiveUser?.name}</span>
                  <span className="text-[9px] uppercase font-bold text-emerald-500 dark:text-emerald-400 tracking-wider">
                    {effectiveRole}{effectiveUser?.coordinationCode ? ` - Coord: ${effectiveUser.coordinationCode}` : ""}
                  </span>
                </div>

                {/* Light / Dark Mode Toggle Button */}
                <button
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className={`p-2 rounded-xl transition cursor-pointer border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-y-[1px] active:translate-x-[1px] active:shadow-0 ${isDarkMode ? "bg-slate-900 border-slate-700 text-yellow-400 hover:bg-slate-800" : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"}`}
                  title="Alternar Tema Claro/Escuro"
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* Sair (Logout) Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl transition cursor-pointer border-2 bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20 shadow-[2px_2px_0px_0px_rgba(244,63,94,0.1)] active:translate-y-[1px] active:translate-x-[1px]"
                  title="Sair do CalanguS"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          {/* MULTI_PROFILE TOP BANNER DROPDOWN MENU */}
          {currentUser && (currentUser.roles || [currentUser.role]).includes("SuperAdmin") && (currentUser.roles || [currentUser.role]).includes("CLA") && (
            <div 
              className="bg-slate-900 border-b-2 border-slate-800 text-white px-6 py-2 flex items-center justify-center gap-3 text-xs font-bold shadow-md no-print"
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium mr-2">Operar Painel como:</span>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 animate-fade-in">
                  {(currentUser.roles || [currentUser.role]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRole(r)}
                      className={`px-4 py-1.5 rounded-lg transition-all duration-155 text-[10px] font-black font-mono border uppercase cursor-pointer ${
                        effectiveRole === r
                           ? "bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm"
                           : "bg-transparent text-slate-400 border-transparent hover:text-slate-200"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

      {/* CORE DISPLAY MAIN BOARD */}
      <main 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6"
      >
        
        {/* EVENT TICKER BRIEF INSTRUCTIONS CARD (glowing 3D warning/announcement design) */}
        {eventConfig && (
          <div className={`no-print p-5 rounded-2xl mb-8 border-2 flex flex-col md:flex-row md:items-center justify-between gap-5 transition ${isDarkMode ? "bg-[#0f172a]/90 border-emerald-500/30 shadow-[4px_4px_0px_0px_#047857] glow-emerald" : "bg-emerald-50/75 border-emerald-300/60 shadow-[4px_4px_0px_0px_#10b981]"}`}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-md">Diretiva Geral ENEM {eventConfig.year}</span>
                <span className="text-[9px] bg-indigo-500/25 text-indigo-400 font-bold px-2 py-0.5 rounded-full font-mono border border-indigo-400/20">Sincronizado Cebraspe</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans font-medium">{eventConfig.generalInstructions}</p>
            </div>
            <div className="flex gap-4 text-xs shrink-0 font-bold text-slate-500 dark:text-slate-400 border-l-2 border-slate-200 dark:border-slate-800 pl-4">
              <div>
                <span className="block text-[8px] text-gray-400 uppercase font-extrabold tracking-wider">1ª Prova:</span>
                <span className="font-mono font-extrabold text-slate-800 dark:text-emerald-400 text-sm">{eventConfig.examDates[0]}</span>
              </div>
              <div>
                <span className="block text-[8px] text-gray-400 uppercase font-extrabold tracking-wider">2ª Prova:</span>
                <span className="font-mono font-extrabold text-slate-800 dark:text-emerald-400 text-sm">{eventConfig.examDates[1]}</span>
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
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              
              {/* SUB NAVBAR VERTICAL SIDEBAR WITH 3D BUTTON CARDS */}
              <div className={`no-print shrink-0 space-y-3 transition-all duration-300 ${isSidebarCollapsed ? "w-full lg:w-16" : "w-full lg:w-64"}`}>
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

                {effectiveRole === "SuperAdmin" ? (
                  <>
                    <button
                      onClick={() => setActiveTab("admin-dashboard")}
                      title="Painel Geral"
                      className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4 py-3.5"} ${activeTab === "admin-dashboard" ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"}`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                        <Activity className={`w-4 h-4 shrink-0 ${activeTab === "admin-dashboard" ? "text-white" : "text-emerald-450"}`} />
                        {!isSidebarCollapsed && <span>0. Painel Operacional</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">STAT</span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab("building")}
                      title="Local de Aplicação"
                      className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4 py-3.5"} ${activeTab === "building" ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"}`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                        <Landmark className={`w-4 h-4 shrink-0 ${activeTab === "building" ? "text-white" : "text-emerald-400"}`} />
                        {!isSidebarCollapsed && <span>1. Local de Aplicação</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">INFO</span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab("admin-directives")}
                      title="Diretivas do Evento"
                      className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4 py-3.5"} ${activeTab === "admin-directives" ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"}`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                        <Calendar className={`w-4 h-4 shrink-0 ${activeTab === "admin-directives" ? "text-white" : "text-sky-400"}`} />
                        {!isSidebarCollapsed && <span>2. Diretivas Gerais</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">PROP</span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab("admin-profiles")}
                      title="Gestão de Usuários"
                      className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4 py-3.5"} ${activeTab === "admin-profiles" ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"}`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                        <Users className={`w-4 h-4 shrink-0 ${activeTab === "admin-profiles" ? "text-white" : "text-indigo-400"}`} />
                        {!isSidebarCollapsed && <span>3. Gestão de Perfis</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">ROLE</span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab("admin-register")}
                      title="Pré-cadastro"
                      className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4 py-3.5"} ${activeTab === "admin-register" ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"}`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                        <PlusCircle className={`w-4 h-4 shrink-0 ${activeTab === "admin-register" ? "text-white" : "text-amber-400"}`} />
                        {!isSidebarCollapsed && <span>4. Cadastrar CLA/Admin</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">NEW</span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab("admin-reset")}
                      title="Restauração de Sistema"
                      className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${activeTab === "admin-reset" ? "bg-rose-600 text-white border-rose-805 shadow-[3px_3px_0px_0px_#9f1239] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-rose-400 hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-rose-50 hover:text-rose-600"}`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                        <Trash2 className={`w-4 h-4 shrink-0 ${activeTab === "admin-reset" ? "text-white" : "text-rose-500 font-bold"}`} />
                        {!isSidebarCollapsed && <span>5. Master Reset</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">KILL</span>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveTab("building")}
                      title="1. Local de Aplicação"
                      className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4 py-3.5"} ${activeTab === "building" ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"}`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                        <Landmark className={`w-4 h-4 shrink-0 ${activeTab === "building" ? "text-white" : "text-emerald-400"}`} />
                        {!isSidebarCollapsed && <span>1. Local de Aplicação</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">INFO</span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab("staff")}
                      title="2. Fiscais e Inscrições"
                      className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4 py-3.5"} ${activeTab === "staff" ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"}`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                        <Users className={`w-4 h-4 shrink-0 ${activeTab === "staff" ? "text-white" : "text-sky-400"}`} />
                        {!isSidebarCollapsed && <span>2. Fiscais e Inscrições</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">RECRU</span>
                      )}
                    </button>

                    {(effectiveRole === "CLA" || effectiveRole === "ALA") && (
                      <button
                        onClick={() => setActiveTab("association")}
                        title="3. Associação de Função"
                        className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4 py-3.5"} ${activeTab === "association" ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"}`}
                      >
                        <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                          <UserCheck className={`w-4 h-4 shrink-0 ${activeTab === "association" ? "text-white" : "text-emerald-450"}`} />
                          {!isSidebarCollapsed && <span>3. Associação de Função</span>}
                        </div>
                        {!isSidebarCollapsed && (
                          <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">ROLE</span>
                        )}
                      </button>
                    )}
                    
                    {(effectiveRole === "CLA" || effectiveRole === "ALA") && (
                      <button
                        onClick={() => setActiveTab("alloc")}
                        title="4. Alocação e Reservas"
                        className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4 py-3.5"} ${activeTab === "alloc" ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"}`}
                      >
                        <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                          <Layers className={`w-4 h-4 shrink-0 ${activeTab === "alloc" ? "text-white" : "text-indigo-400"}`} />
                          {!isSidebarCollapsed && <span>4. Alocação e Reservas</span>}
                        </div>
                        {!isSidebarCollapsed && (
                          <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">DRAG</span>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => setActiveTab("team")}
                      title="5. Gestão de Equipe"
                      className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4 py-3.5"} ${activeTab === "team" ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"}`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                        <Users className={`w-4 h-4 shrink-0 ${activeTab === "team" ? "text-white" : "text-emerald-450"}`} />
                        {!isSidebarCollapsed && <span>5. Gestão de Equipe</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">TEAM</span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab("catering")}
                      title="6. Alimentação"
                      className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4 py-3.5"} ${activeTab === "catering" ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"}`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                        <Coffee className={`w-4 h-4 shrink-0 ${activeTab === "catering" ? "text-white" : "text-amber-400"}`} />
                        {!isSidebarCollapsed && <span>6. Alimentação</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">CATER</span>
                      )}
                    </button>
                    
                    <button
                      onClick={() => setActiveTab("plates")}
                      title="7. Impressão"
                      className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4 py-3.5"} ${activeTab === "plates" ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"}`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                        <Printer className={`w-4 h-4 shrink-0 ${activeTab === "plates" ? "text-white" : "text-pink-400"}`} />
                        {!isSidebarCollapsed && <span>7. Impressão</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">PRINT</span>
                      )}
                    </button>
                    
                    <button
                      onClick={() => setActiveTab("photos")}
                      title="8. Fotos"
                      className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4 py-3.5"} ${activeTab === "photos" ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"}`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                        <Camera className={`w-4 h-4 shrink-0 ${activeTab === "photos" ? "text-white" : "text-violet-400"}`} />
                        {!isSidebarCollapsed && <span>8. Fotos</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">CAM</span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab("activities")}
                      title="9. Atividades do CLA"
                      className={`w-full font-display font-bold transition rounded-xl text-xs flex items-center cursor-pointer border-2 transition-all duration-150 ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4 py-3.5"} ${activeTab === "activities" ? "bg-emerald-600 text-white border-emerald-800 shadow-[3px_3px_0px_0px_#047857] scale-[1.02]" : isDarkMode ? "bg-[#101726]/90 border-slate-800 text-slate-400 shadow-[2px_2px_0px_0px_#020617] hover:text-white hover:bg-[#161f30]" : "bg-white text-slate-700 shadow-[2px_2px_0px_0px_#cbd5e1] hover:bg-slate-50"}`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                        <CheckSquare className={`w-4 h-4 shrink-0 ${activeTab === "activities" ? "text-white" : "text-emerald-450"}`} />
                        {!isSidebarCollapsed && <span>9. Atividades do CLA</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">TASK</span>
                      )}
                    </button>
                  </>
                )}
                
                {/* ALA Helper Banner (3D border style) */}
                {effectiveRole === "ALA" && !isSidebarCollapsed && (
                  <div className="p-4 bg-indigo-500/10 border-2 border-indigo-500/30 text-indigo-300 rounded-2xl text-[10px] mt-4 font-bold leading-relaxed font-sans shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
                    🚨 OBS (ALA): Você tem acesso para visualizar todos os menus do CLA, mas possui permissão de edição e alteração apenas nos menus: 2 (Fiscais e Inscrições), 3 (Associação de Função) e 4 (Alocação e Reservas).
                  </div>
                )}

                {/* CLA Personal Coordination Card */}
                {effectiveRole === "CLA" && effectiveUser?.coordinationCode && !isSidebarCollapsed && (
                  <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-300 rounded-2xl text-[10px] mt-4 font-bold leading-relaxed font-sans shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
                    🏢 <strong className="uppercase">Sua Coordenação</strong>
                    <div className="mt-1 font-mono">Código: {effectiveUser.coordinationCode}</div>
                    <div className="text-slate-400 mt-1 font-normal">Coordenador do local de aplicação do ENEM.</div>
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="mt-3 w-full bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/30 font-extrabold py-1.5 rounded-lg text-[9px] cursor-pointer text-white tracking-wider uppercase transition active:scale-95"
                    >
                      📝 Editar Cadastro
                    </button>
                  </div>
                )}
              </div>

              {/* TAB CONTENT GRID */}
              <div className="flex-1 min-w-0 w-full space-y-6">
              
              {effectiveRole === "SuperAdmin" && activeTab === "admin-dashboard" && (
                <div className="animate-fade-in">
                  <SuperAdminDash 
                    initialConfig={eventConfig} 
                    onSaveConfig={saveEventConfig} 
                    activeSubTab="dashboard"
                  />
                </div>
              )}

              {effectiveRole === "SuperAdmin" && activeTab === "admin-directives" && (
                <div className="animate-fade-in">
                  <SuperAdminDash 
                    initialConfig={eventConfig} 
                    onSaveConfig={saveEventConfig} 
                    activeSubTab="directives"
                  />
                </div>
              )}

              {effectiveRole === "SuperAdmin" && activeTab === "admin-profiles" && (
                <div className="animate-fade-in">
                  <SuperAdminDash 
                    initialConfig={eventConfig} 
                    onSaveConfig={saveEventConfig} 
                    activeSubTab="profiles"
                  />
                </div>
              )}

              {effectiveRole === "SuperAdmin" && activeTab === "admin-register" && (
                <div className="animate-fade-in">
                  <SuperAdminDash 
                    initialConfig={eventConfig} 
                    onSaveConfig={saveEventConfig} 
                    activeSubTab="register"
                  />
                </div>
              )}

              {effectiveRole === "SuperAdmin" && activeTab === "admin-reset" && (
                <div className="animate-fade-in">
                  <SuperAdminDash 
                    initialConfig={eventConfig} 
                    onSaveConfig={saveEventConfig} 
                    activeSubTab="reset"
                  />
                </div>
              )}

              {activeTab === "building" && (
                effectiveRole === "SuperAdmin" ? (
                  <div className="animate-fade-in">
                    <SuperAdminDash 
                      initialConfig={eventConfig} 
                      onSaveConfig={saveEventConfig} 
                      activeSubTab="building"
                    />
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <BuildingConfigView 
                      initialBuilding={building} 
                      claId={effectiveUser?.uid || currentUser.uid} 
                      onSave={saveBuilding} 
                      userRole={effectiveRole}
                      readOnly={effectiveRole === "ALA"}
                    />
                  </div>
                )
              )}

              {activeTab === "staff" && (
                <div className="animate-fade-in">
                  <CollaboratorManager 
                    collaborators={collaborators} 
                    claId={effectiveUser?.uid || currentUser.uid} 
                    onAdd={addCollaborator} 
                    onUpdate={updateCollaborator} 
                    onDelete={deleteCollaborator} 
                    onSimulatePublicRecruit={() => setIsPublicForm(true)}
                  />
                </div>
              )}

              {activeTab === "association" && (effectiveRole === "CLA" || effectiveRole === "ALA") && (
                <div className="animate-fade-in">
                  <AssociationView 
                    collaborators={collaborators} 
                    onUpdate={updateCollaborator}
                    readOnly={false}
                    building={building}
                    onSaveBuilding={saveBuilding}
                  />
                </div>
              )}

              {activeTab === "alloc" && (effectiveRole === "CLA" || effectiveRole === "ALA") && (
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
                    onMove={handleDragAllocationMove} 
                  />
                </div>
              )}

              {activeTab === "catering" && (
                <div className="animate-fade-in">
                  <CateringView 
                    initialCatering={catering} 
                    claId={effectiveUser?.uid || currentUser.uid} 
                    collaborators={collaborators} 
                    onSave={saveCatering} 
                    readOnly={effectiveRole === "ALA"}
                  />
                </div>
              )}

              {activeTab === "plates" && (
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
                    readOnly={effectiveRole === "ALA"}
                  />
                </div>
              )}

              {activeTab === "photos" && (
                <div className="animate-fade-in">
                  <PhotoRecordLogsView 
                    photos={photos} 
                    claId={effectiveUser?.uid || currentUser.uid} 
                    onAdd={addPhoto} 
                    onDelete={deletePhoto} 
                    readOnly={effectiveRole === "ALA"}
                  />
                </div>
              )}

              {activeTab === "team" && (
                <div className="animate-fade-in">
                  <AccessManagementView 
                    currentUser={effectiveUser || currentUser} 
                    colegas={colegas} 
                    activeClaId={(effectiveRole === "ALA" || effectiveRole === "Colaborador") ? (effectiveUser?.claId || effectiveUser?.uid || currentUser.uid) : (effectiveUser?.uid || currentUser.uid)} 
                    readOnly={effectiveRole === "ALA"}
                  />
                </div>
              )}

              {activeTab === "activities" && (
                <div className="animate-fade-in">
                  <ClaActivitiesView 
                    activeClaId={(effectiveRole === "ALA" || effectiveRole === "Colaborador") ? (effectiveUser?.claId || effectiveUser?.uid || currentUser.uid) : (effectiveUser?.uid || currentUser.uid)} 
                    activities={claActivities} 
                    readOnly={effectiveRole === "ALA"}
                  />
                </div>
              )}



            </div>
          </div>
         )
        )}

        {/* ========================================================= */}
        {/* CASE 3: CANDIDATE COLLABORATOR INDIVIDUAL PORTAL          */}
        {/* ========================================================= */}
        {effectiveRole === "Colaborador" && (
          <CollaboratorDashboard
            currentUser={effectiveUser || currentUser}
            building={building}
            catering={catering}
            collaboratorRecord={collaborators.find(c => c.email === (effectiveUser || currentUser).email) || null}
            individualConfirmationStatus={individualConfirmationStatus}
            onUpdateConfirmationStatus={handleUpdateConfirmationStatus}
            onUpdateProfile={handleUpdateCollaboratorProfile}
          />
        )}

      </main>
    </>
   )}
  </div>
  );
}
