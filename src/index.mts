import 'dotenv/config';
import { Octokit } from 'octokit';

async function getFiles() {
  const github = new Octokit({ auth: process.env.GITHUB_TOKEN })
  const data = await github.rest.repos.getContent({ owner: 'roosoliveira', repo: 'code-review-llm', path: '' })
  return data.data
}

async function run() {
  const files = await getFiles()
  console.log(files)
}
  
run()