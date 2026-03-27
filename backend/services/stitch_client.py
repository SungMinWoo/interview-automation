import logging
import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


class StitchClient:
    """Client for communicating with the Stitch Bridge microservice."""

    def __init__(self):
        self.base_url = settings.STITCH_BRIDGE_URL

    def generate_design(self, prompt: str, reference_image_urls: list[str] | None = None) -> dict:
        """Request design generation from Stitch Bridge.

        Args:
            prompt: Design prompt text
            reference_image_urls: Optional list of reference image URLs

        Returns:
            {project_id, html_url, screenshot_url, html_content, status}
        """
        try:
            response = httpx.post(
                f"{self.base_url}/generate",
                json={
                    'prompt': prompt,
                    'reference_images': reference_image_urls or [],
                },
                timeout=120,
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Stitch generation failed: {e}")
            raise

    def get_status(self, project_id: str) -> dict:
        """Check the status of a Stitch generation.

        Returns:
            {status, html_url, screenshot_url, error}
        """
        try:
            response = httpx.get(
                f"{self.base_url}/status/{project_id}",
                timeout=30,
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Stitch status check failed: {e}")
            raise
