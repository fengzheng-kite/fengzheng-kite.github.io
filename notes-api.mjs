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

async function updateArticleMetadata(articleId, updates) {
  const contentDirectory = path.resolve('src/content/blog');
  let articleFile;
  let markdown;

  for (const extension of ['md', 'mdx']) {
    const candidate = path.join(contentDirectory, `${articleId}.${extension}`);
    try {
      markdown = await readFile(candidate, 'utf8');
      articleFile = candidate;
      break;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  if (!articleFile) return false;
  const frontmatter = markdown.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0];
  if (!frontmatter) throw new Error('Article frontmatter is missing');

  let updatedFrontmatter = frontmatter;
  if (updates.title !== undefined) {
    if (!/^title:[^\r\n]*$/m.test(updatedFrontmatter)) throw new Error('Article title is missing from frontmatter');
    updatedFrontmatter = updatedFrontmatter.replace(/^title:[^\r\n]*$/m, `title: ${JSON.stringify(updates.title)}`);
  }
  if (updates.tags !== undefined) {
    if (!/^tags:[^\r\n]*$/m.test(updatedFrontmatter)) throw new Error('Article tags are missing from frontmatter');
    updatedFrontmatter = updatedFrontmatter.replace(/^tags:[^\r\n]*$/m, `tags: ${JSON.stringify(updates.tags)}`);
  }
  const temporaryFile = `${articleFile}.tmp`;
  await writeFile(temporaryFile, `${updatedFrontmatter}${markdown.slice(frontmatter.length)}`, 'utf8');
  await rename(temporaryFile, articleFile);
  return true;
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
  if (url.pathname.startsWith('/api/articles/') && request.method === 'PATCH') {
    const articleId = decodeURIComponent(url.pathname.slice('/api/articles/'.length));
    if (!/^[a-zA-Z0-9_-]+$/.test(articleId)) {
      sendJson(response, 400, { error: '文章 ID 无效' });
      return true;
    }
    try {
      let body = '';
      for await (const chunk of request) body += chunk;
      const payload = JSON.parse(body);
      const updates = {};
      if ('title' in payload) {
        if (typeof payload.title !== 'string' || !payload.title.trim()) {
          sendJson(response, 400, { error: '标题不能为空' });
          return true;
        }
        updates.title = payload.title.trim();
      }
      if ('tags' in payload) {
        if (!Array.isArray(payload.tags) || !payload.tags.every((tag) => typeof tag === 'string' && tag.trim())) {
          sendJson(response, 400, { error: '分类格式无效' });
          return true;
        }
        updates.tags = payload.tags.map((tag) => tag.trim());
      }
      if (Object.keys(updates).length === 0) {
        sendJson(response, 400, { error: '没有需要更新的内容' });
        return true;
      }
      if (!(await updateArticleMetadata(articleId, updates))) {
        sendJson(response, 404, { error: '文章不存在' });
        return true;
      }
      sendJson(response, 200, { saved: true });
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: '无法更新文章信息' });
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
