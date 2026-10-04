import { createHash } from "node:crypto";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { EmbeddingService } from "../ai/embedding.service.js";
import { chunkText, lexicalScore } from "./chunking.js";
import { AddTextDocumentDto, CreateKnowledgeBaseDto } from "./knowledge.dto.js";

export interface KnowledgeResult {
  chunkId: string;
  content: string;
  score: number;
  document: { id: string; title: string };
}

@Injectable()
export class KnowledgeService {
  constructor(private readonly database: DatabaseService, private readonly embeddings: EmbeddingService) {}

  listBases(organizationId: string) {
    return this.database.client.knowledgeBase.findMany({
      where: { organizationId, deletedAt: null },
      include: { _count: { select: { documents: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  createBase(organizationId: string, input: CreateKnowledgeBaseDto) {
    return this.database.client.knowledgeBase.create({
      data: { organizationId, name: input.name.trim(), description: input.description.trim() },
    });
  }

  async listDocuments(organizationId: string, baseId: string) {
    await this.requireBase(organizationId, baseId);
    return this.database.client.knowledgeDocument.findMany({
      where: { knowledgeBaseId: baseId, deletedAt: null },
      include: { _count: { select: { chunks: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async addTextDocument(organizationId: string, baseId: string, input: AddTextDocumentDto) {
    await this.requireBase(organizationId, baseId);
    const checksum = createHash("sha256").update(input.content).digest("hex");
    const duplicate = await this.database.client.knowledgeDocument.findFirst({
      where: { knowledgeBaseId: baseId, checksum, deletedAt: null }, select: { id: true },
    });
    if (duplicate) throw new ConflictException({ code: "DOCUMENT_ALREADY_EXISTS" });
    const chunks = chunkText(input.content);
    const document = await this.database.client.knowledgeDocument.create({
      data: {
        knowledgeBaseId: baseId,
        title: input.title.trim(),
        checksum,
        status: "READY",
        chunks: { create: chunks.map((chunk) => ({ position: chunk.position, content: chunk.content, tokenCount: chunk.tokenCount })) },
      },
      include: { chunks: { select: { id: true, content: true } }, _count: { select: { chunks: true } } },
    });
    let embeddingStatus: "disabled" | "ready" | "failed" = "disabled";
    if (this.embeddings.enabled()) {
      try {
        await this.embeddings.embedAndStore(document.chunks);
        embeddingStatus = "ready";
      } catch {
        embeddingStatus = "failed";
      }
    }
    const { chunks: storedChunks, ...safeDocument } = document;
    return { ...safeDocument, embeddingStatus, processedChunks: storedChunks.length };
  }

  async search(organizationId: string, baseId: string, query: string, limit = 5): Promise<KnowledgeResult[]> {
    await this.requireBase(organizationId, baseId);
    if (this.embeddings.enabled()) {
      try {
        const semantic = await this.embeddings.semanticSearch(organizationId, baseId, query, limit);
        if (semantic.length > 0) {
          return semantic.map((item) => ({
            chunkId: item.chunkId,
            content: item.content,
            score: Number(item.score),
            document: { id: item.documentId, title: item.title },
          }));
        }
      } catch {
        // Lexical retrieval remains available if the external embedding provider is unavailable.
      }
    }
    const chunks = await this.database.client.documentChunk.findMany({
      where: { document: { knowledgeBaseId: baseId, status: "READY", deletedAt: null } },
      include: { document: { select: { id: true, title: true } } },
      take: 1000,
    });
    const ranked: KnowledgeResult[] = chunks.map(
      (chunk: { id: string; content: string; document: { id: string; title: string } }): KnowledgeResult => ({
        chunkId: chunk.id,
        content: chunk.content,
        document: chunk.document,
        score: lexicalScore(query, chunk.content),
      }),
    );
    return ranked
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async requireBase(organizationId: string, baseId: string): Promise<void> {
    const base = await this.database.client.knowledgeBase.findFirst({ where: { id: baseId, organizationId, deletedAt: null }, select: { id: true } });
    if (!base) throw new NotFoundException({ code: "KNOWLEDGE_BASE_NOT_FOUND" });
  }
}
