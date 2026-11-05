import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extractNotes,rankMolecules,rankPerfumes,cosine,planReferences,cleanReflection} from '../dist/engine.js';
const cache=JSON.parse(fs.readFileSync(new URL('../dist/predictions.json',import.meta.url)));
test('real model cache has finite probabilities, 138 labels and 256-d embeddings',()=>{
 assert.equal(cache.mode,'real_cached_inference');assert.equal(cache.ensemble_size,10);assert.equal(cache.labels.length,138);assert.equal(cache.molecules.length,30);
 for(const m of cache.molecules){assert.equal(Object.keys(m.predictions).length,138);assert.ok(Object.values(m.predictions).every(v=>Number.isFinite(v)&&v>=0&&v<=1));assert.equal(m.embedding.length,256)}
});
test('memory extraction respects negation instead of recommending disliked notes',()=>{
 const r=extractNotes('A rose garden with coffee, but not smoky and no vanilla.');
 assert.ok(r.notes.includes('coffee'));assert.ok(r.notes.includes('rose'));assert.ok(r.avoid.includes('smoky'));assert.ok(r.avoid.includes('vanilla'));assert.ok(!r.notes.includes('smoky'));assert.ok(!r.notes.includes('vanilla'));
});
test('no unsupported scent words means no invented notes',()=>assert.deepEqual(extractNotes('I remember her smile on a Tuesday.').notes,[]));
test('model ranking changes with the actual requested scent',()=>{
 const vanilla=rankMolecules(cache.molecules,['vanilla']);const mint=rankMolecules(cache.molecules,['mint']);
 assert.notEqual(vanilla[0].id,mint[0].id);assert.ok(vanilla[0].predictions.vanilla>0.5);assert.ok(mint[0].predictions.mint>0.5);
});
test('unwanted note penalty lowers a candidate score',()=>{
 const a=rankMolecules(cache.molecules,['floral']);const b=rankMolecules(cache.molecules,['floral'],['sweet']);
 for(const m of a)assert.ok(b.find(x=>x.id===m.id).score<=m.score);
});
test('perfume retrieval declines unsupported matches',()=>assert.deepEqual(rankPerfumes(['garlic','fishy']),[]));
test('available home references are marked without inventing a blend',()=>{
 const ranked=rankMolecules(cache.molecules,['coffee','roasted']);const refs=planReferences(ranked,['coffee','roasted'],[],['coffee']);
 assert.ok(refs.some(r=>r.id==='coffee'&&r.available));assert.ok(refs.every(r=>r.support.value>=0.1));
});
test('embedding similarity is normalized',()=>{const a=cache.molecules[0].embedding;assert.ok(Math.abs(cosine(a,a)-1)<1e-10);assert.equal(cosine(null,a),null)});

test('a perfume with an explicitly excluded note is never recommended',()=>{assert.ok(rankPerfumes(['woody','vanilla','roasted'],['smoky']).every(p=>!p.tags.includes('smoky')))});
test('unfinished or instructional LLM reflections fall back instead of becoming recipes',()=>{assert.equal(cleanReflection('Mix two drops of oil.'),null);assert.equal(cleanReflection('You can use the following sentence to describe it.'),null);assert.equal(cleanReflection('A little memory of vanilla and'),null);assert.equal(cleanReflection('A little memory of vanilla, coffee, and warm wooden shelves. Incomplete trailing'),'A little memory of vanilla, coffee, and warm wooden shelves.')});
