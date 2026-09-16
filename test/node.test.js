const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist');
const { StringWebAccess } = require(path.join(dist, 'nodes/StringWebAccess/StringWebAccess.node.js'));
const { StringWebAccessApi } = require(path.join(dist, 'credentials/StringWebAccessApi.credentials.js'));
const transport = require(path.join(dist, 'nodes/StringWebAccess/transport.js'));

const node = new StringWebAccess().description;
const credential = new StringWebAccessApi();

test('node declares the identity n8n lists it under', () => {
	assert.equal(node.displayName, 'String Web Access');
	assert.equal(node.name, 'stringWebAccess');
	assert.equal(node.usableAsTool, true);
	assert.deepEqual(node.credentials, [{ name: 'stringWebAccessApi', required: true }]);
});

test('both icon variants ship and resolve from the built node', () => {
	for (const rel of Object.values(node.icon)) {
		const file = path.join(dist, 'nodes/StringWebAccess', rel.replace('file:', ''));
		assert.ok(fs.existsSync(file), `missing icon ${file}`);
	}
});

test('the credential icon resolves from the built credential', () => {
	for (const rel of Object.values(credential.icon)) {
		const file = path.join(dist, 'credentials', rel.replace('file:', ''));
		assert.ok(fs.existsSync(file), `missing icon ${file}`);
	}
});

test('all four capabilities are reachable from the UI', () => {
	const operations = node.properties.filter((p) => p.name === 'operation');
	const pairs = [];
	for (const op of operations) {
		for (const choice of op.options) {
			pairs.push(`${op.displayOptions.show.resource[0]}:${choice.value}`);
		}
	}
	assert.deepEqual(pairs.sort(), ['page:fetch', 'page:sendRequest', 'site:map', 'web:search']);
});

test('the write path offers only methods the API accepts a body on', () => {
	const method = node.properties.find(
		(p) => p.name === 'method' && p.displayOptions.show.operation[0] === 'sendRequest',
	);
	assert.deepEqual(
		method.options.map((o) => o.value),
		['PATCH', 'POST', 'PUT'],
	);
	assert.equal(method.default, 'POST');
});

test('the API key is a password field and is never a node parameter', () => {
	const apiKey = credential.properties.find((p) => p.name === 'apiKey');
	assert.equal(apiKey.typeOptions.password, true);

	const serialised = JSON.stringify(node.properties);
	for (const leak of ['apiKey', 'Authorization', 'Bearer']) {
		assert.ok(!serialised.includes(leak), `node properties mention ${leak}`);
	}
});

test('the credential sends a bearer header and tests without billing a fetch', () => {
	assert.equal(credential.authenticate.properties.headers.Authorization, '=Bearer {{$credentials.apiKey}}');
	assert.equal(credential.test.request.url, '/sitemap');
	assert.equal(credential.test.request.method, 'GET');
});

test('a JSON fetch is handed back as the API framed it', () => {
	const envelope = { statusCode: 200, headers: {}, data: { ok: true } };
	const out = transport.formatFetchResponse({ body: envelope, headers: {}, statusCode: 200 }, 'json');
	assert.deepEqual(out, envelope);
});

test("a Markdown fetch reports the destination's status, not the API's", () => {
	const out = transport.formatFetchResponse(
		{ body: '# Title', headers: { 'x-status-code': '404' }, statusCode: 200 },
		'markdown',
	);
	assert.deepEqual(out, { statusCode: 404, markdown: '# Title' });
});

test('a raw fetch keeps the body untouched', () => {
	const out = transport.formatFetchResponse(
		{ body: '<html></html>', headers: { 'x-status-code': '200' }, statusCode: 200 },
		'raw',
	);
	assert.deepEqual(out, { statusCode: 200, data: '<html></html>' });
});

test('crawl statuses that still carry results are treated as terminal', () => {
	assert.equal(transport.isTerminal('completed'), true);
	assert.equal(transport.isTerminal('token_cap_exceeded'), true);
	assert.equal(transport.isTerminal('failed'), true);
	assert.equal(transport.isTerminal('running'), false);
	assert.equal(transport.isTerminal('awaiting_approval'), false);
});

test('the node targets the documented API base', () => {
	assert.equal(transport.BASE_URL, 'https://request.usestring.ai/v1');
});
