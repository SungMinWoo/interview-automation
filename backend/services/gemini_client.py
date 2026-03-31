import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class GeminiClient:
    """Wrapper for Google Gemini API for all AI operations."""

    def __init__(self):
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    def analyze_project(self, requirements_text: str, existing_site_data: dict | None, reference_sites_data: list[dict]) -> dict:
        """Phase 1: Analyze client requirements and sites.

        Args:
            requirements_text: Client's requirements description
            existing_site_data: {url, screenshot_base64, crawl_text} or None
            reference_sites_data: [{url, screenshot_base64, crawl_text}, ...]

        Returns:
            {requirements_summary, existing_site_analysis, reference_sites_analysis, combined_insights}
        """
        prompt_parts = [
            "당신은 SI 회사의 UX/UI 분석 전문가입니다. 다음 정보를 분석하여 JSON 형식으로 결과를 제공하세요.\n",
            f"## 클라이언트 요구사항\n{requirements_text}\n",
        ]

        if existing_site_data:
            prompt_parts.append(f"\n## 기존 사이트\nURL: {existing_site_data.get('url', '')}\n")
            if existing_site_data.get('crawl_text'):
                prompt_parts.append(f"크롤링 텍스트:\n{existing_site_data['crawl_text'][:3000]}\n")

        for i, ref in enumerate(reference_sites_data):
            prompt_parts.append(f"\n## 레퍼런스 사이트 {i+1}\nURL: {ref.get('url', '')}\n")
            if ref.get('crawl_text'):
                prompt_parts.append(f"크롤링 텍스트:\n{ref['crawl_text'][:2000]}\n")

        prompt_parts.append("""
## 출력 형식 (JSON)
{
    "requirements_summary": "클라이언트 요구사항 요약",
    "existing_site_analysis": {
        "layout": "레이아웃 분석",
        "navigation": "네비게이션 구조",
        "color_scheme": "컬러 스킴",
        "typography": "타이포그래피",
        "strengths": ["강점1", "강점2"],
        "weaknesses": ["약점1", "약점2"]
    },
    "reference_sites_analysis": [
        {
            "url": "사이트 URL",
            "layout": "레이아웃 특징",
            "standout_features": ["특징1", "특징2"],
            "design_patterns": ["패턴1"],
            "relevant_to_requirements": "요구사항과의 관련성"
        }
    ],
    "combined_insights": {
        "recommended_direction": "추천 디자인 방향",
        "key_patterns_to_adopt": ["채택할 패턴1", "채택할 패턴2"],
        "gaps_to_address": ["해결할 격차1"],
        "risk_areas": ["위험 영역1"]
    }
}
""")

        try:
            response = self.model.generate_content(
                '\n'.join(prompt_parts),
                generation_config={
                    'response_mime_type': 'application/json',
                    'temperature': 0.7,
                }
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            raise

    def generate_questionnaire(self, confirmed_analysis: dict, position_categories: list[str]) -> dict:
        """Phase 2: Generate interview questions based on confirmed analysis.

        Args:
            confirmed_analysis: The confirmed ProjectAnalysis data (with user edits applied)
            position_categories: List of position category names (e.g., ["임원", "관리자", "실무자"])

        Returns:
            {title, description, questions: [{text, description, question_type, is_required, options, position_categories}]}
        """
        prompt = f"""당신은 SI 회사의 UX/UI 프로젝트를 위한 임직원 인터뷰 질문지 전문가입니다.

## 분석 결과
{json.dumps(confirmed_analysis, ensure_ascii=False, indent=2)}

## 직급 카테고리
{', '.join(position_categories) if position_categories else '전체 (직급 구분 없음)'}

## 지시사항
위 분석 결과를 바탕으로 클라이언트 회사의 임직원 인터뷰 질문지를 생성하세요.
- 회사의 현재 방향성과 미래 비전에 대한 질문 포함
- 현재 사이트/서비스에 대한 만족도와 개선사항
- 브랜드 이미지와 가치에 대한 인식
- 직급별로 적합한 질문이 다를 수 있음 (임원은 전략적, 실무자는 실용적)
- position_categories가 비어있으면 모든 직급 공통 질문만 생성

## 출력 형식 (JSON)
{{
    "title": "질문지 제목",
    "description": "질문지 설명",
    "questions": [
        {{
            "text": "질문 내용",
            "description": "질문 보조 설명 (선택)",
            "question_type": "textarea|text|single_choice|multiple_choice|rating",
            "is_required": true,
            "options": ["선택지1", "선택지2"],
            "importance": 3,
            "purpose": "이 질문이 확인하고자 하는 것에 대한 설명",
            "position_categories": ["해당 직급"] 또는 [] (전체 대상)
        }}
    ]
}}
"""
        try:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    'response_mime_type': 'application/json',
                    'temperature': 0.7,
                }
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini questionnaire generation failed: {e}")
            raise

    def aggregate_responses(self, questions_with_answers: list[dict], analysis_context: dict) -> dict:
        """Phase 3: Aggregate all survey responses.

        Args:
            questions_with_answers: [{question_text, answers: [{employee_name, position, text_value, ...}]}]
            analysis_context: Original confirmed analysis for context

        Returns:
            {summary, company_direction, desired_changes, company_values, keywords, sentences}
        """
        prompt = f"""당신은 SI 회사의 UX/UI 프로젝트를 위한 인터뷰 응답 분석 전문가입니다.

## 원래 분석 컨텍스트
{json.dumps(analysis_context, ensure_ascii=False, indent=2)}

## 인터뷰 응답 데이터
{json.dumps(questions_with_answers, ensure_ascii=False, indent=2)}

## 지시사항
모든 인터뷰 응답을 종합 분석하여 다음을 추출하세요:
1. 전체 요약: 임직원들의 전반적인 의견 종합
2. 회사 방향성: 임직원들이 생각하는 회사의 나아갈 방향
3. 변화하고 싶은 것들: 개선하고 싶은 점들
4. 추구하는 가치: 회사가 중시하는 가치
5. 핵심 키워드: 디자인 방향에 활용할 키워드들 (카테고리: tone, feature, value, emotion 등)
6. 핵심 문장: 디자인 컨셉에 활용할 인상적인 문장들

## 출력 형식 (JSON)
{{
    "summary": "전체 종합 요약",
    "company_direction": "회사 방향성 서술",
    "desired_changes": ["변화1", "변화2", ...],
    "company_values": ["가치1", "가치2", ...],
    "keywords": [
        {{"text": "키워드", "category": "카테고리", "weight": 0.9}}
    ],
    "sentences": [
        {{"text": "핵심 문장", "category": "카테고리"}}
    ]
}}
"""
        try:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    'response_mime_type': 'application/json',
                    'temperature': 0.5,
                }
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini aggregation failed: {e}")
            raise

    def generate_additional_keywords(self, existing_keywords: list[str], context: dict) -> list[dict]:
        """Generate additional keywords based on existing ones and context."""
        prompt = f"""기존 키워드: {', '.join(existing_keywords)}
컨텍스트: {json.dumps(context, ensure_ascii=False)}

위 키워드와 컨텍스트를 바탕으로 추가 키워드 5개를 제안하세요.
JSON 배열로 출력: [{{"text": "키워드", "category": "카테고리", "weight": 0.8}}]
"""
        try:
            response = self.model.generate_content(
                prompt,
                generation_config={'response_mime_type': 'application/json', 'temperature': 0.8}
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini additional keywords failed: {e}")
            raise

    def build_stitch_prompt(self, design_brief_data: dict) -> str:
        """Convert design brief data into an optimized prompt for Google Stitch."""
        # Build structured context
        parts = []
        parts.append(f"Title: {design_brief_data.get('title', 'Corporate Website')}")
        if design_brief_data.get('summary'):
            parts.append(f"Summary: {design_brief_data['summary']}")
        if design_brief_data.get('design_direction'):
            parts.append(f"Design Direction: {design_brief_data['design_direction']}")
        if design_brief_data.get('target_audience'):
            parts.append(f"Target Audience: {design_brief_data['target_audience']}")

        keywords = design_brief_data.get('selected_keywords', [])
        if keywords:
            kw_texts = [kw['text'] if isinstance(kw, dict) else str(kw) for kw in keywords]
            parts.append(f"Brand Keywords: {', '.join(kw_texts)}")

        sentences = design_brief_data.get('selected_sentences', [])
        if sentences:
            s_texts = [s['text'] if isinstance(s, dict) else str(s) for s in sentences]
            parts.append(f"Key Messages: {'; '.join(s_texts[:5])}")

        colors = design_brief_data.get('color_preferences', {})
        if colors and isinstance(colors, dict):
            color_parts = []
            if colors.get('primary'): color_parts.append(f"primary: {colors['primary']}")
            if colors.get('secondary'): color_parts.append(f"secondary: {colors['secondary']}")
            if colors.get('accent'): color_parts.append(f"accent: {colors['accent']}")
            if color_parts:
                parts.append(f"Brand Colors: {', '.join(color_parts)}")

        tone = design_brief_data.get('tone_and_mood', {})
        if tone:
            parts.append(f"Tone & Mood: {json.dumps(tone, ensure_ascii=False) if isinstance(tone, dict) else str(tone)}")
        if design_brief_data.get('additional_notes'):
            parts.append(f"Notes: {design_brief_data['additional_notes']}")

        context = '\n'.join(parts)

        prompt = f"""You are a web design prompt engineer. Based on the following design brief, create a detailed English prompt for Google Stitch AI to generate a professional website design.

## Design Brief
{context}

## Requirements
1. Specify website type and purpose
2. Describe visual style, tone, aesthetic in detail
3. If brand colors provided, specify exact hex values
4. List sections: hero, about, services, testimonials, contact, footer
5. Typography preferences
6. Layout: grid-based, full-width hero, card layouts
7. Reflect brand keywords and key messages
8. Desktop responsive design

Output ONLY the English prompt. No JSON, no explanation."""

        try:
            response = self.model.generate_content(prompt, generation_config={'temperature': 0.7})
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini stitch prompt generation failed: {e}")
            raise

    def generate_design_md(self, design_brief_data: dict) -> str:
        """Generate a DESIGN.md file content from design brief data."""
        import json as _json
        context_parts = []
        for key in ['title', 'summary', 'design_direction', 'target_audience', 'additional_notes']:
            if design_brief_data.get(key):
                context_parts.append(f"{key}: {design_brief_data[key]}")
        keywords = design_brief_data.get('selected_keywords', [])
        if keywords:
            context_parts.append(f"Keywords: {', '.join(kw['text'] if isinstance(kw, dict) else str(kw) for kw in keywords)}")
        colors = design_brief_data.get('color_preferences', {})
        if colors and isinstance(colors, dict):
            context_parts.append(f"Colors: {_json.dumps(colors)}")

        prompt = f"""Create a comprehensive DESIGN.md for Google Stitch based on this brief:

{chr(10).join(context_parts)}

Include these 6 sections:
1. Visual Theme & Atmosphere
2. Color Palette & Roles (with hex codes)
3. Typography Rules
4. Component Stylings
5. Layout Principles
6. Design System Notes for Stitch Generation

Use descriptive language with hex codes. Start with "# Design System: [title]".
Output ONLY the markdown content."""

        try:
            response = self.model.generate_content(prompt, generation_config={'temperature': 0.7})
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini design MD generation failed: {e}")
            raise
