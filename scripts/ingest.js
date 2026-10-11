// 지식베이스 3개 문서를 잘라 임베딩하고 Supabase documents 테이블을 통째로 교체한다.
// Vercel 빌드(npm run build)에서 자동 실행된다. 환경 변수가 없으면 건너뛴다.
// 수동 실행: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY를 설정한 뒤 node scripts/ingest.js
const fs = require('fs');
const path = require('path');
const { missingEnv, sb, embed, EMBEDDING_MODEL } = require('../api/_lib');

const ROOT = path.join(__dirname, '..');
// 고객 답변의 근거로 쓰지 않는 절: 문서 내부 안내와 조사 기록
const SKIP_H2 = [/^H\. 참고 자료와 조사 기록/];
const SKIP_H3 = [/^챗봇 응답 규칙$/, /^이 문서의 역할$/, /^구성$/];

function read(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8').replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '');
}

// company-profile.md, service-policy.md: H3 단위(없으면 H2 단위)로 자른다.
function chunkSections(file, label) {
  const chunks = [];
  const h2Blocks = read(file).split(/^(?=## )/m).filter((b) => b.startsWith('## '));
  for (const block of h2Blocks) {
    const h2 = block.match(/^## (.+)$/m)[1].trim();
    if (SKIP_H2.some((re) => re.test(h2))) continue;
    const parts = block.replace(/^## .+\n/, '').split(/^(?=### )/m);
    for (const part of parts) {
      const m = part.match(/^### (.+)$/m);
      const h3 = m ? m[1].trim() : '';
      if (h3 && SKIP_H3.some((re) => re.test(h3))) continue;
      const text = part.replace(/^### .+\n/, '').trim();
      if (text.length < 20) continue;
      const heading = h3 ? `${h2} > ${h3}` : h2;
      chunks.push({ source: `${file}#${h3 || h2}`, content: `[${label}] ${heading}\n\n${text}` });
    }
  }
  return chunks;
}

// faq.md: 질문 1개가 청크 1개
function chunkFaq() {
  return read('faq.md')
    .split(/^(?=### FAQ-\d{3}\. )/m)
    .slice(1)
    .map((block) => {
      const lines = block.split('\n');
      const [, id, q] = lines[0].match(/^### (FAQ-\d{3})\. (.+)$/);
      const f = {};
      for (const line of lines.slice(1)) {
        if (line.startsWith('## ')) break;
        const m = line.match(/^- ([^:]+): (.+)$/);
        if (m) f[m[1]] = m[2].trim();
      }
      return {
        source: `faq.md#${id}`,
        content: `[자주 묻는 질문 ${id}] ${q.trim()}\n\n답변: ${f['답변']}\n분류: ${f['분류']}\n관련 서비스: ${f['관련 서비스']}\n검색 키워드: ${f['검색 키워드']}\n상담 연결: ${f['상담 연결']}`,
      };
    });
}

async function main() {
  const missing = missingEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY']);
  const chunks = [
    ...chunkSections('service-policy.md', '서비스 운영 정책'),
    ...chunkSections('company-profile.md', '회사 소개'),
    ...chunkFaq(),
  ];
  if (process.argv.includes('--dry-run') || missing.length) {
    console.log(`ingest: 청크 ${chunks.length}개 준비됨.`);
    if (missing.length) console.log(`ingest: 환경 변수 없음(${missing.join(', ')}) → 업로드를 건너뜁니다.`);
    return;
  }

  // 모두 임베딩한 뒤에 교체해 검색이 비는 시간을 줄인다.
  const rows = [];
  for (let i = 0; i < chunks.length; i += 64) {
    const batch = chunks.slice(i, i + 64);
    const vectors = await embed(batch.map((c) => c.content));
    batch.forEach((c, j) => rows.push({ ...c, embedding: vectors[j] }));
  }
  await sb('documents?id=gt.0', { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  for (let i = 0; i < rows.length; i += 50) {
    await sb('documents', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: rows.slice(i, i + 50) });
  }
  console.log(`ingest: documents 테이블을 ${rows.length}건으로 교체했습니다. (${EMBEDDING_MODEL})`);
}

main().catch((err) => {
  // 임베딩 API 장애로 사이트 배포까지 막히지 않게 하되, 로그에는 분명히 남긴다.
  console.error('ingest 실패 — 지식베이스가 갱신되지 않았습니다:', err.message);
});
