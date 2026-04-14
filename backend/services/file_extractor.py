"""Extract text from uploaded files (PDF, DOCX, TXT, images)."""

import logging
import os

logger = logging.getLogger(__name__)


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
