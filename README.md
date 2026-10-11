# 분양LAB

분양LAB(가상의 1인 부동산 콘텐츠 제작·마케팅 기업)의 지식베이스와 웹사이트 시안입니다.
가격·기간·정책은 모두 실습용 가상 정책(`simulation_draft`)입니다.

| 경로 | 내용 |
|---|---|
| `company-profile.md` | 회사 소개와 서비스 구조 |
| `service-policy.md` | 가격·기간·계약·수정·환불 정책 (기준 문서) |
| `faq.md` | FAQ 100선 |
| `Design/` | 디자인 시스템(DESIGN.md)과 Stitch 시안 |
| `site/` | 정적 웹사이트 (Vercel 배포 대상) |

`faq.md`를 수정하면 `node site/build-faq.js`로 `site/faq-data.js`를 다시 생성합니다. Vercel 빌드에서도 같은 명령이 실행됩니다.
