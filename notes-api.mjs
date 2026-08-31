import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dataDirectory = path.resolve('data');
const notesFile = path.join(dataDirectory, 'paper-notes.json');

async function readAllNotes() {
  try {
    return JSON.parse(await readFile(notesFile, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
}

async function writeAllNotes(notes) {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryFile = `${notesFile}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(notes, null, 2)}\n`, 'utf8');
  await rename(temporaryFile, notesFile);
}

function sendJson(response, status, value) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value));
}

export async function handleNotesApi(request, response) {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/api/articles' && request.method === 'POST') {
    try {
      let body = '';
      for await (const chunk of request) body += chunk;
      const { title, description } = JSON.parse(body);
      if (typeof title !== 'string' || !title.trim() || typeof description !== 'string') {
        sendJson(response, 400, { error: '标题不能为空' });
        return true;
      }
      const id = `article-${Date.now()}`;
      const contentDirectory = path.resolve('src/content/blog');
      const markdown = `---\ntitle: ${JSON.stringify(title.trim())}\ndescription: ${JSON.stringify(description.trim())}\npublishedAt: ${JSON.stringify(new Date().toISOString())}\ntags: []\ndraft: false\n---\n`;
      await mkdir(contentDirectory, { recursive: true });
      await writeFile(path.join(contentDirectory, `${id}.md`), markdown, { encoding: 'utf8', flag: 'wx' });
      sendJson(response, 201, { id });
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: '无法创建文章' });
    }
    return true;
  }
  if (!url.pathname.startsWith('/api/notes/')) return false;

  const paperId = decodeURIComponent(url.pathname.slice('/api/notes/'.length));
  if (!/^[a-zA-Z0-9_-]+$/.test(paperId)) {
    sendJson(response, 400, { error: 'Invalid paper ID' });
    return true;
  }

  try {
    const allNotes = await readAllNotes();
    if (request.method === 'GET') {
      sendJson(response, 200, { notes: allNotes[paperId] || [] });
      return true;
    }

    if (request.method === 'POST') {
      let body = '';
      for await (const chunk of request) body += chunk;
      const { notes } = JSON.parse(body);
      if (!Array.isArray(notes) || !notes.every((note) => typeof note === 'string')) {
        sendJson(response, 400, { error: 'Invalid notes' });
        return true;
      }
      allNotes[paperId] = notes;
      await writeAllNotes(allNotes);
      sendJson(response, 200, { saved: true });
      return true;
    }

    sendJson(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: 'Could not save notes' });
  }
  return true;
}

export function notesApiPlugin() {
  return {
    name: 'local-paper-notes-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!(await handleNotesApi(request, response))) next();
      });
    }
  };
}
