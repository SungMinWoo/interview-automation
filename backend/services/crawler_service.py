import logging
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class CrawlerService:
    """Crawls websites to extract text content and structure."""

    def crawl(self, url: str) -> dict:
        """Crawl a URL and extract useful information.

        Returns:
            {url, title, meta_description, headings, main_text, navigation, colors_found}
        """
        try:
            response = httpx.get(url, timeout=30, follow_redirects=True, verify=False, headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            })
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # Remove script and style elements
            for tag in soup(['script', 'style', 'noscript']):
                tag.decompose()

            title = soup.title.string.strip() if soup.title and soup.title.string else ''

            meta_desc = ''
            meta_tag = soup.find('meta', attrs={'name': 'description'})
            if meta_tag:
                meta_desc = meta_tag.get('content', '')

            headings = []
            for level in range(1, 4):
                for h in soup.find_all(f'h{level}'):
                    text = h.get_text(strip=True)
                    if text:
                        headings.append({'level': level, 'text': text})

            nav_items = []
            for nav in soup.find_all('nav'):
                for link in nav.find_all('a'):
                    text = link.get_text(strip=True)
                    href = link.get('href', '')
                    if text:
                        nav_items.append({'text': text, 'href': href})

            main_text = soup.get_text(separator='\n', strip=True)[:5000]

            return {
                'url': url,
                'title': title,
                'meta_description': meta_desc,
                'headings': headings,
                'main_text': main_text,
                'navigation': nav_items,
            }
        except Exception as e:
            logger.error(f"Crawl failed for {url}: {e}")
            return {
                'url': url,
                'title': '',
                'meta_description': '',
                'headings': [],
                'main_text': '',
                'navigation': [],
                'error': str(e),
            }
