"""Verify Supabase bearer tokens server-side; bound per-user usage in this single-worker demo."""
import os
import time
from collections import OrderedDict, deque
import httpx
from fastapi import Header, HTTPException

requests = OrderedDict()
async def authorized(authorization: str = Header(default='')):
    url = os.getenv('SUPABASE_URL', '').rstrip('/')
    key = os.getenv('SUPABASE_PUBLISHABLE_KEY', '')
    if not url or not key:
        raise HTTPException(503, 'The backend account service is not configured.')
    if not authorization.startswith('Bearer ') or len(authorization) > 8192:
        raise HTTPException(401, 'Sign in with Google before using the memory assistant.')
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(url + '/auth/v1/user', headers={'apikey': key, 'Authorization': authorization})
        if response.status_code != 200:
            raise HTTPException(401, 'Your session expired. Please sign in again.')
        user_id = response.json().get('id')
        if not user_id:
            raise HTTPException(401, 'Invalid account session.')
    except (httpx.HTTPError, ValueError):
        raise HTTPException(503, 'Account verification is temporarily unavailable.')
    now = time.monotonic()
    history = requests.setdefault(user_id, deque())
    requests.move_to_end(user_id)
    while history and history[0] <= now - 3600:
        history.popleft()
    if len(history) >= int(os.getenv('WHIFFY_REQUESTS_PER_HOUR', '12')):
        raise HTTPException(429, 'Your hourly memory-assistant limit has been reached. Please try later.')
    history.append(now)
    while len(requests) > 10000:
        requests.popitem(last=False)
    return user_id
