import logging
from pathlib import Path
from django.conf import settings

logger = logging.getLogger(__name__)


class ScreenshotService:
    """Captures screenshots of websites using Playwright."""

    async def capture(self, url: str, output_path: str | None = None) -> str:
        """Capture a full-page screenshot of a URL.

        Args:
            url: The URL to screenshot
            output_path: Optional path to save the screenshot. If None, auto-generates.

        Returns:
            Path to the saved screenshot file
        """
        from playwright.async_api import async_playwright

        if not output_path:
            media_dir = Path(settings.MEDIA_ROOT) / 'screenshots'
            media_dir.mkdir(parents=True, exist_ok=True)
            import uuid
            output_path = str(media_dir / f"{uuid.uuid4()}.png")

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page(viewport={'width': 1920, 'height': 1080})
                await page.goto(url, wait_until='networkidle', timeout=30000)
                await page.screenshot(path=output_path, full_page=True)
                await browser.close()

            logger.info(f"Screenshot captured: {url} -> {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Screenshot failed for {url}: {e}")
            raise

    def capture_sync(self, url: str, output_path: str | None = None) -> str:
        """Synchronous wrapper for capture."""
        import asyncio
        return asyncio.run(self.capture(url, output_path))
