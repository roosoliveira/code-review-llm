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
  return (data.data as any[]).map(file => file.path)
}

async function getFileContent(github: Octokit, file: string):Promise<string> {
  const data = await github.rest.repos.getContent({ owner: 'roosoliveira', repo: 'code-review-llm', path: file })
  return Buffer.from((data.data as any).content, 'base64').toString('utf-8')
}

async function getFileChanges(github: Octokit, pull_number: number): Promise<{ file : string, content: string, status: string }[]> {
  const data = await github.rest.pulls.listFiles({ owner: 'roosoliveira', repo: 'code-review-llm', pull_number })
  return (data.data as any[]).map(file => ({ file: file.filename, content: file.patch, status: file.status }))
}

async function createReviewComment(github: Octokit, pull_number: number, file: string, comment: string) {
  const listCommits = await github.rest.pulls.listCommits({ owner: 'roosoliveira', repo: 'code-review-llm', pull_number })
  const commit = listCommits.data.pop()
  await github.rest.pulls.createReviewComment({
    owner: 'roosoliveira',
    repo: 'code-review-llm',
    pull_number,
    body: comment,
    path: file,
    commit_id: commit!.sha,
    subject_type: 'file'
  })
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
    file: doc.file,
    content: doc.content,
    similarity: cosineSimilarity(doc.embedding, queryEmbedding.embedding),
  })

  const byRelevance = (a: any, b: any) => b.similarity - a.similarity

  return embeddings
    .map(similarity)
    .sort(byRelevance)
    .slice(0, topN);
}

function createPrompt(relatedFiles: any[], changes: any[]) {
  const relatedContent = relatedFiles
    .map(
      (file) => `Arquivo relacionado: ${file.file}\nConteúdo:\n${file.content}`
    )
    .join("\n");

  const prompt = `
    Você é um especialista em revisão de código. Aqui estão as alterações de um PR e o conteúdo de arquivos relacionados. Revise o código, identifique problemas e sugira melhorias.

    Alterações no PR:
    ${changes
    .map((file) => `Arquivo: ${file.file}\nAlterações:\n${file.content}\n`)
    .join("\n")}

    Arquivos relacionados:
    ${relatedContent}

    Responda detalhadamente.`;
  return prompt
}

async function analyzeCode(openai: OpenAI, relatedFiles: any[], changes: any[]) {
  const prompt = createPrompt(relatedFiles, changes)
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: "system", content: "Você é um especialista em revisão de código." },
      { role: 'user', content: prompt }
    ]
  })
  return response.choices[0].message.content
}


async function run() {
  const embeddings: EmbeddingData[] = []
  const fileList = await getFiles(github) as any[]
  const fileChangesList = await getFileChanges(github, 1)
  for(const file of fileList) {
    const content = await getFileContent(github, file)
    const embedding = await createEmbedding(openai, file, content)
    embeddings.push(embedding)
  }

  for (const file of fileChangesList) {
    const fileChangesEmbedding = await createEmbedding(openai, `pr-1-${file.file}`, file.content)
    const relatedFiles = findRelatedFiles(embeddings, fileChangesEmbedding)
    const response = await analyzeCode(openai, relatedFiles, fileChangesList)
    await createReviewComment(github, 1, file.file, response!)
  }

  
  console.log('end')
}
  
run()