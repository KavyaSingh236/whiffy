"""Product images come from the catalog brand page's metadata, never from the LLM."""
import asyncio
import time
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
import httpx

class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.image = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'meta' and (a.get('property') or a.get('name')) in ('og:image', 'twitter:image') and not self.image:
            self.image = a.get('content')

cache = {}
slots = asyncio.Semaphore(3)
ALLOWED_IMAGE_HOSTS = ('maisonmargiela.com', 'maisonmargiela-fragrances.us', 'diptyqueparis.com', 'jomalone.com',
                       'cdn.shopify.com', 'cdn.media.amplience.net', 'media.douglas.com', 'scene7.com',
                       'sdcdn.io', 'elcdev.net', 'loreal-dam-front-corp-en-cdn.damdy.com')

def safe_image(url):
    p = urlparse(url)
    return p.scheme == 'https' and not p.username and not p.password and p.port in (None, 443) and any(
        p.hostname == host or (p.hostname or '').endswith('.' + host) for host in ALLOWED_IMAGE_HOSTS)

async def product_image(product):
    key = product['id']
    if key in cache and cache[key][0] > time.monotonic():
        return cache[key][1]
    image = None
    try:
        async with slots, httpx.AsyncClient(timeout=6, follow_redirects=False) as client:
            # Only server-owned catalog URLs. Do not follow arbitrary redirects or fetch LLM URLs.
            async with client.stream('GET', product['url'], headers={'User-Agent': 'Whiffy/2.0 product-preview'}) as response:
                if response.status_code == 200 and 'text/html' in response.headers.get('content-type', ''):
                    body = bytearray()
                    async for chunk in response.aiter_bytes():
                        body.extend(chunk)
                        if len(body) > 1_000_000:
                            break
                    parser = Metadata()
                    parser.feed(body.decode('utf-8', errors='ignore'))
                    if parser.image:
                        candidate = urljoin(product['url'], parser.image)
                        if safe_image(candidate):
                            image = candidate
    except (httpx.HTTPError, ValueError):
        pass
    cache[key] = (time.monotonic() + (86400 if image else 300), image)
    return image
