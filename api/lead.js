// POST /api/lead — 상담 신청을 leads 테이블에 저장한다.
const { missingEnv, sb, sbCount, clean, isoAgo } = require('./_lib');

const SERVICE_IDS = ['SVC-01', 'SVC-02', 'SVC-03', 'SVC-04', 'SVC-05', 'SVC-06'];
const MAX_LEADS_PER_HOUR = 30; // 전체 기준. 스팸으로 테이블이 채워지는 것을 막는 상한

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: '허용되지 않는 요청입니다.' });
  }
  if (missingEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']).length) {
    return res.status(503).json({ error: '상담 접수 기능이 아직 설정되지 않았습니다.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  // 사람에게 보이지 않는 입력란. 값이 있으면 자동 입력 프로그램으로 보고 저장하지 않는다.
  if (clean(body.website, 200)) return res.status(200).json({ ok: true });

  const name = clean(body.name, 80);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 120);
  const company = clean(body.company, 120);
  const note = clean(body.message, 2000);
  const state = clean(body.state, 40);
  const services = Array.isArray(body.services) ? body.services.filter((s) => SERVICE_IDS.includes(s)) : [];

  if (!name) return res.status(400).json({ error: '성함을 입력해 주세요.' });
  if (!phone && !email) return res.status(400).json({ error: '연락처 또는 이메일을 입력해 주세요.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: '이메일 주소를 올바르게 입력해 주세요.' });
  }
  if (body.agree !== true) return res.status(400).json({ error: '개인정보 수집·이용에 동의해 주세요.' });

  try {
    if ((await sbCount('leads', `created_at=gte.${isoAgo(60 * 60 * 1000)}`)) >= MAX_LEADS_PER_HOUR) {
      return res.status(429).json({ error: '접수가 일시적으로 많습니다. 잠시 후 다시 시도해 주세요.' });
    }
    // leads 테이블에 서비스·상황 컬럼이 없어 message 앞에 붙여 저장한다.
    const message = [
      services.length ? `[관심 서비스] ${services.join(', ')}` : '',
      state ? `[현재 상황] ${state}` : '',
      note,
    ].filter(Boolean).join('\n');

    await sb('leads', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: { name, phone: phone || null, email: email || null, company: company || null, message: message || null },
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('lead error:', err);
    return res.status(500).json({ error: '접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
  }
};
