import 'dotenv/config';
import { Octokit } from 'octokit';

async function getFiles() {
  const github = new Octokit({ auth: process.env.GITHUB_TOKEN })
  const data = await github.rest.repos.getContent({ owner: 'roosoliveira', repo: 'code-review-llm', path: 'src' })
  return data.data
}

async function getContentFile(file: string) {
  const github = new Octokit({ auth: process.env.GITHUB_TOKEN })
  const data = await github.rest.repos.getContent({ owner: 'roosoliveira', repo: 'code-review-llm', path: file })
  return data.data
}

async function run() {
  const files = await getFiles() as any[]
  for(const file of files) {
    const content = await getContentFile(file.path) as any
    console.log(Buffer.from(content.content, 'base64').toString('utf-8'))
  }
  console.log(files)
}
  
run()