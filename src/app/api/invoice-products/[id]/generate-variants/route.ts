import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const db = prisma as any;

const generateVariantsSchema = z.object({
    overwrite: z.boolean().optional().default(false),
});

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;
            let body: any = {};
            try { body = await request.json(); } catch { } // Body is optional

            const parsed = generateVariantsSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 422 });
            }
            const { overwrite } = parsed.data;

            const product = await db.invoiceProduct.findFirst({
                where: { id, OR: [{ companyId: user.companyId }, { companyId: null }] },
                include: { attributes: { include: { values: true } }, variants: true }
            });
            if (!product) throw new NotFoundError('Product not found');
            if (product.type !== 'VARIABLE') throw new ValidationError('Product must be of type VARIABLE to generate variants');
            if (product.attributes.length === 0) throw new ValidationError('Product must have at least one attribute to generate variants');

            // Find all attributes and values
            const attributes = product.attributes;
            for (const attr of attributes) {
                if (attr.values.length === 0) throw new ValidationError(`Attribute "${attr.name}" has no values`);
            }

            if (product.variants.length > 0 && !overwrite) {
                return NextResponse.json({ error: 'Variants already exist. Use { overwrite: true } to regenerate.' }, { status: 409 });
            }

            // Permutation logic
            const buildPermutations = (arrays: any[][], index: number = 0): any[][] => {
                if (index === arrays.length) return [[]];
                const res: any[][] = [];
                const currentArray = arrays[index];
                const subPermutations = buildPermutations(arrays, index + 1);
                for (const item of currentArray) {
                    for (const sub of subPermutations) {
                        res.push([item, ...sub]);
                    }
                }
                return res;
            };

            const permutableArrays = attributes.map((a: any) => a.values.map((v: any) => ({ attribute: a, value: v })));
            const permutations = buildPermutations(permutableArrays);

            const generatedVariants = await db.$transaction(async (tx: any) => {
                if (overwrite) {
                    // This cascades nicely, removing mapping entries
                    await tx.productVariant.deleteMany({ where: { productId: id } });
                }

                const result = [];
                let skuIndex = 1;
                for (const perm of permutations) {
                    const skuSuffix = perm.map((p: any) => p.value.value.substring(0, 3).toUpperCase()).join('-');
                    const suggestedSku = `${product.name.substring(0, 3).toUpperCase()}-${id.substring(0, 4).toUpperCase()}-${skuSuffix}-${skuIndex++}`;
                    
                    const attrJson = perm.reduce((acc: any, curr: any) => {
                        acc[curr.attribute.name] = curr.value.value;
                        return acc;
                    }, {});

                    const variant = await tx.productVariant.create({
                        data: {
                            productId: id,
                            sku: suggestedSku,
                            priceINR: product.basePrice ?? 0,
                            priceUSD: product.basePrice ?? 0,
                            stockQuantity: 0,
                            manageStock: true,
                            isActive: true,
                            attributes: attrJson,
                        }
                    });

                    // Add mapping
                    await tx.variantAttributeMapping.createMany({
                        data: perm.map((p: any) => ({
                            variantId: variant.id,
                            attributeValueId: p.value.id,
                        }))
                    });

                    result.push({ ...variant, mappings: perm });
                }
                return result;
            });

            logger.info('Variants generated', {
                productId: id, variantCount: permutations.length, overwrite, userId: user.id
            });

            const refreshedProduct = await db.invoiceProduct.findUnique({
                where: { id },
                include: { variants: { include: { attributeValues: true } }, attributes: { include: { values: true } } }
            });

            return NextResponse.json(refreshedProduct, { status: 201 });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
