import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/currency';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Calendar,
  Users,
  IndianRupee,
  MapPin,
  Send,
  MessageSquare,
  ListFilter,
  AlertCircle,
  ShieldCheck,
  Utensils,
  RefreshCw,
  Edit3,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { EventTier, EventType, FoodPreference } from '../../types';
import { eventArchitectClient } from '../../services/eventArchitectClient';
import { ArchitectChatMessage, EventIntakeDraft } from '../../server/architect/types';

export const OnboardingWizardModal: React.FC = () => {
  const { onboardingOpen, setOnboardingOpen, createNewEvent, showToast } = useApp();
  const { user } = useAuth();

  // Mode: 'conversational' (Gemini Event Architect) or 'form' (Structured 4-Step Form)
  const [activeTab, setActiveTab] = useState<'conversational' | 'form'>('conversational');

  // Conversational Intake State
  const [messages, setMessages] = useState<ArchitectChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Namaste! 🙏 I am your Utsav AI Event Architect. Tell me about your celebration — whether it is a royal wedding in Jaipur, an intimate birthday in Mumbai, or a community utsav. You can describe your guests, budget, city, and food preference in English, हिन्दी, or Hinglish!',
      suggestedFollowUps: [
        'Plan a vegetarian wedding in Jaipur for 200 people with ₹12 lakh budget',
        'हम जयपुर में 200 लोगों की शादी प्लान करना चाहते हैं, बजट 12 लाख है',
        'Birthday party in Mumbai for 50 kids with ₹1.5L budget',
      ],
      isSimulated: false,
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Draft state shared between conversational extraction and form
  const [currentDraft, setCurrentDraft] = useState<EventIntakeDraft>({
    eventType: 'wedding',
    title: 'Aarav & Meera’s Wedding',
    city: 'Jaipur',
    state: 'Rajasthan',
    hasExactDate: false,
    eventDate: null,
    eventDateWindow: 'Date to be confirmed',
    guestCount: 200,
    budgetINR: 1200000,
    foodPreference: 'vegetarian',
    tier: 'standard',
    functionCount: 2,
    functions: ['Sangeet & Mehendi', 'Wedding Ceremony & Feast'],
    venueType: 'Heritage Resort Lawn',
    accommodationNeeded: true,
    traditions: ['North Indian / Rajasthani'],
    preferences: ['Pure vegetarian catering', 'Heritage courtyard vibe'],
    assumptions: [
      'Assuming 1 main wedding ceremony with 200 guests',
      'Estimated catering based on standard Rajasthani thali packages',
      'Contingency reserve recommended at 15% (₹1,80,000)',
    ],
    missingFields: ['eventDate'],
    confidence: 85,
  });

  // Manual Form State
  const [formStep, setFormStep] = useState<number>(1);
  const [formData, setFormData] = useState({
    type: 'wedding' as EventType,
    name: 'Aarav & Meera’s Wedding',
    city: 'Jaipur',
    hasExactDate: false,
    eventDate: '',
    guestCount: 200,
    totalBudget: 1200000,
    tier: 'standard' as EventTier,
    foodPreference: 'vegetarian' as FoodPreference,
    functionCount: 2,
    venueType: 'Heritage Resort Lawn',
    accommodationNeeded: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Synchronize draft -> formData when switching tabs
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      type: currentDraft.eventType,
      name: currentDraft.title,
      city: currentDraft.city,
      hasExactDate: currentDraft.hasExactDate,
      eventDate: currentDraft.eventDate || '',
      guestCount: currentDraft.guestCount,
      totalBudget: currentDraft.budgetINR,
      tier: currentDraft.tier,
      foodPreference: currentDraft.foodPreference,
      functionCount: currentDraft.functionCount,
      venueType: currentDraft.venueType,
      accommodationNeeded: currentDraft.accommodationNeeded,
    }));
  }, [currentDraft, activeTab]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  if (!onboardingOpen) return null;

  // Send message to Gemini Event Architect
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isProcessing) return;

    setInputMessage('');
    const userMsg: ArchitectChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsProcessing(true);

    try {
      const response = await eventArchitectClient.sendMessage(updatedMessages, currentDraft);
      setCurrentDraft(response.draft);

      const assistantMsg: ArchitectChatMessage = {
        role: 'assistant',
        content: response.replyText,
        suggestedFollowUps: response.followUpQuestions,
        isSimulated: response.simulated,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (response.notice) {
        setNotice(response.notice);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast('Could not process with architect: ' + message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm and persist event creation
  const handleConfirmCreation = () => {
    createNewEvent({
      name: currentDraft.title,
      type: currentDraft.eventType,
      city: currentDraft.city,
      eventDate: currentDraft.hasExactDate && currentDraft.eventDate ? currentDraft.eventDate : undefined,
      guestCount: Number(currentDraft.guestCount),
      totalBudget: Number(currentDraft.budgetINR),
      tier: currentDraft.tier,
      foodPreference: currentDraft.foodPreference,
      functionCount: Number(currentDraft.functionCount),
      venueType: currentDraft.venueType,
      accommodationNeeded: currentDraft.accommodationNeeded,
    });
  };

  // Form Validation for Structured Form
  const validateFormStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.name.trim()) newErrors.name = 'Please provide an event title.';
      if (!formData.type) newErrors.type = 'Please select an event type.';
    } else if (currentStep === 2) {
      if (!formData.city.trim()) newErrors.city = 'Please enter a host city.';
      if (formData.hasExactDate && !formData.eventDate) {
        newErrors.eventDate = 'Please pick a date or choose "Date to be confirmed".';
      }
    } else if (currentStep === 3) {
      if (!formData.guestCount || formData.guestCount < 10) {
        newErrors.guestCount = 'Guest count must be at least 10.';
      }
      if (!formData.totalBudget || formData.totalBudget < 50000) {
        newErrors.totalBudget = 'Please enter a realistic budget (min ₹50,000).';
      }
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormFinish = () => {
    if (!validateFormStep(formStep)) return;
    createNewEvent({
      name: formData.name,
      type: formData.type,
      city: formData.city,
      eventDate: formData.hasExactDate ? formData.eventDate : undefined,
      guestCount: Number(formData.guestCount),
      totalBudget: Number(formData.totalBudget),
      tier: formData.tier,
      foodPreference: formData.foodPreference,
      functionCount: Number(formData.functionCount),
      venueType: formData.venueType,
      accommodationNeeded: formData.accommodationNeeded,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-[#231530]/10 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header with Mode Switcher */}
        <div className="p-4 sm:p-5 border-b border-[#231530]/10 bg-[#FAF7F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E06D28] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#E06D28]">
                  Utsav AI Architect · Phase 3 Intake
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E06D28]/10 text-[#E06D28] border border-[#E06D28]/20">
                  Gemini Gateway
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#231530] font-display">Plan a New Celebration</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Tabs */}
            <div className="flex bg-[#231530]/5 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('conversational')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'conversational'
                    ? 'bg-white text-[#231530] shadow-xs'
                    : 'text-[#231530]/60 hover:text-[#231530]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E06D28]" />
                <span>Conversational Intake</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'form'
                    ? 'bg-white text-[#231530] shadow-xs'
                    : 'text-[#231530]/60 hover:text-[#231530]'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5 text-[#231530]" />
                <span>Step Wizard</span>
              </button>
            </div>

            <button
              onClick={() => setOnboardingOpen(false)}
              className="p-2 text-[#231530]/60 hover:text-[#231530] hover:bg-[#231530]/5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice Banner (Simulation / Status) */}
        {notice && (
          <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{notice}</span>
            </div>
            <button
              onClick={() => setNotice(null)}
              className="text-amber-700 hover:text-amber-900 text-[11px] font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: CONVERSATIONAL ARCHITECT */}
        {activeTab === 'conversational' ? (
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#231530]/10">
            {/* Left: Chat & Conversation Stream (7 cols on lg) */}
            <div className="lg:col-span-7 flex flex-col h-[65vh] sm:h-[68vh] bg-white">
              {/* Message History */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                        msg.role === 'user'
                          ? 'bg-[#231530] text-white rounded-br-xs'
                          : 'bg-[#FAF7F2] text-[#231530] border border-[#231530]/10 rounded-bl-xs'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#E06D28] mb-1.5 uppercase tracking-wider">
                          <Sparkles className="w-3 h-3" />
                          <span>Utsav Event Architect</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {msg.isSimulated && (
                        <div className="mt-2 pt-2 border-t border-[#231530]/10 text-[10px] text-[#231530]/60 italic flex items-center gap-1">
                          <Info className="w-3 h-3 text-[#E06D28]" />
                          <span>Local adaptive parser</span>
                        </div>
                      )}
                    </div>

                    {/* Follow-up question quick action chips */}
                    {msg.role === 'assistant' &&
                      msg.suggestedFollowUps &&
                      msg.suggestedFollowUps.length > 0 &&
                      i === messages.length - 1 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[90%]">
                          {msg.suggestedFollowUps.map((chip, chipIdx) => (
                            <button
                              key={chipIdx}
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleSendMessage(chip)}
                              className="px-2.5 py-1 rounded-full text-xs bg-[#FAF7F2] hover:bg-[#E06D28]/10 text-[#231530] border border-[#231530]/15 hover:border-[#E06D28]/30 transition-all text-left cursor-pointer flex items-center gap-1"
                            >
                              <span>{chip}</span>
                              <ChevronRight className="w-3 h-3 text-[#E06D28]" />
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                ))}

                {isProcessing && (
                  <div className="flex items-center gap-2 p-3 bg-[#FAF7F2] rounded-2xl border border-[#231530]/10 w-fit text-xs text-[#231530]/70">
                    <RefreshCw className="w-3.5 h-3.5 text-[#E06D28] animate-spin" />
                    <span>Gemini is analyzing celebration parameters & regional traditions...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Box */}
              <div className="p-3 sm:p-4 border-t border-[#231530]/10 bg-[#FAF7F2]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="e.g. Plan a vegetarian wedding in Jaipur for 200 people with ₹12 lakh budget..."
                    disabled={isProcessing}
                    className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#231530]/15 rounded-xl focus:border-[#E06D28] focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isProcessing}
                    className="px-4 py-2.5 bg-[#E06D28] text-white rounded-xl hover:bg-[#C4551D] disabled:opacity-50 transition-colors flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#231530]/60 px-1">
                  <span>Supports English, हिन्दी, & Hinglish</span>
                  <span>Regional benchmark estimates</span>
                </div>
              </div>
            </div>

            {/* Right: Real-time Draft Blueprint Summary Card (5 cols on lg) */}
            <div className="lg:col-span-5 flex flex-col h-[65vh] sm:h-[68vh] bg-[#FAF7F2] overflow-y-auto p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#E06D28]" />
                  <h4 className="text-sm font-bold text-[#231530] uppercase tracking-wider">
                    Extracted Event Draft
                  </h4>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {currentDraft.confidence}% Extracted
                </span>
              </div>

              <div className="bg-white rounded-xl border border-[#231530]/10 p-4 space-y-4 shadow-xs">
                {/* Event Title & Type */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#231530]/60">
                      Title & Type
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E06D28]/10 text-[#E06D28] uppercase">
                      {currentDraft.eventType}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={currentDraft.title}
                    onChange={(e) => setCurrentDraft({ ...currentDraft, title: e.target.value })}
                    className="mt-1 font-bold text-base text-[#231530] w-full border-b border-transparent hover:border-[#231530]/20 focus:border-[#E06D28] focus:outline-hidden bg-transparent"
                  />
                </div>

                {/* City & Venue */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#231530]/5 text-xs">
                  <div>
                    <span className="text-[#231530]/60 flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3 h-3 text-[#E06D28]" /> Host City
                    </span>
                    <input
                      type="text"
                      value={currentDraft.city}
                      onChange={(e) => setCurrentDraft({ ...currentDraft, city: e.target.value })}
                      className="font-semibold text-[#231530] mt-0.5 w-full bg-transparent border-b border-transparent hover:border-[#231530]/20 focus:border-[#E06D28] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <span className="text-[#231530]/60 text-[11px]">Venue Style</span>
                    <div className="font-semibold text-[#231530] mt-0.5 truncate">
                      {currentDraft.venueType}
                    </div>
                  </div>
                </div>

                {/* Date Status — Crucial Acceptance Test C */}
                <div className="pt-2 border-t border-[#231530]/5">
                  <span className="text-[#231530]/60 flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3 h-3 text-[#E06D28]" /> Event Date Status
                  </span>
                  {currentDraft.hasExactDate && currentDraft.eventDate ? (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-semibold text-[#231530]">
                        Fixed: {currentDraft.eventDate}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentDraft({
                            ...currentDraft,
                            hasExactDate: false,
                            eventDate: null,
                            eventDateWindow: 'Date to be confirmed',
                          })
                        }
                        className="text-[11px] text-[#E06D28] hover:underline cursor-pointer"
                      >
                        Change to Tentative
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 p-2 bg-[#FAF7F2] rounded-lg border border-[#231530]/10 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-amber-800">
                          Date to be confirmed
                        </span>
                        <p className="text-[10px] text-[#231530]/60">
                          Planning with relative offsets (T-minus). No fabricated date.
                        </p>
                      </div>
                      <input
                        type="date"
                        onChange={(e) => {
                          if (e.target.value) {
                            setCurrentDraft({
                              ...currentDraft,
                              hasExactDate: true,
                              eventDate: e.target.value,
                              eventDateWindow: e.target.value,
                            });
                          }
                        }}
                        className="text-[11px] border border-[#231530]/15 rounded px-1.5 py-0.5 bg-white cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Guests & Budget */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#231530]/5 text-xs">
                  <div>
                    <span className="text-[#231530]/60 flex items-center gap-1 text-[11px]">
                      <Users className="w-3 h-3 text-[#E06D28]" /> Guest Count
                    </span>
                    <input
                      type="number"
                      value={currentDraft.guestCount}
                      onChange={(e) =>
                        setCurrentDraft({ ...currentDraft, guestCount: Number(e.target.value) })
                      }
                      min={10}
                      className="font-bold text-sm text-[#231530] mt-0.5 w-full bg-transparent border-b border-transparent hover:border-[#231530]/20 focus:border-[#E06D28] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <span className="text-[#231530]/60 flex items-center gap-1 text-[11px]">
                      <IndianRupee className="w-3 h-3 text-[#E06D28]" /> Total Budget
                    </span>
                    <input
                      type="number"
                      value={currentDraft.budgetINR}
                      onChange={(e) =>
                        setCurrentDraft({ ...currentDraft, budgetINR: Number(e.target.value) })
                      }
                      step={50000}
                      className="font-bold text-sm text-[#231530] mt-0.5 w-full bg-transparent border-b border-transparent hover:border-[#231530]/20 focus:border-[#E06D28] focus:outline-hidden"
                    />
                    <div className="text-[10px] text-[#231530]/60">
                      {formatINR(currentDraft.budgetINR)}
                    </div>
                  </div>
                </div>

                {/* Food & Tier */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#231530]/5 text-xs">
                  <div>
                    <span className="text-[#231530]/60 flex items-center gap-1 text-[11px]">
                      <Utensils className="w-3 h-3 text-[#E06D28]" /> Catering
                    </span>
                    <select
                      value={currentDraft.foodPreference}
                      onChange={(e) =>
                        setCurrentDraft({
                          ...currentDraft,
                          foodPreference: e.target.value as FoodPreference,
                        })
                      }
                      className="mt-0.5 font-semibold text-xs text-[#231530] bg-transparent border border-[#231530]/15 rounded px-1.5 py-0.5"
                    >
                      <option value="vegetarian">Pure Vegetarian</option>
                      <option value="jain">Jain (No onion/garlic)</option>
                      <option value="mixed">Mixed (Veg & Non-Veg)</option>
                      <option value="non-veg">Non-Vegetarian</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[#231530]/60 text-[11px]">Service Tier</span>
                    <select
                      value={currentDraft.tier}
                      onChange={(e) =>
                        setCurrentDraft({
                          ...currentDraft,
                          tier: e.target.value as EventTier,
                        })
                      }
                      className="mt-0.5 font-semibold text-xs text-[#231530] bg-transparent border border-[#231530]/15 rounded px-1.5 py-0.5"
                    >
                      <option value="budget">Value & Essential</option>
                      <option value="standard">Standard Heritage</option>
                      <option value="premium">Premium Royal</option>
                    </select>
                  </div>
                </div>

                {/* Stated Assumptions */}
                {currentDraft.assumptions && currentDraft.assumptions.length > 0 && (
                  <div className="pt-2 border-t border-[#231530]/5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#231530]/60">
                      AI Assumptions & Safety Buffer
                    </span>
                    <ul className="mt-1 space-y-1 text-[11px] text-[#231530]/75">
                      {currentDraft.assumptions.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-[#E06D28] font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Primary Action Button */}
              <div className="mt-auto pt-4 space-y-2">
                <button
                  type="button"
                  onClick={handleConfirmCreation}
                  className="w-full py-3 bg-[#E06D28] text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-[#C4551D] shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Create Celebration</span>
                </button>
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#231530]/60 text-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Gemini structures draft · You confirm creation · Firestore persists</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: STRUCTURED FORM WIZARD (Original 4-step wizard intact) */
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Step Progress Bar */}
            <div className="w-full bg-[#FAF7F2] px-6 pt-3 pb-0">
              <div className="flex items-center justify-between text-xs text-[#231530]/60 font-semibold mb-1.5">
                <span>Step {formStep} of 4</span>
                <span>
                  {formStep === 1
                    ? 'Basics'
                    : formStep === 2
                    ? 'City & Date'
                    : formStep === 3
                    ? 'Guests & Budget'
                    : 'Review & Initialize'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#231530]/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E06D28] transition-all duration-300"
                  style={{ width: `${(formStep / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* Step Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* STEP 1: Event Type & Name */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#231530]/70 mb-2">
                      What are you celebrating?
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'wedding', label: 'Wedding', desc: 'Baraat, rituals, multi-day' },
                        { id: 'birthday', label: 'Birthday', desc: 'Theme, cake, games' },
                        { id: 'community', label: 'Community', desc: 'Permissions, stage, volunteers' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              type: t.id as EventType,
                              name:
                                t.id === 'wedding'
                                  ? 'Aarav & Meera’s Wedding'
                                  : t.id === 'birthday'
                                  ? 'Aarohi’s 5th Birthday'
                                  : 'Diwali Milan Community Festival',
                            }))
                          }
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                            formData.type === t.id
                              ? 'border-[#E06D28] bg-[#E06D28]/5 ring-1 ring-[#E06D28]'
                              : 'border-[#231530]/15 hover:border-[#231530]/30 bg-white'
                          }`}
                        >
                          <div className="font-semibold text-sm text-[#231530]">{t.label}</div>
                          <div className="text-[11px] text-[#231530]/60 mt-0.5">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#231530]/70 mb-1.5">
                      Event Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Aarav & Meera's Wedding"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#231530]/15 rounded-xl focus:border-[#E06D28] focus:outline-hidden"
                    />
                    {formErrors.name && <p className="text-xs text-rose-600 mt-1">{formErrors.name}</p>}
                  </div>
                </div>
              )}

              {/* STEP 2: City & Date Handling */}
              {formStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#231530]/70 mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#E06D28]" />
                      Host City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. Jaipur, Udaipur, Delhi NCR, Mumbai"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#231530]/15 rounded-xl focus:border-[#E06D28] focus:outline-hidden"
                    />
                    {formErrors.city && <p className="text-xs text-rose-600 mt-1">{formErrors.city}</p>}
                  </div>

                  <div className="p-4 bg-[#FAF7F2] border border-[#231530]/10 rounded-xl space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#231530]/70 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#E06D28]" />
                      Event Date Status
                    </label>
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="dateType"
                          checked={!formData.hasExactDate}
                          onChange={() => setFormData({ ...formData, hasExactDate: false, eventDate: '' })}
                          className="accent-[#E06D28]"
                        />
                        <span>Date to be confirmed (Relative T-minus planning)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="dateType"
                          checked={formData.hasExactDate}
                          onChange={() => setFormData({ ...formData, hasExactDate: true })}
                          className="accent-[#E06D28]"
                        />
                        <span>Exact date fixed</span>
                      </label>
                    </div>

                    {formData.hasExactDate && (
                      <div className="pt-2">
                        <input
                          type="date"
                          value={formData.eventDate}
                          onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                          className="w-full px-3.5 py-2 text-sm bg-white border border-[#231530]/15 rounded-xl focus:border-[#E06D28] focus:outline-hidden"
                        />
                        {formErrors.eventDate && (
                          <p className="text-xs text-rose-600 mt-1">{formErrors.eventDate}</p>
                        )}
                      </div>
                    )}
                    {!formData.hasExactDate && (
                      <p className="text-[11px] text-[#231530]/60 italic">
                        Utsav AI handles events without fixed dates using relative milestone offsets (T-60, T-30, T-0 days) so no dates are invented.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Guests, Budget & Tier */}
              {formStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#231530]/70 mb-1.5 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#E06D28]" />
                        Estimated Guests
                      </label>
                      <input
                        type="number"
                        value={formData.guestCount}
                        onChange={(e) => setFormData({ ...formData, guestCount: Number(e.target.value) })}
                        min={10}
                        step={10}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#231530]/15 rounded-xl focus:border-[#E06D28] focus:outline-hidden"
                      />
                      {formErrors.guestCount && (
                        <p className="text-xs text-rose-600 mt-1">{formErrors.guestCount}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#231530]/70 mb-1.5 flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-[#E06D28]" />
                        Total Budget (INR)
                      </label>
                      <input
                        type="number"
                        value={formData.totalBudget}
                        onChange={(e) => setFormData({ ...formData, totalBudget: Number(e.target.value) })}
                        min={50000}
                        step={50000}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#231530]/15 rounded-xl focus:border-[#E06D28] focus:outline-hidden"
                      />
                      <div className="text-xs text-[#231530]/60 mt-1">
                        Formatted: {formatINR(formData.totalBudget)}
                      </div>
                      {formErrors.totalBudget && (
                        <p className="text-xs text-rose-600 mt-1">{formErrors.totalBudget}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#231530]/70 mb-1.5">
                        Catering Style
                      </label>
                      <select
                        value={formData.foodPreference}
                        onChange={(e) =>
                          setFormData({ ...formData, foodPreference: e.target.value as FoodPreference })
                        }
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#231530]/15 rounded-xl focus:border-[#E06D28] focus:outline-hidden"
                      >
                        <option value="vegetarian">Pure Vegetarian</option>
                        <option value="jain">Jain (No onion/garlic)</option>
                        <option value="mixed">Mixed (Veg & Non-Veg)</option>
                        <option value="non-veg">Non-Vegetarian</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#231530]/70 mb-1.5">
                        Tier / Experience
                      </label>
                      <select
                        value={formData.tier}
                        onChange={(e) => setFormData({ ...formData, tier: e.target.value as EventTier })}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#231530]/15 rounded-xl focus:border-[#E06D28] focus:outline-hidden"
                      >
                        <option value="budget">Value & Essential</option>
                        <option value="standard">Standard Heritage</option>
                        <option value="premium">Premium Royal</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Review & Initialize */}
              {formStep === 4 && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#231530]/10 space-y-2 text-xs">
                    <h4 className="font-bold text-sm text-[#231530] font-display">
                      {formData.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#231530]/10">
                      <div>
                        <span className="text-[#231530]/60">City:</span>{' '}
                        <span className="font-semibold text-[#231530]">{formData.city}</span>
                      </div>
                      <div>
                        <span className="text-[#231530]/60">Date:</span>{' '}
                        <span className="font-semibold text-[#231530]">
                          {formData.hasExactDate ? formData.eventDate : 'Date to be confirmed'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#231530]/60">Guests:</span>{' '}
                        <span className="font-semibold text-[#231530]">{formData.guestCount} guests</span>
                      </div>
                      <div>
                        <span className="text-[#231530]/60">Budget:</span>{' '}
                        <span className="font-semibold text-[#231530]">
                          {formatINR(formData.totalBudget)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Footer Navigation */}
            <div className="p-4 px-6 border-t border-[#231530]/10 bg-[#FAF7F2] flex items-center justify-between">
              {formStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setFormStep((s) => Math.max(1, s - 1))}
                  className="px-4 py-2 text-xs font-semibold text-[#231530]/70 hover:text-[#231530] flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              {formStep < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (validateFormStep(formStep)) setFormStep((s) => s + 1);
                  }}
                  className="px-5 py-2.5 bg-[#231530] text-white text-xs font-semibold rounded-xl hover:bg-[#3A2350] transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFormFinish}
                  className="px-5 py-2.5 bg-[#E06D28] text-white text-xs font-semibold rounded-xl hover:bg-[#C4551D] shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <Check className="w-4 h-4" />
                  <span>Create Event & Initialize Plan</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
