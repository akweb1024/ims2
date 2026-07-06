import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        // Prisma 7 ignores package.json's "prisma.seed" once prisma.config.ts
        // exists — without this, `prisma db seed` prints "No seed command
        // configured" and exits 0 (which silently broke CI e2e seeding).
        seed: "tsx prisma/seed.ts",
    },
    datasource: {
        url: process.env.DATABASE_URL || "postgresql://unauthenticated@localhost:5432/placeholder",
    },
});
