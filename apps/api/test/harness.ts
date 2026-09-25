import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

/**
 * Integration harness: boots the real Nest application against the real
 * database, so these tests exercise the same guards, filters, transactions and
 * SQL the product runs in production (docs/spec/12 — Integration).
 */
export interface Harness {
  app: INestApplication;
  prisma: PrismaService;
  close: () => Promise<void>;
}

export async function createHarness(): Promise<Harness> {
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-that-is-long-enough";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-that-is-long-enough";

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api", { exclude: ["health"] });
  app.use(cookieParser());
  await app.init();

  const prisma = app.get(PrismaService);

  return {
    app,
    prisma,
    close: async () => {
      await app.close();
    },
  };
}

export const DEMO_PASSWORD = "Zycount!Demo2026";

export interface Session {
  token: string;
  user: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
    companies: Array<{ id: string; name: string }>;
  };
}

export async function login(app: INestApplication, email: string): Promise<Session> {
  const response = await request(app.getHttpServer())
    .post("/api/auth/login")
    .send({ email, password: DEMO_PASSWORD })
    .expect(200);

  return { token: response.body.accessToken, user: response.body.user };
}

/** Pre-authenticated request builders, so tests read as intent not plumbing. */
export function api(app: INestApplication, session: Session, companyId?: string) {
  const headers = (req: request.Test) => {
    req.set("Authorization", `Bearer ${session.token}`);
    if (companyId) req.set("X-Company-Id", companyId);
    return req;
  };

  return {
    get: (path: string) => headers(request(app.getHttpServer()).get(`/api${path}`)),
    post: (path: string, body?: unknown) =>
      headers(request(app.getHttpServer()).post(`/api${path}`).send(body ?? {})),
    patch: (path: string, body?: unknown) =>
      headers(request(app.getHttpServer()).patch(`/api${path}`).send(body ?? {})),
    delete: (path: string) => headers(request(app.getHttpServer()).delete(`/api${path}`)),
  };
}
