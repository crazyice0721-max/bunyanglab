// API 공용 도우미. 파일명이 _로 시작하므로 Vercel 라우트로 노출되지 않는다.
// 필요한 환경 변수(Vercel Project Settings > Environment Variables):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY(임베딩), ANTHROPIC_API_KEY(답변 생성)

const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536차원. documents.embedding vector(1536)과 일치해야 한다.

function missingEnv(names) {
  return names.filter((n) => !process.env[n]);
}

// Supabase REST(PostgREST) 호출. service_role 키는 RLS를 우회하므로 서버에서만 사용한다.
async function sb(path, { method = 'GET', body, headers = {} } = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${path.split('?')[0]} ${res.status}: ${text.slice(0, 300)}`);
  }
  return res;
}

// 조건에 맞는 행 수. filter 예: "role=eq.user&created_at=gte.2026-01-01T00:00:00Z"
async function sbCount(table, filter) {
  const res = await sb(`${table}?select=id&${filter}`, {
    method: 'HEAD',
    headers: { Prefer: 'count=exact', Range: '0-0' },
  });
  const total = (res.headers.get('content-range') || '').split('/')[1];
  return Number(total) || 0;
}

// OpenAI 임베딩. 입력 배열과 같은 순서의 벡터 배열을 돌려준다.
async function embed(inputs) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: inputs }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI embeddings ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function isoAgo(ms) {
  return new Date(Date.now() - ms).toISOString();
}

module.exports = { EMBEDDING_MODEL, missingEnv, sb, sbCount, embed, clean, isoAgo };
