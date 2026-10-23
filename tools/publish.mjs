// 로컬 수정 사항을 GitHub에 올린다: 썸네일 → 빌드·글 검증 → 커밋 → AI가 올린 글 받기(pull --rebase) → 푸시
// GitHub Actions가 받아서 빌드·배포한다(2~3분). 저장소 연결 전이면 안내만 하고 끝낸다.
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (c, o = {}) => execSync(c, { cwd: ROOT, stdio: 'inherit', ...o });
const out = c => execSync(c, { cwd: ROOT, encoding: 'utf8' }).trim();

try { out('git rev-parse --is-inside-work-tree'); } catch {
  console.log('이 폴더는 아직 git 저장소가 아닙니다. README의 「배포」 절차로 저장소를 먼저 연결하세요.');
  process.exit(1);
}
run('python tools/thumbs/build_thumbs.py');
run('node build.mjs');
run('node tools/blog-ai/generate.mjs --check');
run('git add -A');
let changed = true;
try { out('git diff --cached --quiet'); changed = false; } catch { /* 변경 있음 */ }
if (changed) run(`git commit -m "사이트 수정 ${new Date().toISOString().slice(0, 10)}"`);
run('git pull --rebase');
run('git push');
console.log('\n올렸습니다. GitHub Actions가 2~3분 뒤 반영합니다.');
