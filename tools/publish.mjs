// 로컬 수정 사항을 배포한다: 썸네일 → 빌드·글 검증 → 커밋 → AI가 올린 글 받기(pull --rebase) → 푸시
// 푸시하면 GitHub Actions(GitHub Pages 미리보기)와 Railway가 각각 받아서 2~3분 뒤 반영한다.
//   node tools/publish.mjs          → 진행 상황을 화면에 보여 준다(publish.bat, ../deploy.bat)
//   node tools/publish.mjs --hook   → Claude Code Stop 훅용: 기록은 ../deploy.log, 결과는 JSON 한 줄(stdout)
// 바뀐 파일도, 아직 안 올린 커밋도 없으면 아무것도 하지 않는다.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = process.argv.includes('--hook');
const LOG = path.join(ROOT, '..', 'deploy.log');
const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

// 훅 모드: 하위 명령 출력은 deploy.log로 보내고, 화면(stdout)에는 Claude Code가 읽을 JSON만 남긴다
let logFd = 'inherit';
if (HOOK) {
  if (fs.existsSync(LOG) && fs.statSync(LOG).size > 1_000_000) fs.writeFileSync(LOG, fs.readFileSync(LOG, 'utf8').slice(-200_000));
  logFd = fs.openSync(LOG, 'a');
}
const note = s => (HOOK ? fs.writeSync(logFd, s + '\n') : console.log(s));
const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, env, stdio: ['ignore', logFd, logFd] });
const out = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const reply = obj => { if (HOOK) process.stdout.write(JSON.stringify(obj) + '\n'); };

// Stop 훅이 이미 한 번 막아서 이어진 차례면(stop_hook_active) 다시 막지 않는다(무한 반복 방지)
let again = false;
if (HOOK) {
  try { again = !!JSON.parse(fs.readFileSync(0, 'utf8') || '{}').stop_hook_active; } catch { /* 입력 없음 */ }
}

try { out('git', ['rev-parse', '--is-inside-work-tree']); } catch {
  note('이 폴더는 아직 git 저장소가 아닙니다. README의 「배포」 절차로 저장소를 먼저 연결하세요.');
  reply({ systemMessage: '자동 배포 건너뜀: paroot-site가 git 저장소가 아닙니다' });
  process.exit(HOOK ? 0 : 1);
}

const dirty = out('git', ['status', '--porcelain']) !== '';
let ahead = 0;
try { ahead = Number(out('git', ['rev-list', '--count', '@{u}..HEAD'])) || 0; } catch { /* upstream 없음 */ }
if (!dirty && !ahead) {
  note('바뀐 내용이 없어 배포하지 않습니다.');
  process.exit(0);
}

note(`\n=== 배포 ${new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' })} KST ===`);
let step = '';
try {
  step = '썸네일 생성'; run('python', ['tools/thumbs/build_thumbs.py']);
  step = '사이트 빌드'; run(process.execPath, ['build.mjs']);
  step = '글 검증'; run(process.execPath, ['tools/blog-ai/generate.mjs', '--check']);

  step = '커밋'; run('git', ['add', '-A']);
  const files = out('git', ['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
  if (files.length) {
    const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const list = files.slice(0, 4).join(', ') + (files.length > 4 ? ` 외 ${files.length - 4}개` : '');
    const msg = HOOK
      ? `사이트 수정 ${date} (자동 배포)\n\n${list}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
      : `사이트 수정 ${date}\n\n${list}`;
    run('git', ['commit', '-m', msg]);
  }

  step = '원격 변경 받기(pull --rebase)';
  try { run('git', ['pull', '--rebase']); } catch (e) {
    try { run('git', ['rebase', '--abort']); } catch { /* 진행 중인 rebase 없음 */ }
    throw e;
  }
  step = '푸시'; run('git', ['push']);
} catch (e) {
  const tail = HOOK ? fs.readFileSync(LOG, 'utf8').trim().split('\n').slice(-15).join('\n') : '';
  note(`배포 실패: ${step}`);
  if (!HOOK) { console.error(`\n배포 실패: ${step}`); process.exit(1); }
  if (again) reply({ systemMessage: `자동 배포 실패(${step}) — 6. 파릇/deploy.log를 확인하세요` });
  else reply({ decision: 'block', reason: `deploy.bat 자동 배포가 「${step}」 단계에서 멈췄습니다. 원인을 고치고 작업을 마치면 다시 배포됩니다(기록: 6. 파릇/deploy.log).\n--- 마지막 기록 ---\n${tail}` });
  process.exit(0);
}

const head = out('git', ['log', '--oneline', '-1']);
note(`올렸습니다: ${head}\nGitHub Pages와 Railway가 2~3분 뒤 반영합니다.`);
reply({ systemMessage: `자동 배포 완료: ${head} → GitHub Pages·Railway 2~3분 뒤 반영` });
