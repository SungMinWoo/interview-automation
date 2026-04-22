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
from apps.projects.models import Project, ReferenceSite, ProjectDepartment, ProjectPosition, ProjectFile, ProjectActivity
from apps.analysis.models import SiteAnalysis, ProjectAnalysis
from apps.questionnaires.models import Questionnaire, QuestionSection, PositionCategory, Question
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

PROJECT_CONFIGS = [
    {
        'title': '산더미 전자 리뉴얼 프로젝트',
        'project_type': 'uxui',
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
        'departments': ['경영진', '마케팅', '디자인', '개발', '기획'],
        'positions': ['대표이사', '팀장', '실무자'],
    },
    {
        'title': '산더미 커머스 플랫폼',
        'project_type': 'uxui',
        'client_name': '산더미 커머스',
        'client_contact_email': 'biz@commerce.example.com',
        'client_contact_phone': '031-9876-5432',
        'requirements_text': (
            '메신저 기반 커머스 플랫폼의 웹 버전을 새로 구축합니다. '
            '자사 디자인 시스템과의 일관성, 빠른 상품 탐색, '
            '소셜 공유 기능 강화가 필요합니다.'
        ),
        'existing_site_url': 'https://commerce.example.com/',
        'departments': ['서비스기획', '프론트엔드', '백엔드', 'QA'],
        'positions': ['PM', '리드', '시니어', '주니어'],
    },
    {
        'title': '산더미 모터스 브랜드 리뉴얼',
        'project_type': 'bx',
        'client_name': '산더미 모터스',
        'client_contact_email': 'brand@motors.example.com',
        'client_contact_phone': '02-3456-7890',
        'requirements_text': (
            '산더미 모터스의 EV 전환에 맞춘 브랜드 아이덴티티 리뉴얼을 원합니다. '
            '기존 자동차 제조사 이미지에서 모빌리티 혁신 기업으로의 전환, '
            '젊은 세대를 타겟으로 한 브랜드 포지셔닝 재정립, '
            '브랜드 슬로건/톤앤매너/비주얼 아이덴티티 전면 재정비가 핵심입니다.'
        ),
        'existing_site_url': 'https://motors.example.com/',
        'departments': ['브랜드전략', '마케팅', '디자인', '커뮤니케이션'],
        'positions': ['임원', '팀장', '매니저', '사원'],
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
    {'name': '김철수', 'email': 'kim.cs@example.com', 'position': '대표이사', 'department': '경영진', 'phone': '010-1234-5678'},
    {'name': '이영희', 'email': 'lee.yh@example.com', 'position': '팀장', 'department': '마케팅', 'phone': '010-2345-6789'},
    {'name': '박지성', 'email': 'park.js@example.com', 'position': '팀장', 'department': '디자인', 'phone': '010-3456-7890'},
    {'name': '최수연', 'email': 'choi.sy@example.com', 'position': '팀장', 'department': '개발', 'phone': '010-4567-8901'},
    {'name': '정민호', 'email': 'jung.mh@example.com', 'position': '실무자', 'department': '기획', 'phone': '010-5678-9012'},
    {'name': '한소희', 'email': 'han.sh@example.com', 'position': '실무자', 'department': '디자인', 'phone': '010-6789-0123'},
    {'name': '오세훈', 'email': 'oh.sh@example.com', 'position': '실무자', 'department': '개발', 'phone': '010-7890-1234'},
    {'name': '강다현', 'email': 'kang.dh@example.com', 'position': '실무자', 'department': '마케팅', 'phone': '010-8901-2345'},
]

# 섹션 기반 질문 데이터
SECTIONS_DATA = [
    {
        'title': 'Project Overview',
        'description': '프로젝트 전반에 대한 이해를 위한 질문입니다.',
        'importance': 'high',
        'target_area': '공통',
        'questions': [
            {'text': '현재 웹사이트에서 가장 불편하다고 느끼는 점은 무엇인가요?', 'question_type': 'textarea', 'importance': 'required', 'sub_category': '현황 파악', 'purpose': '현재 사이트의 주요 문제점 파악'},
            {'text': '웹사이트의 주요 타겟 사용자층은 누구라고 생각하시나요?', 'question_type': 'single_choice', 'importance': 'required', 'sub_category': '타겟/고객', 'purpose': '타겟 사용자 정의', 'options': ['10-20대 젊은 층', '30-40대 직장인', '50대 이상', '기업 고객(B2B)', '글로벌 사용자']},
            {'text': '리뉴얼 후 가장 기대하는 변화는 무엇인가요?', 'question_type': 'textarea', 'importance': 'important', 'sub_category': '전략/로드맵', 'purpose': '기대 효과 파악'},
        ],
    },
    {
        'title': 'Service Image',
        'description': '서비스 이미지와 브랜드 인식에 대한 질문입니다.',
        'importance': 'high',
        'target_area': '공통',
        'questions': [
            {'text': '브랜드 이미지를 한 단어로 표현한다면?', 'question_type': 'text', 'importance': 'important', 'sub_category': '브랜드 인식', 'purpose': '브랜드 인식 조사'},
            {'text': '디자인 방향성에 대해 선호하는 스타일을 선택해주세요.', 'question_type': 'single_choice', 'importance': 'important', 'sub_category': '디자인 방향', 'purpose': '디자인 방향 설정', 'options': ['미니멀/모던', '화려하고 역동적', '전통적/클래식', '친근하고 따뜻한', '테크/미래지향적']},
        ],
    },
    {
        'title': 'UX/UI Design',
        'description': 'UX/UI 디자인 관련 세부 질문입니다.',
        'importance': 'medium',
        'target_area': '공통',
        'questions': [
            {'text': '새 웹사이트에서 가장 중요하게 생각하는 기능을 선택해주세요.', 'question_type': 'multiple_choice', 'importance': 'required', 'sub_category': '기능 우선순위', 'purpose': '핵심 기능 우선순위 파악', 'options': ['반응형 디자인', '빠른 로딩 속도', '검색 기능', '다국어 지원', '접근성', 'SEO 최적화']},
            {'text': '컬러 톤에 대한 선호도를 평가해주세요. (1: 차가운 톤 ~ 5: 따뜻한 톤)', 'question_type': 'rating', 'importance': 'optional', 'sub_category': '컬러', 'purpose': '컬러 방향 설정'},
            {'text': '아래 항목을 중요도 순으로 정렬해주세요.', 'question_type': 'ranking', 'importance': 'important', 'sub_category': '우선순위', 'purpose': '디자인 우선순위 결정', 'options': ['시각적 임팩트', '정보 전달력', '사용 편의성', '브랜드 일관성', '성능/속도']},
        ],
    },
]

# BX 프로젝트용 섹션/질문 데이터
BX_SECTIONS_DATA = [
    {
        'title': 'Brand Overview',
        'description': '현재 브랜드에 대한 인식과 현황을 파악합니다.',
        'importance': 'high',
        'target_area': '공통',
        'questions': [
            {'text': '현재 브랜드를 한 단어로 표현한다면 무엇인가요?', 'question_type': 'text', 'importance': 'required', 'sub_category': '브랜드 인식', 'purpose': '내부 브랜드 인식 현황 파악'},
            {'text': '우리 브랜드의 가장 큰 강점은 무엇이라고 생각하시나요?', 'question_type': 'textarea', 'importance': 'required', 'sub_category': '브랜드 가치', 'purpose': '브랜드 핵심 가치 도출'},
            {'text': '고객이 우리 브랜드를 선택하는 이유는 무엇이라고 생각하시나요?', 'question_type': 'textarea', 'importance': 'important', 'sub_category': '고객 가치', 'purpose': '고객 관점 브랜드 가치 파악'},
        ],
    },
    {
        'title': 'Brand Identity',
        'description': '원하는 브랜드 이미지와 퍼소나에 대한 질문입니다.',
        'importance': 'high',
        'target_area': '공통',
        'questions': [
            {'text': '브랜드가 사람이라면 어떤 성격을 가졌으면 하나요?', 'question_type': 'single_choice', 'importance': 'required', 'sub_category': '브랜드 퍼소나', 'purpose': '브랜드 퍼소나 정의', 'options': ['혁신적이고 도전적인', '신뢰감 있고 안정적인', '친근하고 따뜻한', '세련되고 프리미엄한', '역동적이고 에너지 넘치는']},
            {'text': '브랜드 톤앤매너는 어떤 방향이 적합하다고 생각하시나요?', 'question_type': 'textarea', 'importance': 'important', 'sub_category': '톤앤매너', 'purpose': '커뮤니케이션 톤 설정'},
        ],
    },
    {
        'title': 'Competitive Landscape',
        'description': '경쟁사 브랜드와의 비교 및 차별화 전략입니다.',
        'importance': 'medium',
        'target_area': '공통',
        'questions': [
            {'text': '가장 강력한 경쟁 브랜드는 어디이며, 그 이유는 무엇인가요?', 'question_type': 'textarea', 'importance': 'required', 'sub_category': '경쟁 분석', 'purpose': '경쟁 포지셔닝 파악'},
            {'text': '경쟁 브랜드 대비 우리 브랜드의 차별점은 무엇인가요?', 'question_type': 'textarea', 'importance': 'important', 'sub_category': '차별화', 'purpose': '차별화 포인트 도출'},
            {'text': '벤치마킹하고 싶은 브랜드가 있다면 어디인가요? (타 업종 포함)', 'question_type': 'textarea', 'importance': 'optional', 'sub_category': '벤치마킹', 'purpose': '브랜드 방향 레퍼런스 수집'},
        ],
    },
]

BX_ANSWER_SAMPLES = {
    'textarea': [
        'EV 전환 시대에 맞는 혁신적이고 미래지향적인 이미지가 필요합니다.',
        '기존 자동차 제조사 느낌에서 벗어나 모빌리티 혁신 기업으로 인식되었으면 합니다.',
        '젊은 세대에게 어필할 수 있는 대담하고 에너지 넘치는 브랜드가 되어야 합니다.',
        '테슬라처럼 기술 혁신의 아이콘으로 포지셔닝하고 싶습니다.',
        '환경에 대한 책임감과 지속가능성이 브랜드 핵심 가치가 되어야 합니다.',
        '글로벌 시장에서 프리미엄 이미지를 확보하는 것이 중요합니다.',
    ],
    'text': [
        '혁신', '미래', '전환', '프리미엄', '지속가능', '도전', '연결', '자유',
    ],
}

BX_KEYWORDS_DATA = [
    {'text': 'EV 혁신', 'category': 'identity', 'weight': 0.95, 'is_user_added': False},
    {'text': '모빌리티', 'category': 'positioning', 'weight': 0.92, 'is_user_added': False},
    {'text': '미래지향', 'category': 'personality', 'weight': 0.88, 'is_user_added': False},
    {'text': '프리미엄', 'category': 'value', 'weight': 0.85, 'is_user_added': False},
    {'text': '지속가능성', 'category': 'value', 'weight': 0.82, 'is_user_added': False},
    {'text': '대담한', 'category': 'personality', 'weight': 0.78, 'is_user_added': False},
    {'text': '글로벌', 'category': 'positioning', 'weight': 0.75, 'is_user_added': False},
    {'text': '친환경', 'category': 'identity', 'weight': 0.72, 'is_user_added': False},
    {'text': '젊은 감성', 'category': 'personality', 'weight': 0.68, 'is_user_added': True},
    {'text': '기술 리더십', 'category': 'positioning', 'weight': 0.65, 'is_user_added': True},
]

BX_SENTENCES_DATA = [
    {'text': '김철수 대표이사: \'EV 시대에 맞는 새로운 브랜드 아이덴티티가 필요합니다.\'', 'category': '브랜드 인식', 'is_user_added': False},
    {'text': '이영희 팀장: \'테슬라와 경쟁하려면 기술 혁신 이미지를 강화해야 합니다.\'', 'category': '경쟁 포지셔닝', 'is_user_added': False},
    {'text': '박지성 팀장: \'젊은 세대가 공감할 수 있는 대담한 브랜드 언어가 필요합니다.\'', 'category': '톤앤매너', 'is_user_added': False},
    {'text': '최수연 팀장: \'지속가능성을 브랜드 핵심 가치로 내세워야 합니다.\'', 'category': '브랜드 가치', 'is_user_added': False},
    {'text': '정민호 기획자: \'모빌리티 기업으로의 전환을 슬로건에 반영해야 합니다.\'', 'category': '브랜드 인식', 'is_user_added': False},
    {'text': '내부 논의: 기존 Heritage를 완전히 버리지 않되 미래 지향적 요소를 강조', 'category': '브랜드 가치', 'is_user_added': True},
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
}

KEYWORDS_DATA = [
    {'text': '모바일 퍼스트', 'category': 'feature', 'weight': 0.95, 'is_user_added': False},
    {'text': '사용자 경험', 'category': 'value', 'weight': 0.92, 'is_user_added': False},
    {'text': '프리미엄', 'category': 'tone', 'weight': 0.88, 'is_user_added': False},
    {'text': '혁신', 'category': 'value', 'weight': 0.85, 'is_user_added': False},
    {'text': '접근성', 'category': 'feature', 'weight': 0.80, 'is_user_added': False},
    {'text': '빠른 로딩', 'category': 'feature', 'weight': 0.78, 'is_user_added': False},
    {'text': '반응형', 'category': 'feature', 'weight': 0.75, 'is_user_added': False},
    {'text': '미니멀', 'category': 'tone', 'weight': 0.72, 'is_user_added': False},
    {'text': '글로벌', 'category': 'value', 'weight': 0.70, 'is_user_added': True},
    {'text': '신뢰', 'category': 'emotion', 'weight': 0.68, 'is_user_added': True},
    {'text': '고객 중심', 'category': 'value', 'weight': 0.65, 'is_user_added': True},
]

SENTENCES_DATA = [
    {'text': '김철수 대표이사: \'모바일 환경에서의 사용성이 가장 중요합니다.\'', 'category': 'UX', 'is_user_added': False},
    {'text': '이영희 팀장: \'브랜드의 프리미엄 이미지를 디지털에서도 일관되게 전달해야 합니다.\'', 'category': '브랜드', 'is_user_added': False},
    {'text': '박지성 팀장: \'사용자가 원하는 정보에 3클릭 이내로 접근할 수 있어야 합니다.\'', 'category': 'UX', 'is_user_added': False},
    {'text': '최수연 팀장: \'경쟁사 대비 차별화된 비주얼 아이덴티티가 필요합니다.\'', 'category': '디자인', 'is_user_added': False},
    {'text': '정민호 기획자: \'페이지 로딩 속도가 3초 이내여야 합니다.\'', 'category': '기술', 'is_user_added': False},
    {'text': '강다현 마케터: \'글로벌 시장을 고려한 다국어 지원이 필수입니다.\'', 'category': '비전', 'is_user_added': False},
    {'text': '담당자 메모: 경쟁사 대비 차별화 포인트로 접근성을 강조할 것', 'category': 'UX', 'is_user_added': True},
    {'text': '내부 논의: EV 중심 라인업 강조 필요', 'category': '비전', 'is_user_added': True},
]


class Command(BaseCommand):
    help = '프로젝트 상태별 더미데이터를 생성합니다.'

    def add_arguments(self, parser):
        parser.add_argument('--stage', type=str, choices=STAGE_ORDER, help='특정 프로젝트 상태만 생성')
        parser.add_argument('--admin-only', action='store_true', help='어드민 계정만 생성')
        parser.add_argument('--flush', action='store_true', help='기존 더미데이터 삭제 후 재생성')

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
            self.stdout.write(self.style.SUCCESS(f'  [{STAGE_LABELS[stage]}] {project.title} (id={project.id})'))

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
        QuestionSection.objects.all().delete()
        PositionCategory.objects.all().delete()
        Questionnaire.objects.all().delete()
        ProjectAnalysis.objects.all().delete()
        SiteAnalysis.objects.all().delete()
        ProjectActivity.objects.all().delete()
        ProjectFile.objects.all().delete()
        ProjectPosition.objects.all().delete()
        ProjectDepartment.objects.all().delete()
        ReferenceSite.objects.all().delete()
        Project.objects.all().delete()
        User.objects.filter(email__in=['admin@example.com', 'test@example.com']).delete()
        User.objects.filter(username__in=['admin', 'testuser']).delete()
        self.stdout.write(self.style.SUCCESS('삭제 완료'))

    def _create_admin(self):
        admin, created = User.objects.get_or_create(
            email='admin@example.com',
            defaults={'username': 'admin', 'first_name': '관리자', 'last_name': '', 'company_name': '산더미 컴퍼니', 'is_staff': True, 'is_superuser': True, 'is_active': True},
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
            defaults={'username': 'testuser', 'first_name': '테스트', 'last_name': '유저', 'company_name': '테스트 에이전시', 'is_staff': False, 'is_superuser': False, 'is_active': True},
        )
        if created:
            user.set_password('test1234')
            user.save()
            self.stdout.write(self.style.SUCCESS('테스트 계정 생성: test@example.com / test1234'))
        else:
            self.stdout.write('테스트 계정 이미 존재합니다.')
        return user

    def _create_project_at_stage(self, owner, stage, config, index):
        stage_idx = STAGE_ORDER.index(stage)
        now = timezone.now()

        # 작업자 풀 (더미: 여러 사람이 작업한 것처럼)
        actors = [
            {'user_id': 1, 'user_name': '관리자'},
            {'user_id': 2, 'user_name': '테스트'},
            {'user_id': 1, 'user_name': '관리자'},
        ]
        actor = actors[index % len(actors)]

        project = Project.objects.create(
            owner=owner,
            project_type=config.get('project_type', 'uxui'),
            title=f"[{STAGE_LABELS[stage]}] {config['title']}",
            client_name=config['client_name'],
            client_contact_email=config['client_contact_email'],
            client_contact_phone=config['client_contact_phone'],
            requirements_text=config['requirements_text'],
            existing_site_url=config.get('existing_site_url', ''),
            status=stage,
        )

        # 프로젝트 생성 활동 기록
        self._log(project, actor, 'project_created', now - timedelta(days=14), {'title': project.title, 'client_name': config['client_name']})

        # 부서/직급 구조 생성
        dept_objs = self._create_departments(project, config.get('departments', []))
        pos_objs = self._create_positions(project, config.get('positions', []))

        # 레퍼런스 사이트
        ref_sites = self._create_reference_sites(project, index)

        # analyzing 이상
        if stage_idx >= STAGE_ORDER.index('analyzing'):
            self._create_site_analyses(project, ref_sites)
            analysis_status = 'processing'
            if stage_idx >= STAGE_ORDER.index('analysis_ready'):
                analysis_status = 'completed'
            if stage_idx >= STAGE_ORDER.index('analysis_confirmed'):
                analysis_status = 'confirmed'
            self._create_project_analysis(project, analysis_status)
            self._log(project, actor, 'analysis_triggered', now - timedelta(days=10), {'ai_provider': 'claude'})
            if stage_idx >= STAGE_ORDER.index('analysis_confirmed'):
                self._log(project, actor, 'analysis_confirmed', now - timedelta(days=9))

        # questionnaire_ready 이상
        if stage_idx >= STAGE_ORDER.index('questionnaire_ready'):
            questionnaire = self._create_questionnaire(project)
            sections, questions = self._create_sections_and_questions(questionnaire, pos_objs, dept_objs)
            self._log(project, actor, 'questionnaire_generate_triggered', now - timedelta(days=8), {'ai_provider': 'claude', 'reference_count': 0})

            # distributing 이상이면 질문지 확정
            if stage_idx >= STAGE_ORDER.index('distributing'):
                questionnaire.status = 'confirmed'
                questionnaire.save(update_fields=['status'])
                self._log(project, actor, 'questionnaire_confirmed', now - timedelta(days=7))

                employees = self._create_employees(project, dept_objs, pos_objs)
                invitations = self._create_invitations(project, employees, stage_idx)
                self._log(project, actor, 'invitations_generated', now - timedelta(days=6), {'count': len(employees)})

                if stage_idx >= STAGE_ORDER.index('collecting'):
                    self._create_responses(project, owner, employees, invitations, questions, all_completed=(stage_idx >= STAGE_ORDER.index('closed')))

                if stage_idx >= STAGE_ORDER.index('closed'):
                    self._log(project, actor, 'collection_closed', now - timedelta(days=3))

            # aggregating 이상
            if stage_idx >= STAGE_ORDER.index('aggregating'):
                agg_status = 'processing'
                if stage_idx >= STAGE_ORDER.index('aggregation_ready'):
                    agg_status = 'completed'
                aggregation = self._create_aggregation(project, questions, agg_status)
                self._log(project, actor, 'aggregation_triggered', now - timedelta(days=2), {'ai_provider': 'claude'})

                if stage_idx >= STAGE_ORDER.index('brief_ready'):
                    brief = self._create_design_brief(project, aggregation)
                    if stage_idx >= STAGE_ORDER.index('completed'):
                        self._create_stitch_generation(brief)

        return project

    def _log(self, project, actor, action, timestamp, detail=None):
        activity = ProjectActivity.objects.create(
            project=project,
            user_id=actor['user_id'],
            user_name=actor['user_name'],
            action=action,
            detail=detail or {},
        )
        # Override auto_now_add
        ProjectActivity.objects.filter(pk=activity.pk).update(created_at=timestamp)

    def _create_departments(self, project, dept_names):
        objs = {}
        for i, name in enumerate(dept_names):
            objs[name] = ProjectDepartment.objects.create(project=project, name=name, order=i)
        return objs

    def _create_positions(self, project, pos_names):
        objs = {}
        for i, name in enumerate(pos_names):
            weight = round(max(1.0, (len(pos_names) - i) * 0.5 + 0.5), 1)
            objs[name] = ProjectPosition.objects.create(project=project, name=name, weight=weight, order=i)
        return objs

    def _create_reference_sites(self, project, index):
        sites = []
        start = index % len(REFERENCE_SITES)
        count = 2 + (index % 3)
        for i in range(count):
            ref = REFERENCE_SITES[(start + i) % len(REFERENCE_SITES)]
            site = ReferenceSite.objects.create(
                project=project, url=ref['url'], title=ref['title'], description=ref['description'], order=i,
                crawl_data={'title': ref['title'], 'meta_description': ref['description'], 'text_content': f'{ref["title"]}의 웹사이트 크롤링 데이터입니다.'},
            )
            sites.append(site)
        return sites

    def _create_site_analyses(self, project, ref_sites):
        if project.existing_site_url:
            SiteAnalysis.objects.create(
                project=project, is_existing_site=True, url=project.existing_site_url,
                crawl_text=f'{project.client_name} 기존 웹사이트의 크롤링 텍스트입니다.',
                ai_analysis={'layout': '데스크톱 중심', 'navigation': '복잡한 메가 메뉴', 'strengths': ['브랜드 인지도', '풍부한 콘텐츠'], 'weaknesses': ['모바일 최적화 부족', '느린 로딩']},
            )
        for ref_site in ref_sites:
            SiteAnalysis.objects.create(
                project=project, reference_site=ref_site, url=ref_site.url,
                crawl_text=f'{ref_site.title} 레퍼런스 사이트의 크롤링 텍스트입니다.',
                ai_analysis={'layout': '미니멀', 'strengths': ['깔끔한 디자인', '빠른 로딩'], 'design_patterns': ['미니멀리즘', '카드 레이아웃']},
            )

    def _create_project_analysis(self, project, status):
        confirmed_at = timezone.now() if status == 'confirmed' else None
        is_bx = project.project_type == 'bx'
        if is_bx:
            req_summary = f'{project.client_name}의 브랜드 아이덴티티 리뉴얼 프로젝트입니다. EV 전환에 맞는 브랜드 포지셔닝, 젊은 세대 타겟팅, 지속가능성 가치 반영이 핵심 목표입니다.'
        else:
            req_summary = f'{project.client_name}의 웹사이트 리뉴얼 프로젝트입니다. 모바일 퍼스트 디자인, 사용자 경험 개선, 브랜드 이미지 강화가 핵심 목표입니다.'
        ProjectAnalysis.objects.create(
            project=project, status=status, ai_provider='claude',
            requirements_summary=req_summary,
            existing_site_analysis={'layout': '데스크톱 중심 레이아웃', 'navigation': '복잡한 메가 메뉴 구조', 'color_scheme': '브랜드 블루 + 화이트', 'typography': '고딕 계열', 'strengths': ['브랜드 인지도 높음', '풍부한 콘텐츠'], 'weaknesses': ['모바일 최적화 부족', '느린 로딩 속도', '구식 디자인']},
            reference_sites_analysis=[
                {'url': 'https://www.apple.com/', 'layout': '풀스크린 히어로 + 그리드', 'standout_features': ['미니멀 디자인', '제품 중심 UI'], 'design_patterns': ['히어로 섹션', '카드 레이아웃'], 'relevant_to_requirements': '모바일 퍼스트, 프리미엄 이미지에 적합'},
                {'url': 'https://www.tesla.com/', 'layout': '풀스크린 비주얼 중심', 'standout_features': ['임팩트 있는 비주얼', '직관적 구매 플로우'], 'design_patterns': ['스크롤 스토리텔링'], 'relevant_to_requirements': 'EV 브랜드 참고'},
            ],
            combined_insights={'recommended_direction': '프리미엄 미니멀리즘 + 대담한 타이포그래피', 'key_patterns_to_adopt': ['풀스크린 히어로', '카드 기반 UI', '스크롤 스토리텔링'], 'gaps_to_address': ['모바일 네비게이션 재설계', '로딩 속도 최적화'], 'risk_areas': ['다국어 지원 복잡도', '레거시 시스템 연동']},
            confirmed_at=confirmed_at,
            raw_ai_response={'model': 'claude-sonnet-4', 'usage': {'input_tokens': 5000, 'output_tokens': 3000}},
        )

    def _create_questionnaire(self, project):
        is_bx = project.project_type == 'bx'
        return Questionnaire.objects.create(
            project=project,
            title=f'{project.client_name} {"브랜드 전략" if is_bx else "웹사이트 리뉴얼"} 인터뷰',
            description=f'{project.client_name} {"브랜드 리뉴얼" if is_bx else "웹사이트 리뉴얼"}을 위한 내부 인터뷰 설문입니다.',
            status='completed',
            ai_provider='claude',
        )

    def _create_sections_and_questions(self, questionnaire, pos_objs, dept_objs):
        sections = []
        questions = []
        q_order = 0
        sections_data = BX_SECTIONS_DATA if questionnaire.project.project_type == 'bx' else SECTIONS_DATA
        for s_idx, s_data in enumerate(sections_data):
            section = QuestionSection.objects.create(
                questionnaire=questionnaire,
                title=s_data['title'],
                description=s_data['description'],
                importance=s_data['importance'],
                target_area=s_data['target_area'],
                order=s_idx,
            )
            sections.append(section)

            for q_data in s_data['questions']:
                question = Question.objects.create(
                    questionnaire=questionnaire,
                    section=section,
                    text=q_data['text'],
                    question_type=q_data['question_type'],
                    importance=q_data['importance'],
                    sub_category=q_data.get('sub_category', ''),
                    purpose=q_data.get('purpose', ''),
                    order=q_order,
                    options=q_data.get('options', []),
                )
                questions.append(question)
                q_order += 1

        return sections, questions

    def _create_employees(self, project, dept_objs, pos_objs):
        employees = []
        for emp_data in EMPLOYEES_DATA:
            emp = Employee.objects.create(
                project=project,
                name=emp_data['name'],
                email=emp_data['email'],
                position=emp_data['position'],
                department=emp_data.get('department', ''),
                phone=emp_data.get('phone', ''),
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
                employee=emp, project=project, password_hash=make_password(emp.phone[-4:] if len(emp.phone) >= 4 else '1234'),
                status=status, expires_at=now + timedelta(days=14), sent_at=now - timedelta(days=7),
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
                invitation=inv, project=project, employee=emp, completed_at=inv.completed_at or timezone.now(),
            )
            for question in questions:
                self._create_answer(response, question, random)

    def _create_answer(self, response, question, random):
        text_value, choice_values, rating_value = '', [], None
        is_bx = response.project.project_type == 'bx'
        samples = BX_ANSWER_SAMPLES if is_bx else ANSWER_SAMPLES

        if question.question_type == 'textarea':
            text_value = random.choice(samples['textarea'])
        elif question.question_type == 'text':
            text_value = random.choice(samples['text'])
        elif question.question_type == 'single_choice' and question.options:
            choice_values = [random.choice(question.options)]
        elif question.question_type == 'multiple_choice' and question.options:
            choice_values = random.sample(question.options, random.randint(1, min(3, len(question.options))))
        elif question.question_type == 'rating':
            rating_value = random.randint(1, 5)
        elif question.question_type == 'ranking' and question.options:
            shuffled = list(question.options)
            random.shuffle(shuffled)
            choice_values = shuffled

        Answer.objects.create(response=response, question=question, text_value=text_value, choice_values=choice_values, rating_value=rating_value)

    def _create_aggregation(self, project, questions, status):
        is_bx = project.project_type == 'bx'
        if is_bx:
            return self._create_bx_aggregation(project, questions, status)
        return self._create_uxui_aggregation(project, questions, status)

    def _create_bx_aggregation(self, project, questions, status):
        aggregation = Aggregation.objects.create(
            project=project, status=status, ai_provider='claude', version=1,
            summary=f'{project.client_name} 브랜드 리뉴얼에 대한 내부 인터뷰 결과, EV 전환에 맞는 혁신적 브랜드 아이덴티티 구축, 젊은 세대 타겟 포지셔닝, 지속가능성 가치 강화가 핵심 방향으로 도출되었습니다.',
            section_summaries=[
                {
                    'section_title': 'Brand Overview',
                    'summary': '현재 브랜드는 \'신뢰\'와 \'안정\'으로 인식되나, EV 시대에 맞는 \'혁신\'과 \'미래\' 이미지로 전환이 필요하다는 공감대가 형성됨.',
                    'key_quotes': ['김철수 대표: \'EV 시대에 맞는 새로운 브랜드 아이덴티티가 필요\'', '정민호 기획자: \'모빌리티 기업으로의 전환을 슬로건에 반영해야\''],
                    'question_summaries': [
                        {'question': '현재 브랜드를 한 단어로 표현한다면 무엇인가요?', 'summary': '\'신뢰\', \'안정\', \'전통\' 등 보수적 이미지가 다수. 일부에서 \'혁신\' 언급.', 'key_points': ['신뢰/안정 - 경영진에서 주로 언급', '혁신/도전 - 마케팅/디자인팀에서 선호', '현재 이미지와 희망 이미지 간 갭 존재']},
                        {'question': '우리 브랜드의 가장 큰 강점은 무엇이라고 생각하시나요?', 'summary': '오랜 역사와 기술력이 공통 강점. EV 기술 투자를 새로운 강점으로 인식.', 'key_points': ['기술력과 품질에 대한 신뢰', 'EV 전환 투자에 대한 기대감', '글로벌 브랜드 인지도']},
                    ],
                },
                {
                    'section_title': 'Brand Identity',
                    'summary': '\'혁신적이고 도전적인\' 퍼소나와 \'대담하면서도 세련된\' 톤앤매너에 대한 선호가 높음.',
                    'key_quotes': ['박지성 팀장: \'젊은 세대가 공감할 수 있는 대담한 브랜드 언어가 필요\''],
                    'question_summaries': [
                        {'question': '브랜드가 사람이라면 어떤 성격을 가졌으면 하나요?', 'summary': '\'혁신적이고 도전적인\' 45%, \'세련되고 프리미엄한\' 30%.', 'key_points': ['혁신/도전 - 전 직군 과반', '프리미엄 - 경영진 선호', '친근함보다 전문성 중시']},
                        {'question': '브랜드 톤앤매너는 어떤 방향이 적합하다고 생각하시나요?', 'summary': '대담하고 자신감 있는 톤, 미래지향적 언어 사용에 공감.', 'key_points': ['대담하고 자신감 있는 표현', '기술적 전문성을 쉽게 전달', '환경/지속가능성 메시지 통합']},
                    ],
                },
                {
                    'section_title': 'Competitive Landscape',
                    'summary': '테슬라가 가장 강력한 경쟁자로 인식. 기술 혁신 이미지에서의 차별화가 핵심 과제.',
                    'key_quotes': ['이영희 팀장: \'테슬라와 경쟁하려면 기술 혁신 이미지를 강화해야\'', '최수연 팀장: \'지속가능성을 브랜드 핵심 가치로 내세워야\''],
                    'question_summaries': [
                        {'question': '가장 강력한 경쟁 브랜드는 어디이며, 그 이유는 무엇인가요?', 'summary': '테슬라가 1순위 경쟁자. 기술 혁신 이미지와 팬덤 문화에서 차이.', 'key_points': ['테슬라 - 기술 혁신/브랜드 팬덤', 'BMW - 프리미엄 포지셔닝', '중국 EV - 가격 경쟁력']},
                        {'question': '경쟁 브랜드 대비 우리 브랜드의 차별점은 무엇인가요?', 'summary': '제조 품질/신뢰도에서 우위, 소프트웨어/감성 브랜딩에서 열위.', 'key_points': ['강점: 품질, 글로벌 네트워크, AS', '약점: 소프트웨어 이미지, 젊은 감성 부족']},
                    ],
                },
            ],
            company_direction='EV 중심 모빌리티 혁신 기업으로의 브랜드 전환. 기존 제조 신뢰를 기반으로 미래지향적/지속가능한 브랜드 이미지를 구축합니다.',
            desired_changes=[
                {'category': '브랜드 전략', 'items': ['EV 중심 포지셔닝 재정립', '모빌리티 혁신 기업으로의 내러티브 전환']},
                {'category': '브랜드 커뮤니케이션', 'items': ['대담하고 미래지향적 톤앤매너', '젊은 세대 타겟 언어 개발']},
                {'category': '비주얼 아이덴티티', 'items': ['로고/심볼 현대화', 'EV 감성 컬러 팔레트']},
                {'category': '브랜드 경험', 'items': ['디지털 터치포인트 통합', '지속가능성 가치 체험 설계']},
            ],
            company_values=['혁신', '지속가능성', '고객 중심', '기술 리더십'],
            raw_ai_response={'model': 'claude-sonnet-4'},
        )

        for i, kw in enumerate(BX_KEYWORDS_DATA):
            ExtractedKeyword.objects.create(aggregation=aggregation, text=kw['text'], category=kw['category'], weight=kw['weight'], is_user_added=kw.get('is_user_added', False), order=i)
        for i, sent in enumerate(BX_SENTENCES_DATA):
            source_q = questions[i % len(questions)] if questions and not sent.get('is_user_added') else None
            ExtractedSentence.objects.create(aggregation=aggregation, text=sent['text'], category=sent['category'], source_question=source_q, is_user_added=sent.get('is_user_added', False), order=i)

        return aggregation

    def _create_uxui_aggregation(self, project, questions, status):
        aggregation = Aggregation.objects.create(
            project=project, status=status, ai_provider='claude', version=1,
            summary=f'{project.client_name} 웹사이트 리뉴얼에 대한 내부 인터뷰 결과, 모바일 최적화, 사용자 경험 개선, 브랜드 이미지 강화가 가장 높은 우선순위로 나타났습니다.',
            section_summaries=[
                {
                    'section_title': 'Project Overview',
                    'summary': '전반적으로 현재 사이트의 모바일 대응 부족과 네비게이션 복잡도가 주요 문제로 지적됨.',
                    'key_quotes': ['김철수 대표: \'모바일 사용성이 최우선\'', '정민호 기획자: \'검색 기능 부족\''],
                    'question_summaries': [
                        {'question': '현재 웹사이트에서 가장 불편하다고 느끼는 점은 무엇인가요?', 'summary': '네비게이션 복잡도, 모바일 최적화 부족, 느린 로딩 속도가 공통적으로 지적됨.', 'key_points': ['네비게이션이 복잡하여 원하는 정보 탐색이 어려움', '모바일 환경에서의 사용성 저하', '페이지 로딩 속도 개선 필요']},
                        {'question': '웹사이트의 주요 타겟 사용자층은 누구라고 생각하시나요?', 'summary': '30-40대 직장인과 기업 고객(B2B)이 주요 타겟으로 인식됨.', 'key_points': ['30-40대 직장인 의견이 과반수', 'B2B 고객 비중도 상당', '글로벌 사용자 고려 필요']},
                        {'question': '리뉴얼 후 가장 기대하는 변화는 무엇인가요?', 'summary': '모바일 친화적 디자인과 빠른 정보 접근성이 가장 높은 기대치.', 'key_points': ['모바일 퍼스트 디자인 전환', '검색 및 필터 기능 강화', '브랜드 이미지와 일관된 디지털 경험']},
                    ],
                },
                {
                    'section_title': 'Service Image',
                    'summary': '프리미엄/혁신적 이미지를 원하며, 미니멀 모던 스타일에 대한 선호가 높음.',
                    'key_quotes': ['이영희 팀장: \'브랜드 프리미엄 이미지 일관성\''],
                    'question_summaries': [
                        {'question': '브랜드 이미지를 한 단어로 표현한다면?', 'summary': '\'혁신\', \'프리미엄\', \'신뢰\'가 가장 많이 언급됨.', 'key_points': ['혁신 - 경영진/기획 직군에서 주로 선택', '프리미엄 - 디자인/마케팅 직군에서 선호', '신뢰 - 전 직군에서 고르게 언급']},
                        {'question': '디자인 방향성에 대해 선호하는 스타일을 선택해주세요.', 'summary': '미니멀/모던 스타일이 압도적 선호, 테크/미래지향적이 차순위.', 'key_points': ['미니멀/모던 62.5%', '테크/미래지향적 25%', '화려하고 역동적 12.5%']},
                    ],
                },
                {
                    'section_title': 'UX/UI Design',
                    'summary': '반응형 디자인, 빠른 로딩, 접근성이 기능적 핵심 요구사항. 사용 편의성 > 시각적 임팩트 우선순위.',
                    'key_quotes': ['박지성 팀장: \'3클릭 내 접근\'', '최수연 팀장: \'3초 이내 로딩\''],
                    'question_summaries': [
                        {'question': '새 웹사이트에서 가장 중요하게 생각하는 기능을 선택해주세요.', 'summary': '반응형 디자인과 빠른 로딩 속도가 1, 2위를 차지함.', 'key_points': ['반응형 디자인 - 전원 선택', '빠른 로딩 속도 - 87.5% 선택', '접근성과 SEO 최적화도 과반수 선택']},
                        {'question': '컬러 톤에 대한 선호도를 평가해주세요.', 'summary': '평균 2.8점으로 약간 차가운 톤 선호. 프리미엄 이미지와 부합.', 'key_points': ['차가운 톤 선호 경향 (평균 2.8/5)', '디자인팀은 중립 톤 선호', '경영진은 차가운 톤 강하게 선호']},
                        {'question': '아래 항목을 중요도 순으로 정렬해주세요.', 'summary': '사용 편의성이 1순위, 정보 전달력과 브랜드 일관성이 그 뒤를 이음.', 'key_points': ['1순위: 사용 편의성', '2순위: 정보 전달력', '3순위: 브랜드 일관성']},
                    ],
                },
            ],
            company_direction='디지털 트랜스포메이션을 통한 글로벌 시장 확대와 프리미엄 브랜드 이미지 강화를 목표로 하고 있습니다.',
            desired_changes=[
                {'category': 'UX', 'items': ['직관적인 네비게이션 구조', '3클릭 내 정보 접근']},
                {'category': '디자인', 'items': ['프리미엄 미니멀리즘', '브랜드 아이덴티티 강화']},
                {'category': '기술', 'items': ['모바일 퍼스트 반응형', '3초 이내 로딩 속도']},
                {'category': '비즈니스', 'items': ['글로벌 다국어 지원', 'SEO 최적화']},
            ],
            company_values=['혁신', '신뢰', '고객 중심', '지속가능성'],
            raw_ai_response={'model': 'claude-sonnet-4'},
        )

        for i, kw in enumerate(KEYWORDS_DATA):
            ExtractedKeyword.objects.create(aggregation=aggregation, text=kw['text'], category=kw['category'], weight=kw['weight'], is_user_added=kw.get('is_user_added', False), order=i)
        for i, sent in enumerate(SENTENCES_DATA):
            source_q = questions[i % len(questions)] if questions and not sent.get('is_user_added') else None
            ExtractedSentence.objects.create(aggregation=aggregation, text=sent['text'], category=sent['category'], source_question=source_q, is_user_added=sent.get('is_user_added', False), order=i)

        return aggregation

    def _create_design_brief(self, project, aggregation):
        is_bx = project.project_type == 'bx'
        if is_bx:
            return DesignBrief.objects.create(
                project=project, aggregation=aggregation,
                title=f'{project.client_name} 브랜드 전략 브리프',
                summary=f'{project.client_name}의 브랜드 리뉴얼을 위한 전략 브리프입니다. EV 혁신 기업 포지셔닝, 대담한 톤앤매너, 지속가능성 가치를 기본 방향으로 설정합니다.',
                target_audience='20-40대 EV 관심 소비자 및 글로벌 오피니언 리더',
                design_direction='대담하고 미래지향적인 브랜드 아이덴티티. 기존 Heritage를 존중하되 혁신적 전환을 시각적으로 표현.',
                key_requirements=['브랜드 포지셔닝 재정립', '슬로건/태그라인 개발', '비주얼 아이덴티티 시스템', '브랜드 가이드라인', '디지털 터치포인트 통합'],
                selected_keywords=['EV 혁신', '모빌리티', '미래지향', '프리미엄', '지속가능성'],
                selected_sentences=['김철수 대표: \'EV 시대에 맞는 새로운 브랜드 아이덴티티가 필요합니다.\'', '이영희 팀장: \'테슬라와 경쟁하려면 기술 혁신 이미지를 강화해야 합니다.\''],
                tone_and_mood={'primary': '대담한/혁신적', 'secondary': '미래지향적/지속가능한', 'keywords': ['bold', 'innovative', 'sustainable', 'premium']},
                color_preferences={'primary': '#002C5F', 'secondary': '#00AAD2', 'accent': '#E63312', 'background': '#F8F9FA'},
                design_md=f'# {project.client_name} Brand Strategy Brief\n\n## Brand Essence\nMobility Innovation for Sustainable Future\n\n## Brand Personality\nBold / Innovative / Trustworthy\n\n## Color Palette\n- Primary: #002C5F (Heritage Blue)\n- Secondary: #00AAD2 (Electric Blue)\n- Accent: #E63312 (Energy Red)\n\n## Tone of Voice\nConfident, Forward-looking, Human\n\n## Key Principles\n- Heritage meets Innovation\n- Sustainability First\n- Human-centered Technology\n',
            )
        return DesignBrief.objects.create(
            project=project, aggregation=aggregation,
            title=f'{project.client_name} 웹사이트 디자인 브리프',
            summary=f'{project.client_name}의 웹사이트 리뉴얼을 위한 디자인 브리프입니다. 모바일 퍼스트, 프리미엄 미니멀리즘을 기본 방향으로 설정합니다.',
            target_audience='30-40대 전문직 종사자 및 기업 의사결정자',
            design_direction='프리미엄 미니멀리즘을 기반으로 대담한 타이포그래피와 여백을 활용한 세련된 디자인.',
            key_requirements=['반응형 디자인 (모바일 퍼스트)', '3초 이내 로딩 속도', '직관적 네비게이션', '접근성 WCAG 2.1 AA 준수', '다국어 지원 (한/영/중/일)'],
            selected_keywords=['모바일 퍼스트', '프리미엄', '혁신', '미니멀', '사용자 경험'],
            selected_sentences=['김철수 대표: \'모바일 환경에서의 사용성이 가장 중요합니다.\'', '이영희 팀장: \'브랜드의 프리미엄 이미지를 디지털에서도 일관되게 전달해야 합니다.\''],
            tone_and_mood={'primary': '프리미엄/세련된', 'secondary': '혁신적/미래지향적', 'keywords': ['elegant', 'bold', 'innovative']},
            color_preferences={'primary': '#0A1628', 'secondary': '#0071E3', 'accent': '#FF6B35', 'background': '#FAFAFA'},
            design_md=f'# {project.client_name} Design Brief\n\n## Visual Theme\nPremium Minimalism\n\n## Color Palette\n- Primary: #0A1628\n- Secondary: #0071E3\n- Accent: #FF6B35\n\n## Typography\nPretendard / Inter\n\n## Key Principles\n- Mobile First\n- 3-Click Rule\n- Sub-3s Loading\n',
        )

    def _create_stitch_generation(self, brief):
        StitchGeneration.objects.create(
            design_brief=brief, status='completed',
            design_md_snapshot=brief.design_md or '',
            stitch_project_id='stitch-demo-001',
            stitch_project_url='https://stitch.withgoogle.com/projects/demo-001',
            generated_html_content='<div style="padding:40px;font-family:sans-serif"><h1>Demo Home</h1><p>Generated by Stitch</p></div>',
        )
