import logging
import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


class StitchClient:
    """Client for communicating with the Stitch Bridge microservice."""

    def __init__(self):
        self.base_url = settings.STITCH_BRIDGE_URL

    def generate_design(self, prompt: str, design_md: str = '', colors: dict | None = None) -> dict:
        """Create Stitch project with design system and generate screen.

        Args:
            prompt: Text prompt for screen generation
            design_md: DESIGN.md content for the design system
            colors: {primary, secondary, accent} hex color dict
        """
        try:
            payload: dict = {'prompt': prompt}
            if design_md:
                payload['design_md'] = design_md
            if colors:
                payload['colors'] = colors

            response = httpx.post(
                f"{self.base_url}/generate",
                json=payload,
                timeout=300,
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Stitch generation failed: {e}")
            raise

    def fetch_screens(self, project_id: str) -> dict:
        """Fetch screens from an existing Stitch project."""
        try:
            response = httpx.get(
                f"{self.base_url}/project/{project_id}/screens",
                timeout=60,
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Stitch fetch screens failed: {e}")
            raise
