from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('distribution', '0002_alter_employee_phone'),
    ]

    operations = [
        migrations.AddField(
            model_name='surveyinvitation',
            name='password_plain',
            field=models.CharField(blank=True, default='', max_length=20),
            preserve_default=False,
        ),
    ]
