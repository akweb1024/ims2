import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCompanyIntegration } from '@/lib/integration-secrets';

/**
 * Resolves the Gemini key to use for a company: its own CompanyIntegration (configured and
 * tested via Settings → Integrations, same as the "STM Aria" chat/document-extraction
 * features) if active, else the server-wide GEMINI_API_KEY env var, else null.
 */
async function getCompanyGeminiKey(companyId: string | null | undefined): Promise<string | null> {
    if (companyId) {
        const integration = await getCompanyIntegration(companyId, 'GEMINI');
        if (integration?.isActive && integration.key) return integration.key;
    }
    return process.env.GEMINI_API_KEY || null;
}

export interface GenerateTextOptions {
    companyId?: string | null;
    model?: string;
}

/**
 * Calls Gemini with a plain prompt and returns the response text, or null if no key is
 * configured (per-company CompanyIntegration or env) or the call fails for any reason.
 * Never throws — every caller is expected to have a non-AI fallback.
 */
export async function generateText(prompt: string, opts: GenerateTextOptions = {}): Promise<string | null> {
    try {
        const apiKey = await getCompanyGeminiKey(opts.companyId);
        if (!apiKey) return null;
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: opts.model || 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text()?.trim();
        return text || null;
    } catch {
        return null;
    }
}

/** Whether a company (or the server env) has a usable Gemini key — for UI gating. */
export async function isGeminiConfigured(companyId: string | null | undefined): Promise<boolean> {
    return (await getCompanyGeminiKey(companyId)) !== null;
}
