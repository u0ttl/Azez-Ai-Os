import { ConflictException, Injectable } from "@nestjs/common";
import { Organization } from "@azez/database";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service.js";
import { CreateOrganizationDto } from "./create-organization.dto.js";

@Injectable()
export class OrganizationsService {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateOrganizationDto, userId: string): Promise<Organization> {
    const existing = await this.database.client.organization.findUnique({ where: { slug: input.slug } });
    if (existing) {
      throw new ConflictException({ code: "ORGANIZATION_SLUG_TAKEN", detail: "Slug is already used" });
    }

    const organizationId = randomUUID();
    const [organization] = await this.database.client.$transaction([
      this.database.client.organization.create({
        data: { id: organizationId, name: input.name.trim(), slug: input.slug, locale: input.locale },
      }),
      this.database.client.membership.create({
        data: { organizationId, userId, role: "OWNER", status: "ACTIVE" },
      }),
    ]);
    return organization;
  }

  async list(userId: string): Promise<Organization[]> {
    return this.database.client.organization.findMany({
      where: { deletedAt: null, memberships: { some: { userId, status: "ACTIVE" } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}
