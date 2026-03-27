from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.projects.models import Project
from apps.aggregation.models import Aggregation
from apps.design_brief.models import DesignBrief, StitchGeneration

User = get_user_model()


class DesignBriefModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='tester', email='t@t.com', password='testpass123',
        )
        self.project = Project.objects.create(
            owner=self.user,
            title='Test Project',
            client_name='Client',
            requirements_text='Build a website.',
        )
        self.aggregation = Aggregation.objects.create(
            project=self.project, version=1,
        )

    def test_create_design_brief(self):
        brief = DesignBrief.objects.create(
            project=self.project,
            aggregation=self.aggregation,
            title='Test Brief',
        )
        self.assertIn('Test Brief', str(brief))
        self.assertEqual(brief.project, self.project)

    def test_one_to_one_relationship(self):
        DesignBrief.objects.create(
            project=self.project,
            aggregation=self.aggregation,
            title='Test Brief',
        )
        self.assertIsNotNone(self.project.design_brief)

    def test_default_json_fields(self):
        brief = DesignBrief.objects.create(
            project=self.project,
            aggregation=self.aggregation,
            title='Test Brief',
        )
        self.assertEqual(brief.key_requirements, [])
        self.assertEqual(brief.selected_keywords, [])
        self.assertEqual(brief.selected_sentences, [])
        self.assertEqual(brief.tone_and_mood, {})
        self.assertEqual(brief.color_preferences, {})

    def test_aggregation_nullable(self):
        brief = DesignBrief.objects.create(
            project=self.project,
            aggregation=None,
            title='Brief without aggregation',
        )
        self.assertIsNone(brief.aggregation)


class StitchGenerationModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='tester', email='t@t.com', password='testpass123',
        )
        self.project = Project.objects.create(
            owner=self.user,
            title='Test Project',
            client_name='Client',
            requirements_text='Build a website.',
        )
        self.aggregation = Aggregation.objects.create(
            project=self.project, version=1,
        )
        self.brief = DesignBrief.objects.create(
            project=self.project,
            aggregation=self.aggregation,
            title='Test Brief',
        )

    def test_create_stitch_generation(self):
        gen = StitchGeneration.objects.create(
            design_brief=self.brief,
            prompt_text='Create a modern landing page.',
            version=1,
        )
        self.assertEqual(gen.status, StitchGeneration.Status.PENDING)
        self.assertIn('v1', str(gen))

    def test_ordering_by_version_desc(self):
        StitchGeneration.objects.create(
            design_brief=self.brief, prompt_text='v1', version=1,
        )
        StitchGeneration.objects.create(
            design_brief=self.brief, prompt_text='v2', version=2,
        )
        generations = list(self.brief.stitch_generations.all())
        self.assertEqual(generations[0].version, 2)
        self.assertEqual(generations[1].version, 1)

    def test_default_fields(self):
        gen = StitchGeneration.objects.create(
            design_brief=self.brief,
            prompt_text='Test prompt',
            version=1,
        )
        self.assertEqual(gen.reference_images, [])
        self.assertEqual(gen.stitch_project_id, '')
        self.assertEqual(gen.generated_html_url, '')
        self.assertEqual(gen.generated_screenshot_url, '')
        self.assertEqual(gen.generated_html_content, '')
