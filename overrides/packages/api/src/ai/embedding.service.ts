import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { DatabaseService } from "../database/database.service.js";

interface EmbeddingChunk {
  id: string;
  content: string;
}

export interface SemanticResultRow {
  chunkId: string;
  content: string;
  score: number;
  documentId: string;
  title: string;
}

@Injectable()
export class EmbeddingService {
  private readonly client: OpenAI | undefined;
  private readonly model: string;

  constructor(private readonly database: DatabaseService) {
    const gatewayToken = process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim();
    const directKey = process.env.OPENAI_API_KEY?.trim();
    if (gatewayToken) {
      this.client = new OpenAI({ apiKey: gatewayToken, baseURL: "https://ai-gateway.vercel.sh/v1" });
      this.model = process.env.AI_GATEWAY_EMBEDDING_MODEL ?? "openai/text-embedding-3-small";
    } else if (directKey) {
      this.client = new OpenAI({ apiKey: directKey });
      this.model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
    } else {
      this.model = "text-embedding-3-small";
    }
  }

  enabled(): boolean {
    return process.env.EMBEDDINGS_ENABLED !== "false" && Boolean(this.client);
  }

  async embedAndStore(chunks: EmbeddingChunk[]): Promise<void> {
    if (!this.enabled() || !this.client || chunks.length === 0) return;
    for (let offset = 0; offset < chunks.length; offset += 64) {
      const batch = chunks.slice(offset, offset + 64);
      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch.map((chunk) => chunk.content),
        encoding_format: "float",
        dimensions: 1536,
      });
      for (const [index, item] of response.data.entries()) {
        const chunk = batch[index];
        if (!chunk) continue;
        const vector = `[${item.embedding.join(",")}]`;
        await this.database.client.$executeRawUnsafe(
          'UPDATE "document_chunks" SET "embedding" = $1::vector WHERE "id" = $2::uuid',
          vector,
          chunk.id,
        );
      }
    }
  }

  async semanticSearch(organizationId: string, baseId: string, query: string, limit: number): Promise<SemanticResultRow[]> {
    if (!this.enabled() || !this.client) return [];
    const response = await this.client.embeddings.create({ model: this.model, input: query, encoding_format: "float", dimensions: 1536 });
    const vector = `[${response.data[0]?.embedding.join(",") ?? ""}]`;
    if (vector === "[]") return [];
    return this.database.client.$queryRawUnsafe<SemanticResultRow[]>(
      `SELECT dc.id AS "chunkId", dc.content, 1 - (dc.embedding <=> $1::vector) AS score,
              kd.id AS "documentId", kd.title
       FROM document_chunks dc
       JOIN knowledge_documents kd ON kd.id = dc.document_id
       JOIN knowledge_bases kb ON kb.id = kd.knowledge_base_id
       WHERE kb.organization_id = $2::uuid AND kb.id = $3::uuid
         AND kd.status = 'READY' AND kd.deleted_at IS NULL AND dc.embedding IS NOT NULL
       ORDER BY dc.embedding <=> $1::vector
       LIMIT $4`,
      vector,
      organizationId,
      baseId,
      limit,
    );
  }
}
