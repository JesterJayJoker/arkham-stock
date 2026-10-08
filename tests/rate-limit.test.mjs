import test from 'node:test';
import assert from 'node:assert/strict';
import {createRateLimiter} from '../backend/rate-limit.mjs';

test('rate limiter blocks only after configured allowance',()=>{
  const l=createRateLimiter({windowMs:1000,max:2});
  assert.equal(l.check('a',0).allowed,true);
  assert.equal(l.check('a',1).allowed,true);
  assert.equal(l.check('a',2).allowed,false);
  assert.equal(l.check('a',1001).allowed,true);
});
