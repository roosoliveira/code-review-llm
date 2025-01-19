import 'dotenv/config';
import { Octokit } from 'octokit';
import { OpenAI } from 'openai';

type EmbeddingData = {
  embedding: number[]
  file: string,
  content: string
}

const github = new Octokit({ auth: process.env.GITHUB_TOKEN })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function getFiles(github: Octokit): Promise<string[]> {
  const data = await github.rest.repos.getContent({ owner: 'roosoliveira', repo: 'code-review-llm', path: 'src' })
  return (data.data as any).path
}

async function getFileContent(github: Octokit, file: string):Promise<string> {
  const data = await github.rest.repos.getContent({ owner: 'roosoliveira', repo: 'code-review-llm', path: file })
  return (data.data as any).content
}

async function createEmbedding(openai: OpenAI, file: string, content: string) {
  const result = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: content
  })

  return { embedding: result.data[0].embedding, file, content }
}

function findRelatedFiles(embeddings: EmbeddingData[], queryEmbedding: EmbeddingData, topN = 3) {
  const cosineSimilarity = (a: number[], b: number[]) =>
    a.reduce((sum, ai, i) => sum + ai * b[i], 0) /
    (Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0)) *
      Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0)));

  const similarity = (doc: EmbeddingData) => ({
    file: doc.content,
    similarity: cosineSimilarity(doc.embedding, queryEmbedding.embedding),
  })

  const byRelevance = (a: any, b: any) => b.similarity - a.similarity

  return embeddings
    .map(similarity)
    .sort(byRelevance)
    .slice(0, topN);
}

async function run() {
  const fileList = await getFiles(github) as any[]
  for(const file of fileList) {
    const content = await getFileContent(github, file.path)
    const embedding = await createEmbedding(openai, file.path, content)
    console.log(Buffer.from(content, 'base64').toString('utf-8'))
  }
  console.log(fileList)
}
  
run()