// 슬라이스별 기본 핸들러를 합성한다. FSD 레이어 밖이라 상위·하위 개념이 없다
// (배치 근거: docs/work/week-08/mock-module-structure.md).
import { productListHandlers } from '@/_pages/product-list/mock/handlers';

export const handlers = [...productListHandlers];
