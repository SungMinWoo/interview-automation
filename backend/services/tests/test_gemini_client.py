import json
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture
def mock_genai():
    """Mock the google.generativeai module."""
    with patch.dict('sys.modules', {'google.generativeai': MagicMock()}):
        with patch('django.conf.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = 'test-api-key'
            yield


@pytest.fixture
def gemini_client(mock_genai):
    """Create a GeminiClient with mocked dependencies."""
    with patch('google.generativeai.configure'), \
         patch('google.generativeai.GenerativeModel') as MockModel:
        from services.gemini_client import GeminiClient
        client = GeminiClient()
        client._mock_model = MockModel.return_value
        return client


class TestAnalyzeProject:
    def test_analyze_project_returns_expected_structure(self, gemini_client):
        expected = {
            'requirements_summary': 'Test summary',
            'existing_site_analysis': {
                'layout': 'Grid layout',
                'navigation': 'Top nav',
                'color_scheme': 'Blue/White',
                'typography': 'Sans-serif',
                'strengths': ['Clean design'],
                'weaknesses': ['Slow loading'],
            },
            'reference_sites_analysis': [
                {
                    'url': 'https://example.com',
                    'layout': 'Card layout',
                    'standout_features': ['Animations'],
                    'design_patterns': ['Hero section'],
                    'relevant_to_requirements': 'High relevance',
                }
            ],
            'combined_insights': {
                'recommended_direction': 'Modern minimalist',
                'key_patterns_to_adopt': ['Card layout'],
                'gaps_to_address': ['Mobile responsiveness'],
                'risk_areas': ['Performance'],
            },
        }

        mock_response = MagicMock()
        mock_response.text = json.dumps(expected)
        gemini_client._mock_model.generate_content.return_value = mock_response

        result = gemini_client.analyze_project(
            requirements_text='Modern website redesign',
            existing_site_data={'url': 'https://old-site.com', 'crawl_text': 'Old site content'},
            reference_sites_data=[{'url': 'https://example.com', 'crawl_text': 'Example content'}],
        )

        assert result == expected
        assert 'requirements_summary' in result
        assert 'combined_insights' in result
        gemini_client._mock_model.generate_content.assert_called_once()


class TestGenerateQuestionnaire:
    def test_generate_questionnaire_returns_questions(self, gemini_client):
        expected = {
            'title': 'UX/UI 인터뷰 설문',
            'description': '프로젝트 설문 설명',
            'questions': [
                {
                    'text': '현재 사이트에서 가장 불편한 점은 무엇인가요?',
                    'description': '',
                    'question_type': 'textarea',
                    'is_required': True,
                    'options': [],
                    'position_categories': [],
                },
                {
                    'text': '회사의 향후 디지털 전략 방향은?',
                    'description': '전략적 관점에서 답변해 주세요.',
                    'question_type': 'textarea',
                    'is_required': True,
                    'options': [],
                    'position_categories': ['임원'],
                },
            ],
        }

        mock_response = MagicMock()
        mock_response.text = json.dumps(expected)
        gemini_client._mock_model.generate_content.return_value = mock_response

        result = gemini_client.generate_questionnaire(
            confirmed_analysis={'requirements_summary': 'Test'},
            position_categories=['임원', '실무자'],
        )

        assert 'questions' in result
        assert len(result['questions']) == 2
        assert result['questions'][0]['question_type'] == 'textarea'


class TestAggregateResponses:
    def test_aggregate_responses_returns_keywords(self, gemini_client):
        expected = {
            'summary': '전반적으로 현대적인 디자인을 원함',
            'company_direction': '디지털 혁신',
            'desired_changes': ['모바일 최적화', '속도 개선'],
            'company_values': ['혁신', '신뢰'],
            'keywords': [
                {'text': '모던', 'category': 'tone', 'weight': 0.9},
                {'text': '신뢰감', 'category': 'emotion', 'weight': 0.8},
            ],
            'sentences': [
                {'text': '사용자 중심의 직관적 경험', 'category': 'direction'},
            ],
        }

        mock_response = MagicMock()
        mock_response.text = json.dumps(expected)
        gemini_client._mock_model.generate_content.return_value = mock_response

        result = gemini_client.aggregate_responses(
            questions_with_answers=[
                {
                    'question_text': '불편한 점은?',
                    'answers': [{'employee_name': 'Kim', 'position': '실무자', 'text_value': '느린 속도'}],
                }
            ],
            analysis_context={'requirements_summary': 'Test'},
        )

        assert 'keywords' in result
        assert len(result['keywords']) == 2
        assert result['keywords'][0]['category'] == 'tone'
        assert 'sentences' in result


class TestBuildStitchPrompt:
    def test_build_stitch_prompt_returns_string(self, gemini_client):
        mock_response = MagicMock()
        mock_response.text = 'Create a modern corporate website with blue color scheme and card-based layout.'
        gemini_client._mock_model.generate_content.return_value = mock_response

        result = gemini_client.build_stitch_prompt(
            design_brief_data={
                'style': 'modern',
                'colors': ['blue', 'white'],
                'keywords': ['professional', 'innovative'],
            }
        )

        assert isinstance(result, str)
        assert len(result) > 0
        gemini_client._mock_model.generate_content.assert_called_once()
