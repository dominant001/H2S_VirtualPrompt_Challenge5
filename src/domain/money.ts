/**
 * Utsav AI — Phase 4: Money Domain Primitive
 * Represents currency in integer paise (1 INR = 100 paise) to eliminate floating-point rounding drift.
 */

export type Paise = number;

export class Money {
  /**
   * Convert INR amount (can be float or integer) to integer Paise
   */
  public static fromINR(inr: number): Paise {
    if (!Number.isFinite(inr)) return 0;
    return Math.round(inr * 100);
  }

  /**
   * Convert integer Paise back to standard INR number
   */
  public static toINR(paise: Paise): number {
    return Math.round(paise) / 100;
  }

  /**
   * Add two paise amounts
   */
  public static add(a: Paise, b: Paise): Paise {
    return Math.round(a + b);
  }

  /**
   * Subtract b from a in paise
   */
  public static subtract(a: Paise, b: Paise): Paise {
    return Math.round(a - b);
  }

  /**
   * Multiply paise by a factor, rounding to nearest integer paise
   */
  public static multiply(a: Paise, factor: number): Paise {
    return Math.round(a * factor);
  }

  /**
   * Divide paise by divisor, rounding to nearest integer paise
   */
  public static divide(a: Paise, divisor: number): Paise {
    if (divisor === 0) return 0;
    return Math.round(a / divisor);
  }

  /**
   * Format paise to standard Indian localized currency string (e.g. ₹12,00,000)
   */
  public static formatINR(paise: Paise, showPaiseDecimals: boolean = false): string {
    const inr = Money.toINR(paise);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: showPaiseDecimals ? 2 : 0,
      minimumFractionDigits: showPaiseDecimals ? 2 : 0,
    }).format(inr);
  }

  /**
   * Format paise to compact string e.g. ₹12L or ₹2.45L
   */
  public static formatCompact(paise: Paise): string {
    const inr = Money.toINR(paise);
    if (Math.abs(inr) >= 10000000) {
      return `₹${(inr / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
    }
    if (Math.abs(inr) >= 100000) {
      return `₹${(inr / 100000).toFixed(2).replace(/\.00$/, '')} L`;
    }
    if (Math.abs(inr) >= 1000) {
      return `₹${(inr / 1000).toFixed(1).replace(/\.0$/, '')} K`;
    }
    return `₹${inr.toLocaleString('en-IN')}`;
  }
}
