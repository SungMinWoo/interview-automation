import os
import tempfile
from rest_framework import permissions, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from services.ai_client import get_ai_client, validate_ai_provider
from services.crawler_service import CrawlerService
from services.file_extractor import extract_text_from_file


class AnalyzeSiteView(APIView):
    """POST - Crawl a URL and analyze with AI (project-independent)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        url = request.data.get('url', '').strip()
        if not url:
            return Response({'detail': 'URL을 입력해주세요.'}, status=status.HTTP_400_BAD_REQUEST)

        ai_provider = validate_ai_provider(request.data.get('ai_provider'))

        # Crawl
        crawler = CrawlerService()
        crawl_result = crawler.crawl(url)

        if crawl_result.get('error'):
            return Response({
                'detail': f'크롤링 실패: {crawl_result["error"]}',
                'crawl': crawl_result,
            }, status=status.HTTP_502_BAD_GATEWAY)

        # AI analysis
        ai_client = get_ai_client(ai_provider)
        try:
            analysis = ai_client.analyze_site(
                url=url,
                crawl_text=crawl_result.get('main_text', ''),
            )
        except Exception as e:
            return Response({
                'detail': f'AI 분석 실패: {str(e)}',
                'crawl': crawl_result,
            }, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            'url': url,
            'crawl': {
                'title': crawl_result.get('title', ''),
                'meta_description': crawl_result.get('meta_description', ''),
                'headings': crawl_result.get('headings', []),
                'navigation': crawl_result.get('navigation', []),
            },
            'analysis': analysis,
            'ai_provider': ai_provider,
        })


class AnalyzeFileView(APIView):
    """POST - Upload a file, extract text, and analyze with AI (project-independent)."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'detail': '파일을 업로드해주세요.'}, status=status.HTTP_400_BAD_REQUEST)

        ai_provider = validate_ai_provider(request.data.get('ai_provider'))
        ext = os.path.splitext(uploaded_file.name)[1].lower()

        # Save to temp file for extraction
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            for chunk in uploaded_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            extracted_text = extract_text_from_file(tmp_path, ext)
        finally:
            os.unlink(tmp_path)

        if not extracted_text:
            return Response({
                'detail': '파일에서 텍스트를 추출할 수 없습니다.',
                'file_name': uploaded_file.name,
                'file_type': ext,
            }, status=status.HTTP_400_BAD_REQUEST)

        # AI analysis
        ai_client = get_ai_client(ai_provider)
        try:
            result = ai_client.analyze_file_content(
                file_text=extracted_text,
                file_name=uploaded_file.name,
            )
        except Exception as e:
            return Response({
                'detail': f'AI 분석 실패: {str(e)}',
                'file_name': uploaded_file.name,
                'extracted_text': extracted_text[:500],
            }, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            'file_name': uploaded_file.name,
            'file_type': ext,
            'file_size': uploaded_file.size,
            'extracted_text': extracted_text[:2000],
            'analysis': result,
            'ai_provider': ai_provider,
        })
