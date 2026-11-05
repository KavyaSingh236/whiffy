import asyncio
from unittest.mock import AsyncMock
import pytest
from pipeline import Brief, recreate
from products import Metadata, safe_image


def run(notes=('rose',), avoid=(), selections=None, final=None, mode='live_openpom'):
    completion = AsyncMock(side_effect=[selections or {'molecule_ids': ['phenethyl-alcohol', 'vanillin']}, final or {'title': 'Garden at home', 'summary': 'The model supports a floral aspect of this memory, rather than reconstructing the whole garden.', 'home_ids': ['flowers'], 'perfume_ids': ['perfume-4']}])
    async def predict(rows):
        assert [r['id'] for r in rows] == ['phenethyl-alcohol', 'vanillin']
        return {'mode': mode, 'ensemble_size': 1, 'molecules': [{**r, 'predictions': dict.fromkeys(['rose','vanilla','smoky','sweet'], .8 if r['id']=='phenethyl-alcohol' else .2)} for r in rows]}
    result = asyncio.run(recreate(Brief(memory='The roses in my old garden', notes=list(notes), avoid=list(avoid)), completion, predict))
    return result, completion


def test_live_evidence_reaches_final_llm():
    result, completion = run()
    assert result['evidence']['mode'] == 'live_openpom'
    assert result['ranked'][0]['id'] == 'phenethyl-alcohol'
    final_prompt = completion.call_args_list[1].args[1]
    assert '0.8' in final_prompt and 'OCCc1ccccc1' in final_prompt
    assert result['refs'][0]['id'] == 'flowers'
    assert result['perfumes'][0]['google_url'].startswith('https://www.google.com/search?')
    assert result['perfumes'][0]['amazon_url'].startswith('https://www.amazon.com/s?k=')
    assert result['guide']['steps']


def test_invented_molecule_is_rejected_before_inference():
    with pytest.raises(ValueError, match='outside the verified catalog'):
        run(selections={'molecule_ids':['invented']})


def test_cached_predictions_cannot_masquerade_as_live():
    with pytest.raises(ValueError, match='Fresh OpenPOM'):
        run(mode='real_cached_inference')


def test_hallucinated_product_or_home_reference_rejected():
    with pytest.raises(ValueError, match='unsupported'):
        run(final={'title':'X','summary':'A sufficiently long summary.', 'home_ids':['bleach'],'perfume_ids':['fake-perfume']})


def test_excluded_perfume_cannot_be_recommended():
    with pytest.raises(ValueError, match='unsupported'):
        run(avoid=('sweet',))  # Eau Rose catalog includes sweet; final LLM cannot override exclusion.


def test_conflicting_or_unknown_labels_rejected():
    with pytest.raises(ValueError):
        Brief(memory='My garden memory',notes=['made-up'])
    with pytest.raises(ValueError, match='wanted and excluded'):
        run(avoid=('rose',))


def test_image_metadata_is_sourced_and_allowlisted():
    p=Metadata();p.feed('<meta property="og:image" content="https://cdn.shopify.com/test.jpg">')
    assert safe_image(p.image)
    for url in ['http://localhost/image','https://127.0.0.1/x','https://evil.example/image','javascript:alert(1)','https://cdn.shopify.com.evil.example/x']:
        assert not safe_image(url)
