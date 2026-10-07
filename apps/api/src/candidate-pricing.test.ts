import test from 'node:test';
import assert from 'node:assert/strict';
import {candidatePricing,candidateQuote} from './candidate-pricing.js';
for(const [quantity,total] of [[1,2.50],[2,5],[3,7.50],[4,10],[5,12.50],[10,25],[40,100]])test(`launch price ${quantity} candidates = ${total}`,()=>{
  assert.equal(candidatePricing.normal_unit_price,4.99);assert.equal(candidatePricing.discount_percent,50);
  assert.equal(candidatePricing.unit_price,2.50);assert.deepEqual(candidateQuote(quantity),{quantity,total});
});
test('invalid counts cannot generate a quote',()=>{for(const n of [0,-1,2.5,41,NaN,Infinity])assert.throws(()=>candidateQuote(n));});
