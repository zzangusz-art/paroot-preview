// 어드민 저장: GitHub 저장소에 바로 커밋한다(외부 패키지 없이 REST API).
// 커밋되면 Railway(parootent.kr)와 GitHub Pages가 평소처럼 다시 배포한다. 여러 파일(공지 JSON + 이미지)을 한 커밋에 묶는다.
// 필요한 환경 변수: GITHUB_TOKEN(저장소 Contents 읽기·쓰기 권한의 fine-grained 토큰), GITHUB_REPO(기본 zzangusz-art/paroot-preview), GITHUB_BRANCH(기본 main)
const API = 'https://api.github.com';
const repo = () => process.env.GITHUB_REPO || 'zzangusz-art/paroot-preview';
const branch = () => process.env.GITHUB_BRANCH || 'main';
export const githubOn = () => !!process.env.GITHUB_TOKEN;
export const githubRepo = () => repo();

async function gh(method, url, body) {
  const r = await fetch(API + url, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'paroot-admin', ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const j = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) { const e = new Error(`GitHub ${r.status}${j?.message ? `: ${j.message}` : ''}`); e.status = r.status; throw e; }
  return j;
}
const enc = p => p.split('/').map(encodeURIComponent).join('/');

// 저장소의 최신 파일(없으면 null). 어드민은 고치기 전에 항상 이걸 읽어 다른 곳의 변경을 덮어쓰지 않는다
export async function readFile(p) {
  try {
    const j = await gh('GET', `/repos/${repo()}/contents/${enc(p)}?ref=${encodeURIComponent(branch())}`);
    return Buffer.from(j.content || '', 'base64');
  } catch (e) { if (e.status === 404) return null; throw e; }
}

// files: [{ path, content: Buffer | string | null(삭제) }] → 커밋 sha
export async function commitFiles(files, message) {
  for (let attempt = 0; ; attempt++) {
    const ref = await gh('GET', `/repos/${repo()}/git/ref/heads/${encodeURIComponent(branch())}`);
    const head = ref.object.sha;
    const base = await gh('GET', `/repos/${repo()}/git/commits/${head}`);
    const tree = [];
    for (const f of files) {
      if (f.content == null) { tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null }); continue; }
      const blob = await gh('POST', `/repos/${repo()}/git/blobs`, { content: Buffer.from(f.content).toString('base64'), encoding: 'base64' });
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const t = await gh('POST', `/repos/${repo()}/git/trees`, { base_tree: base.tree.sha, tree });
    const c = await gh('POST', `/repos/${repo()}/git/commits`, { message, tree: t.sha, parents: [head] });
    try {
      await gh('PATCH', `/repos/${repo()}/git/refs/heads/${encodeURIComponent(branch())}`, { sha: c.sha, force: false });
      return c.sha;
    } catch (e) {
      // 그사이 다른 커밋이 올라왔으면(빨리 감기 불가) 최신 위에서 한 번 더
      if (e.status === 422 && attempt < 2) continue;
      throw e;
    }
  }
}
