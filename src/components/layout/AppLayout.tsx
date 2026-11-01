import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatINRCompact } from '../../utils/currency';
import {
  LayoutDashboard,
  PieChart,
  CheckSquare,
  Calendar,
  Store,
  Sparkles,
  Users,
  Settings,
  FolderKanban,
  Menu,
  X,
  Compass,
  AlertCircle,
  Plus,
  ChevronDown,
  LogIn,
  LogOut,
  Cloud,
  CloudOff,
  User as UserIcon,
  RefreshCw,
} from 'lucide-react';
import { ProposalModal } from '../budget/ProposalModal';
import { CopilotDrawer } from '../copilot/CopilotDrawer';
import { OnboardingWizardModal } from '../events/OnboardingWizardModal';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentTab,
    setCurrentTab,
    copilotOpen,
    setCopilotOpen,
    setOnboardingOpen,
    events,
    activeEventId,
    activeEvent,
    setActiveEventId,
    toasts,
    removeToast,
    isSyncing,
    seedSampleEventToCloud,
  } = useApp();

  const {
    user,
    isDemoMode,
    setDemoMode,
    signInWithGoogle,
    signOutUser,
    isOnline,
    authError,
    clearAuthError,
  } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [eventSwitcherOpen, setEventSwitcherOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'budget', label: 'Budget Studio', icon: PieChart },
    { id: 'checklist', label: 'Smart Checklist', icon: CheckSquare },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'vendors', label: 'Vendor Hub', icon: Store },
    { id: 'inspiration', label: 'Inspiration', icon: Sparkles },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'events', label: 'My Events', icon: FolderKanban },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#231530] flex flex-col font-sans">
      {/* Phase 2 Cloud & Auth Banner */}
      <div className="bg-[#231530] text-amber-200/90 px-4 py-1.5 text-[11px] flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          {isDemoMode ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>
                <strong className="text-white font-semibold">Active Session:</strong> Managing {activeEvent.name} ({activeEvent.type.charAt(0).toUpperCase() + activeEvent.type.slice(1)}) · Real-time Planning
              </span>
              {!user && (
                <button
                  onClick={() => signInWithGoogle()}
                  className="hidden md:inline-block ml-2 text-white bg-[#E06D28] hover:bg-[#C4551D] px-2 py-0.5 rounded-sm font-semibold transition-colors cursor-pointer"
                >
                  Sign in with Google
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-white font-semibold">Cloud Connected:</strong> Firestore Active · {user?.email}
              </span>
              {isSyncing && (
                <span className="flex items-center gap-1 text-white/70 ml-2">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Syncing...</span>
                </span>
              )}
            </div>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-4 text-white/60 text-[10px]">
          <span>Asia/Kolkata (IST)</span>
          <span>INR (₹) Standard</span>
          {isOnline ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Cloud className="w-3 h-3" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-rose-400">
              <CloudOff className="w-3 h-3" /> Offline
            </span>
          )}
        </div>
      </div>

      {/* Main Top Header */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#231530]/10 px-4 sm:px-8 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand & Event Switcher */}
          <div className="flex items-center gap-6 shrink-0">
            <button
              onClick={() => setCurrentTab('landing')}
              className="text-left flex items-center gap-2 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#E06D28] text-white flex items-center justify-center font-royal font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
                उ
              </div>
              <div>
                <span className="font-display font-bold text-xl tracking-tight text-[#231530]">
                  Utsav<span className="text-[#E06D28]">AI</span>
                </span>
                <span className="hidden sm:inline-block ml-2 text-[11px] text-[#231530]/60 font-medium">
                  You celebrate. We plan.
                </span>
              </div>
            </button>

            {/* Event Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setEventSwitcherOpen(!eventSwitcherOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#FAF7F2]/80 border border-[#231530]/10 rounded-xl text-xs font-medium text-[#231530] transition-colors cursor-pointer"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isDemoMode ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
                <span className="font-semibold max-w-[140px] truncate">{activeEvent.name}</span>
                <span className="text-[#231530]/50 text-[11px]">({activeEvent.city})</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#231530]/50" />
              </button>

              {eventSwitcherOpen && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white border border-[#231530]/10 rounded-xl shadow-xl z-50 p-2 space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-[#231530]/50 px-2.5 py-1 flex justify-between">
                    <span>{isDemoMode ? 'Active Local Celebrations' : 'Your Cloud Events'}</span>
                    <span>{events.length}</span>
                  </div>

                  {events.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[#231530]/60 space-y-2">
                      <p>No events in your cloud account yet.</p>
                      <button
                        onClick={() => {
                          setEventSwitcherOpen(false);
                          seedSampleEventToCloud();
                        }}
                        className="w-full py-1.5 px-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-semibold hover:bg-amber-100"
                      >
                        Import Baseline Celebration
                      </button>
                    </div>
                  ) : (
                    events.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => {
                          setActiveEventId(ev.id);
                          setEventSwitcherOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          ev.id === activeEventId
                            ? 'bg-[#E06D28]/10 text-[#E06D28] font-semibold'
                            : 'hover:bg-[#FAF7F2] text-[#231530]'
                        }`}
                      >
                        <div className="truncate">
                          <div>{ev.name}</div>
                          <div className="text-[10px] text-[#231530]/50 font-normal">
                            {ev.city} · {formatINRCompact(ev.totalBudget)}
                          </div>
                        </div>
                        {ev.id === activeEventId && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#E06D28]" />
                        )}
                      </button>
                    ))
                  )}

                  <div className="pt-1 border-t border-[#231530]/5 space-y-1">
                    <button
                      onClick={() => {
                        setEventSwitcherOpen(false);
                        setOnboardingOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-[#E06D28] hover:bg-[#E06D28]/5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Plan New Celebration</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#231530] text-white shadow-xs font-semibold'
                      : 'text-[#231530]/70 hover:text-[#231530] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action: Copilot, Auth identity & Mobile Menu Toggle */}
          <div className="flex items-center gap-2">
            {/* Ask Utsav AI Copilot trigger */}
            <button
              onClick={() => setCopilotOpen(!copilotOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#E06D28] text-white rounded-xl text-xs font-semibold hover:bg-[#C4551D] transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask Utsav AI</span>
              <span className="sm:hidden">Copilot</span>
            </button>

            {/* Auth Identity Pill / Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 bg-white border border-[#231530]/15 rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer text-xs"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#231530] text-white flex items-center justify-center font-bold text-[10px]">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="hidden sm:inline font-semibold max-w-[100px] truncate text-[#231530]">
                    {user.displayName?.split(' ')[0] || user.email}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#231530]/50" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-60 bg-white border border-[#231530]/10 rounded-xl shadow-xl z-50 p-2 space-y-1">
                    <div className="px-3 py-2 border-b border-[#231530]/5">
                      <div className="font-semibold text-xs text-[#231530] truncate">
                        {user.displayName || 'Celebration Host'}
                      </div>
                      <div className="text-[10px] text-[#231530]/50 truncate">{user.email}</div>
                    </div>

                    <button
                      onClick={() => {
                        setDemoMode(!isDemoMode);
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#231530] hover:bg-[#FAF7F2] rounded-lg flex items-center justify-between cursor-pointer"
                    >
                      <span>{isDemoMode ? 'Switch to Cloud Firestore' : 'Switch to Local Storage'}</span>
                      <span className="text-[10px] text-[#E06D28] font-semibold">
                        {isDemoMode ? 'Cloud' : 'Local'}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        signOutUser();
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#231530] text-white hover:bg-[#3A2350] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Sign in with Google to enable Cloud Firestore persistence"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#231530] hover:bg-[#FAF7F2] rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-[#231530]/10 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                setCurrentTab('landing');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-lg text-xs font-medium text-left bg-neutral-100 flex items-center gap-2"
            >
              <Compass className="w-4 h-4 text-[#E06D28]" />
              <span>Landing Overview</span>
            </button>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-lg text-xs font-medium text-left flex items-center gap-2 transition-colors ${
                    isActive
                      ? 'bg-[#231530] text-white font-semibold'
                      : 'hover:bg-[#FAF7F2] text-[#231530]/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="col-span-2 pt-2 border-t border-[#231530]/10 flex items-center justify-between px-2">
              {user ? (
                <button
                  onClick={() => {
                    signOutUser();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs font-semibold text-rose-700 flex items-center gap-1.5 py-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out ({user.displayName?.split(' ')[0] || user.email})</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    signInWithGoogle();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs font-semibold text-[#E06D28] flex items-center gap-1.5 py-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In with Google</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Auth error alert banner if sign-in fails */}
        {authError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
            <button
              onClick={clearAuthError}
              className="text-rose-600 hover:text-rose-900 font-semibold ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {children}
      </main>

      {/* Floating Ask Utsav AI trigger */}
      {!copilotOpen && (
        <button
          onClick={() => setCopilotOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-[#231530] text-white hover:bg-[#3A2350] p-3.5 sm:px-4 sm:py-3 rounded-full shadow-xl flex items-center gap-2 text-xs font-semibold transition-all hover:scale-105 cursor-pointer border border-amber-300/30"
          title="Open Utsav AI Copilot Drawer"
        >
          <div className="w-6 h-6 rounded-full bg-[#E06D28] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="hidden sm:inline">Ask Utsav AI</span>
        </button>
      )}

      {/* Interactive Toasts Container */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl text-xs font-medium shadow-lg flex items-start gap-2.5 border transition-all animate-in slide-in-from-bottom duration-200 ${
              toast.type === 'success'
                ? 'bg-white text-emerald-900 border-emerald-200'
                : toast.type === 'warning'
                ? 'bg-white text-amber-900 border-amber-200'
                : toast.type === 'error'
                ? 'bg-white text-rose-900 border-rose-200'
                : 'bg-white text-[#231530] border-[#231530]/15'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                toast.type === 'success'
                  ? 'bg-emerald-600'
                  : toast.type === 'warning'
                  ? 'bg-amber-600'
                  : toast.type === 'error'
                  ? 'bg-rose-600'
                  : 'bg-[#E06D28]'
              }`}
            />
            <div className="flex-1 leading-relaxed">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#231530]/40 hover:text-[#231530] ml-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Persistent Modals & Drawers */}
      <CopilotDrawer />
      <ProposalModal />
      <OnboardingWizardModal />
    </div>
  );
};
