// faq.md를 읽어 faq-data.js(window.FAQ_DATA)를 생성한다.
// 사용법: node build-faq.js   (faq.md를 수정한 뒤 다시 실행)
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'faq.md'), 'utf8').replace(/\r\n/g, '\n');
const keys = { '분류': 'cat', '관련 서비스': 'svc', '관련 정책': 'policy', '답변': 'a', '검색 키워드': 'kw', '상담 연결': 'link' };

const items = [];
for (const block of src.split(/^(?=### FAQ-\d{3}\. )/m).slice(1)) {
  const lines = block.split('\n');
  const m = lines[0].match(/^### (FAQ-\d{3})\. (.+)$/);
  const item = { id: m[1], q: m[2].trim() };
  for (const line of lines.slice(1)) {
    if (line.startsWith('## ')) break;
    const f = line.match(/^- ([^:]+): (.+)$/);
    if (f && keys[f[1]]) item[keys[f[1]]] = f[2].trim();
  }
  items.push(item);
}

if (items.length !== 100) throw new Error(`FAQ 개수가 100이 아닙니다: ${items.length}`);
fs.writeFileSync(
  path.join(__dirname, 'faq-data.js'),
  '// 자동 생성 파일. 직접 수정하지 말고 faq.md를 고친 뒤 node build-faq.js를 실행한다.\nwindow.FAQ_DATA = ' + JSON.stringify(items, null, 1) + ';\n',
  'utf8'
);
console.log(`faq-data.js 생성 완료: ${items.length}건`);
