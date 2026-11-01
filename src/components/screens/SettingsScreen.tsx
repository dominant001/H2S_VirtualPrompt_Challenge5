import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  Settings,
  Languages,
  RotateCcw,
  Bell,
  Eye,
  FileDown,
  ShieldAlert,
  Check,
  AlertTriangle,
  Cloud,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';
import { AIGatewayControlSection } from './AIGatewayControlSection';
import { PDFExportService } from '../../services/pdfExportService';

export const SettingsScreen: React.FC = () => {
  const {
    language,
    setLanguage,
    reducedMotion,
    setReducedMotion,
    resetAllDemoData,
    showToast,
    activeEvent,
    categories,
    tasks,
    vendorQuotes,
    teamMembers,
  } = useApp();

  const {
    user,
    isDemoMode,
    setDemoMode,
    signInWithGoogle,
    signOutUser,
    isOnline,
  } = useAuth();

  const handleTestNotification = () => {
    showToast(
      `Milestone Reminder: "Utsav AI: 1 pending priority milestone for ${activeEvent.name} — Review checklist due this week."`,
      'info'
    );
  };

  const handleDownloadPDF = () => {
    try {
      PDFExportService.downloadEventSummaryPDF(
        activeEvent,
        categories,
        tasks,
        vendorQuotes,
        teamMembers
      );
      showToast('Master event brief PDF downloaded successfully!', 'success');
    } catch (err: any) {
      showToast('Could not generate PDF: ' + (err?.message || 'Unknown error'), 'error');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
          <span>System & Preferences</span>
          <span className="text-[#231530]/40">·</span>
          <span>Phase 2 Firebase Cloud Architecture</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#231530] font-display">
          Settings & Data Governance
        </h1>
      </div>

      {/* Cloud & Authentication Card */}
      <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#231530] text-base">Google Firebase & Cloud Firestore</h3>
              <p className="text-xs text-[#231530]/60">
                Enterprise durable storage with security rules enforcement
              </p>
            </div>
          </div>

          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold font-mono ${
              isDemoMode
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {isDemoMode ? 'Demo Mode Active' : 'Cloud Connected'}
          </span>
        </div>

        <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#231530]/10 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-[#231530]/60">Firebase Project ID:</span>
            <span className="font-mono font-medium text-[#231530]">gen-lang-client-0830839315</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#231530]/60">Firestore Database ID:</span>
            <span className="font-mono font-medium text-[#231530]">ai-studio-utsavai-5ee2195d-5a01-4554-a806-a394a5166eee</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#231530]/60">Account Identity:</span>
            <span className="font-medium text-[#231530]">
              {user ? `${user.displayName || 'Host'} (${user.email})` : 'Not signed in (Local Demo)'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDemoMode(!isDemoMode);
                showToast(
                  isDemoMode ? 'Switched to Cloud Firestore Events' : 'Switched to Local Demo Mode',
                  'info'
                );
              }}
              className="px-3.5 py-2 bg-[#FAF7F2] hover:bg-[#231530] hover:text-white text-[#231530] text-xs font-semibold rounded-xl border border-[#231530]/10 transition-colors cursor-pointer"
            >
              {isDemoMode ? 'Activate Cloud Mode' : 'Explore Demo Mode'}
            </button>
          </div>

          {user ? (
            <button
              onClick={() => signOutUser()}
              className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="px-4 py-2 bg-[#231530] text-white hover:bg-[#3A2350] text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Centralized AI Usage Gateway & Billing Control */}
      <AIGatewayControlSection />

      {/* 1. Localization */}
      <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E06D28]/10 text-[#E06D28] flex items-center justify-center">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#231530] text-base">Language & Localization</h3>
            <p className="text-xs text-[#231530]/60">
              English primary baseline; domain terminology structured for Hindi / Hinglish translation in Phase 2
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => {
              setLanguage('en');
              showToast('Language set to English', 'info');
            }}
            className={`p-4 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
              language === 'en'
                ? 'border-[#E06D28] bg-[#E06D28]/5 ring-1 ring-[#E06D28]'
                : 'border-[#231530]/10 hover:border-[#231530]/25 bg-[#FAF7F2]'
            }`}
          >
            <div>
              <div className="font-semibold text-sm text-[#231530]">English (India)</div>
              <div className="text-[11px] text-[#231530]/60 mt-0.5">₹ Lakhs/Crores · Asia/Kolkata</div>
            </div>
            {language === 'en' && <Check className="w-4 h-4 text-[#E06D28]" />}
          </button>

          <button
            onClick={() => {
              setLanguage('hi');
              showToast('Hindi preview mode enabled (Labels organized for Hindi in Phase 2)', 'info');
            }}
            className={`p-4 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
              language === 'hi'
                ? 'border-[#E06D28] bg-[#E06D28]/5 ring-1 ring-[#E06D28]'
                : 'border-[#231530]/10 hover:border-[#231530]/25 bg-[#FAF7F2]'
            }`}
          >
            <div>
              <div className="font-semibold text-sm text-[#231530]">हिन्दी (Hindi Preview)</div>
              <div className="text-[11px] text-[#231530]/60 mt-0.5">उत्सव एआई · आप मनाइए, हम योजना बनाएंगे</div>
            </div>
            {language === 'hi' && <Check className="w-4 h-4 text-[#E06D28]" />}
          </button>
        </div>
      </div>

      {/* 2. Accessibility & Motion */}
      <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#231530] text-base">Accessibility & Motion</h3>
            <p className="text-xs text-[#231530]/60">
              WCAG AA contrast standards, keyboard accessible dialogs, and reduced-motion compliance
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between p-3.5 bg-[#FAF7F2] rounded-xl border border-[#231530]/10">
          <div>
            <div className="font-semibold text-xs text-[#231530]">Reduced Motion Mode</div>
            <div className="text-[11px] text-[#231530]/60">
              Disable drawer slide animations and ambient transitions
            </div>
          </div>
          <button
            onClick={() => setReducedMotion(!reducedMotion)}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              reducedMotion ? 'bg-[#E06D28]' : 'bg-neutral-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                reducedMotion ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 3. Notification Demo Controls */}
      <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#231530] text-base">Notifications & Milestone Alerts</h3>
            <p className="text-xs text-[#231530]/60">
              Scheduled milestone reminders sent to designated family leads
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between p-3.5 bg-[#FAF7F2] rounded-xl border border-[#231530]/10">
          <div>
            <div className="font-semibold text-xs text-[#231530]">Send Priority Task Ping</div>
            <div className="text-[11px] text-[#231530]/60">
              Send priority milestone reminder for {activeEvent.name}
            </div>
          </div>
          <button
            onClick={handleTestNotification}
            className="px-3.5 py-1.5 bg-[#231530] hover:bg-[#3A2350] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Trigger Milestone Alert
          </button>
        </div>
      </div>

      {/* 4. Export & Reports Boundary */}
      <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <FileDown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#231530] text-base">Plan Export & Printable Dossier</h3>
            <p className="text-xs text-[#231530]/60">
              Comprehensive event itinerary, catering sheets, and vendor contract dossier for {activeEvent.name}
            </p>
          </div>
        </div>

        <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs text-[#231530] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">Download Master Dossier (PDF)</span>
            <span className="text-[11px] text-[#231530]/60">({activeEvent.name} · {activeEvent.type})</span>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* 5. Data Source Disclaimers & Reset Demo Data */}
      <div className="bg-rose-50/50 border border-rose-200/60 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-rose-950 text-base">Data Governance & Reset</h3>
            <p className="text-xs text-rose-800/80">
              Utsav AI is integrated with Centralized AI Usage Gateway, Firebase Cloud Storage, and Google Maps Platform.
            </p>
          </div>
        </div>

        <div className="text-xs text-rose-900/80 leading-relaxed space-y-1">
          <p>
            • All figures and budget distributions are dynamic models adhering to regional vendor benchmarking.
          </p>
          <p>
            • Changes made to budgets, tasks, vendors, and timelines are securely persisted.
          </p>
        </div>

        <div className="pt-2 border-t border-rose-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-rose-900 font-medium">
            Reset all events, categories, and tasks back to initial baseline:
          </div>

          <button
            onClick={resetAllDemoData}
            className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Event Baseline</span>
          </button>
        </div>
      </div>
    </div>
  );
};
