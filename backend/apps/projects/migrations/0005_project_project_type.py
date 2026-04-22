from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0004_add_projectactivity'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='project_type',
            field=models.CharField(choices=[('uxui', 'UX/UI'), ('bx', 'BX')], default='uxui', max_length=10),
        ),
    ]
