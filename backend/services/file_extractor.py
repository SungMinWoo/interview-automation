"""Extract text from uploaded files (PDF, DOCX, TXT, images)."""

import logging
import os

logger = logging.getLogger(__name__)


# 업로드 허용 확장자 — 프론트엔드 화이트리스트와 동기화
ALLOWED_UPLOAD_EXTENSIONS = {
    '.pdf', '.docx', '.doc', '.txt',
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp',
}

# 파일당 최대 크기 (bytes) — 20MB. nginx client_max_body_size와 일치.
MAX_UPLOAD_SIZE = 20 * 1024 * 1024


class UploadValidationError(Exception):
    """업로드 검증 실패 — 호출자가 ValidationError로 변환해서 클라이언트에 반환."""


def validate_uploaded_file(uploaded_file) -> str:
    """업로드된 파일의 확장자와 크기를 검증. 통과 시 정규화된 소문자 확장자를 반환.

    Args:
        uploaded_file: Django `UploadedFile` 객체 (request.FILES.get('file') 결과).

    Returns:
        '.pdf' 형태의 소문자 확장자 문자열.

    Raises:
        UploadValidationError: 확장자가 화이트리스트 밖이거나 크기 초과.
    """
    if not uploaded_file:
        raise UploadValidationError('파일이 업로드되지 않았습니다.')

    name = uploaded_file.name or ''
    ext = os.path.splitext(name)[1].lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        allowed = ', '.join(sorted(ALLOWED_UPLOAD_EXTENSIONS))
        raise UploadValidationError(
            f'허용되지 않은 파일 형식입니다: "{ext or name}". 허용: {allowed}'
        )

    size = getattr(uploaded_file, 'size', 0) or 0
    if size > MAX_UPLOAD_SIZE:
        raise UploadValidationError(
            f'파일 크기가 너무 큽니다. 최대 {MAX_UPLOAD_SIZE // (1024 * 1024)}MB까지 업로드 가능합니다.'
        )

    return ext


def extract_text_from_file(file_path: str, file_type: str = '') -> str:
    """Extract text content from a file.

    Supports: PDF, DOCX, TXT, and common text formats.
    For images, returns empty string (handled by AI vision separately).
    """
    ext = file_type.lower() or os.path.splitext(file_path)[1].lower()

    try:
        if ext in ('.pdf',):
            return _extract_pdf(file_path)
        elif ext in ('.docx',):
            return _extract_docx(file_path)
        elif ext in ('.txt', '.md', '.csv', '.json', '.xml', '.html'):
            return _extract_text(file_path)
        elif ext in ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'):
            return ''  # Images handled by AI vision
        else:
            logger.warning(f"Unsupported file type: {ext}")
            return ''
    except Exception as e:
        logger.error(f"Failed to extract text from {file_path}: {e}")
        return ''


def _extract_pdf(file_path: str) -> str:
    """Extract text from PDF using pypdf."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        return '\n\n'.join(pages)
    except ImportError:
        logger.warning("pypdf not installed. Install with: pip install pypdf")
        return ''


def _extract_docx(file_path: str) -> str:
    """Extract text from DOCX using python-docx."""
    try:
        from docx import Document
        doc = Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return '\n\n'.join(paragraphs)
    except ImportError:
        logger.warning("python-docx not installed. Install with: pip install python-docx")
        return ''


def _extract_text(file_path: str) -> str:
    """Read plain text file."""
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()


def is_image_file(file_type: str) -> bool:
    """Check if the file is an image that can be analyzed by AI vision."""
    return file_type.lower() in ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp')
