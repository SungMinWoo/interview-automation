import logging

import jwt
import requests
from django.conf import settings
from jwt.jwks_client import PyJWKClient

logger = logging.getLogger(__name__)


def exchange_code_for_token(code: str, code_verifier: str) -> dict:
    """
    Authorization Code + PKCE code_verifier로 SSO Provider에서 토큰 교환.
    ID Token의 JWKS 서명을 검증하고 user_info를 반환한다.
    """
    data = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': settings.OAUTH2_REDIRECT_CALLBACK_URI,
        'client_id': settings.OAUTH2_CLIENT_ID,
        'client_secret': settings.OAUTH2_CLIENT_SECRET,
        'scope': 'profile',
        'code_verifier': code_verifier,
    }

    response = requests.post(settings.OAUTH2_TOKEN_URL, data=data, timeout=10)
    response.raise_for_status()
    tokens = response.json()

    user_info = None
    if 'id_token' in tokens:
        id_token = tokens['id_token']
        try:
            oidc_config = requests.get(settings.OAUTH2_WELL_KNOWN_URL, timeout=10).json()
            jwks_uri = oidc_config['jwks_uri']
            issuer_url = oidc_config['issuer']

            jwks_client = PyJWKClient(jwks_uri)
            signing_key = jwks_client.get_signing_key_from_jwt(id_token)

            claims = jwt.decode(
                id_token,
                key=signing_key.key,
                algorithms=['RS256'],
                audience=settings.OAUTH2_CLIENT_ID,
                issuer=issuer_url,
            )
            user_info = claims.get('profile', claims)

        except jwt.ExpiredSignatureError:
            raise Exception('SSO 토큰이 만료되었습니다.')
        except jwt.InvalidAudienceError:
            raise Exception('SSO 토큰의 audience가 올바르지 않습니다.')
        except jwt.InvalidIssuerError:
            raise Exception('SSO 토큰의 issuer가 올바르지 않습니다.')
        except jwt.InvalidTokenError as e:
            raise Exception(f'잘못된 SSO 토큰입니다: {e}')
        except Exception as e:
            logger.error(f'SSO token validation failed: {e}')
            raise Exception('SSO 인증에 실패했습니다. 관리자에게 문의해주세요.')

    tokens['user_info'] = user_info
    return tokens
