import { defineRailway, github, postgres, redis, project, service } from "railway/iac";

export default defineRailway(() => {
  // Adopt the existing managed databases (must match the service names already created).
  const db = postgres("Postgres");
  const cache = redis("Redis");

  // NestJS API + BullMQ workers (in-process). Built from the repo root so the
  // pnpm workspace + @hrms/shared resolve; turbo --filter builds shared first.
  // NODE_ENV is intentionally NOT set here — it would make the install prune the
  // devDependencies (turbo, @nestjs/cli, typescript) the build needs.
  const api = service("api", {
    source: github("Adineu03/hrms", { branch: "main" }),
    build: "pnpm exec turbo build --filter=@hrms/api",
    start: "pnpm --filter @hrms/api start:prod",
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      REDIS_URL: cache.env.REDIS_URL,
      // OPENAI_API_KEY + JWT_* are set out-of-band via `railway variable set --stdin`
      // (kept out of source). WEB_URL + NEXT_PUBLIC_API_URL set after domains exist.
    },
  });

  // Next.js frontend.
  const web = service("web", {
    source: github("Adineu03/hrms", { branch: "main" }),
    build: "pnpm exec turbo build --filter=@hrms/web",
    start: "pnpm --filter @hrms/web start",
  });

  return project("hrms", {
    resources: [db, cache, api, web],
  });
});
