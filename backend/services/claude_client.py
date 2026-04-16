import json
import logging
import time
from django.conf import settings

logger = logging.getLogger(__name__)


class ClaudeClient:
    """Wrapper for Anthropic Claude API for all AI operations."""

    def __init__(self):
        import anthropic
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = 'claude-sonnet-4-20250514'

    def _request_json(self, prompt: str, temperature: float = 0.7, max_retries: int = 3) -> dict:
        """Send a prompt and parse the JSON response with retry for overloaded/rate-limit errors."""
        import anthropic

        for attempt in range(max_retries):
            try:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=8192,
                    temperature=temperature,
                    messages=[{'role': 'user', 'content': prompt}],
                )
                text = response.content[0].text.strip()
                # Claude may wrap JSON in ```json ... ``` blocks
                if text.startswith('```'):
                    text = text.split('\n', 1)[1] if '\n' in text else text[3:]
                    if text.endswith('```'):
                        text = text[:-3].strip()
                return json.loads(text)
            except anthropic.APIStatusError as e:
                if e.status_code in (429, 529) and attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.warning(f"Claude API {e.status_code} error, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                else:
                    raise

    def _request_text(self, prompt: str, temperature: float = 0.7, max_retries: int = 3) -> str:
        """Send a prompt and return plain text response with retry for overloaded/rate-limit errors."""
        import anthropic

        for attempt in range(max_retries):
            try:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=4096,
                    temperature=temperature,
                    messages=[{'role': 'user', 'content': prompt}],
                )
                return response.content[0].text.strip()
            except anthropic.APIStatusError as e:
                if e.status_code in (429, 529) and attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.warning(f"Claude API {e.status_code} error, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                else:
                    raise

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
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
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
            return self._request_json('\n'.join(prompt_parts), temperature=0.7)
        except Exception as e:
            logger.error(f"Claude analysis failed: {e}")
            raise

    def regenerate_analysis_section(self, section: str, current_analysis: dict, context: dict) -> dict:
        """Regenerate a specific section of the analysis."""
        section_prompts = {
            'requirements_summary': '클라이언트 요구사항을 다시 분석하여 요약해주세요. 첨부 파일 내용도 반영하세요.',
            'existing_site_analysis': '기존 사이트를 다시 분석해주세요. layout, navigation, color_scheme, typography, strengths, weaknesses를 포함하세요.',
            'reference_sites_analysis': '레퍼런스 사이트들을 다시 분석해주세요. 각 사이트별로 url, layout, standout_features, design_patterns, relevant_to_requirements를 포함하세요.',
            'combined_insights': '모든 분석 결과를 종합하여 인사이트를 다시 도출해주세요. recommended_direction, key_patterns_to_adopt, gaps_to_address, risk_areas를 포함하세요.',
        }
        instruction = section_prompts.get(section, f'{section} 섹션을 다시 분석해주세요.')

        prompt = f"""당신은 SI 회사의 UX/UI 분석 전문가입니다.

## 현재 분석 결과
{json.dumps(current_analysis, ensure_ascii=False, indent=2)}

## 프로젝트 컨텍스트
{json.dumps(context, ensure_ascii=False, indent=2)}

## 지시사항
{instruction}

기존 분석 결과를 참고하되, 더 깊이 있고 구체적으로 다시 작성해주세요.

## 출력 형식
반드시 JSON으로만 응답하세요. "{section}" 키의 값만 반환하세요.
{{"{ section }": ...}}"""
        try:
            return self._request_json(prompt, temperature=0.7)
        except Exception as e:
            logger.error(f"Claude section regeneration failed: {e}")
            raise

    def generate_questionnaire(self, confirmed_analysis: dict, position_categories: list[str]) -> dict:
        """Phase 2: Generate interview questions organized by sections with sub-categories."""
        prompt = f"""당신은 SI 회사의 UX/UI 프로젝트를 위한 임직원 인터뷰 질문지 전문가입니다.

## 분석 결과
{json.dumps(confirmed_analysis, ensure_ascii=False, indent=2)}

## 직급 카테고리
{', '.join(position_categories) if position_categories else '전체 (직급 구분 없음)'}

## 지시사항
위 분석 결과를 바탕으로 체계적인 인터뷰 질문지를 생성하세요.

### 질문지 구조
- **구분 (section)**: 대분류. 각 구분에 설명과 중요도(상/중/하), 질문영역(공통 등)을 부여
- **세부구분 (sub_category)**: 각 질문의 소주제 분류
- **질문**: 실제 인터뷰에서 물어볼 질문. 각 질문에 중요도와 의도를 포함

### 구분 예시 (분석 결과에 맞게 적절히 변경)
1. Project Overview — 기본 소개 및 프로젝트 전반 (직무/포지션, 전략/로드맵, 트렌드, 업의 본질)
2. Service Image — 서비스 이미지/브랜드 인식
3. Target / Business — 고객유치, 강점/약점, 리뉴얼 방향
4. UX/UI Design — 벤치마킹, 디자인 방향, 사용자 경험

### 질문 작성 원칙
- 주로 서술형(textarea) 질문
- 구체적이고 답변하기 쉬운 질문 (예시를 괄호로 추가)
- 각 구분에 4~8개 질문
- 각 질문에 세부구분(sub_category)과 의도(purpose)를 반드시 포함

## 출력 형식 (JSON)
반드시 아래 JSON 형식으로만 응답하세요.
{{
    "title": "질문지 제목",
    "description": "질문지 설명",
    "sections": [
        {{
            "title": "구분 제목 (e.g., Project Overview)",
            "description": "이 구분의 설명 (e.g., 기본적인 소개와 프로젝트 전반의 질의로 구성합니다.)",
            "importance": "high|medium|low",
            "target_area": "공통",
            "questions": [
                {{
                    "sub_category": "세부구분 (e.g., 직무/포지션)",
                    "text": "질문 내용",
                    "description": "질문 보조 설명이나 예시 (선택)",
                    "question_type": "textarea",
                    "options": [],
                    "importance": "required|important|optional",
                    "purpose": "이 질문의 의도 — 무엇을 확인하고자 하는지"
                }}
            ]
        }}
    ]
}}
"""
        try:
            return self._request_json(prompt, temperature=0.7)
        except Exception as e:
            logger.error(f"Claude questionnaire generation failed: {e}")
            raise

    def generate_section_questions(self, section_title: str, section_description: str, count: int, analysis_context: dict, existing_questions: list[str]) -> dict:
        """Generate additional questions for a specific section."""
        prompt = f"""당신은 SI 회사의 UX/UI 프로젝트를 위한 임직원 인터뷰 질문지 전문가입니다.

## 분석 컨텍스트
{json.dumps(analysis_context, ensure_ascii=False, indent=2)}

## 섹션 정보
- 섹션 제목: {section_title}
- 섹션 설명: {section_description}

## 이미 있는 질문 (중복 금지)
{chr(10).join(f'- {q}' for q in existing_questions) if existing_questions else '(없음)'}

## 지시사항
위 섹션에 추가할 질문을 정확히 {count}개 생성하세요.
- 이미 있는 질문과 중복되지 않는 새로운 질문
- 주로 서술형(textarea) 질문
- 구체적이고 답변하기 쉬운 질문
- 각 질문에 세부구분(sub_category)과 의도(purpose)를 반드시 포함

## 출력 형식 (JSON)
반드시 아래 JSON 형식으로만 응답하세요.
{{
    "questions": [
        {{
            "sub_category": "세부구분",
            "text": "질문 내용",
            "description": "질문 보조 설명 (선택)",
            "question_type": "textarea",
            "options": [],
            "importance": "required|important|optional",
            "purpose": "이 질문의 의도"
        }}
    ]
}}"""
        try:
            return self._request_json(prompt, temperature=0.7)
        except Exception as e:
            logger.error(f"Claude section question generation failed: {e}")
            raise

    def aggregate_responses(self, questions_with_answers: list[dict], analysis_context: dict) -> dict:
        """Phase 3: Aggregate all survey responses by section with preserved wording."""
        prompt = f"""당신은 SI 회사의 UX/UI 프로젝트를 위한 인터뷰 응답 분석 전문가입니다.

## 원래 분석 컨텍스트
{json.dumps(analysis_context, ensure_ascii=False, indent=2)}

## 인터뷰 응답 데이터
{json.dumps(questions_with_answers, ensure_ascii=False, indent=2)}

## 지시사항
모든 인터뷰 응답을 종합 분석하되 다음 원칙을 지켜주세요:

### 1. 파트별 구분 요약 (section_summaries)
- 질문 데이터에 section 정보가 있으면 파트별로 구분하여 요약
- 각 파트별로 핵심 내용을 정리
- section 정보가 없으면 질문 주제별로 자연스럽게 그룹핑

### 2. 원문 워딩 유지 (sentences)
- 응답자의 원래 표현을 최대한 살려서 인용
- "OOO 과장: '디지털 전환이 급선무'" 형태로 화자와 원문을 함께 기록
- 임원의 발언은 특히 중요하게 다룰 것

### 3. 변화사항 카테고라이징 (desired_changes)
- 단순 리스트가 아닌 카테고리별 분류: UX, 디자인, 기술, 조직/문화, 서비스 등

### 4. 키워드는 디자인 방향에 활용할 것들 위주

## 출력 형식 (JSON)
반드시 아래 JSON 형식으로만 응답하세요.
{{
    "summary": "전체 종합 요약",
    "section_summaries": [
        {{
            "section_title": "파트명 (예: 회사 비전/방향성)",
            "summary": "이 파트의 응답 요약",
            "key_quotes": ["화자: '원문 인용'", ...]
        }}
    ],
    "company_direction": "회사 방향성 서술",
    "desired_changes": [
        {{"category": "UX", "items": ["변화1", "변화2"]}},
        {{"category": "디자인", "items": ["변화3"]}},
        {{"category": "기술", "items": ["변화4"]}}
    ],
    "company_values": ["가치1", "가치2"],
    "keywords": [
        {{"text": "키워드", "category": "tone|feature|value|emotion", "weight": 0.9}}
    ],
    "sentences": [
        {{"text": "화자: '원문 인용 문장'", "category": "비전|브랜드|UX|기술"}}
    ]
}}
"""
        try:
            return self._request_json(prompt, temperature=0.5)
        except Exception as e:
            logger.error(f"Claude aggregation failed: {e}")
            raise

    def analyze_file_content(self, file_text: str, file_name: str) -> dict:
        """Analyze uploaded file content and extract requirements summary."""
        prompt = f"""다음은 SI 프로젝트의 요구사항 관련 파일입니다.
파일명: {file_name}

## 파일 내용
{file_text[:8000]}

## 지시사항
이 파일에서 다음을 추출해주세요:
1. 프로젝트 요구사항 요약
2. 핵심 키워드/요구 기능
3. 타겟 사용자/오디언스
4. 특별한 제약 조건이나 참고사항

반드시 JSON 형식으로 응답하세요.
{{
    "summary": "파일 내용 요약",
    "requirements": ["요구사항1", "요구사항2"],
    "keywords": ["키워드1", "키워드2"],
    "target_audience": "타겟 사용자",
    "constraints": ["제약조건1"],
    "notes": "기타 참고사항"
}}"""
        try:
            return self._request_json(prompt, temperature=0.3)
        except Exception as e:
            logger.error(f"Claude file analysis failed: {e}")
            raise

    def generate_additional_keywords(self, existing_keywords: list[str], context: dict) -> list[dict]:
        """Generate additional keywords based on existing ones and context."""
        prompt = f"""기존 키워드: {', '.join(existing_keywords)}
컨텍스트: {json.dumps(context, ensure_ascii=False)}

위 키워드와 컨텍스트를 바탕으로 추가 키워드 5개를 제안하세요.
반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
[{{"text": "키워드", "category": "카테고리", "weight": 0.8}}]
"""
        try:
            return self._request_json(prompt, temperature=0.8)
        except Exception as e:
            logger.error(f"Claude additional keywords failed: {e}")
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
        if colors:
            if isinstance(colors, dict):
                color_parts = []
                if colors.get('primary'): color_parts.append(f"primary: {colors['primary']}")
                if colors.get('secondary'): color_parts.append(f"secondary: {colors['secondary']}")
                if colors.get('accent'): color_parts.append(f"accent: {colors['accent']}")
                if color_parts:
                    parts.append(f"Brand Colors: {', '.join(color_parts)}")
                elif colors:
                    parts.append(f"Brand Colors: {json.dumps(colors)}")

        tone = design_brief_data.get('tone_and_mood', {})
        if tone:
            parts.append(f"Tone & Mood: {json.dumps(tone, ensure_ascii=False) if isinstance(tone, dict) else str(tone)}")

        if design_brief_data.get('additional_notes'):
            parts.append(f"Notes: {design_brief_data['additional_notes']}")

        context = '\n'.join(parts)

        prompt = f"""You are a web design prompt engineer. Based on the following design brief, create a detailed English prompt for Google Stitch AI to generate a professional website design.

## Design Brief
{context}

## Requirements for the prompt
1. Specify the type of website (corporate, landing page, etc.) and its purpose
2. Describe the visual style, tone, and overall aesthetic in detail
3. If brand colors are provided, specify exact color values (e.g., "Use #2563EB as primary color")
4. List the major sections: hero, about, services/features, testimonials, contact, footer
5. Describe typography preferences (modern, clean, serif/sans-serif)
6. Include layout preferences (grid-based, full-width hero, card layouts, etc.)
7. Reflect the brand keywords and key messages in the design direction
8. Specify responsive design for desktop view

Output ONLY the English prompt for Stitch. No JSON, no explanation, just the prompt text."""

        try:
            return self._request_text(prompt, temperature=0.7)
        except Exception as e:
            logger.error(f"Claude stitch prompt generation failed: {e}")
            raise

    def generate_design_md(self, design_brief_data: dict) -> str:
        """Generate a DESIGN.md file content from design brief data.

        Returns Stitch-compatible Design MD markdown content.
        """
        # Build context from brief
        parts = []
        if design_brief_data.get('title'):
            parts.append(f"Project: {design_brief_data['title']}")
        if design_brief_data.get('summary'):
            parts.append(f"Summary: {design_brief_data['summary']}")
        if design_brief_data.get('design_direction'):
            parts.append(f"Design Direction: {design_brief_data['design_direction']}")
        if design_brief_data.get('target_audience'):
            parts.append(f"Target Audience: {design_brief_data['target_audience']}")

        keywords = design_brief_data.get('selected_keywords', [])
        if keywords:
            kw_texts = [kw['text'] if isinstance(kw, dict) else str(kw) for kw in keywords]
            parts.append(f"Keywords: {', '.join(kw_texts)}")

        sentences = design_brief_data.get('selected_sentences', [])
        if sentences:
            s_texts = [s['text'] if isinstance(s, dict) else str(s) for s in sentences]
            parts.append(f"Key Messages: {'; '.join(s_texts[:5])}")

        colors = design_brief_data.get('color_preferences', {})
        if colors and isinstance(colors, dict):
            color_parts = []
            for k, v in colors.items():
                if v:
                    color_parts.append(f"{k}: {v}")
            if color_parts:
                parts.append(f"Brand Colors: {', '.join(color_parts)}")

        tone = design_brief_data.get('tone_and_mood', {})
        if tone:
            parts.append(f"Tone & Mood: {json.dumps(tone, ensure_ascii=False) if isinstance(tone, dict) else str(tone)}")

        if design_brief_data.get('additional_notes'):
            parts.append(f"Additional Notes: {design_brief_data['additional_notes']}")

        context = '\n'.join(parts)

        prompt = f"""You are a Design Systems Lead creating a DESIGN.md file for Google Stitch.
Based on the following design brief, generate a comprehensive DESIGN.md file.

## Design Brief
{context}

## DESIGN.md Format Requirements
The file MUST follow this exact structure with these 6 sections:

1. **Visual Theme & Atmosphere** - Evocative description of the overall mood, aesthetic philosophy, key characteristics
2. **Color Palette & Roles** - Every color with: Descriptive Name + Hex Code + Functional Role. Include Primary Foundation, Accent & Interactive, Typography colors, Functional States. If brand colors are provided, use those exact hex values.
3. **Typography Rules** - Font family, hierarchy (H1-H3, body, small, CTA), weights, sizes, letter-spacing, line-height
4. **Component Stylings** - Buttons (shape, colors, states), Cards (corners, shadows, padding), Navigation, Inputs/Forms
5. **Layout Principles** - Grid system, whitespace strategy, breakpoints, alignment, responsive behavior
6. **Design System Notes for Stitch Generation** - Language to use, color references, component prompts, iteration guidelines

## Important Rules
- Use descriptive, natural language (e.g., "Ocean-deep Cerulean #0077B6" not just "blue")
- Include hex codes alongside every color description
- Use designer-friendly language, not CSS property names
- Make it readable by both humans and AI agents
- Start with "# Design System: [Project Title]"

Output ONLY the DESIGN.md content in markdown format. No wrapping code blocks."""

        try:
            return self._request_text(prompt, temperature=0.7)
        except Exception as e:
            logger.error(f"Claude design MD generation failed: {e}")
            raise
