import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/currency';
import {
  Store,
  Plus,
  Star,
  Check,
  X,
  AlertCircle,
  Clock,
  Sparkles,
  FileText,
  Building,
  Columns,
  MapPin,
  ExternalLink,
  Phone,
  Search,
  Upload,
  Download,
  ShieldAlert,
  FileCheck,
  Layers,
  Trash2,
  Info,
  Filter,
} from 'lucide-react';
import { PlacesVendorResult, QuoteExtractionCandidate, VendorQuote } from '../../types';
import { vendorClient } from '../../services/vendorClient';
import { PDFExportService } from '../../services/pdfExportService';

export const VendorHubScreen: React.FC = () => {
  const {
    activeEvent,
    categories: budgetCategories,
    tasks,
    vendorQuotes,
    teamMembers,
    addVendorQuote,
    updateQuoteStatus,
    deleteVendorQuote,
    finalizeVendorForCategory,
    unfinalizeVendorForCategory,
    showToast,
  } = useApp();

  // Navigation tab
  const [hubTab, setHubTab] = useState<'directory' | 'quotes' | 'compare'>('directory');

  // Directory / Places Search State
  const [searchCity, setSearchCity] = useState(activeEvent.city || 'Jaipur');
  const [searchCategory, setSearchCategory] = useState('Catering');
  const [searchRadius, setSearchRadius] = useState(25);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesData, setPlacesData] = useState<{
    results: PlacesVendorResult[];
    isLive: boolean;
    sourceNotice: string;
  } | null>(null);

  // Quote Modal & AI Extractor State
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [extractorModalOpen, setExtractorModalOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [untrustedText, setUntrustedText] = useState('');
  const [extractedCandidate, setExtractedCandidate] = useState<QuoteExtractionCandidate | null>(null);

  // New quote form state
  const [newQuoteData, setNewQuoteData] = useState({
    vendorName: '',
    category: 'Catering',
    city: activeEvent.city || 'Jaipur',
    rating: 4.8,
    chargeBasis: 'Per plate',
    rate: 950,
    quantity: activeEvent.guestCount || 200,
    taxes: 9500,
    extras: 15000,
    minimumGuarantee: activeEvent.guestCount ? Math.round(activeEvent.guestCount * 0.9) : 180,
    deposits: 50000,
    inclusionsText: 'Full royal buffet spread\nUniformed service staff\nLive chaat & beverage counter',
    exclusionsText: 'Midnight snack extension\nHard alcohol bar glassware',
    validityDate: '2026-12-31',
    status: 'review' as 'review' | 'shortlisted' | 'finalized' | 'rejected',
    sourceType: 'USER_ENTERED' as 'USER_ENTERED' | 'DOCUMENT_EXTRACTED' | 'MODELLED_SAMPLE',
    sourceLabel: 'User-negotiated quotation',
    notes: 'Quotation verified with banquet coordinator',
  });

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [compareCategory, setCompareCategory] = useState('Catering');

  // Load directory on initial mount
  useEffect(() => {
    loadPlacesDirectory();
  }, [searchCategory, searchCity]);

  const loadPlacesDirectory = async () => {
    setPlacesLoading(true);
    try {
      const data = await vendorClient.searchPlacesVendors(searchCity, searchCategory, searchRadius);
      setPlacesData(data);
    } catch (err: any) {
      showToast('Could not fetch directory: ' + err.message, 'warning');
    } finally {
      setPlacesLoading(false);
    }
  };

  const handleOpenLogQuoteFromPlace = (place: PlacesVendorResult) => {
    setNewQuoteData((prev) => ({
      ...prev,
      vendorName: place.name,
      category: place.category,
      city: place.city,
      rating: place.rating || 4.5,
      sourceLabel: place.isLivePlaces ? 'Quotation from Google Places discovery' : 'Curated directory inquiry',
    }));
    setQuoteModalOpen(true);
  };

  const handleExtractQuote = async () => {
    if (!untrustedText.trim()) return;
    setExtracting(true);
    try {
      const candidate = await vendorClient.extractQuote(
        untrustedText,
        'vendor-quotation.pdf',
        'application/pdf',
        untrustedText.length
      );
      setExtractedCandidate(candidate);
      showToast(
        `AI Extracted quote figures with ${(candidate.confidence * 100).toFixed(0)}% confidence. Review below.`,
        'success'
      );
    } catch (err: any) {
      showToast('Quote extraction error: ' + err.message, 'error');
    } finally {
      setExtracting(false);
    }
  };

  const handleApplyExtractedCandidate = () => {
    if (!extractedCandidate) return;
    setNewQuoteData({
      vendorName: extractedCandidate.vendorName,
      category: extractedCandidate.category,
      city: extractedCandidate.city,
      rating: 4.8,
      chargeBasis: 'Per plate',
      rate: extractedCandidate.rate,
      quantity: extractedCandidate.quantity,
      taxes: extractedCandidate.taxes,
      extras: extractedCandidate.extras,
      minimumGuarantee: extractedCandidate.minimumGuarantee || 180,
      deposits: extractedCandidate.deposits || 0,
      inclusionsText: extractedCandidate.inclusions.join('\n'),
      exclusionsText: extractedCandidate.exclusions.join('\n'),
      validityDate: extractedCandidate.validityDate,
      status: 'review',
      sourceType: 'DOCUMENT_EXTRACTED',
      sourceLabel: `Extracted via AI document parser (${(extractedCandidate.confidence * 100).toFixed(0)}% confidence)`,
      notes: extractedCandidate.notes || 'Imported from AI-extracted candidate document.',
    });
    setExtractorModalOpen(false);
    setQuoteModalOpen(true);
    setExtractedCandidate(null);
    setUntrustedText('');
  };

  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteData.vendorName.trim()) return;

    addVendorQuote({
      vendorName: newQuoteData.vendorName,
      category: newQuoteData.category,
      city: newQuoteData.city,
      rating: Number(newQuoteData.rating),
      chargeBasis: newQuoteData.chargeBasis,
      rate: Number(newQuoteData.rate),
      quantity: Number(newQuoteData.quantity),
      taxes: Number(newQuoteData.taxes),
      extras: Number(newQuoteData.extras),
      minimumGuarantee: Number(newQuoteData.minimumGuarantee),
      deposits: Number(newQuoteData.deposits),
      inclusions: newQuoteData.inclusionsText.split('\n').filter((s) => s.trim() !== ''),
      exclusions: newQuoteData.exclusionsText.split('\n').filter((s) => s.trim() !== ''),
      validityDate: newQuoteData.validityDate,
      status: newQuoteData.status,
      sourceType: newQuoteData.sourceType,
      sourceLabel: newQuoteData.sourceLabel,
      notes: newQuoteData.notes,
    });

    setQuoteModalOpen(false);
    showToast(`Quotation saved for "${newQuoteData.vendorName}".`, 'success');
  };

  const handleDownloadPDF = () => {
    try {
      PDFExportService.downloadEventSummaryPDF(
        activeEvent,
        budgetCategories,
        tasks,
        vendorQuotes,
        teamMembers
      );
      showToast('Master event brief PDF downloaded successfully!', 'success');
    } catch (err: any) {
      showToast('Could not generate PDF: ' + err.message, 'error');
    }
  };

  const isCategoryMatch = (quoteCat: string, filterCat: string) => {
    if (!filterCat || filterCat.toLowerCase() === 'all') return true;
    if (!quoteCat) return false;
    const qc = quoteCat.toLowerCase().trim();
    const fc = filterCat.toLowerCase().trim();
    return (
      qc === fc ||
      qc.startsWith(fc) ||
      fc.startsWith(qc) ||
      (fc.includes('photo') && qc.includes('photo'))
    );
  };

  const categoriesList = ['all', 'Catering', 'Decor', 'Photography', 'Venue', 'Logistics'];

  const filteredQuotes = vendorQuotes.filter((q) => isCategoryMatch(q.category, selectedCategoryFilter));

  const standardCompareCategories = ['Catering', 'Decor', 'Photography', 'Venue', 'Logistics'];
  const extraCompareCategories = Array.from(
    new Set(
      vendorQuotes
        .map((q) => q.category)
        .filter((cat) => cat && !standardCompareCategories.some((sc) => isCategoryMatch(cat, sc)))
    )
  );
  const compareCategories = [...standardCompareCategories, ...extraCompareCategories];

  const comparisonQuotes = vendorQuotes.filter(
    (q) => (q.status === 'finalized' || q.status === 'shortlisted' || q.status === 'review') && isCategoryMatch(q.category, compareCategory)
  );

  const getTradeoffEvaluation = (quotes: VendorQuote[], category: string) => {
    if (quotes.length < 2) return '';
    const sorted = [...quotes].sort((a, b) => a.totalCalculated - b.totalCalculated);
    const lowest = sorted[0];
    const highest = sorted[sorted.length - 1];
    const diff = highest.totalCalculated - lowest.totalCalculated;

    if (category.toLowerCase().includes('catering')) {
      const lowestPerPlate = Math.round(lowest.totalCalculated / (lowest.quantity || 1));
      const highestPerPlate = Math.round(highest.totalCalculated / (highest.quantity || 1));
      return `Comparing shortlisted ${category} quotes reveals that ${lowest.vendorName} features a lower effective per-plate rate at ~₹${lowestPerPlate.toLocaleString('en-IN')}/pax (${formatINR(lowest.totalCalculated)} total for ${lowest.quantity} plates) with ${lowest.inclusions.length} listed inclusions. In contrast, ${highest.vendorName} offers premium package items at ~₹${highestPerPlate.toLocaleString('en-IN')}/pax (${formatINR(highest.totalCalculated)} total, variance: +${formatINR(diff)}). Confirm minimum guarantee headcounts (${lowest.minimumGuarantee || lowest.quantity} vs ${highest.minimumGuarantee || highest.quantity}) and live counter inclusions before signing binding addendums.`;
    }

    return `Comparing shortlisted ${category} quotes: ${lowest.vendorName} provides the most competitive package at ${formatINR(lowest.totalCalculated)} with ${lowest.inclusions.length} inclusions. ${highest.vendorName} offers extended scope at ${formatINR(highest.totalCalculated)} (variance: +${formatINR(diff)}). Evaluate specific inclusions against exclusions (e.g. equipment, overtime rates, permits) to determine true net value.`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
            <span>Phase 7 Vendor Ecosystem</span>
            <span className="text-[#231530]/40">·</span>
            <span>Google Places &amp; Quote Auditor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#231530] font-display">
            Vendor Hub &amp; Quotation Studio
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadPDF}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-[#FAF7F2] border border-[#231530]/15 text-[#231530] hover:bg-[#231530]/5 transition-colors cursor-pointer shadow-2xs"
            title="Download comprehensive printable event brief PDF"
          >
            <Download className="w-4 h-4 text-[#E06D28]" />
            <span>Export Brief (PDF)</span>
          </button>

          <button
            onClick={() => setExtractorModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>AI Document Extractor</span>
          </button>

          <button
            onClick={() => setQuoteModalOpen(true)}
            className="px-4 py-2 bg-[#E06D28] hover:bg-[#C4551D] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Vendor Quote</span>
          </button>
        </div>
      </div>

      {/* Governance & Anti-Hallucination Notice */}
      <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-950 leading-relaxed shadow-2xs">
        <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold">Vendor Governance &amp; Price Integrity:</div>
          <div className="text-[#231530]/80">
            Google Places data displays public business listings and contact locations. No per-plate pricing or live availability is inferred from Google Maps. All quotation totals are calculated with integer precision arithmetic and require explicit contractual addendums before booking.
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#231530]/10 pb-3">
        <button
          onClick={() => setHubTab('directory')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            hubTab === 'directory'
              ? 'bg-[#231530] text-white shadow-xs'
              : 'bg-[#FAF7F2] text-[#231530]/70 hover:text-[#231530]'
          }`}
        >
          <Building className="w-4 h-4 text-[#E06D28]" />
          <span>Vendor Directory (Places)</span>
        </button>

        <button
          onClick={() => setHubTab('quotes')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            hubTab === 'quotes'
              ? 'bg-[#231530] text-white shadow-xs'
              : 'bg-[#FAF7F2] text-[#231530]/70 hover:text-[#231530]'
          }`}
        >
          <FileCheck className="w-4 h-4 text-[#E06D28]" />
          <span>Active Quotations ({vendorQuotes.length})</span>
        </button>

        <button
          onClick={() => setHubTab('compare')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            hubTab === 'compare'
              ? 'bg-[#231530] text-white shadow-xs'
              : 'bg-[#FAF7F2] text-[#231530]/70 hover:text-[#231530]'
          }`}
        >
          <Columns className="w-4 h-4 text-[#E06D28]" />
          <span>Apples-to-Apples Comparison</span>
        </button>
      </div>

      {/* TAB 1: VENDOR DIRECTORY VIA PLACES */}
      {hubTab === 'directory' && (
        <div className="space-y-6">
          {/* Places Search Bar */}
          <div className="p-4 bg-white border border-[#231530]/10 rounded-2xl shadow-xs space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[11px] font-semibold text-[#231530]/70 uppercase tracking-wider block mb-1">
                  City &amp; Region
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl">
                  <MapPin className="w-4 h-4 text-[#E06D28]" />
                  <input
                    type="text"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="w-full text-xs bg-transparent focus:outline-hidden text-[#231530]"
                    placeholder="e.g. Jaipur"
                  />
                </div>
              </div>

              <div className="w-48">
                <label className="text-[11px] font-semibold text-[#231530]/70 uppercase tracking-wider block mb-1">
                  Category
                </label>
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530] font-medium"
                >
                  <option value="Catering">Catering</option>
                  <option value="Venue">Venue</option>
                  <option value="Decor">Decor</option>
                  <option value="Photography">Photography</option>
                  <option value="Logistics">Logistics</option>
                </select>
              </div>

              <div className="w-36">
                <label className="text-[11px] font-semibold text-[#231530]/70 uppercase tracking-wider block mb-1">
                  Radius
                </label>
                <select
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530] font-medium"
                >
                  <option value="15">15 km</option>
                  <option value="25">25 km (Default)</option>
                  <option value="50">50 km</option>
                </select>
              </div>

              <div className="pt-5">
                <button
                  onClick={loadPlacesDirectory}
                  disabled={placesLoading}
                  className="px-4 py-2 bg-[#E06D28] hover:bg-[#C4551D] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{placesLoading ? 'Searching Places...' : 'Search Places'}</span>
                </button>
              </div>
            </div>

            {placesData && (
              <div className="flex items-center justify-between text-[11px] text-[#231530]/60 pt-2 border-t border-[#231530]/5">
                <span>{placesData.sourceNotice}</span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-[#231530]">
                  {placesData.isLive ? 'LIVE PLACES API' : 'CURATED DIRECTORY'}
                </span>
              </div>
            )}
          </div>

          {/* Places Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {placesData?.results.map((place) => (
              <div
                key={place.id}
                className="p-5 bg-white border border-[#231530]/10 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between hover:border-[#E06D28]/30 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-[#E06D28]/10 text-[#E06D28]">
                      {place.category}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                        place.isLivePlaces
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {place.isLivePlaces ? 'Live Google Places' : 'Verified Directory'}
                    </span>
                  </div>

                  <h3 className="font-bold text-[#231530] text-sm leading-snug font-display">
                    {place.name}
                  </h3>

                  <div className="text-xs text-[#231530]/70 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{place.address}</span>
                  </div>

                  {place.rating && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="flex items-center gap-1 text-amber-600 font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{place.rating}</span>
                      </div>
                      <span className="text-[11px] text-[#231530]/50 font-mono">
                        ({place.userRatingCount || 0} reviews)
                      </span>
                    </div>
                  )}

                  {/* Clarification Notice */}
                  <div className="p-2.5 bg-amber-50/50 border border-amber-200/50 rounded-xl text-[10.5px] text-amber-900 leading-relaxed">
                    <div className="font-semibold text-[10px] uppercase text-amber-800 flex items-center gap-1">
                      <Info className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>Rate &amp; Booking Clarification:</span>
                    </div>
                    {place.priceClarificationNotice}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#231530]/5 flex items-center justify-between gap-2">
                  {place.websiteUri ? (
                    <a
                      href={place.websiteUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#E06D28] hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-[#231530]/40 font-mono">{place.phone || 'Inquire directly'}</span>
                  )}

                  <button
                    onClick={() => handleOpenLogQuoteFromPlace(place)}
                    className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#E06D28] text-[#231530] hover:text-white border border-[#231530]/15 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Log Quote</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE QUOTATIONS & AI EXTRACTOR */}
      {hubTab === 'quotes' && (
        <div className="space-y-6">
          {/* Category Filter */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategoryFilter.toLowerCase() === cat.toLowerCase()
                      ? 'bg-[#231530] text-white font-semibold'
                      : 'bg-white border border-[#231530]/10 text-[#231530]/70 hover:text-[#231530]'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>

            <span className="text-xs text-[#231530]/60">
              Showing <strong>{filteredQuotes.length}</strong> logged quotes
            </span>
          </div>

          {/* Quotes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQuotes.map((q) => {
              const isFinal = q.status === 'finalized';
              return (
              <div
                key={q.id}
                className={`p-5 bg-white border rounded-2xl shadow-xs space-y-4 transition-all ${
                  isFinal
                    ? 'border-2 border-emerald-500 bg-emerald-50/15 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-[#231530]/10 hover:border-[#E06D28]/30'
                }`}
              >
                {isFinal && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-200" />
                      <span>FINAL SELECTED VENDOR (Agreed Contract)</span>
                    </div>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono">
                      Committed to Budget
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-neutral-100 text-[#231530]/70">
                      {q.category}
                    </span>
                    <h3 className="font-bold text-[#231530] text-base mt-1 font-display">
                      {q.vendorName}
                    </h3>
                    <div className="text-xs text-[#231530]/60">
                      {q.city} · {q.chargeBasis} · Valid until {q.validityDate || '2026-12-31'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold font-mono text-[#E06D28]">
                      {formatINR(q.totalCalculated)}
                    </div>
                    <div className="text-[11px] text-[#231530]/50 font-mono">
                      {formatINR(q.rate)}/unit × {q.quantity}
                    </div>
                  </div>
                </div>

                {/* Financial breakdown pills */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#FAF7F2] rounded-xl text-xs text-center border border-[#231530]/5">
                  <div>
                    <div className="text-[10px] text-[#231530]/50 uppercase font-semibold">Base Cost</div>
                    <div className="font-mono font-bold text-[#231530]">{formatINR(q.rate * q.quantity)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#231530]/50 uppercase font-semibold">Taxes</div>
                    <div className="font-mono font-bold text-[#231530]">{formatINR(q.taxes)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#231530]/50 uppercase font-semibold">Extras</div>
                    <div className="font-mono font-bold text-[#231530]">{formatINR(q.extras)}</div>
                  </div>
                </div>

                {/* Inclusions & Exclusions */}
                <div className="space-y-1.5 text-xs">
                  <div className="font-semibold text-[#231530] text-[11px] uppercase tracking-wider">
                    Package Inclusions ({q.inclusions.length}):
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {q.inclusions.slice(0, 4).map((inc, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                      >
                        ✓ {inc}
                      </span>
                    ))}
                    {q.inclusions.length > 4 && (
                      <span className="text-[10px] text-[#231530]/50 self-center">
                        +{q.inclusions.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Provenance and status bar */}
                <div className="pt-2 border-t border-[#231530]/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[10px] text-[#231530]/50 italic">
                    {q.sourceLabel}
                  </span>

                  <div className="flex items-center gap-2">
                    {isFinal ? (
                      <button
                        type="button"
                        onClick={() => updateQuoteStatus(q.id, 'shortlisted')}
                        className="px-2.5 py-1 bg-emerald-100 hover:bg-rose-50 text-emerald-900 hover:text-rose-700 border border-emerald-300 hover:border-rose-300 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Click to remove final vendor status"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Finalized ✓</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => finalizeVendorForCategory(q.id)}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-[#231530] hover:text-emerald-900 border border-[#231530]/20 hover:border-emerald-400 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Mark this vendor as the final chosen vendor for this category"
                      >
                        <Check className="w-3.5 h-3.5 text-[#E06D28]" />
                        <span>Select as Final</span>
                      </button>
                    )}

                    <select
                      value={q.status}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        if (val === 'finalized') {
                          finalizeVendorForCategory(q.id);
                        } else {
                          updateQuoteStatus(q.id, val);
                        }
                      }}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border font-mono uppercase cursor-pointer ${
                        q.status === 'finalized'
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : q.status === 'shortlisted'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : q.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      <option value="review">Review</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="finalized">Finalized</option>
                      <option value="rejected">Rejected</option>
                    </select>

                    <button
                      onClick={() => deleteVendorQuote(q.id)}
                      className="p-1.5 text-[#231530]/40 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Remove quote"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: APPLES-TO-APPLES COMPARISON */}
      {hubTab === 'compare' && (
        <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#231530]/10 pb-4">
            <div>
              <h3 className="font-bold text-[#231530] font-display text-lg">
                Apples-to-Apples Vendor Comparison Matrix
              </h3>
              <p className="text-xs text-[#231530]/60 mt-0.5">
                Side-by-side audit of rates, taxes, hidden surcharges, and service inclusion terms within the same category
              </p>
            </div>
            <span className="text-xs text-[#E06D28] font-semibold bg-[#E06D28]/10 px-3 py-1 rounded-full font-mono self-start sm:self-auto">
              {comparisonQuotes.length} Quotes Active ({compareCategory})
            </span>
          </div>

          {/* Category Filter on Top */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#FAF7F2] border border-[#231530]/10 rounded-xl">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-[#231530]/70 flex items-center gap-1.5 whitespace-nowrap">
                <Filter className="w-3.5 h-3.5 text-[#E06D28]" />
                Filter by Category:
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                {compareCategories.map((cat) => {
                  const count = vendorQuotes.filter(
                    (q) =>
                      (q.status === 'finalized' || q.status === 'shortlisted' || q.status === 'review') &&
                      isCategoryMatch(q.category, cat)
                  ).length;
                  const isSelected = isCategoryMatch(compareCategory, cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => setCompareCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#231530] text-white font-semibold shadow-xs'
                          : 'bg-white border border-[#231530]/15 text-[#231530]/70 hover:text-[#231530] hover:bg-neutral-50'
                      }`}
                    >
                      <span>{cat}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isSelected
                            ? 'bg-white/20 text-white font-bold'
                            : count > 0
                            ? 'bg-[#E06D28]/10 text-[#E06D28] font-bold'
                            : 'bg-neutral-100 text-neutral-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <span className="text-xs text-[#231530]/60 whitespace-nowrap">
              Comparing <strong>{comparisonQuotes.length}</strong> {compareCategory} quote{comparisonQuotes.length !== 1 ? 's' : ''}
            </span>
          </div>

          {comparisonQuotes.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#231530]/60 space-y-2.5">
              <Columns className="w-8 h-8 text-[#E06D28] mx-auto opacity-50" />
              <div className="font-semibold text-sm text-[#231530]">
                No Shortlisted or Review Quotes in {compareCategory}
              </div>
              <p className="max-w-md mx-auto">
                Apples-to-apples comparison requires vendors in the same category. Log or shortlist vendor quotations in {compareCategory} to view side-by-side analysis.
              </p>
              <button
                onClick={() => {
                  setNewQuoteData((prev) => ({ ...prev, category: compareCategory }));
                  setQuoteModalOpen(true);
                }}
                className="mt-2 px-3.5 py-2 bg-[#231530] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#231530]/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#E06D28]" />
                Log {compareCategory} Quote
              </button>
            </div>
          ) : comparisonQuotes.length === 1 ? (
            <div className="p-8 text-center text-xs text-[#231530]/60 space-y-2.5">
              <Columns className="w-8 h-8 text-[#E06D28] mx-auto opacity-50" />
              <div className="font-semibold text-sm text-[#231530]">
                Need At Least 2 {compareCategory} Quotes for Comparison
              </div>
              <p className="max-w-md mx-auto">
                Currently 1 quote is active in {compareCategory} (<strong>{comparisonQuotes[0].vendorName}</strong>).
                Add or shortlist a second {compareCategory} quotation to unlock the direct side-by-side audit.
              </p>
              <button
                onClick={() => {
                  setNewQuoteData((prev) => ({ ...prev, category: compareCategory }));
                  setQuoteModalOpen(true);
                }}
                className="mt-2 px-3.5 py-2 bg-[#231530] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#231530]/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#E06D28]" />
                Log Another {compareCategory} Quote
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#231530]/15 bg-[#FAF7F2] text-[#231530]/80">
                    <th className="p-3 font-semibold w-48">Comparison Metric</th>
                    {comparisonQuotes.map((q) => {
                      const isFinal = q.status === 'finalized';
                      return (
                        <th
                          key={q.id}
                          className={`p-3 font-bold text-sm text-[#231530] transition-colors ${
                            isFinal ? 'bg-emerald-50/80 border-t-2 border-emerald-500' : ''
                          }`}
                        >
                          {isFinal && (
                            <span className="inline-flex items-center gap-1 mb-1.5 text-[10px] font-mono uppercase bg-emerald-600 text-white px-2 py-0.5 rounded font-bold shadow-2xs">
                              <Check className="w-3 h-3 text-emerald-100" />
                              <span>Final Selected Vendor</span>
                            </span>
                          )}
                          <div className="font-display text-[#231530]">{q.vendorName}</div>
                          <div className="text-[11px] font-normal text-[#231530]/60">
                            {q.category} · {q.city}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#231530]/10">
                  <tr>
                    <td className="p-3 font-semibold text-[#231530]">Status</td>
                    {comparisonQuotes.map((q) => (
                      <td key={q.id} className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-sm font-bold text-[10px] uppercase font-mono ${
                            q.status === 'finalized'
                              ? 'bg-emerald-600 text-white'
                              : q.status === 'shortlisted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-[#FAF7F2]/40">
                    <td className="p-3 font-semibold text-[#231530]">Procurement Decision</td>
                    {comparisonQuotes.map((q) => {
                      const isFinal = q.status === 'finalized';
                      return (
                        <td key={q.id} className="p-3">
                          {isFinal ? (
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Agreed Final Vendor</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => finalizeVendorForCategory(q.id)}
                              className="px-3 py-1 bg-white hover:bg-emerald-50 border border-[#231530]/20 hover:border-emerald-500 text-xs font-semibold text-[#231530] hover:text-emerald-900 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Mark this vendor as the final agreed choice"
                            >
                              <Check className="w-3.5 h-3.5 text-[#E06D28]" />
                              <span>Select as Final</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[#231530]">Base Unit Rate</td>
                    {comparisonQuotes.map((q) => (
                      <td key={q.id} className="p-3 font-mono font-bold text-[#231530]">
                        {formatINR(q.rate)} / {q.chargeBasis}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[#231530]">Quantity / Guarantee</td>
                    {comparisonQuotes.map((q) => (
                      <td key={q.id} className="p-3 font-mono text-[#231530]">
                        {q.quantity} units (Min: {q.minimumGuarantee || q.quantity})
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[#231530]">Taxes &amp; Surcharges</td>
                    {comparisonQuotes.map((q) => (
                      <td key={q.id} className="p-3 font-mono text-[#231530]">
                        {formatINR(q.taxes)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[#231530]">Extras &amp; Live Stations</td>
                    {comparisonQuotes.map((q) => (
                      <td key={q.id} className="p-3 font-mono text-[#231530]">
                        {formatINR(q.extras)}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-[#FAF7F2] font-semibold">
                    <td className="p-3 font-bold text-[#231530]">Total Calculated Cost</td>
                    {comparisonQuotes.map((q) => (
                      <td key={q.id} className="p-3 font-mono text-base font-bold text-[#E06D28]">
                        {formatINR(q.totalCalculated)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[#231530]">
                      {isCategoryMatch(compareCategory, 'Catering') ? 'Effective Rate / Plate' : 'Effective Unit Cost'}
                    </td>
                    {comparisonQuotes.map((q) => (
                      <td key={q.id} className="p-3 font-mono font-bold text-neutral-800">
                        ₹{Math.round(q.totalCalculated / (q.quantity || 1)).toLocaleString('en-IN')}
                        {isCategoryMatch(compareCategory, 'Catering') ? '/pax' : q.quantity > 1 ? ` (${q.quantity} units)` : ''}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[#231530]">Inclusions Breakdown</td>
                    {comparisonQuotes.map((q) => (
                      <td key={q.id} className="p-3 align-top">
                        <ul className="space-y-1 text-[11px] text-[#231530]/80">
                          {q.inclusions.map((inc, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-emerald-600">✓</span>
                              <span>{inc}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[#231530]">Exclusions &amp; Gaps</td>
                    {comparisonQuotes.map((q) => (
                      <td key={q.id} className="p-3 align-top">
                        <ul className="space-y-1 text-[11px] text-[#231530]/60">
                          {q.exclusions.map((exc, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-rose-500">✗</span>
                              <span>{exc}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              {/* Tradeoff Explanation Box */}
              <div className="mt-6 p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-700" />
                  <span className="font-bold text-xs uppercase tracking-wider text-indigo-950">
                    Utsav AI Objective Tradeoff Evaluation ({compareCategory}):
                  </span>
                </div>
                <p className="text-xs text-indigo-900/90 leading-relaxed">
                  {getTradeoffEvaluation(comparisonQuotes, compareCategory)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: MANUAL QUOTE ENTRY */}
      {quoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-[#231530]/10 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-[#231530]/10 bg-[#FAF7F2] flex items-center justify-between rounded-t-2xl">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-[#E06D28]">
                  Vendor Financial Management
                </span>
                <h3 className="text-lg font-bold text-[#231530] font-display">Log Vendor Quotation</h3>
              </div>
              <button
                onClick={() => setQuoteModalOpen(false)}
                className="p-2 text-[#231530]/60 hover:text-[#231530] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-[#231530] block mb-1">Vendor Business Name</label>
                  <input
                    type="text"
                    required
                    value={newQuoteData.vendorName}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, vendorName: e.target.value })}
                    className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530]"
                    placeholder="e.g. Maharaja Royal Kitchens"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#231530] block mb-1">Category</label>
                  <select
                    value={newQuoteData.category}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, category: e.target.value })}
                    className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530]"
                  >
                    <option value="Catering">Catering</option>
                    <option value="Venue">Venue</option>
                    <option value="Decor">Decor</option>
                    <option value="Photography">Photography</option>
                    <option value="Logistics">Logistics</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#231530] block mb-1">City</label>
                  <input
                    type="text"
                    value={newQuoteData.city}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, city: e.target.value })}
                    className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#231530] block mb-1">Unit Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newQuoteData.rate}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, rate: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#231530] block mb-1">Quantity (Units / Guests)</label>
                  <input
                    type="number"
                    min="1"
                    value={newQuoteData.quantity}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, quantity: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#231530] block mb-1">Taxes (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newQuoteData.taxes}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, taxes: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#231530] block mb-1">Extras / Stations (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newQuoteData.extras}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, extras: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530] font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <div className="p-3 bg-[#FAF7F2] rounded-xl flex items-center justify-between font-semibold text-xs border border-[#231530]/10">
                    <span className="text-[#231530]">Calculated Total Cost:</span>
                    <span className="font-mono text-sm text-[#E06D28] font-bold">
                      {formatINR(newQuoteData.rate * newQuoteData.quantity + newQuoteData.taxes + newQuoteData.extras)}
                    </span>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-[#231530] block mb-1">
                    Package Inclusions (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={newQuoteData.inclusionsText}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, inclusionsText: e.target.value })}
                    className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530]"
                    placeholder="Full royal buffet spread&#10;25 service stewards&#10;Live chaat station"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-[#231530] block mb-1">
                    Exclusions (One per line)
                  </label>
                  <textarea
                    rows={2}
                    value={newQuoteData.exclusionsText}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, exclusionsText: e.target.value })}
                    className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530]"
                    placeholder="Alcohol license&#10;Overtime past midnight"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#231530] block mb-1">Quote Validity Date</label>
                  <input
                    type="date"
                    value={newQuoteData.validityDate}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, validityDate: e.target.value })}
                    className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#231530] block mb-1">Status</label>
                  <select
                    value={newQuoteData.status}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, status: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530]"
                  >
                    <option value="review">Review</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="finalized">Finalized (Agreed Contract)</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#231530]/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setQuoteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#231530]/60 hover:text-[#231530] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#E06D28] hover:bg-[#C4551D] text-white text-xs font-semibold rounded-xl cursor-pointer shadow-sm"
                >
                  Save Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AI DOCUMENT EXTRACTOR */}
      {extractorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-[#231530]/10 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-[#231530]/10 bg-indigo-50/60 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700">
                    Gemini Document Parser
                  </span>
                  <h3 className="text-base font-bold text-[#231530] font-display">
                    Extract Quote from Proposal Text / PDF
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setExtractorModalOpen(false)}
                className="p-2 text-[#231530]/60 hover:text-[#231530] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[#231530]/70 leading-relaxed">
                Paste supplier proposal text below. Gemini extracts rates, guest guarantees, inclusions, and line-item taxes with explicit source citations.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#231530] block">
                  Supplier Proposal Text / OCR Content
                </label>
                <textarea
                  rows={6}
                  value={untrustedText}
                  onChange={(e) => setUntrustedText(e.target.value)}
                  placeholder="Paste vendor proposal text here...&#10;e.g.&#10;Maharaja Kitchens Quote&#10;Rate: ₹950 per plate, 200 guests&#10;Taxes: ₹9,500 GST&#10;Extras: ₹15,000 for live chaat&#10;Inclusions: Royal Rajasthani thali, 25 stewards&#10;Valid until: 2026-12-31"
                  className="w-full text-xs p-3 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl text-[#231530] font-mono"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    setUntrustedText(
                      `JAIPUR HERITAGE CATERERS QUOTATION\nFrom: Maharaja Royal Kitchens\nDate: 15 Oct 2026\nRate: ₹950 per plate\nQuantity: 200 guests\nTaxes: ₹9,500 (5% GST)\nExtras: ₹15,000 (Live Chaat & Kulfi Counter)\nInclusions: Royal Rajasthani thali, welcome mocktails, 25 stewards\nExclusions: Hard liquor glassware\nValid until: 2026-12-31`
                    )
                  }
                  className="text-[11px] text-[#E06D28] hover:underline font-medium cursor-pointer"
                >
                  Insert Sample Vendor Quote
                </button>

                <button
                  onClick={handleExtractQuote}
                  disabled={extracting || !untrustedText.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{extracting ? 'Extracting via AI...' : 'Extract Quote Figures'}</span>
                </button>
              </div>

              {/* Extracted Preview Card */}
              {extractedCandidate && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      Extracted Candidate Quotation
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                      {(extractedCandidate.confidence * 100).toFixed(0)}% Confidence
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#231530]/60">Vendor:</span>{' '}
                      <strong>{extractedCandidate.vendorName}</strong>
                    </div>
                    <div>
                      <span className="text-[#231530]/60">Category:</span>{' '}
                      <strong>{extractedCandidate.category}</strong>
                    </div>
                    <div>
                      <span className="text-[#231530]/60">Rate:</span>{' '}
                      <strong className="font-mono">{formatINR(extractedCandidate.rate)}/unit</strong>
                    </div>
                    <div>
                      <span className="text-[#231530]/60">Total Calc:</span>{' '}
                      <strong className="font-mono text-[#E06D28]">{formatINR(extractedCandidate.totalCalculated)}</strong>
                    </div>
                  </div>

                  {extractedCandidate.sourceReferences.length > 0 && (
                    <div className="text-[10.5px] text-[#231530]/70 space-y-0.5 pt-1 border-t border-emerald-200/60">
                      <span className="font-semibold text-emerald-900">Source Citations:</span>
                      {extractedCandidate.sourceReferences.map((ref, idx) => (
                        <div key={idx}>• {ref}</div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={handleApplyExtractedCandidate}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Review &amp; Import into Active Quotations
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
