"""
이메일 발송 테스트 스크립트.

사용법 (docker 환경):
    docker compose exec backend python test_email.py recipient@example.com

사용법 (로컬):
    cd backend && python test_email.py recipient@example.com

옵션:
    --html      HTML 메일도 같이 보냄
    --settings  Django settings 모듈 지정 (기본: config.settings.development)
"""
import argparse
import os
import sys
import django


def main():
    parser = argparse.ArgumentParser(description="Django 이메일 발송 테스트")
    parser.add_argument("recipient", help="수신자 이메일 주소")
    parser.add_argument("--html", action="store_true", help="HTML 본문도 함께 발송")
    parser.add_argument(
        "--settings",
        default=os.environ.get("DJANGO_SETTINGS_MODULE", "config.settings.development"),
        help="Django settings 모듈",
    )
    args = parser.parse_args()

    os.environ["DJANGO_SETTINGS_MODULE"] = args.settings
    django.setup()

    from django.conf import settings
    from django.core.mail import EmailMultiAlternatives, get_connection

    print("=" * 60)
    print("이메일 설정 확인")
    print("=" * 60)
    print(f"EMAIL_BACKEND      : {settings.EMAIL_BACKEND}")
    print(f"EMAIL_HOST         : {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT         : {settings.EMAIL_PORT}")
    print(f"EMAIL_USE_TLS      : {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_HOST_USER    : {settings.EMAIL_HOST_USER}")
    print(f"EMAIL_HOST_PASSWORD: {'(설정됨)' if settings.EMAIL_HOST_PASSWORD else '(비어있음)'}")
    print(f"DEFAULT_FROM_EMAIL : {settings.DEFAULT_FROM_EMAIL}")
    print(f"수신자             : {args.recipient}")
    print("=" * 60)

    if "console" in settings.EMAIL_BACKEND:
        print("⚠️  EMAIL_BACKEND이 console로 설정되어 있어 콘솔에만 출력됩니다.")
        print("    실제 발송하려면 .env에서 EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend 로 변경하세요.\n")

    print("\n[1/2] SMTP 서버 연결 테스트...")
    try:
        connection = get_connection()
        connection.open()
        print(f"    ✅ {settings.EMAIL_HOST}:{settings.EMAIL_PORT} 연결 성공")
        connection.close()
    except Exception as e:
        print(f"    ❌ 연결 실패: {type(e).__name__}: {e}")
        sys.exit(1)

    print("\n[2/2] 테스트 메일 발송 중...")
    subject = "[Interview Site] 이메일 발송 테스트"
    text_body = (
        "이 메일은 Django 이메일 설정 검증용 테스트 메일입니다.\n"
        "이 메일이 정상적으로 도착했다면 SMTP 설정이 올바르게 동작하고 있습니다."
    )

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[args.recipient],
        )
        if args.html:
            html_body = (
                "<h2>이메일 발송 테스트</h2>"
                "<p>이 메일은 <b>Django 이메일 설정 검증용</b> 테스트 메일입니다.</p>"
                "<p>이 메일이 정상적으로 도착했다면 SMTP 설정이 올바르게 동작하고 있습니다.</p>"
            )
            msg.attach_alternative(html_body, "text/html")

        sent = msg.send(fail_silently=False)
        if sent:
            print(f"    ✅ 발송 성공 ({sent}건)")
            print(f"\n수신자({args.recipient}) 메일함을 확인하세요.")
        else:
            print("    ⚠️  send()가 0을 반환했습니다. 메일이 전송되지 않았을 수 있습니다.")
            sys.exit(1)
    except Exception as e:
        print(f"    ❌ 발송 실패: {type(e).__name__}: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
