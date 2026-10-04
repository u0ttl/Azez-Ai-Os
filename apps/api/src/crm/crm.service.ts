import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { CreateActivityDto, CreateCompanyDto, CreateContactDto, CreateLeadDto, ListCompaniesDto, UpdateCompanyDto, UpdateLeadStatusDto } from "./crm.dto.js";

@Injectable()
export class CrmService {
  constructor(private readonly database: DatabaseService) {}

  listCompanies(organizationId: string, query: ListCompaniesDto) {
    const search = query.search?.trim();
    return this.database.client.company.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: query.status,
        ...(search ? { OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
        ] } : {}),
      },
      include: { _count: { select: { contacts: true, leads: true, activities: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async companyDetails(organizationId: string, companyId: string) {
    const company = await this.database.client.company.findFirst({
      where: { id: companyId, organizationId, deletedAt: null },
      include: {
        contacts: { orderBy: { createdAt: "desc" }, take: 100 },
        activities: {
          include: { contact: { select: { id: true, name: true } }, lead: { select: { id: true, title: true } } },
          orderBy: { occurredAt: "desc" },
          take: 100,
        },
        leads: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 100 },
      },
    });
    if (!company) throw new NotFoundException({ code: "COMPANY_NOT_FOUND" });
    return { ...company, leads: company.leads.map((lead: (typeof company.leads)[number]) => this.serializeLead(lead)) };
  }

  createCompany(organizationId: string, input: CreateCompanyDto) {
    return this.database.client.company.create({
      data: { organizationId, name: input.name.trim(), email: input.email, phone: input.phone, website: input.website, status: input.status },
    });
  }

  async updateCompany(organizationId: string, companyId: string, input: UpdateCompanyDto) {
    await this.requireCompany(organizationId, companyId);
    return this.database.client.company.update({ where: { id: companyId }, data: input });
  }

  async createContact(organizationId: string, companyId: string, input: CreateContactDto) {
    await this.requireCompany(organizationId, companyId);
    return this.database.client.contact.create({ data: { companyId, name: input.name.trim(), email: input.email, phone: input.phone, jobTitle: input.jobTitle } });
  }

  async createActivity(organizationId: string, companyId: string, userId: string, input: CreateActivityDto) {
    await this.requireCompany(organizationId, companyId);
    if (input.contactId) {
      const contact = await this.database.client.contact.findFirst({ where: { id: input.contactId, companyId }, select: { id: true } });
      if (!contact) throw new BadRequestException({ code: "CONTACT_NOT_IN_COMPANY" });
    }
    if (input.leadId) {
      const lead = await this.database.client.lead.findFirst({ where: { id: input.leadId, organizationId, deletedAt: null }, select: { companyId: true } });
      if (!lead || (lead.companyId && lead.companyId !== companyId)) throw new BadRequestException({ code: "LEAD_NOT_IN_COMPANY" });
    }
    return this.database.client.activity.create({
      data: {
        organizationId, companyId, createdByUserId: userId, contactId: input.contactId, leadId: input.leadId,
        type: input.type, subject: input.subject.trim(), notes: input.notes, occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      },
    });
  }

  async listLeads(organizationId: string) {
    const leads = await this.database.client.lead.findMany({
      where: { organizationId, deletedAt: null },
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return leads.map((lead: (typeof leads)[number]) => this.serializeLead(lead));
  }

  async createLead(organizationId: string, userId: string, input: CreateLeadDto) {
    if (input.companyId) await this.requireCompany(organizationId, input.companyId);
    const lead = await this.database.client.lead.create({
      data: {
        organizationId, ownerUserId: userId, title: input.title.trim(), companyId: input.companyId, status: input.status,
        valueMinor: input.valueMinor === undefined ? undefined : BigInt(input.valueMinor), currency: input.currency?.toUpperCase(),
      },
    });
    return this.serializeLead(lead);
  }

  async updateLeadStatus(organizationId: string, leadId: string, input: UpdateLeadStatusDto) {
    const lead = await this.database.client.lead.findFirst({ where: { id: leadId, organizationId, deletedAt: null } });
    if (!lead) throw new NotFoundException({ code: "LEAD_NOT_FOUND" });
    return this.serializeLead(await this.database.client.lead.update({ where: { id: leadId }, data: { status: input.status } }));
  }

  private serializeLead<T extends { valueMinor: bigint | null }>(lead: T): Omit<T, "valueMinor"> & { valueMinor: string | null } {
    return { ...lead, valueMinor: lead.valueMinor?.toString() ?? null };
  }

  private async requireCompany(organizationId: string, companyId: string): Promise<void> {
    const company = await this.database.client.company.findFirst({ where: { id: companyId, organizationId, deletedAt: null }, select: { id: true } });
    if (!company) throw new NotFoundException({ code: "COMPANY_NOT_FOUND" });
  }
}
