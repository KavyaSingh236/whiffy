"""Opt-in integration check: real checkpoint inference, scripted LLM responses (no API key)."""
import asyncio
import json
import os
from pathlib import Path
from unittest.mock import AsyncMock
import pytest
from catalog import CATALOG
from live_inference import runtime
from pipeline import Brief, recreate

@pytest.mark.skipif(os.getenv('WHIFFY_TEST_LIVE') != '1', reason='Requires downloaded OpenPOM checkpoints and ML dependencies')
def test_real_openpom_pipeline():
    # Validate every catalog structure through the real featurizer and checkpoint.
    full = runtime.predict(CATALOG)
    assert len(full['molecules']) == 30 and len(full['labels']) == 138
    assert all(len(m['embedding']) == 256 for m in full['molecules'])
    vanillin = next(m for m in full['molecules'] if m['id']=='vanillin')
    assert vanillin['predictions']['vanilla'] > .5
    llm = AsyncMock(side_effect=[{'molecule_ids':['phenethyl-alcohol','vanillin','benzyl-acetate']},
        {'title':'The garden window','summary':'Floral and rose predictions support the garden aspect. This evokes part of the memory rather than reconstructing it.',
         'home_ids':['flowers'], 'perfume_ids':['perfume-4']}])
    async def predict(rows):
        return runtime.predict(rows)
    result = asyncio.run(recreate(Brief(memory='Roses and jasmine in the garden',notes=['rose','jasmin'],owned=['flowers']),llm,predict))
    assert result['evidence']['mode']=='live_openpom'
    assert result['refs'][0]['available'] is True
    assert result['perfumes'][0]['name']=='Eau Rose'
    assert 'predictions' in result['ranked'][0]
    output=os.getenv('WHIFFY_TEST_RESULT_PATH')
    if output:
        Path(output).write_text(json.dumps(result))
