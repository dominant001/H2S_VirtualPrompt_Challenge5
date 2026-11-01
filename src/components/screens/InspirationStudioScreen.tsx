import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Palette,
  Edit3,
  Copy,
  Check,
  Flower2,
  Crown,
  Heart,
  AlertCircle,
  Download,
  Languages,
  Users,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { vendorClient } from '../../services/vendorClient';
import { PDFExportService } from '../../services/pdfExportService';
import { InvitationDraftContent } from '../../types';

export const InspirationStudioScreen: React.FC = () => {
  const {
    activeEvent,
    categories,
    tasks,
    vendorQuotes,
    teamMembers,
    showToast,
  } = useApp();

  const [activeTheme, setActiveTheme] = useState<'marigold' | 'ivory' | 'royal'>('marigold');

  // Invitation AI Generator State
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi' | 'bilingual'>('bilingual');
  const [selectedTone, setSelectedTone] = useState<'traditional_royal' | 'modern_minimal' | 'festive_warm'>('traditional_royal');
  const [hostsInput, setHostsInput] = useState('');
  const [coupleInput, setCoupleInput] = useState('');
  const [customRequests, setCustomRequests] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);

  // Editable Invitation Card State
  const isDateConfirmed = Boolean(activeEvent.hasExactDate && activeEvent.eventDate);

  const [invitationCopy, setInvitationCopy] = useState<InvitationDraftContent>({
    title: '',
    language: 'bilingual',
    shlokaOrBlessing: '',
    hostsLine: '',
    invitationText: '',
    coupleOrHonorLine: '',
    dateAndMuhuratLine: '',
    venueLine: '',
    rsvpLine: '',
    isDateConfirmed: false,
    notes: '',
  });

  // Sync invitation template whenever activeEvent changes
  React.useEffect(() => {
    const isBirthday = activeEvent.type === 'birthday';
    const isCommunity = activeEvent.type === 'community';
    const isDateConfirmed = Boolean(activeEvent.eventDate && activeEvent.eventDate.trim() !== '');

    const defaultHost = isBirthday
      ? `${activeEvent.name.split("'")[0]} Family`
      : isCommunity
      ? 'Community Organizing Committee'
      : 'Smt. Sunita & Shri Rajesh Sharma';

    const defaultSubject = isBirthday
      ? activeEvent.name.replace(/birthday/i, '').trim() || 'Birthday Celebrant'
      : isCommunity
      ? activeEvent.name
      : 'Aarav & Meera';

    setHostsInput(defaultHost);
    setCoupleInput(defaultSubject);

    if (isBirthday) {
      setInvitationCopy({
        title: `${activeEvent.name} — Party Invitation`,
        language: 'en',
        shlokaOrBlessing: '🎈 Hip Hip Hurray! Join us for a special celebration 🎂',
        hostsLine: defaultHost,
        invitationText: 'cordially invite you and your family to celebrate the birthday celebration of',
        coupleOrHonorLine: defaultSubject,
        dateAndMuhuratLine: isDateConfirmed
          ? `Date: ${activeEvent.eventDate} · 04:30 PM Onwards`
          : 'Date to be confirmed shortly',
        venueLine: activeEvent.venueType
          ? `${activeEvent.venueType}, ${activeEvent.city}`
          : `Celebration Party Hall & Play Zone, ${activeEvent.city}`,
        rsvpLine: 'RSVP for dietary requirements & personalized favor packs count',
        isDateConfirmed,
        notes: isDateConfirmed ? 'Confirmed birthday party date' : 'Date tentative: awaiting hall slot confirmation.',
      });
    } else if (isCommunity) {
      setInvitationCopy({
        title: `${activeEvent.name} — Community Assembly Circular`,
        language: 'bilingual',
        shlokaOrBlessing: '॥ सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः ॥',
        hostsLine: defaultHost,
        invitationText: 'cordially invites all esteemed members, residents, and families to attend',
        coupleOrHonorLine: defaultSubject,
        dateAndMuhuratLine: isDateConfirmed
          ? `Assembly Date: ${activeEvent.eventDate} · 09:30 AM Onwards`
          : 'Assembly date to be finalized',
        venueLine: activeEvent.venueType
          ? `${activeEvent.venueType}, ${activeEvent.city}`
          : `Municipal Community Grounds, ${activeEvent.city}`,
        rsvpLine: 'Registration & volunteer coordination desk open at entry',
        isDateConfirmed,
        notes: isDateConfirmed ? 'Confirmed community date' : 'Date pending civic ground clearance.',
      });
    } else {
      setInvitationCopy({
        title: 'Royal Rajasthani Vivah Patrika',
        language: 'bilingual',
        shlokaOrBlessing: '॥ श्री गणेशाय नमः ॥ वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ',
        hostsLine: defaultHost,
        invitationText: 'cordially invite you and your family to celebrate the auspicious wedding ceremony of their beloved son',
        coupleOrHonorLine: defaultSubject,
        dateAndMuhuratLine: isDateConfirmed
          ? `Auspicious Date: ${activeEvent.eventDate} · Evening Muhurat`
          : 'Date & Auspicious Muhurat to be announced shortly with family blessings',
        venueLine: activeEvent.venueType
          ? `${activeEvent.venueType}, ${activeEvent.city}, Rajasthan`
          : `Heritage Haveli Resort & Royal Lawns, ${activeEvent.city}, Rajasthan`,
        rsvpLine: 'RSVP: Sharma Family · +91 98290 12345',
        isDateConfirmed,
        notes: isDateConfirmed ? 'Confirmed auspicious date' : 'Date tentative: awaiting family astrological mahurat confirmation.',
      });
    }
  }, [activeEvent.id, activeEvent.name, activeEvent.type, activeEvent.city, activeEvent.eventDate, activeEvent.venueType]);

  // Community Sponsor Proposal state
  const [sponsorProposal, setSponsorProposal] = useState<any | null>(null);

  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const copyHex = (hex: string) => {
    navigator.clipboard?.writeText(hex);
    setCopiedColor(hex);
    showToast(`Copied color code ${hex}`, 'info');
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const copyInvitationText = () => {
    const fullText = [
      invitationCopy.shlokaOrBlessing,
      invitationCopy.hostsLine,
      invitationCopy.invitationText,
      invitationCopy.coupleOrHonorLine,
      invitationCopy.dateAndMuhuratLine,
      invitationCopy.venueLine,
      invitationCopy.rsvpLine,
    ]
      .filter(Boolean)
      .join('\n\n');

    navigator.clipboard?.writeText(fullText);
    setCopiedText(true);
    showToast('Invitation copy copied to clipboard!', 'success');
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleGenerateCopy = async () => {
    setIsGeneratingCopy(true);
    try {
      const generated = await vendorClient.generateInvitation(
        activeEvent,
        selectedLanguage,
        selectedTone,
        hostsInput,
        coupleInput,
        customRequests
      );
      setInvitationCopy(generated);
      showToast('Generated culturally customized invitation copy!', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast('Could not generate copy: ' + message, 'warning');
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const handleGenerateSponsorProposal = async () => {
    try {
      const proposal = await vendorClient.generateSponsorProposal(activeEvent);
      setSponsorProposal(proposal);
      showToast('Generated community sponsorship proposal draft!', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast('Could not generate proposal: ' + message, 'error');
    }
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast('Could not generate PDF: ' + message, 'error');
    }
  };

  const themes = [
    {
      id: 'marigold',
      name: 'Traditional Marigold Festivity',
      subtitle: 'Auspicious Genda Phool, Brass Bells & Sunlit Warmth',
      icon: Flower2,
      palette: [
        { name: 'Saffron Gold', hex: '#E06D28', role: 'Primary' },
        { name: 'Marigold Yellow', hex: '#F59E0B', role: 'Accent' },
        { name: 'Jasmine White', hex: '#FAF7F2', role: 'Base' },
        { name: 'Royal Emerald', hex: '#065F46', role: 'Leafage' },
        { name: 'Deep Indigo', hex: '#231530', role: 'Typography' },
      ],
      description:
        'Centuries-old Indian wedding elegance rooted in fresh marigold garlands, brass urlis filled with floating diyas, vibrant yellow-orange floral drapes, and sunlit outdoor lawns.',
    },
    {
      id: 'ivory',
      name: 'Elegant Ivory & Blush Rose',
      subtitle: 'Subtle Champagne, Tuberose Strings & Candlelit Mandap',
      icon: Heart,
      palette: [
        { name: 'Warm Ivory', hex: '#FAF6F0', role: 'Canvas' },
        { name: 'Rose Quartz', hex: '#E11D48', role: 'Petals' },
        { name: 'Champagne Gold', hex: '#D4AF37', role: 'Trim' },
        { name: 'Muted Taupe', hex: '#78716C', role: 'Structure' },
        { name: 'Midnight Charcoal', hex: '#1C1917', role: 'Contrast' },
      ],
      description:
        'Understated, modern royal aesthetic with cascading white jasmine strings, soft candle votives in cut glass, pastel rose petals, and delicate gold filigree accents.',
    },
    {
      id: 'royal',
      name: 'Royal Heritage Rajasthani',
      subtitle: 'Deep Plum, Antique Zari & Carved Sandstone Archways',
      icon: Crown,
      palette: [
        { name: 'Imperial Plum', hex: '#2D1E3A', role: 'Heritage' },
        { name: 'Antique Gold', hex: '#C59B27', role: 'Foil' },
        { name: 'Ruby Vermillion', hex: '#991B1B', role: 'Sacred' },
        { name: 'Sandstone Cream', hex: '#F5EBE1', role: 'Architecture' },
        { name: 'Jaipur Blue', hex: '#1E3A8A', role: 'Pottery' },
      ],
      description:
        'Inspired by Jaipur palaces and haveli courtyards. Hand-woven brocade fabrics, carved sandstone mandap backdrop, vintage lanterns, and deep jewel-toned drapery.',
    },
  ];

  const currentTheme = themes.find((t) => t.id === activeTheme) || themes[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Title & PDF Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
            <span>Phase 7 Aesthetic Curation</span>
            <span className="text-[#231530]/40">·</span>
            <span>Themes, Palettes &amp; Multilingual Wording</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#231530] font-display">
            Inspiration Studio &amp; Exports
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-[#FAF7F2] hover:bg-[#231530]/5 text-[#231530] border border-[#231530]/15 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Download complete Master Event Plan in PDF format"
          >
            <Download className="w-4 h-4 text-[#E06D28]" />
            <span>Download Event Brief (PDF)</span>
          </button>
        </div>
      </div>

      {/* Date Uncertainty Guard Banner */}
      {!isDateConfirmed && (
        <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed shadow-2xs">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Tentative Date Mode Active:</strong> Since the exact event date for{' '}
            <strong>{activeEvent.name}</strong> is not finalized, all generated invitations and exports strictly output tentative muhurat phrasing and will <em>never</em> fabricate an artificial date.
          </div>
        </div>
      )}

      {/* Theme Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {themes.map((theme) => {
          const Icon = theme.icon;
          const isSelected = activeTheme === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => setActiveTheme(theme.id as any)}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#E06D28] bg-white ring-2 ring-[#E06D28]/30 shadow-md'
                  : 'border-[#231530]/10 bg-white/70 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-[#E06D28] text-white' : 'bg-neutral-100 text-[#231530]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {isSelected && (
                  <span className="text-[10px] uppercase font-bold text-[#E06D28] bg-[#E06D28]/10 px-2 py-0.5 rounded-full font-mono">
                    Active Theme
                  </span>
                )}
              </div>
              <h3 className="font-bold text-[#231530] font-display text-base mt-3">
                {theme.name}
              </h3>
              <p className="text-xs text-[#231530]/60 mt-1 line-clamp-2">
                {theme.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Theme Breakdown & Color Palette Swatches */}
      <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
            Curated Color Harmonies
          </span>
          <h3 className="text-xl font-bold text-[#231530] font-display mt-0.5">
            {currentTheme.name} Palette
          </h3>
          <p className="text-xs text-[#231530]/70 mt-1 max-w-2xl leading-relaxed">
            {currentTheme.description}
          </p>
        </div>

        {/* Swatches Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {currentTheme.palette.map((color) => (
            <div
              key={color.hex}
              onClick={() => copyHex(color.hex)}
              className="p-3 bg-[#FAF7F2] border border-[#231530]/10 rounded-xl space-y-2 hover:border-[#E06D28] cursor-pointer transition-all group"
            >
              <div
                className="w-full h-16 rounded-lg shadow-inner border border-black/5 flex items-end justify-end p-1.5"
                style={{ backgroundColor: color.hex }}
              >
                {copiedColor === color.hex && (
                  <span className="text-[10px] bg-black/75 text-white px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" /> Copied
                  </span>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-[#231530] truncate">{color.name}</div>
                <div className="flex items-center justify-between text-[11px] text-[#231530]/60 font-mono mt-0.5">
                  <span>{color.hex}</span>
                  <span className="text-[10px] font-sans text-[#E06D28] group-hover:underline">
                    Copy
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Moodboard Showcase Tiles with CONCEPT ART Disclaimer */}
      <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
              Spatial Aesthetics
            </span>
            <h3 className="text-xl font-bold text-[#231530] font-display mt-0.5">
              Mandap &amp; Decor Concept Moodboard
            </h3>
          </div>
          <span className="text-[10px] font-mono uppercase bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-full border border-neutral-200">
            CONCEPT ART · Not a contractor deliverable
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-[#FAF7F2] border border-[#231530]/10 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold font-mono">
              01
            </div>
            <h4 className="font-bold text-[#231530] text-sm">Vedic Mandap Canopies</h4>
            <p className="text-xs text-[#231530]/70 leading-relaxed">
              Open-air quadrangular pillar mandap wrapped in dense yellow marigold garlands with suspended brass Ghungroo bells and raw silk overhead ceiling draping.
            </p>
            <div className="text-[10px] text-[#231530]/50 italic border-t border-[#231530]/5 pt-2">
              Concept Mood: Illustrative styling for floral designer brief.
            </div>
          </div>

          <div className="p-5 bg-[#FAF7F2] border border-[#231530]/10 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#E06D28] flex items-center justify-center font-bold font-mono">
              02
            </div>
            <h4 className="font-bold text-[#231530] text-sm">Grand Toran Gateway</h4>
            <p className="text-xs text-[#231530]/70 leading-relaxed">
              Majestic welcoming archway adorned with mango leaves (Amrapali), hand-woven mogra strings, and grand brass urlis illuminating the Baraat arrival pathway.
            </p>
            <div className="text-[10px] text-[#231530]/50 italic border-t border-[#231530]/5 pt-2">
              Concept Mood: Illustrative styling for floral designer brief.
            </div>
          </div>

          <div className="p-5 bg-[#FAF7F2] border border-[#231530]/10 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-bold font-mono">
              03
            </div>
            <h4 className="font-bold text-[#231530] text-sm">Banqueting Table Styling</h4>
            <p className="text-xs text-[#231530]/70 leading-relaxed">
              Hand-blocked Rajasthani tablecloths with low centerpiece terracotta pots, scented mogra candles, and personalized handwritten guest place cards.
            </p>
            <div className="text-[10px] text-[#231530]/50 italic border-t border-[#231530]/5 pt-2">
              Concept Mood: Illustrative styling for floral designer brief.
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Invitation Card Copy Workshop & Royal Preview */}
      <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
              Card Copy Workshop
            </span>
            <h3 className="text-xl font-bold text-[#231530] font-display mt-0.5">
              Celebration Invitation Card Proof &amp; Invocations
            </h3>
            <p className="text-xs text-[#231530]/60 mt-1">
              Generate authentic multilingual phrasing via Gemini with Sanskrit shlokas and real event details
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyInvitationText}
              className="px-3.5 py-1.5 bg-[#FAF7F2] hover:bg-[#E06D28] text-[#231530] hover:text-white border border-[#231530]/15 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Copied Wording!' : 'Copy Full Wording'}</span>
            </button>
          </div>
        </div>

        {/* AI Generator Controls Bar */}
        <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#231530]/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-[#231530] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E06D28]" />
              Gemini Invitation Composer
            </span>
            <span className="text-[11px] text-[#231530]/60 font-mono">
              Routes via AI Usage Gateway (Low-Cost)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-[#231530]/70 block mb-1">Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as any)}
                className="w-full text-xs p-2 bg-white rounded-lg border border-[#231530]/15 text-[#231530]"
              >
                <option value="bilingual">Bilingual (English + Sanskrit)</option>
                <option value="hi">Hindi (Devanagari)</option>
                <option value="en">English (Classic Royal)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#231530]/70 block mb-1">Tone</label>
              <select
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value as any)}
                className="w-full text-xs p-2 bg-white rounded-lg border border-[#231530]/15 text-[#231530]"
              >
                <option value="traditional_royal">Traditional Royal</option>
                <option value="modern_minimal">Modern Minimalist</option>
                <option value="festive_warm">Festive &amp; Warm</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#231530]/70 block mb-1">Hosts Line</label>
              <input
                type="text"
                value={hostsInput}
                onChange={(e) => setHostsInput(e.target.value)}
                className="w-full text-xs p-2 bg-white rounded-lg border border-[#231530]/15 text-[#231530]"
                placeholder="Hosts name"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#231530]/70 block mb-1">Celebrants / Couple</label>
              <input
                type="text"
                value={coupleInput}
                onChange={(e) => setCoupleInput(e.target.value)}
                className="w-full text-xs p-2 bg-white rounded-lg border border-[#231530]/15 text-[#231530]"
                placeholder="Names"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[#231530]/60">
              Respects date status ({isDateConfirmed ? `Confirmed: ${activeEvent.eventDate}` : 'Tentative: Date placeholder'})
            </span>

            <button
              onClick={handleGenerateCopy}
              disabled={isGeneratingCopy}
              className="px-4 py-2 bg-[#E06D28] hover:bg-[#C4551D] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGeneratingCopy ? 'Composing...' : 'Compose Invitation Wording'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: Input Form */}
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#231530]/70 mb-1">
                Sanskrit Invocation / Opening Blessing
              </label>
              <input
                type="text"
                value={invitationCopy.shlokaOrBlessing || ''}
                onChange={(e) => setInvitationCopy({ ...invitationCopy, shlokaOrBlessing: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl font-medium text-[#231530]"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#231530]/70 mb-1">
                Host Family Names
              </label>
              <input
                type="text"
                value={invitationCopy.hostsLine}
                onChange={(e) => setInvitationCopy({ ...invitationCopy, hostsLine: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl font-medium text-[#231530]"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#231530]/70 mb-1">
                Solicitation Phrasing
              </label>
              <textarea
                rows={2}
                value={invitationCopy.invitationText}
                onChange={(e) => setInvitationCopy({ ...invitationCopy, invitationText: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl font-medium text-[#231530]"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#231530]/70 mb-1">
                Couple / Honoree Names (Headline)
              </label>
              <input
                type="text"
                value={invitationCopy.coupleOrHonorLine}
                onChange={(e) => setInvitationCopy({ ...invitationCopy, coupleOrHonorLine: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl font-bold text-[#231530]"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#231530]/70 mb-1">
                Auspicious Muhurat &amp; Date
              </label>
              <input
                type="text"
                value={invitationCopy.dateAndMuhuratLine}
                onChange={(e) => setInvitationCopy({ ...invitationCopy, dateAndMuhuratLine: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530]"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#231530]/70 mb-1">
                Venue Location Line
              </label>
              <input
                type="text"
                value={invitationCopy.venueLine}
                onChange={(e) => setInvitationCopy({ ...invitationCopy, venueLine: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530]"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#231530]/70 mb-1">
                R.S.V.P. Line
              </label>
              <input
                type="text"
                value={invitationCopy.rsvpLine || ''}
                onChange={(e) => setInvitationCopy({ ...invitationCopy, rsvpLine: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530]"
              />
            </div>
          </div>

          {/* Right: Realistic Card Visualizer */}
          <div className="relative p-8 sm:p-10 rounded-2xl bg-[#FDFBF7] border-2 border-amber-300/60 shadow-xl text-center space-y-4 overflow-hidden">
            {/* Ornate Gold Border Corners */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-600/50" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-600/50" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-600/50" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-600/50" />

            {invitationCopy.shlokaOrBlessing && (
              <div className="text-amber-800 font-semibold text-xs tracking-wider">
                {invitationCopy.shlokaOrBlessing}
              </div>
            )}

            <div className="w-12 h-px bg-amber-400 mx-auto my-2" />

            <div className="text-xs uppercase tracking-widest text-[#231530]/70 font-semibold">
              {invitationCopy.hostsLine}
            </div>

            <div className="text-[11px] text-[#231530]/70 italic max-w-sm mx-auto leading-relaxed">
              {invitationCopy.invitationText}
            </div>

            <div className="py-2">
              <h2 className="text-2xl sm:text-3xl font-royal font-bold text-[#231530] tracking-wide">
                {invitationCopy.coupleOrHonorLine}
              </h2>
            </div>

            <div className="w-20 h-px bg-amber-400 mx-auto my-2" />

            <div className="text-xs font-semibold text-amber-900 tracking-wider">
              {invitationCopy.dateAndMuhuratLine}
            </div>

            <div className="text-xs text-[#231530]/80 font-medium">
              {invitationCopy.venueLine}
            </div>

            {invitationCopy.rsvpLine && (
              <div className="text-[10px] text-[#231530]/60 pt-2 tracking-widest uppercase">
                {invitationCopy.rsvpLine}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Community Events: Sponsor Proposal Section */}
      <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#231530]/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#E06D28]" />
              <h3 className="font-bold text-[#231530] font-display text-base">
                Community &amp; Corporate Sponsorship Proposal Engine
              </h3>
            </div>
            <p className="text-xs text-[#231530]/60 mt-0.5">
              Draft structured partnership tiers for community gatherings, cultural festivals, or public celebrations
            </p>
          </div>

          <button
            onClick={handleGenerateSponsorProposal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Sponsor Tiers</span>
          </button>
        </div>

        {sponsorProposal && (
          <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3 text-xs animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-indigo-950">{sponsorProposal.title}</span>
              <span className="text-[10px] font-mono uppercase bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full font-bold">
                PROPOSED SPONSORS ONLY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sponsorProposal.proposedTiers.map((tier: { tierName: string; contributionINR: number; deliverableSummary?: string[]; entitlements: string[]; disclaimer: string }, idx: number) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-indigo-100 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-[#231530]">{tier.tierName}</span>
                    <span className="font-mono font-bold text-[#E06D28]">
                      ₹{tier.contributionINR.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <ul className="text-[11px] text-[#231530]/70 space-y-1">
                    {tier.entitlements.map((ent: string, i: number) => (
                      <li key={i}>• {ent}</li>
                    ))}
                  </ul>
                  <div className="text-[10px] text-amber-800 italic pt-1 border-t border-neutral-100">
                    {tier.disclaimer}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[10.5px] text-indigo-900/70 pt-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{sponsorProposal.notice}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
