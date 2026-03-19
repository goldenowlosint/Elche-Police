import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use the direct connection (port 5432) for CLI operations like migrations
    url: process.env["DIRECT_URL"],
  },
});
