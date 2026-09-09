// AI 생성: 설계 문서(0번)는 "공용 유틸로 통일"만 정하고 정확한 위치·시그니처는 명시하지 않았다.
export function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}
