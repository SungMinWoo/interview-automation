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

    def analyze_project(self, requirements_text: str, existing_site_data: dict | None, reference_sites_data: list[dict], file_contents: list[dict] | None = None) -> dict:
        """Phase 1: Analyze client requirements and sites."""
        prompt_parts = [
            "당신은 SI 회사의 UX/UI 분석 전문가입니다. 다음 정보를 분석하여 JSON 형식으로 결과를 제공하세요.\n",
            f"## 클라이언트 요구사항\n{requirements_text}\n",
        ]

        if file_contents:
            prompt_parts.append("\n## 요구사항 첨부 파일")
            for fc in file_contents:
                prompt_parts.append(f"\n### 파일: {fc['file_name']}")
                if fc.get('ai_summary'):
                    prompt_parts.append(f"AI 요약: {fc['ai_summary']}")
                if fc.get('content'):
                    prompt_parts.append(f"내용:\n{fc['content']}\n")

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

    def regenerate_analysis_section(self, section: str, current_analysis: dict, context: dict) -> dict:
        """Regenerate a specific section of the analysis."""
        prompt = f"""현재 분석: {json.dumps(current_analysis, ensure_ascii=False)}
컨텍스트: {json.dumps(context, ensure_ascii=False)}

"{section}" 섹션을 더 깊이 있고 구체적으로 다시 작성하세요. JSON: {{"{section}": ...}}"""
        try:
            response = self.model.generate_content(prompt, generation_config={'response_mime_type': 'application/json', 'temperature': 0.7})
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini section regeneration failed: {e}")
            raise

    def generate_questionnaire(self, confirmed_analysis: dict, position_categories: list[str]) -> dict:
        """Phase 2: Generate interview questions organized by sections."""
        prompt = f"""당신은 SI 회사의 UX/UI 프로젝트를 위한 임직원 인터뷰 질문지 전문가입니다.

## 분석 결과
{json.dumps(confirmed_analysis, ensure_ascii=False, indent=2)}

## 직급 카테고리
{', '.join(position_categories) if position_categories else '전체 (직급 구분 없음)'}

## 지시사항
구분(section)별로 질문지를 생성하세요. 각 구분에 4~8개 질문. 질문마다 sub_category, importance, purpose 필수.

## 출력 형식 (JSON)
{{
    "title": "질문지 제목",
    "description": "질문지 설명",
    "sections": [
        {{
            "title": "구분 제목",
            "description": "구분 설명",
            "importance": "high|medium|low",
            "target_area": "공통",
            "questions": [
                {{
                    "sub_category": "세부구분",
                    "text": "질문 내용",
                    "description": "",
                    "question_type": "textarea",
                    "options": [],
                    "importance": "required|important|optional",
                    "purpose": "질문 의도"
                }}
            ]
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

    def generate_section_questions(self, section_title: str, section_description: str, count: int, analysis_context: dict, existing_questions: list[str]) -> dict:
        """Generate additional questions for a specific section."""
        existing = chr(10).join(f'- {q}' for q in existing_questions) if existing_questions else '(없음)'
        prompt = f"""섹션 "{section_title}" ({section_description})에 추가할 질문을 정확히 {count}개 생성하세요. 기존 질문과 중복 금지.

## 컨텍스트
{json.dumps(analysis_context, ensure_ascii=False, indent=2)}

## 기존 질문
{existing}

## JSON 출력
{{"questions": [{{"sub_category":"세부구분","text":"질문","description":"","question_type":"textarea","options":[],"importance":"required|important|optional","purpose":"의도"}}]}}"""
        try:
            response = self.model.generate_content(prompt, generation_config={'response_mime_type': 'application/json', 'temperature': 0.7})
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini section question generation failed: {e}")
            raise

    def aggregate_responses(self, questions_with_answers: list[dict], analysis_context: dict) -> dict:
        """Phase 3: Aggregate all survey responses.

        Args:
            questions_with_answers: [{question_text, answers: [{employee_name, position, text_value, ...}]}]
            analysis_context: Original confirmed analysis for context

        Returns:
            {summary, company_direction, desired_changes, company_values, keywords, sentences}
        """
        prompt = f"""인터뷰 응답을 파트별로 요약하세요. 원문 워딩을 최대한 유지하고, 변화사항은 카테고리(UX, 디자인, 기술 등)로 분류하세요.

## 컨텍스트
{json.dumps(analysis_context, ensure_ascii=False, indent=2)}

## 응답 데이터
{json.dumps(questions_with_answers, ensure_ascii=False, indent=2)}

## 출력 형식 (JSON)
{{
    "summary": "전체 종합 요약",
    "section_summaries": [
        {{"section_title": "파트명", "summary": "파트 요약", "key_quotes": ["화자: '원문'"]}}
    ],
    "company_direction": "회사 방향성",
    "desired_changes": [
        {{"category": "UX", "items": ["변화1"]}},
        {{"category": "디자인", "items": ["변화2"]}}
    ],
    "company_values": ["가치1"],
    "keywords": [{{"text": "키워드", "category": "tone|feature|value|emotion", "weight": 0.9}}],
    "sentences": [{{"text": "화자: '원문 인용'", "category": "비전|브랜드|UX"}}]
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

    def analyze_file_content(self, file_text: str, file_name: str) -> dict:
        """Analyze uploaded file content and extract requirements summary."""
        prompt = f"""파일명: {file_name}\n\n{file_text[:8000]}\n\n위 파일에서 프로젝트 요구사항을 추출하세요. JSON: {{"summary":"요약","requirements":["항목"],"keywords":["키워드"],"target_audience":"타겟","constraints":["제약"],"notes":"참고"}}"""
        try:
            response = self.model.generate_content(prompt, generation_config={'response_mime_type': 'application/json', 'temperature': 0.3})
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini file analysis failed: {e}")
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
