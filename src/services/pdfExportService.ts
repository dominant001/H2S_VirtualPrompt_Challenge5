/**
 * Utsav AI — Phase 7: Real Event PDF Export Service
 * Generates downloadable, structured multi-section PDF event briefs
 * with exact financial figures, provenance legends, checklist milestones, and quotes.
 */

import { jsPDF } from 'jspdf';
import { BudgetCategory, EventModel, TaskItem, TeamMember, VendorQuote } from '../types';
import { formatINR } from '../utils/currency';

export class PDFExportService {
  /**
   * Generates a fully formatted jsPDF document with real event figures and disclaimers.
   */
  public static buildEventPDF(
    event: EventModel,
    categories: BudgetCategory[] = [],
    tasks: TaskItem[] = [],
    quotes: VendorQuote[] = [],
    team: TeamMember[] = []
  ): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 18;

    // Helper: Header bar
    doc.setFillColor(35, 21, 48); // Deep Indigo #231530
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('UTSAV AI — MASTER EVENT PLAN & FINANCIAL BRIEF', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const timestampStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    doc.text(`CONFIDENTIAL · Generated on ${timestampStr} (IST) · Version v${event.version || 1}`, margin, 18);

    y = 32;

    // Event Overview Block
    doc.setTextColor(35, 21, 48);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(event.name, margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const dateText = event.hasExactDate && event.eventDate
      ? `Date: ${event.eventDate}`
      : 'Date: Date to be finalized (Astrological Muhurat Pending)';
    const overviewLine = `Type: ${event.type.toUpperCase()}  |  City: ${event.city}, Rajasthan  |  Guests: ${event.guestCount}  |  ${dateText}`;
    doc.text(overviewLine, margin, y);
    y += 8;

    // Financial KPI Summary Cards
    const totalAllocated = categories.reduce((sum, c) => sum + (c.allocated || 0), 0);
    const contingencyCat = categories.find((c) => c.isContingency || c.name.toLowerCase().includes('contingency'));
    const contingencyINR = contingencyCat ? contingencyCat.allocated : 180000;

    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 247, 242);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('TOTAL CEILING', margin + 6, y + 6);
    doc.text('ALLOCATED TOTAL', margin + 50, y + 6);
    doc.text('CONTINGENCY RESERVE', margin + 100, y + 6);
    doc.text('STATUS', margin + 150, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(224, 109, 40); // Orange
    doc.text(formatINR(event.totalBudget), margin + 6, y + 12);
    doc.setTextColor(35, 21, 48);
    doc.text(formatINR(totalAllocated), margin + 50, y + 12);
    doc.text(formatINR(contingencyINR), margin + 100, y + 12);

    const variance = totalAllocated - event.totalBudget;
    if (variance === 0) {
      doc.setTextColor(22, 101, 52); // Emerald
      doc.text('BALANCED (0 Var)', margin + 150, y + 12);
    } else {
      doc.setTextColor(185, 28, 28);
      doc.text(`VAR ${formatINR(variance)}`, margin + 150, y + 12);
    }

    y += 24;

    // Section 1: Budget Category Allocation Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(35, 21, 48);
    doc.text('1. BUDGET ALLOCATIONS & PROVENANCE', margin, y);
    y += 5;

    // Table Header
    doc.setFillColor(240, 237, 232);
    doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text('Category', margin + 2, y + 4.5);
    doc.text('Allocated', margin + 55, y + 4.5);
    doc.text('Committed', margin + 85, y + 4.5);
    doc.text('Paid', margin + 115, y + 4.5);
    doc.text('Source Provenance', margin + 140, y + 4.5);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);

    for (const cat of categories.slice(0, 10)) {
      doc.text(cat.name.slice(0, 26), margin + 2, y + 4);
      doc.text(formatINR(cat.allocated), margin + 55, y + 4);
      doc.text(formatINR(cat.committedAmount ?? cat.committed ?? 0), margin + 85, y + 4);
      const paidText = formatINR(cat.paidAmount ?? cat.paid ?? 0) + (cat.isPaidLocked ? ' (Locked)' : '');
      doc.text(paidText, margin + 115, y + 4);

      const src = cat.selectedVendorName
        ? `CONTRACT: ${cat.selectedVendorName}`
        : (cat.sourceType === 'modelled' ? 'BUDGET ESTIMATE' : cat.sourceType || 'BUDGET ESTIMATE');
      doc.text(src.slice(0, 24), margin + 140, y + 4);

      doc.setDrawColor(245, 245, 245);
      doc.line(margin, y + 5.5, pageWidth - margin, y + 5.5);
      y += 6;
    }

    y += 4;

    // Provenance Legend Callout
    doc.setFillColor(254, 243, 199); // Amber 50
    doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(146, 64, 14); // Amber 800
    doc.text('PROVENANCE NOTICE:', margin + 3, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.text('MODELLED_SAMPLE: Parametric estimate. USER_ENTERED: Negotiated quotation. DOCUMENT_EXTRACTED: Candidate proposal.', margin + 3, y + 7.5);
    y += 16;

    // Section 2: Key Checklist Milestones & Dependency Chains
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(35, 21, 48);
    doc.text('2. CRITICAL PATH CHECKLIST & TIMELINE', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);

    const keyTasks = tasks.slice(0, 6);
    if (keyTasks.length > 0) {
      for (const t of keyTasks) {
        const checkMark = t.status === 'completed' ? '[X]' : '[ ]';
        const offset = t.relativeOffsetDays ? ` (T${t.relativeOffsetDays > 0 ? '+' : ''}${t.relativeOffsetDays}d)` : '';
        const line = `${checkMark} ${t.title.slice(0, 65)}${offset} — [${t.categoryName || 'General'}]`;
        doc.text(line, margin + 2, y + 3.5);
        y += 5;
      }
    } else {
      doc.text('No active tasks scheduled.', margin + 2, y + 3.5);
      y += 5;
    }

    y += 5;

    // Page Break for Section 3 & 4
    doc.addPage();
    y = 18;

    // Page 2 Header
    doc.setFillColor(35, 21, 48);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`UTSAV AI — ${event.name} (Page 2)`, margin, 9);
    y = 22;

    // Section 3: Vendor Quotes & Apples-to-Apples Comparisons
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(35, 21, 48);
    doc.text('3. VENDOR QUOTATIONS & COMPARISONS', margin, y);
    y += 6;

    if (quotes.length > 0) {
      doc.setFillColor(240, 237, 232);
      doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text('Vendor Name', margin + 2, y + 4.5);
      doc.text('Category', margin + 55, y + 4.5);
      doc.text('Unit Rate', margin + 85, y + 4.5);
      doc.text('Total Calc', margin + 115, y + 4.5);
      doc.text('Status / Expiry', margin + 145, y + 4.5);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);

      for (const q of quotes) {
        doc.text(q.vendorName.slice(0, 24), margin + 2, y + 4);
        doc.text(q.category, margin + 55, y + 4);
        doc.text(formatINR(q.rate), margin + 85, y + 4);
        doc.text(formatINR(q.totalCalculated), margin + 115, y + 4);
        doc.text(`${q.status.toUpperCase()} (${q.validityDate || 'Open'})`, margin + 145, y + 4);

        y += 6;

        // Inclusions line
        if (q.inclusions && q.inclusions.length > 0) {
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(`   Inclusions: ${q.inclusions.join(', ').slice(0, 95)}`, margin + 2, y + 2.5);
          doc.setFontSize(8);
          doc.setTextColor(40, 40, 40);
          y += 5;
        }

        doc.setDrawColor(240, 240, 240);
        doc.line(margin, y, pageWidth - margin, y);
        y += 2;
      }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('No vendor quotations logged yet. Log quotations via Vendor Hub.', margin + 2, y + 4);
      y += 8;
    }

    y += 8;

    // Section 4: Event Planning Team Roles
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(35, 21, 48);
    doc.text('4. COORDINATION TEAM & RESPONSIBILITIES', margin, y);
    y += 6;

    if (team.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);

      for (const m of team) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${m.name} (${m.relation}):`, margin + 2, y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.text(m.primaryResponsibilities.join(', ') || 'Coordination', margin + 55, y + 3.5);
        y += 5.5;
      }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text('Default family coordination team assigned.', margin + 2, y + 3.5);
      y += 6;
    }

    y += 12;

    // Legal & Security Disclaimer Footer
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('GOVERNANCE & CONTRACTUAL DISCLAIMER', margin + 3, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'This document contains planning estimates compiled by Utsav AI. Figures do NOT constitute formal contracts or booking confirmations. ' +
      'All vendor rates, venue license limits, plate counts, and astrological timings must be validated directly with respective providers. ' +
      'Confidential document: Not for commercial distribution or unauthorized reproduction.',
      margin + 3,
      y + 8,
      { maxWidth: pageWidth - margin * 2 - 6 }
    );

    return doc;
  }

  /**
   * Generates and triggers actual browser file download
   */
  public static downloadEventSummaryPDF(
    event: EventModel,
    categories: BudgetCategory[] = [],
    tasks: TaskItem[] = [],
    quotes: VendorQuote[] = [],
    team: TeamMember[] = []
  ): void {
    const doc = PDFExportService.buildEventPDF(event, categories, tasks, quotes, team);
    const filename = `utsav-event-summary-${(event.name || 'celebration')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')}.pdf`;
    doc.save(filename);
  }
}
