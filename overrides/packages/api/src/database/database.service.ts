import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@azez/database";

const LEGACY_SSL_ALIASES = new Set(["prefer", "require", "verify-ca"]);

export function normalizeDatabaseConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
    if (sslMode && LEGACY_SSL_ALIASES.has(sslMode)) {
      // pg currently treats these aliases as verify-full. Make that secure behavior explicit
      // before the next major version adopts weaker libpq-compatible alias semantics.
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    return connectionString.replace(
      /([?&]sslmode=)(prefer|require|verify-ca)(?=(&|$))/i,
      "$1verify-full",
    );
  }
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly client: PrismaClient;

  constructor() {
    const configuredConnectionString = process.env.DATABASE_URL;
    if (!configuredConnectionString) {
      throw new Error("DATABASE_URL is required");
    }
    const connectionString = normalizeDatabaseConnectionString(configuredConnectionString);
    this.client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
