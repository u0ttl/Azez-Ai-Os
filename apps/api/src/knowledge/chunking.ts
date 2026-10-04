export interface TextChunk {
  position: number;
  content: string;
  tokenCount: number;
}

export function chunkText(input: string, maxCharacters = 1200): TextChunk[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  const flush = (): void => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxCharacters) {
      flush();
      for (let start = 0; start < paragraph.length; start += maxCharacters) {
        chunks.push(paragraph.slice(start, start + maxCharacters).trim());
      }
      continue;
    }
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxCharacters) flush();
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  flush();

  return chunks.filter(Boolean).map((content, position) => ({
    position,
    content,
    tokenCount: Math.max(1, Math.ceil(content.length / 4)),
  }));
}

function terms(value: string): Set<string> {
  return new Set((value.toLocaleLowerCase("ar").match(/[\p{L}\p{N}]{2,}/gu) ?? []));
}

export function lexicalScore(query: string, content: string): number {
  const queryTerms = terms(query);
  if (queryTerms.size === 0) return 0;
  const contentTerms = terms(content);
  let matches = 0;
  for (const term of queryTerms) if (contentTerms.has(term)) matches += 1;
  const phraseBonus = content.toLocaleLowerCase("ar").includes(query.toLocaleLowerCase("ar")) ? 2 : 0;
  return matches / queryTerms.size + phraseBonus;
}
