const { getKnowledgeDocuments, saveKnowledgeDocument } = require('../config/db');

function normalizeWhitespace(text = '') {
  return String(text || '').replace(/\r/g, '').replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTextFromBuffer(buffer, mimeType = 'text/plain') {
  if (!buffer) return '';
  if (/application\/(json|xml)|text\//.test(mimeType)) {
    return buffer.toString('utf8');
  }
  return buffer.toString('utf8');
}

function chunkText(text = '', chunkSize = 700, overlap = 120) {
  const clean = normalizeWhitespace(text);
  if (!clean) return [];

  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < clean.length) {
    const end = Math.min(clean.length, start + chunkSize);
    chunks.push({
      id: `chunk-${index + 1}`,
      text: clean.slice(start, end),
      start,
      end,
    });
    if (end >= clean.length) break;
    start = Math.max(0, end - overlap);
    index += 1;
  }

  return chunks;
}

function tokenize(value = '') {
  return String(value || '').toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
}

function scoreChunk(query, chunk) {
  const queryTokens = [...new Set(tokenize(query))];
  const chunkTokens = tokenize(chunk.text);
  const chunkTokenSet = new Set(chunkTokens);
  return queryTokens.reduce((score, token) => score + (chunkTokenSet.has(token) ? 1 : 0), 0);
}

async function ingestKnowledgeDocument({ userId, title, docType, sourceName, contentText, tags = [] }) {
  const normalized = normalizeWhitespace(contentText);
  const chunks = chunkText(normalized);
  return saveKnowledgeDocument({
    userId,
    title,
    docType,
    sourceName,
    contentText: normalized,
    chunks,
    tags,
  });
}

async function ingestKnowledgeBuffer({ userId, title, docType, sourceName, buffer, mimeType, tags = [] }) {
  const text = extractTextFromBuffer(buffer, mimeType);
  return ingestKnowledgeDocument({ userId, title, docType, sourceName, contentText: text, tags });
}

async function retrieveKnowledgeContext({ userId, query, limit = 3 }) {
  const documents = await getKnowledgeDocuments(userId);
  const ranked = documents
    .flatMap((document) => (document.chunks || []).map((chunk) => ({
      document_id: document.id,
      title: document.title,
      doc_type: document.doc_type,
      source_name: document.source_name,
      text: chunk.text,
      score: scoreChunk(query, chunk),
    })))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    documents,
    matches: ranked,
    hasMatches: ranked.length > 0,
  };
}

module.exports = {
  chunkText,
  ingestKnowledgeBuffer,
  ingestKnowledgeDocument,
  retrieveKnowledgeContext,
};