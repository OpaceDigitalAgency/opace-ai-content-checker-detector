import test from 'node:test';
import assert from 'node:assert/strict';
import { postPickerUrl } from '../../assets/js/post-picker.mjs';

test('picker search preserves plain-permalink REST routing', () => {
	const url = new URL(postPickerUrl('https://example.test/?rest_route=/oaci/v1/', 'https://example.test/wp-admin/', 'posts', new URLSearchParams({ search: 'Page & post', type: 'page', page: '2' })));
	assert.equal(url.searchParams.get('rest_route'), '/oaci/v1/posts');
	assert.equal(url.searchParams.get('search'), 'Page & post');
	assert.equal(url.searchParams.get('type'), 'page');
	assert.equal(url.searchParams.get('page'), '2');
});

test('picker search supports pretty permalinks and subdirectory installations', () => {
	const url = new URL(postPickerUrl('https://example.test/site/wp-json/oaci/v1/', 'https://example.test/site/wp-admin/', 'posts', new URLSearchParams({ search: 'draft' })));
	assert.equal(url.pathname, '/site/wp-json/oaci/v1/posts');
	assert.equal(url.searchParams.get('search'), 'draft');
});

test('picker load is same-site only', () => {
	assert.equal(postPickerUrl('https://example.test/?rest_route=/oaci/v1/', 'https://example.test/wp-admin/', 'posts/42'), 'https://example.test/?rest_route=%2Foaci%2Fv1%2Fposts%2F42');
	assert.throws(() => postPickerUrl('https://other.test/wp-json/oaci/v1/', 'https://example.test/wp-admin/', 'posts'), /not on this site/);
});
