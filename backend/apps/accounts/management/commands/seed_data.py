"""
프로젝트 상태별 더미데이터 생성 Management Command

사용법:
    python manage.py seed_data                    # 모든 상태의 프로젝트 생성
    python manage.py seed_data --stage created     # 특정 상태만 생성
    python manage.py seed_data --admin-only        # 어드민 계정만 생성
    python manage.py seed_data --flush             # 기존 더미데이터 삭제 후 재생성
"""

import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.hashers import make_password

from apps.accounts.models import User
from apps.projects.models import Project, ReferenceSite
from apps.analysis.models import SiteAnalysis, ProjectAnalysis
from apps.questionnaires.models import Questionnaire, PositionCategory, Question
from apps.distribution.models import Employee, SurveyInvitation
from apps.responses.models import SurveyResponse, Answer
from apps.aggregation.models import Aggregation, ExtractedKeyword, ExtractedSentence
from apps.design_brief.models import DesignBrief, StitchGeneration


STAGE_ORDER = [
    'created',
    'analyzing',
    'analysis_ready',
    'analysis_confirmed',
    'questionnaire_ready',
    'distributing',
    'collecting',
    'closed',
    'aggregating',
    'aggregation_ready',
    'brief_ready',
    'completed',
]

STAGE_LABELS = {
    'created': '생성됨',
    'analyzing': '분석중',
    'analysis_ready': '분석완료',
    'analysis_confirmed': '분석확인됨',
    'questionnaire_ready': '질문지완료',
    'distributing': '배포중',
    'collecting': '수집중',
    'closed': '마감됨',
    'aggregating': '취합중',
    'aggregation_ready': '취합완료',
    'brief_ready': '브리프완료',
    'completed': '완료',
}

# 프로젝트별 더미데이터 설정
PROJECT_CONFIGS = [
    {
        'title': '산더미 전자 리뉴얼 프로젝트',
        'client_name': '산더미 전자',
        'client_contact_email': 'contact@electronics.example.com',
        'client_contact_phone': '02-1234-5678',
        'requirements_text': (
            '현재 산더미 전자 공식 웹사이트의 전면 리뉴얼을 원합니다. '
            '모바일 퍼스트 디자인, 제품 카테고리 재구성, '
            '사용자 경험 개선이 핵심 목표입니다. '
            '글로벌 시장을 고려한 다국어 지원도 필요합니다.'
        ),
        'existing_site_url': 'https://electronics.example.com/',
    },
    {
        'title': '산더미 커머스 플랫폼',
        'client_name': '산더미 커머스',
        'client_contact_email': 'biz@commerce.example.com',
        'client_contact_phone': '031-9876-5432',
        'requirements_text': (
            '메신저 기반 커머스 플랫폼의 웹 버전을 새로 구축합니다. '
            '자사 디자인 시스템과의 일관성, 빠른 상품 탐색, '
            '소셜 공유 기능 강화가 필요합니다.'
        ),
        'existing_site_url': 'https://commerce.example.com/',
    },
    {
        'title': '산더미 모터스 브랜드 사이트',
        'client_name': '산더미 모터스',
        'client_contact_email': 'web@motors.example.com',
        'client_contact_phone': '02-3456-7890',
        'requirements_text': (
            '산더미 모터스 브랜드 사이트를 EV 중심으로 재편합니다. '
            '3D 차량 뷰어, 온라인 견적 시스템, '
            '딜러 연결 기능이 핵심입니다. '
            '프리미엄 브랜드 이미지를 강조하는 디자인을 원합니다.'
        ),
        'existing_site_url': 'https://motors.example.com/',
    },
]

REFERENCE_SITES = [
    {'url': 'https://www.apple.com/', 'title': 'Apple', 'description': '미니멀하고 세련된 제품 중심 디자인'},
    {'url': 'https://www.tesla.com/', 'title': 'Tesla', 'description': '임팩트 있는 비주얼과 직관적 UX'},
    {'url': 'https://www.airbnb.com/', 'title': 'Airbnb', 'description': '사용자 친화적 검색 및 탐색 경험'},
    {'url': 'https://www.notion.so/', 'title': 'Notion', 'description': '깔끔한 레이아웃과 타이포그래피'},
    {'url': 'https://www.figma.com/', 'title': 'Figma', 'description': '인터랙티브 요소와 애니메이션 활용'},
]

EMPLOYEES_DATA = [
    {'name': '김철수', 'email': 'kim.cs@example.com', 'position': '대표이사', 'department': '경영진'},
    {'name': '이영희', 'email': 'lee.yh@example.com', 'position': '마케팅 팀장', 'department': '마케팅'},
    {'name': '박지성', 'email': 'park.js@example.com', 'position': '디자인 팀장', 'department': '디자인'},
    {'name': '최수연', 'email': 'choi.sy@example.com', 'position': '개발 팀장', 'department': '개발'},
    {'name': '정민호', 'email': 'jung.mh@example.com', 'position': '기획자', 'department': '기획'},
    {'name': '한소희', 'email': 'han.sh@example.com', 'position': 'UX 디자이너', 'department': '디자인'},
    {'name': '오세훈', 'email': 'oh.sh@example.com', 'position': '프론트엔드 개발자', 'department': '개발'},
    {'name': '강다현', 'email': 'kang.dh@example.com', 'position': '콘텐츠 마케터', 'department': '마케팅'},
]

POSITION_CATEGORIES_DATA = [
    '경영진',
    '마케팅/기획',
    '디자인',
    '개발',
]

QUESTIONS_DATA = [
    {
        'text': '현재 웹사이트에서 가장 불편하다고 느끼는 점은 무엇인가요?',
        'question_type': 'textarea',
        'importance': 'required',
        'purpose': '현재 사이트의 주요 문제점 파악',
        'categories': ['경영진', '마케팅/기획', '디자인', '개발'],
    },
    {
        'text': '새 웹사이트에서 가장 중요하게 생각하는 기능을 선택해주세요.',
        'question_type': 'multiple_choice',
        'importance': 'required',
        'options': ['반응형 디자인', '빠른 로딩 속도', '검색 기능', '다국어 지원', '접근성', 'SEO 최적화'],
        'purpose': '핵심 기능 우선순위 파악',
        'categories': ['경영진', '마케팅/기획', '디자인', '개발'],
    },
    {
        'text': '브랜드 이미지를 한 단어로 표현한다면?',
        'question_type': 'text',
        'importance': 'important',
        'purpose': '브랜드 인식 조사',
        'categories': ['경영진', '마케팅/기획'],
    },
    {
        'text': '웹사이트의 주요 타겟 사용자층은 누구라고 생각하시나요?',
        'question_type': 'single_choice',
        'importance': 'important',
        'options': ['10-20대 젊은 층', '30-40대 직장인', '50대 이상', '기업 고객(B2B)', '글로벌 사용자'],
        'purpose': '타겟 사용자 정의',
        'categories': ['경영진', '마케팅/기획'],
    },
    {
        'text': '디자인 방향성에 대해 선호하는 스타일을 선택해주세요.',
        'question_type': 'single_choice',
        'importance': 'important',
        'options': ['미니멀/모던', '화려하고 역동적', '전통적/클래식', '친근하고 따뜻한', '테크/미래지향적'],
        'purpose': '디자인 방향 설정',
        'categories': ['경영진', '디자인'],
    },
    {
        'text': '컬러 톤에 대한 선호도를 평가해주세요. (1: 차가운 톤 ~ 5: 따뜻한 톤)',
        'question_type': 'rating',
        'importance': 'optional',
        'purpose': '컬러 방향 설정',
        'categories': ['디자인'],
    },
    {
        'text': '아래 항목을 중요도 순으로 정렬해주세요.',
        'question_type': 'ranking',
        'importance': 'important',
        'options': ['시각적 임팩트', '정보 전달력', '사용 편의성', '브랜드 일관성', '성능/속도'],
        'purpose': '디자인 우선순위 결정',
        'categories': ['경영진', '디자인', '개발'],
    },
    {
        'text': '리뉴얼 후 가장 기대하는 변화는 무엇인가요?',
        'question_type': 'textarea',
        'importance': 'optional',
        'purpose': '기대 효과 파악',
        'categories': ['경영진', '마케팅/기획', '디자인', '개발'],
    },
]

ANSWER_SAMPLES = {
    'textarea': [
        '네비게이션이 복잡하고 원하는 정보를 찾기 어렵습니다. 모바일에서 특히 불편합니다.',
        '페이지 로딩이 느리고, 디자인이 구식으로 느껴집니다.',
        '콘텐츠 구조가 체계적이지 않아서 사용자가 원하는 정보에 빠르게 접근하기 어렵습니다.',
        '전반적으로 사용자 경험이 개선되어야 한다고 생각합니다. 특히 검색 기능이 부족합니다.',
        '모바일 최적화가 부족하고, 접근성 측면에서도 개선이 필요합니다.',
        '브랜드 아이덴티티가 웹사이트에 잘 반영되지 않고 있습니다.',
        '사용자 플로우가 매끄럽지 않아 전환율이 떨어지고 있습니다.',
        '글로벌 시장에 맞는 다국어 지원과 현지화가 필요합니다.',
    ],
    'text': [
        '혁신', '신뢰', '프리미엄', '도전', '연결', '미래', '품격', '에너지',
    ],
    'single_choice': None,  # 랜덤 선택
    'multiple_choice': None,  # 랜덤 복수 선택
    'rating': None,  # 1-5 랜덤
    'ranking': None,  # 순서 셔플
}

KEYWORDS_DATA = [
    {'text': '모바일 퍼스트', 'category': '디자인', 'weight': 0.95},
    {'text': '사용자 경험', 'category': '디자인', 'weight': 0.92},
    {'text': '프리미엄', 'category': '브랜드', 'weight': 0.88},
    {'text': '혁신', 'category': '브랜드', 'weight': 0.85},
    {'text': '접근성', 'category': '기술', 'weight': 0.80},
    {'text': '빠른 로딩', 'category': '기술', 'weight': 0.78},
    {'text': '반응형', 'category': '기술', 'weight': 0.75},
    {'text': '미니멀', 'category': '디자인', 'weight': 0.72},
    {'text': '글로벌', 'category': '비즈니스', 'weight': 0.70},
    {'text': '신뢰', 'category': '브랜드', 'weight': 0.68},
]

SENTENCES_DATA = [
    {'text': '모바일 환경에서의 사용성이 가장 중요합니다.', 'category': '디자인'},
    {'text': '브랜드의 프리미엄 이미지를 디지털에서도 일관되게 전달해야 합니다.', 'category': '브랜드'},
    {'text': '사용자가 원하는 정보에 3클릭 이내로 접근할 수 있어야 합니다.', 'category': 'UX'},
    {'text': '경쟁사 대비 차별화된 비주얼 아이덴티티가 필요합니다.', 'category': '디자인'},
    {'text': '페이지 로딩 속도가 3초 이내여야 합니다.', 'category': '기술'},
    {'text': '글로벌 시장을 고려한 다국어 지원이 필수입니다.', 'category': '비즈니스'},
]


class Command(BaseCommand):
    help = '프로젝트 상태별 더미데이터를 생성합니다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--stage',
            type=str,
            choices=STAGE_ORDER,
            help='특정 프로젝트 상태만 생성 (예: created, analysis_ready)',
        )
        parser.add_argument(
            '--admin-only',
            action='store_true',
            help='어드민 계정만 생성',
        )
        parser.add_argument(
            '--flush',
            action='store_true',
            help='기존 더미데이터 삭제 후 재생성',
        )

    def handle(self, *args, **options):
        if options['flush']:
            self._flush()

        admin = self._create_admin()
        user = self._create_test_user()

        if options['admin_only']:
            self.stdout.write(self.style.SUCCESS('어드민 계정 생성 완료'))
            return

        target_stage = options.get('stage')
        stages = [target_stage] if target_stage else STAGE_ORDER

        for i, stage in enumerate(stages):
            config = PROJECT_CONFIGS[i % len(PROJECT_CONFIGS)]
            project = self._create_project_at_stage(user, stage, config, i)
            self.stdout.write(
                self.style.SUCCESS(
                    f'  [{STAGE_LABELS[stage]}] {project.title} (id={project.id})'
                )
            )

        self.stdout.write(self.style.SUCCESS(f'\n총 {len(stages)}개 프로젝트 생성 완료'))
        self.stdout.write(self.style.SUCCESS(f'어드민: admin@example.com / admin1234'))
        self.stdout.write(self.style.SUCCESS(f'테스트: test@example.com / test1234'))

    def _flush(self):
        self.stdout.write('기존 더미데이터 삭제 중...')
        StitchGeneration.objects.all().delete()
        DesignBrief.objects.all().delete()
        ExtractedSentence.objects.all().delete()
        ExtractedKeyword.objects.all().delete()
        Aggregation.objects.all().delete()
        Answer.objects.all().delete()
        SurveyResponse.objects.all().delete()
        SurveyInvitation.objects.all().delete()
        Employee.objects.all().delete()
        Question.objects.all().delete()
        PositionCategory.objects.all().delete()
        Questionnaire.objects.all().delete()
        ProjectAnalysis.objects.all().delete()
        SiteAnalysis.objects.all().delete()
        ReferenceSite.objects.all().delete()
        Project.objects.all().delete()
        User.objects.filter(
            email__in=['admin@example.com', 'test@example.com']
        ).delete()
        User.objects.filter(
            username__in=['admin', 'testuser']
        ).delete()
        self.stdout.write(self.style.SUCCESS('삭제 완료'))

    def _create_admin(self):
        admin, created = User.objects.get_or_create(
            email='admin@example.com',
            defaults={
                'username': 'admin',
                'first_name': '관리자',
                'last_name': '',
                'company_name': '산더미 컴퍼니',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            },
        )
        if created:
            admin.set_password('admin1234')
            admin.save()
            self.stdout.write(self.style.SUCCESS('어드민 계정 생성: admin@example.com / admin1234'))
        else:
            self.stdout.write('어드민 계정 이미 존재합니다.')
        return admin

    def _create_test_user(self):
        user, created = User.objects.get_or_create(
            email='test@example.com',
            defaults={
                'username': 'testuser',
                'first_name': '테스트',
                'last_name': '유저',
                'company_name': '테스트 에이전시',
                'is_staff': False,
                'is_superuser': False,
                'is_active': True,
            },
        )
        if created:
            user.set_password('test1234')
            user.save()
            self.stdout.write(self.style.SUCCESS('테스트 계정 생성: test@example.com / test1234'))
        else:
            self.stdout.write('테스트 계정 이미 존재합니다.')
        return user

    def _create_project_at_stage(self, owner, stage, config, index):
        """주어진 상태까지의 모든 데이터를 포함하는 프로젝트를 생성합니다."""
        stage_idx = STAGE_ORDER.index(stage)

        project = Project.objects.create(
            owner=owner,
            title=f"[{STAGE_LABELS[stage]}] {config['title']}",
            client_name=config['client_name'],
            client_contact_email=config['client_contact_email'],
            client_contact_phone=config['client_contact_phone'],
            requirements_text=config['requirements_text'],
            existing_site_url=config.get('existing_site_url', ''),
            status=stage,
        )

        # 모든 프로젝트에 레퍼런스 사이트 추가
        ref_sites = self._create_reference_sites(project, index)

        # analyzing 이상이면 분석 데이터 생성
        if stage_idx >= STAGE_ORDER.index('analyzing'):
            self._create_site_analyses(project, ref_sites)
            analysis_status = 'processing'
            if stage_idx >= STAGE_ORDER.index('analysis_ready'):
                analysis_status = 'completed'
            if stage_idx >= STAGE_ORDER.index('analysis_confirmed'):
                analysis_status = 'confirmed'
            self._create_project_analysis(project, analysis_status)

        # questionnaire_ready 이상이면 설문 데이터 생성
        if stage_idx >= STAGE_ORDER.index('questionnaire_ready'):
            questionnaire = self._create_questionnaire(project)
            position_categories = self._create_position_categories(questionnaire)
            questions = self._create_questions(questionnaire, position_categories)

            # distributing 이상이면 직원 및 초대 데이터 생성
            if stage_idx >= STAGE_ORDER.index('distributing'):
                employees = self._create_employees(project, position_categories)
                invitations = self._create_invitations(project, employees, stage_idx)

                # collecting 이상이면 응답 데이터 생성
                if stage_idx >= STAGE_ORDER.index('collecting'):
                    self._create_responses(
                        project, owner, employees, invitations, questions,
                        all_completed=(stage_idx >= STAGE_ORDER.index('closed')),
                    )

            # aggregating 이상이면 취합 데이터 생성
            if stage_idx >= STAGE_ORDER.index('aggregating'):
                agg_status = 'processing'
                if stage_idx >= STAGE_ORDER.index('aggregation_ready'):
                    agg_status = 'completed'
                aggregation = self._create_aggregation(project, questions, agg_status)

                # brief_ready 이상이면 디자인 브리프 생성
                if stage_idx >= STAGE_ORDER.index('brief_ready'):
                    brief = self._create_design_brief(project, aggregation)

                    # completed면 Stitch 생성 데이터 추가
                    if stage_idx >= STAGE_ORDER.index('completed'):
                        self._create_stitch_generation(brief)

        return project

    def _create_reference_sites(self, project, index):
        sites = []
        # 2~4개 레퍼런스 사이트 할당
        start = index % len(REFERENCE_SITES)
        count = 2 + (index % 3)
        for i in range(count):
            ref = REFERENCE_SITES[(start + i) % len(REFERENCE_SITES)]
            site = ReferenceSite.objects.create(
                project=project,
                url=ref['url'],
                title=ref['title'],
                description=ref['description'],
                order=i,
                crawl_data={
                    'title': ref['title'],
                    'meta_description': ref['description'],
                    'headings': [f'{ref["title"]} - 메인 페이지'],
                    'text_content': f'{ref["title"]}의 웹사이트 크롤링 데이터입니다.',
                },
            )
            sites.append(site)
        return sites

    def _create_site_analyses(self, project, ref_sites):
        # 기존 사이트 분석
        if project.existing_site_url:
            SiteAnalysis.objects.create(
                project=project,
                is_existing_site=True,
                url=project.existing_site_url,
                crawl_text=f'{project.client_name} 기존 웹사이트의 크롤링 텍스트입니다.',
                ai_analysis={
                    'overall_score': 65,
                    'strengths': ['브랜드 인지도 높음', '풍부한 콘텐츠'],
                    'weaknesses': ['모바일 최적화 부족', '느린 로딩 속도', '구식 디자인'],
                    'ux_score': 60,
                    'design_score': 55,
                    'performance_score': 50,
                    'accessibility_score': 45,
                    'recommendations': [
                        '반응형 디자인 적용 필요',
                        '이미지 최적화로 로딩 속도 개선',
                        '네비게이션 구조 단순화',
                    ],
                },
            )

        # 레퍼런스 사이트 분석
        for ref_site in ref_sites:
            SiteAnalysis.objects.create(
                project=project,
                reference_site=ref_site,
                is_existing_site=False,
                url=ref_site.url,
                crawl_text=f'{ref_site.title} 레퍼런스 사이트의 크롤링 텍스트입니다.',
                ai_analysis={
                    'overall_score': 85,
                    'strengths': ['깔끔한 디자인', '직관적 UX', '빠른 로딩'],
                    'weaknesses': ['특정 브라우저 호환성 이슈'],
                    'design_patterns': ['미니멀리즘', '카드 레이아웃', '히어로 섹션'],
                    'color_palette': ['#000000', '#FFFFFF', '#0071E3'],
                    'typography': 'San Francisco / Pretendard',
                    'applicable_elements': [
                        '풀스크린 히어로 배너',
                        '그리드 기반 제품 갤러리',
                        '스크롤 기반 스토리텔링',
                    ],
                },
            )

    def _create_project_analysis(self, project, status):
        confirmed_at = timezone.now() if status == 'confirmed' else None
        ProjectAnalysis.objects.create(
            project=project,
            status=status,
            ai_provider='claude',
            requirements_summary=(
                f'{project.client_name}의 웹사이트 리뉴얼 프로젝트입니다. '
                '모바일 퍼스트 디자인, 사용자 경험 개선, 브랜드 이미지 강화가 핵심 목표입니다.'
            ),
            existing_site_analysis={
                'current_state': '기존 사이트는 데스크톱 중심 레이아웃으로 모바일 대응이 부족합니다.',
                'improvement_areas': ['반응형 디자인', '성능 최적화', '접근성 개선'],
                'content_audit': '콘텐츠는 풍부하나 구조화가 필요합니다.',
            },
            reference_sites_analysis={
                'common_patterns': ['미니멀 디자인', '대형 비주얼', '직관적 네비게이션'],
                'best_practices': ['모바일 퍼스트', '성능 최적화', '마이크로 인터랙션'],
                'applicable_insights': [
                    '풀스크린 히어로 섹션으로 브랜드 임팩트 극대화',
                    '카드 기반 UI로 콘텐츠 탐색 용이성 확보',
                    '스크롤 기반 스토리텔링으로 제품 특징 전달',
                ],
            },
            combined_insights={
                'design_direction': '프리미엄 미니멀리즘 + 대담한 타이포그래피',
                'key_features': ['반응형 레이아웃', '인터랙티브 제품 뷰어', '빠른 검색'],
                'technology_stack': ['Next.js', 'Tailwind CSS', 'Framer Motion'],
                'estimated_pages': 15,
                'priority_pages': ['메인', '제품 상세', '회사 소개', '고객 지원'],
            },
            confirmed_at=confirmed_at,
            raw_ai_response={'model': 'claude-3-sonnet', 'usage': {'input_tokens': 5000, 'output_tokens': 3000}},
        )

    def _create_questionnaire(self, project):
        return Questionnaire.objects.create(
            project=project,
            title=f'{project.client_name} 웹사이트 리뉴얼 인터뷰',
            description=f'{project.client_name} 웹사이트 리뉴얼을 위한 내부 인터뷰 설문입니다.',
            status='completed',
            ai_provider='claude',
        )

    def _create_position_categories(self, questionnaire):
        categories = {}
        for i, name in enumerate(POSITION_CATEGORIES_DATA):
            cat = PositionCategory.objects.create(
                questionnaire=questionnaire,
                name=name,
                order=i,
            )
            categories[name] = cat
        return categories

    def _create_questions(self, questionnaire, position_categories):
        questions = []
        for i, q_data in enumerate(QUESTIONS_DATA):
            question = Question.objects.create(
                questionnaire=questionnaire,
                text=q_data['text'],
                question_type=q_data['question_type'],
                importance=q_data['importance'],
                purpose=q_data.get('purpose', ''),
                order=i,
                options=q_data.get('options', []),
            )
            for cat_name in q_data.get('categories', []):
                if cat_name in position_categories:
                    question.position_categories.add(position_categories[cat_name])
            questions.append(question)
        return questions

    def _create_employees(self, project, position_categories):
        cat_map = {
            '대표이사': '경영진',
            '마케팅 팀장': '마케팅/기획',
            '디자인 팀장': '디자인',
            '개발 팀장': '개발',
            '기획자': '마케팅/기획',
            'UX 디자이너': '디자인',
            '프론트엔드 개발자': '개발',
            '콘텐츠 마케터': '마케팅/기획',
        }
        employees = []
        for emp_data in EMPLOYEES_DATA:
            cat_name = cat_map.get(emp_data['position'])
            pos_cat = position_categories.get(cat_name)
            emp = Employee.objects.create(
                project=project,
                name=emp_data['name'],
                email=emp_data['email'],
                position=emp_data['position'],
                department=emp_data.get('department', ''),
                position_category=pos_cat,
            )
            employees.append(emp)
        return employees

    def _create_invitations(self, project, employees, stage_idx):
        import random
        invitations = []
        now = timezone.now()
        for emp in employees:
            if stage_idx >= STAGE_ORDER.index('closed'):
                status = 'completed'
            elif stage_idx >= STAGE_ORDER.index('collecting'):
                status = random.choice(['sent', 'opened', 'completed'])
            else:
                status = 'sent'

            inv = SurveyInvitation.objects.create(
                employee=emp,
                project=project,
                password_hash=make_password('survey1234'),
                status=status,
                expires_at=now + timedelta(days=14),
                sent_at=now - timedelta(days=7),
                opened_at=now - timedelta(days=5) if status in ('opened', 'completed') else None,
                completed_at=now - timedelta(days=3) if status == 'completed' else None,
            )
            invitations.append(inv)
        return invitations

    def _create_responses(self, project, admin_user, employees, invitations, questions, all_completed=False):
        import random
        for emp, inv in zip(employees, invitations):
            if inv.status != 'completed' and not all_completed:
                continue

            response = SurveyResponse.objects.create(
                invitation=inv,
                project=project,
                employee=emp,
                completed_at=inv.completed_at or timezone.now(),
            )

            for question in questions:
                self._create_answer(response, question, random)

    def _create_answer(self, response, question, random):
        text_value = ''
        choice_values = []
        rating_value = None

        if question.question_type == 'textarea':
            samples = ANSWER_SAMPLES['textarea']
            text_value = random.choice(samples)
        elif question.question_type == 'text':
            samples = ANSWER_SAMPLES['text']
            text_value = random.choice(samples)
        elif question.question_type == 'single_choice':
            if question.options:
                choice_values = [random.choice(question.options)]
        elif question.question_type == 'multiple_choice':
            if question.options:
                count = random.randint(1, min(3, len(question.options)))
                choice_values = random.sample(question.options, count)
        elif question.question_type == 'rating':
            rating_value = random.randint(1, 5)
        elif question.question_type == 'ranking':
            if question.options:
                shuffled = list(question.options)
                random.shuffle(shuffled)
                choice_values = shuffled

        Answer.objects.create(
            response=response,
            question=question,
            text_value=text_value,
            choice_values=choice_values,
            rating_value=rating_value,
        )

    def _create_aggregation(self, project, questions, status):
        aggregation = Aggregation.objects.create(
            project=project,
            status=status,
            ai_provider='claude',
            version=1,
            summary=(
                f'{project.client_name} 웹사이트 리뉴얼에 대한 내부 인터뷰 결과, '
                '모바일 최적화, 사용자 경험 개선, 브랜드 이미지 강화가 '
                '가장 높은 우선순위로 나타났습니다.'
            ),
            company_direction=(
                '디지털 트랜스포메이션을 통한 글로벌 시장 확대와 '
                '프리미엄 브랜드 이미지 강화를 목표로 하고 있습니다.'
            ),
            desired_changes=[
                '모바일 퍼스트 디자인으로 전환',
                '직관적인 네비게이션 구조',
                '빠른 로딩 속도',
                '브랜드 아이덴티티 강화',
                '글로벌 다국어 지원',
            ],
            company_values=[
                '혁신', '신뢰', '고객 중심', '지속가능성',
            ],
            raw_ai_response={'model': 'claude-3-sonnet', 'usage': {'input_tokens': 8000, 'output_tokens': 4000}},
        )

        # 키워드 생성
        for i, kw in enumerate(KEYWORDS_DATA):
            ExtractedKeyword.objects.create(
                aggregation=aggregation,
                text=kw['text'],
                category=kw['category'],
                weight=kw['weight'],
                order=i,
            )

        # 핵심 문장 생성
        for i, sent in enumerate(SENTENCES_DATA):
            source_q = questions[i % len(questions)] if questions else None
            ExtractedSentence.objects.create(
                aggregation=aggregation,
                text=sent['text'],
                category=sent['category'],
                source_question=source_q,
                order=i,
            )

        return aggregation

    def _create_design_brief(self, project, aggregation):
        return DesignBrief.objects.create(
            project=project,
            aggregation=aggregation,
            title=f'{project.client_name} 웹사이트 디자인 브리프',
            summary=(
                f'{project.client_name}의 웹사이트 리뉴얼을 위한 디자인 브리프입니다. '
                '모바일 퍼스트, 프리미엄 미니멀리즘을 기본 방향으로 설정합니다.'
            ),
            target_audience='30-40대 전문직 종사자 및 기업 의사결정자',
            design_direction=(
                '프리미엄 미니멀리즘을 기반으로 대담한 타이포그래피와 '
                '여백을 활용한 세련된 디자인. '
                '브랜드 컬러를 효과적으로 활용하며, '
                '인터랙티브 요소로 몰입감을 높입니다.'
            ),
            key_requirements=[
                '반응형 디자인 (모바일 퍼스트)',
                '3초 이내 로딩 속도',
                '직관적 네비게이션',
                '접근성 WCAG 2.1 AA 준수',
                '다국어 지원 (한/영/중/일)',
            ],
            selected_keywords=['모바일 퍼스트', '프리미엄', '혁신', '미니멀', '사용자 경험'],
            selected_sentences=[
                '모바일 환경에서의 사용성이 가장 중요합니다.',
                '브랜드의 프리미엄 이미지를 디지털에서도 일관되게 전달해야 합니다.',
                '사용자가 원하는 정보에 3클릭 이내로 접근할 수 있어야 합니다.',
            ],
            tone_and_mood={
                'primary': '프리미엄/세련된',
                'secondary': '혁신적/미래지향적',
                'keywords': ['elegant', 'bold', 'innovative', 'trustworthy'],
            },
            color_preferences={
                'primary': '#0A1628',
                'secondary': '#0071E3',
                'accent': '#FF6B35',
                'background': '#FAFAFA',
                'text': '#1A1A1A',
            },
            design_md=(
                '# 디자인 브리프\n\n'
                '## 프로젝트 개요\n'
                f'{project.client_name} 웹사이트 전면 리뉴얼\n\n'
                '## 디자인 방향\n'
                '- 프리미엄 미니멀리즘\n'
                '- 대담한 타이포그래피\n'
                '- 모바일 퍼스트\n\n'
                '## 핵심 키워드\n'
                '모바일 퍼스트, 프리미엄, 혁신, 미니멀, 사용자 경험\n\n'
                '## 컬러 팔레트\n'
                '- Primary: #0A1628\n'
                '- Secondary: #0071E3\n'
                '- Accent: #FF6B35\n'
            ),
        )

    def _create_stitch_generation(self, brief):
        StitchGeneration.objects.create(
            design_brief=brief,
            prompt_text=f'{brief.title}에 대한 디자인을 생성합니다.',
            design_md_snapshot=brief.design_md,
            reference_images=[],
            stitch_project_id='stitch_dummy_001',
            stitch_project_url='https://stitch.example.com/project/dummy_001',
            generated_html_url='https://stitch.example.com/preview/dummy_001',
            generated_screenshot_url='',
            generated_html_content=(
                '<html><head><title>Generated Design</title></head>'
                '<body><h1>Generated Design Preview</h1></body></html>'
            ),
            version=1,
            status='completed',
        )
