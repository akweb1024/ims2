import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

const db = prisma as any;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strip HTML tags from WooCommerce descriptions.
 */
function stripHtml(html: string | null | undefined): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
}

/**
 * Map WooCommerce product category slugs/names → our InvoiceProductCategory enum.
 */
function mapCategory(wcCategories: { slug: string; name: string }[]): string {
    if (!wcCategories?.length) return 'MISC';
    const slugs = wcCategories.map(c => c.slug.toLowerCase());
    const names = wcCategories.map(c => c.name.toLowerCase());
    const all = [...slugs, ...names].join(' ');

    if (all.includes('journal') || all.includes('subscription')) return 'JOURNAL_SUBSCRIPTION';
    if (all.includes('course') || all.includes('training')) return 'COURSE';
    if (all.includes('workshop')) return 'WORKSHOP';
    if (all.includes('doi') || all.includes('digital-object')) return 'DOI_SERVICE';
    if (all.includes('apc') || all.includes('article-processing')) return 'APC';
    if (all.includes('certificate') || all.includes('certification')) return 'CERTIFICATE';
    if (all.includes('digital') || all.includes('service') || all.includes('software')) return 'DIGITAL_SERVICE';
    return 'MISC';
}

/**
 * Convert WooCommerce regular/sale price strings to floats.
 * WooCommerce prices are stored in the shop's base currency (INR in this case).
 */
function parsePrice(price?: string): number {
    if (!price) return 0;
    return parseFloat(price) || 0;
}

/**
 * Fetch ALL pages from a WooCommerce REST API endpoint using the WC REST API.
 */
async function fetchAllWooPages(
    baseUrl: string,
    endpoint: string,
    consumerKey: string,
    consumerSecret: string,
): Promise<any[]> {
    const results: any[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
        const url = new URL(`${baseUrl}/wp-json/wc/v3/${endpoint}`);
        url.searchParams.set('per_page', String(perPage));
        url.searchParams.set('page', String(page));
        url.searchParams.set('status', 'publish');

        const resp = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
                'Content-Type': 'application/json',
            },
            // 30-second timeout via AbortController
            signal: AbortSignal.timeout(30_000),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`WooCommerce API error (${resp.status}) on ${endpoint}: ${errText.slice(0, 300)}`);
        }

        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) break;

        results.push(...data);
        if (data.length < perPage) break;
        page++;
    }

    return results;
}

// ─── GET: Return last sync status ─────────────────────────────────────────
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (_req: NextRequest, user: any) => {
        try {
            const [lastSynced, totalWoo] = await Promise.all([
                db.invoiceProduct.findFirst({
                    where: { companyId: user.companyId, wooExternalId: { not: null } },
                    orderBy: { wooSyncedAt: 'desc' },
                    select: { wooSyncedAt: true },
                }),
                db.invoiceProduct.count({
                    where: { companyId: user.companyId, wooExternalId: { not: null } },
                }),
            ]);

            return NextResponse.json({
                lastSyncedAt: lastSynced?.wooSyncedAt || null,
                totalSyncedProducts: totalWoo,
            });
        } catch (error) {
            return handleApiError(error, 'woo-sync/status');
        }
    }
);

// ─── POST: Trigger sync ────────────────────────────────────────────────────
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user: any) => {
        try {
            const body = await req.json();
            const {
                storeUrl = 'https://shop.stmjournals.com',
                consumerKey,
                consumerSecret,
                fxRate = 84, // INR → USD conversion rate
                overwriteManual = false,
            } = body;

            if (!consumerKey || !consumerSecret) {
                return NextResponse.json({ error: 'WooCommerce Consumer Key and Secret are required.' }, { status: 400 });
            }

            const baseUrl = storeUrl.replace(/\/$/, '');
            const now = new Date();

            logger.info('WooCommerce sync started', { companyId: user.companyId, storeUrl: baseUrl });

            // ── Fetch all products from WooCommerce ─────────────────────────
            const [wcProducts, wcVariations] = await Promise.all([
                fetchAllWooPages(baseUrl, 'products', consumerKey, consumerSecret),
                // We'll fetch variations per variable product in the upsert loop
                Promise.resolve([] as any[]),
            ]);

            const stats = { created: 0, updated: 0, skipped: 0, errors: 0 };

            for (const wcp of wcProducts) {
                try {
                    const isVariable = wcp.type === 'variable';
                    const priceINR = parsePrice(wcp.price || wcp.regular_price);
                    const priceUSD = parseFloat((priceINR / fxRate).toFixed(2));

                    // Map fields
                    const productData: any = {
                        name: wcp.name,
                        type: isVariable ? 'VARIABLE' : 'SIMPLE',
                        description: stripHtml(wcp.description),
                        shortDesc: stripHtml(wcp.short_description),
                        sku: wcp.sku || null,
                        priceINR: isVariable ? null : (isNaN(priceINR) ? 0 : priceINR),
                        priceUSD: isVariable ? null : (isNaN(priceUSD) ? 0 : priceUSD),
                        tags: (wcp.tags || []).map((t: any) => t.name).slice(0, 20),
                        category: mapCategory(wcp.categories || []),
                        isActive: wcp.status === 'publish',
                        isFeatured: wcp.featured || false,
                        wooExternalId: wcp.id,
                        wooSyncedAt: now,
                        updatedByUserId: user.id,
                        companyId: user.companyId,
                    };

                    // Check existing by wooExternalId within this company
                    const existing = await db.invoiceProduct.findFirst({
                        where: { wooExternalId: wcp.id, companyId: user.companyId },
                        include: { variants: true },
                    });

                    let productId: string;

                    if (existing) {
                        // Update if allowed (always update woo-sourced fields)
                        await db.invoiceProduct.update({
                            where: { id: existing.id },
                            data: {
                                name: productData.name,
                                type: productData.type,
                                description: productData.description,
                                shortDesc: productData.shortDesc,
                                priceINR: productData.priceINR,
                                priceUSD: productData.priceUSD,
                                tags: productData.tags,
                                category: productData.category,
                                isActive: productData.isActive,
                                isFeatured: productData.isFeatured,
                                // Only update SKU if no manual override or overwriteManual is true
                                ...((overwriteManual || !existing.sku) && productData.sku
                                    ? { sku: productData.sku }
                                    : {}),
                                wooSyncedAt: now,
                                updatedByUserId: user.id,
                            },
                        });
                        productId = existing.id;
                        stats.updated++;
                    } else {
                        // Check if sku conflicts
                        if (productData.sku) {
                            const skuConflict = await db.invoiceProduct.findUnique({ where: { sku: productData.sku } });
                            if (skuConflict) {
                                productData.sku = `${productData.sku}-woo${wcp.id}`;
                            }
                        }
                        const created = await db.invoiceProduct.create({ data: productData });
                        productId = created.id;
                        stats.created++;
                    }

                    // ── Handle Variants for VARIABLE products ───────────────
                    if (isVariable) {
                        let wcVars: any[] = [];
                        try {
                            wcVars = await fetchAllWooPages(
                                baseUrl,
                                `products/${wcp.id}/variations`,
                                consumerKey,
                                consumerSecret,
                            );
                        } catch (varErr) {
                            logger.warn('Could not fetch variations for product', { productId: wcp.id, err: String(varErr) });
                        }

                        for (const v of wcVars) {
                            const varPriceINR = parsePrice(v.price || v.regular_price);
                            const varPriceUSD = parseFloat((varPriceINR / fxRate).toFixed(2));

                            // Build attribute map: { "Size": "Large", "Color": "Red" }
                            const attrMap: Record<string, string> = {};
                            for (const attr of v.attributes || []) {
                                attrMap[attr.name] = attr.option;
                            }

                            const variantWooId = v.id;

                            // Check existing variant by sku or embedded woo id in attributes
                            const existingVariant = existing?.variants?.find((ev: any) =>
                                (v.sku && ev.sku === v.sku) ||
                                (ev.attributes as any)?.__wooVariationId === variantWooId
                            );

                            const variantPayload = {
                                productId,
                                sku: v.sku || null,
                                priceINR: isNaN(varPriceINR) ? 0 : varPriceINR,
                                priceUSD: isNaN(varPriceUSD) ? 0 : varPriceUSD,
                                stockQuantity: v.stock_quantity ?? null,
                                manageStock: v.manage_stock || false,
                                isActive: v.status === 'publish',
                                imageUrl: v.image?.src || null,
                                attributes: { ...attrMap, __wooVariationId: variantWooId },
                            };

                            if (existingVariant) {
                                await db.productVariant.update({
                                    where: { id: existingVariant.id },
                                    data: {
                                        priceINR: variantPayload.priceINR,
                                        priceUSD: variantPayload.priceUSD,
                                        stockQuantity: variantPayload.stockQuantity,
                                        manageStock: variantPayload.manageStock,
                                        isActive: variantPayload.isActive,
                                        imageUrl: variantPayload.imageUrl,
                                        attributes: variantPayload.attributes,
                                        ...(overwriteManual && v.sku ? { sku: v.sku } : {}),
                                    },
                                });
                            } else {
                                // Handle sku conflicts on variant
                                if (variantPayload.sku) {
                                    const skuConflict = await db.productVariant.findUnique({
                                        where: { sku: variantPayload.sku },
                                    });
                                    if (skuConflict) {
                                        variantPayload.sku = `${variantPayload.sku}-woo${variantWooId}`;
                                    }
                                }
                                await db.productVariant.create({ data: variantPayload });
                            }
                        }
                    }
                } catch (productErr: any) {
                    logger.error('WooCommerce sync error for product', { wcProductId: wcp.id, err: productErr.message });
                    stats.errors++;
                }
            }

            logger.info('WooCommerce sync completed', {
                companyId: user.companyId,
                ...stats,
                total: wcProducts.length,
            });

            return NextResponse.json({
                success: true,
                total: wcProducts.length,
                ...stats,
                syncedAt: now.toISOString(),
            });
        } catch (error: any) {
            logger.error('WooCommerce sync failed', { err: error.message });
            return handleApiError(error, 'woo-sync');
        }
    }
);
