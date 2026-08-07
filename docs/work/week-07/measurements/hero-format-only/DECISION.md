# 1단계 — 포맷 선택 기록 (webp)

## 비교한 것

`next.config.ts`의 `images.formats`를 바꿔가며 같은 조건(CPU 2.4x / 지연 167ms / 하향 7910Kbps, production build)으로 2회씩 비교 측정했다.

| 포맷 | 전송 용량 | LCP (2회) | LCP 중앙값 |
| --- | --- | --- | --- |
| webp | 409,736 B (400 KB) | 1580.1 / 1263.2 ms | 1421.6 ms |
| avif | 304,373 B (297 KB) | 1437.3 / 1017.2 ms | 1227.3 ms |

측정 근거: `../hero-format-webp-only/`, `../hero-format-avif-only/`

## 선택

avif가 전송 용량·LCP 모두 더 나았으나 **webp를 최종 선택**했다.

## 이 폴더(hero-format-only)의 측정값

`next.config.ts: formats: ['image/webp']` 확정 상태로 5회 측정한 결과.

| 지표 | 1 | 2 | 3 | 4 | 5 | 중앙값 | 최소 | 최대 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCP | 491.4 | 550.6 | 542.4 | 581.4 | 529.5 | 542.4 | 491.4 | 581.4 |
| LCP | 1549.7 | 1267.3 | 1259.0 | 1256.4 | 1271.2 | **1267.3** | 1256.4 | 1549.7 |
| CLS | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

- Hero 이미지 전송: 409,736 B (400 KB), `mimeType: image/webp`, 해상도는 아직 원본 3840×2160 그대로(축소 전)
- LCP element: Hero `<img>` (정상)
- Before 대비: LCP 중앙값 8225.4ms → 1267.3ms
