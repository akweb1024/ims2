
let cachedRates: Record<string, number> = {
    'INR': 1,
    'USD': 83.5,
    'EUR': 90.2,
    'GBP': 105.8,
    'AED': 22.7,
    'SGD': 61.5,
    'AUD': 55.4,
    'CAD': 61.2
};
let lastFetch = 0;

/**
 * Approximate exchange rates for manual conversion.
 */
export const EXCHANGE_RATES = cachedRates;

/**
 * Fetches latest exchange rates from a public API.
 */
export async function getLiveRates() {
    const now = Date.now();
    if (now - lastFetch < 3600000 && lastFetch !== 0) return cachedRates; // Cache for 1 hour

    try {
        const res = await fetch('https://open.er-api.com/v6/latest/INR');
        if (res.ok) {
            const data = await res.json();
            if (data.rates) {
                // The API gives rates relative to INR (e.g. 1 INR = 0.012 USD)
                // We want 1 USD = X INR, so we take 1 / rate
                const newRates: Record<string, number> = {};
                Object.keys(data.rates).forEach(cur => {
                    newRates[cur] = 1 / data.rates[cur];
                });
                cachedRates = newRates;
                lastFetch = now;
                return cachedRates;
            }
        }
    } catch (err) {
        console.error('Failed to fetch exchange rates:', err);
    }
    return cachedRates;
}

/**
 * Converts a given amount from its native currency to INR.
 */
export function convertToINR(amount: number, currency: string = 'INR', customRate?: number): number {
    if (customRate) return amount * customRate;
    const rate = cachedRates[currency.toUpperCase()] || 1;
    return amount * rate;
}

/**
 * Formats a currency value with its appropriate symbol.
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
    const config: any = {
        style: 'currency',
        currency: currency.toUpperCase()
    };

    if (currency.toUpperCase() === 'INR') {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    }

    return new Intl.NumberFormat('en-US', config).format(amount);
}
