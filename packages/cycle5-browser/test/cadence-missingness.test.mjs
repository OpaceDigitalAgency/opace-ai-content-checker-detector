import assert from 'node:assert/strict';
import test from 'node:test';
import { featuresV1, rawFeatures } from '../dist/index.js';

const singleSentenceParagraphs = [
  'The local library opens every weekday morning and provides a quiet study room for residents who need it.',
  'Our committee reviewed the timetable yesterday and agreed that the afternoon sessions should remain available throughout the winter.',
  'Visitors can reserve a desk online or speak to a member of staff when they arrive at reception.',
  'The next meeting will consider maintenance costs and decide whether additional weekend opening hours can be funded next year.',
].join('\n\n');

test('cadence is missing, not a measured zero, when no paragraph has two sentences', () => {
  assert.equal(rawFeatures(singleSentenceParagraphs)[6], undefined);
  assert.equal(featuresV1(singleSentenceParagraphs)[6], 0);
});
