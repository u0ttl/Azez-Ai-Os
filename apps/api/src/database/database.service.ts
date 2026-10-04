import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@azez/database";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly client: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }
    this.client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
