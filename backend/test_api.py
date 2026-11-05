import asyncio
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from app import app
from access import authorized
app.dependency_overrides[authorized] = lambda: "test-user"
client=TestClient(app)
def test_cache_is_real():
    response=client.get('/api/predictions')
    assert response.status_code==200
    assert response.json()['ensemble_size']==10
    assert response.json()['mode']=='real_cached_inference'
def test_short_or_oversized_memory_rejected():
    assert client.post('/api/interpret',json={'memory':'x'}).status_code==422
    assert client.post('/api/interpret',json={'memory':'x'*4001}).status_code==422
def test_llm_labels_allowlisted_and_negation_preserved():
    output={'notes':['rose','made-up-odor','rose','smoky'],'avoid':['smoky'],'explanation':'Suggested notes.'}
    with patch('app.completion',new=AsyncMock(return_value=output)):
        response=client.post('/api/interpret',json={'memory':'A rose garden, without smoke.'})
    assert response.status_code==200
    assert response.json()['notes']==['rose']
    assert response.json()['avoid']==['smoky']
def test_static_frontend_available():
    assert 'A little whiff of a memory' in client.get('/').text

def test_live_pipeline_failure_is_explicit():
    with patch('app.recreate', new=AsyncMock(side_effect=RuntimeError('private details'))):
        r=client.post('/api/recreate',json={'memory':'My childhood rose garden', 'notes':['rose']})
    assert r.status_code==503
    assert 'No simulated result' in r.json()['detail']
    assert 'private details' not in r.text

def test_live_endpoint_requires_authentication():
    app.dependency_overrides.clear()
    try:
        with patch.dict('os.environ', {'SUPABASE_URL':'https://example.supabase.co','SUPABASE_PUBLISHABLE_KEY':'public'}):
            r=client.post('/api/recreate',json={'memory':'My childhood rose garden','notes':['rose']})
        assert r.status_code==401
    finally:
        app.dependency_overrides[authorized] = lambda: 'test-user'
