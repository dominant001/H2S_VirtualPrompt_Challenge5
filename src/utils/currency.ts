/**
 * Indian Rupee (INR) formatting utilities adhering to Indian number grouping system:
 * e.g. ₹12,00,000, ₹1,80,000, ₹45,000.
 */

export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINRCompact(amount: number): string {
  if (isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  if (abs >= 10000000) {
    const cr = abs / 10000000;
    return `${sign}₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    const lakh = abs / 100000;
    return `${sign}₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} Lakh`;
  }
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${sign}₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `${sign}₹${abs}`;
}

export function formatEventDate(dateString?: string): string {
  if (!dateString || dateString.trim() === '') {
    return 'Date to be confirmed';
  }
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Date to be confirmed';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Date to be confirmed';
  }
}
