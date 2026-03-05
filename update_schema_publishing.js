const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// 1. Add Journal Fields
schema = schema.replace(
  /  impactFactor      Float\?/g,
  `  impactFactor      Float?
  frequencyTrack    String?       @default("TRACK_A") // TRACK_A (3 issues), TRACK_B (2 issues), MODULAR
  subscriptionYear  Int?`
);

// 2. Add Institution Affiliation
schema = schema.replace(
  /  domain              String\?/g,
  `  domain              String?
  universityId        String?`
);

// 3. Add university relation to Institution (this part is tricky to do with regex reliably without knowing exact block ending, but I'll try)
// Find the closing brace of Institution and add the relation.
const instMatch = schema.match(/model Institution \{[\s\S]*?\}\n/);
if (instMatch) {
    let instBlock = instMatch[0];
    if (!instBlock.includes('university    Institution?')) {
        instBlock = instBlock.replace(
            /  assignedTo          User\?[\s\S]*?\n/,
            `$&  university          Institution?       @relation("UniversityToAffiliate", fields: [universityId], references: [id])
  affiliates          Institution[]     @relation("UniversityToAffiliate")\n`
        );
        schema = schema.replace(instMatch[0], instBlock);
    }
}

// 4. Update SubscriptionItem to be more generic
schema = schema.replace(
  /  planId         String/g,
  `  planId         String?`
);

schema = schema.replace(
  /  plan           Plan         @relation\(fields: \[planId\], references: \[id\]\)/g,
  `  plan           Plan?        @relation(fields: [planId], references: [id])
  courseId       String?
  course         Course?      @relation(fields: [courseId], references: [id])
  workshopId     String?
  workshop       Workshop?    @relation(fields: [workshopId], references: [id])
  productId      String?
  product        Product?     @relation(fields: [productId], references: [id])`
);

// 5. Create ProductCategory and Product models for modularity
if (!schema.includes('model Product')) {
  schema += \`
model ProductCategory {
  id          String    @id @default(uuid())
  name        String    @unique
  description String?
  products    Product[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Product {
  id                String             @id @default(uuid())
  name              String
  type              String             // e.g. "DOI", "APC", "RAPID_PUB", "CERTIFICATE"
  categoryId        String?
  category          ProductCategory?   @relation(fields: [categoryId], references: [id])
  priceINR          Float              @default(0)
  priceUSD          Float              @default(0)
  isActive          Boolean            @default(true)
  metadata          Json?              // Extensible attributes
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  subscriptionItems SubscriptionItem[]
}
\`;
}

// 6. Update AgencyDetails for Tiered Discounts
schema = schema.replace(
  /  discountRate       Float              @default\(0\)/g,
  `  discountRate       Float              @default(0)
  discountTier       String?           @default("GOLD") // GOLD, SILVER, BRONZE, CUSTOM
  tierMetadata       Json?             // Tiers can have fixed percentages based on product types`
);

fs.writeFileSync('prisma/schema.prisma', schema);
