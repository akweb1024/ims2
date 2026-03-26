type ReservationStatus = "RESERVED" | "CONSUMED" | "RELEASED";

const nowIso = () => new Date().toISOString();

const getQuantity = (item: any) => Number(item?.quantity || 0);

const isTrackablePhysicalProduct = (product: any) => {
  const inventorySettings = product?.productAttributes?.inventorySettings || {};
  return Boolean(
    inventorySettings.isPhysicalDeliverable && inventorySettings.trackInventory,
  );
};

export async function applyInvoiceStockReservations(
  tx: any,
  {
    invoiceId,
    companyId,
    lineItems,
    userId,
    reason = "Invoice stock reservation",
  }: {
    invoiceId: string;
    companyId: string | null | undefined;
    lineItems: any[];
    userId: string;
    reason?: string;
  },
) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) return lineItems;

  const productIds = Array.from(
    new Set(
      lineItems
        .map((item: any) => item?.productId)
        .filter((id: any): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  if (!productIds.length) return lineItems;

  const products: any[] = await tx.invoiceProduct.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      sku: true,
      name: true,
      category: true,
      productAttributes: true,
    },
  });

  const productById = new Map<string, any>(
    products.map((product: any) => [product.id, product]),
  );
  const nextLineItems = [...lineItems];

  for (let index = 0; index < nextLineItems.length; index++) {
    const item = nextLineItems[index];
    if (item?.stockReservation?.status) continue; // already reserved

    const product = item?.productId ? productById.get(item.productId) : null;
    if (!product || !isTrackablePhysicalProduct(product)) continue;

    const qty = getQuantity(item);
    if (qty <= 0) continue;

    // Variant-backed stock (variable products)
    if (item.variantId) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        select: { id: true, stockQuantity: true },
      });

      if (!variant) {
        throw new Error(`Variant not found for stock reservation: ${item.variantId}`);
      }

      const available = Number(variant.stockQuantity || 0);
      if (available < qty) {
        throw new Error(
          `Insufficient stock for ${item.description || product.name}. Available: ${available}, Required: ${qty}`,
        );
      }

      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stockQuantity: available - qty },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: "RESERVE_VARIANT_STOCK",
          entity: "Invoice",
          entityId: invoiceId,
          changes: {
            invoiceId,
            variantId: variant.id,
            productId: product.id,
            quantity: qty,
            beforeStock: available,
            afterStock: available - qty,
            reason,
          },
        },
      });

      nextLineItems[index] = {
        ...item,
        stockReservation: {
          status: "RESERVED" as ReservationStatus,
          sourceType: "VARIANT",
          productId: product.id,
          variantId: variant.id,
          quantity: qty,
          reservedAt: nowIso(),
        },
      };
      continue;
    }

    // Simple products: reserve via logistics inventory item mapped by SKU.
    if (!product.sku || !companyId) {
      throw new Error(
        `Stock tracking requires SKU and company mapping for ${product.name}.`,
      );
    }

    const inventoryItem = await tx.inventoryItem.findUnique({
      where: {
        sku_companyId: {
          sku: product.sku,
          companyId,
        },
      },
    });

    if (!inventoryItem) {
      throw new Error(
        `No inventory record found for SKU ${product.sku}. Add stock in /dashboard/logistics/inventory first.`,
      );
    }

    const available = Number(inventoryItem.quantity || 0);
    if (available < qty) {
      throw new Error(
        `Insufficient stock for ${item.description || product.name}. Available: ${available}, Required: ${qty}`,
      );
    }

    await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: { quantity: available - qty },
    });

    await tx.stockMovement.create({
      data: {
        inventoryItemId: inventoryItem.id,
        type: "RESERVE",
        quantity: qty,
        referenceId: invoiceId,
        notes: reason,
        createdBy: userId,
      },
    });

    nextLineItems[index] = {
      ...item,
      stockReservation: {
        status: "RESERVED" as ReservationStatus,
        sourceType: "INVENTORY_ITEM",
        productId: product.id,
        inventoryItemId: inventoryItem.id,
        quantity: qty,
        reservedAt: nowIso(),
      },
    };
  }

  return nextLineItems;
}

export async function consumeInvoiceStockReservations(tx: any, invoiceId: string) {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, lineItems: true },
  });
  if (!invoice || !Array.isArray(invoice.lineItems)) return;

  const next = invoice.lineItems.map((item: any) => {
    if (item?.stockReservation?.status !== "RESERVED") return item;
    return {
      ...item,
      stockReservation: {
        ...item.stockReservation,
        status: "CONSUMED" as ReservationStatus,
        consumedAt: nowIso(),
      },
    };
  });

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { lineItems: next },
  });
}

export async function releaseInvoiceStockReservations(
  tx: any,
  {
    invoiceId,
    userId,
    reason = "Invoice stock reservation released",
  }: {
    invoiceId: string;
    userId: string;
    reason?: string;
  },
) {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, lineItems: true },
  });
  if (!invoice || !Array.isArray(invoice.lineItems)) return;

  const nextLineItems = [...invoice.lineItems];

  for (let index = 0; index < nextLineItems.length; index++) {
    const item = nextLineItems[index];
    const reservation = item?.stockReservation;
    if (!reservation || reservation.status !== "RESERVED") continue;

    const qty = Number(reservation.quantity || 0);
    if (qty <= 0) continue;

    if (reservation.sourceType === "VARIANT" && reservation.variantId) {
      const variant = await tx.productVariant.findUnique({
        where: { id: reservation.variantId },
        select: { id: true, stockQuantity: true },
      });
      if (variant) {
        const nextStock = Number(variant.stockQuantity || 0) + qty;
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stockQuantity: nextStock },
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: "RELEASE_VARIANT_STOCK",
            entity: "Invoice",
            entityId: invoiceId,
            changes: {
              invoiceId,
              variantId: variant.id,
              productId: reservation.productId,
              quantity: qty,
              beforeStock: Number(variant.stockQuantity || 0),
              afterStock: nextStock,
              reason,
            },
          },
        });
      }
    } else if (
      reservation.sourceType === "INVENTORY_ITEM" &&
      reservation.inventoryItemId
    ) {
      const invItem = await tx.inventoryItem.findUnique({
        where: { id: reservation.inventoryItemId },
        select: { id: true, quantity: true },
      });
      if (invItem) {
        await tx.inventoryItem.update({
          where: { id: invItem.id },
          data: { quantity: Number(invItem.quantity || 0) + qty },
        });
        await tx.stockMovement.create({
          data: {
            inventoryItemId: invItem.id,
            type: "RELEASE",
            quantity: qty,
            referenceId: invoiceId,
            notes: reason,
            createdBy: userId,
          },
        });
      }
    }

    nextLineItems[index] = {
      ...item,
      stockReservation: {
        ...reservation,
        status: "RELEASED" as ReservationStatus,
        releasedAt: nowIso(),
      },
    };
  }

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { lineItems: nextLineItems },
  });
}

export async function replaceInvoiceStockReservations(
  tx: any,
  {
    invoiceId,
    companyId,
    nextLineItems,
    userId,
    reason = "Invoice line items updated, reservation reconciled",
  }: {
    invoiceId: string;
    companyId: string | null | undefined;
    nextLineItems: any[];
    userId: string;
    reason?: string;
  },
) {
  await releaseInvoiceStockReservations(tx, {
    invoiceId,
    userId,
    reason: `${reason}: release previous`,
  });

  return applyInvoiceStockReservations(tx, {
    invoiceId,
    companyId,
    lineItems: nextLineItems,
    userId,
    reason: `${reason}: reserve updated`,
  });
}
