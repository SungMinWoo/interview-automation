"""Factory for AI clients. Returns GeminiClient or ClaudeClient based on provider string."""

from django.conf import settings

AI_PROVIDER_GEMINI = 'gemini'
AI_PROVIDER_CLAUDE = 'claude'
AI_PROVIDERS = (AI_PROVIDER_CLAUDE, AI_PROVIDER_GEMINI)


def get_ai_client(provider: str | None = None):
    """Return an AI client instance for the given provider.

    Args:
        provider: 'claude' or 'gemini'. Falls back to settings.DEFAULT_AI_PROVIDER.

    Returns:
        ClaudeClient or GeminiClient instance.
    """
    provider = (provider or getattr(settings, 'DEFAULT_AI_PROVIDER', AI_PROVIDER_CLAUDE)).lower()

    if provider == AI_PROVIDER_GEMINI:
        from services.gemini_client import GeminiClient
        return GeminiClient()

    # default to claude
    from services.claude_client import ClaudeClient
    return ClaudeClient()


def validate_ai_provider(provider: str | None) -> str:
    """Validate and return a normalised provider string."""
    if provider is None:
        return getattr(settings, 'DEFAULT_AI_PROVIDER', AI_PROVIDER_CLAUDE)
    provider = provider.lower()
    if provider not in AI_PROVIDERS:
        raise ValueError(f"Invalid AI provider: {provider}. Choose from {AI_PROVIDERS}")
    return provider
