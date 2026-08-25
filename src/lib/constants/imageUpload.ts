/**
 * 사진 보관함(갤러리)에서만 고르도록 유도하는 accept 값.
 * - capture 속성은 절대 붙이지 않음 (카메라 직행 방지)
 * - image/* 와일드카드 대신 구체 MIME·확장자 사용
 *   (문서앱·드라이브·카메라 옵션이 덜 뜨도록)
 */
export const IMAGE_LIBRARY_ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif'
