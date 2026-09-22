import type { INodeProperties } from 'n8n-workflow';

export const resourceField: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	default: 'page',
	options: [
		{ name: 'Page', value: 'page' },
		{ name: 'Site', value: 'site' },
		{ name: 'Web', value: 'web' },
	],
};

export const operationFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'fetch',
		displayOptions: { show: { resource: ['page'] } },
		options: [
			{
				name: 'Fetch',
				value: 'fetch',
				description: 'Retrieve a page as Markdown, JSON or its original body',
				action: 'Fetch a URL',
			},
			{
				name: 'Send Request',
				value: 'sendRequest',
				description: 'Send a POST, PUT or PATCH request to a URL and return the response',
				action: 'Send a request to a URL',
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'search',
		displayOptions: { show: { resource: ['web'] } },
		options: [
			{
				name: 'Search',
				value: 'search',
				description: 'Retrieve ranked organic results for a query',
				action: 'Search the web',
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'map',
		displayOptions: { show: { resource: ['site'] } },
		options: [
			{
				name: 'Map',
				value: 'map',
				description: 'Discover every URL on one site from a single starting point',
				action: 'Map a site',
			},
		],
	},
];

const customHeadersField: INodeProperties = {
	displayName: 'Custom Headers',
	name: 'headers',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	placeholder: 'Add Header',
	default: {},
	description:
		'Headers to send to the destination. Cannot be combined with rendering JavaScript.',
	options: [
		{
			displayName: 'Header',
			name: 'header',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					placeholder: 'e.g. Accept-Language',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					placeholder: 'e.g. enUS',
				},
			],
		},
	],
};

const countryCodeField: INodeProperties = {
	displayName: 'Country Code',
	name: 'countryCode',
	type: 'string',
	default: '',
	placeholder: 'e.g. US',
	description:
		'Two-letter ISO 3166-1 country to route the request through, for pages that vary by location',
};

const solveCaptchaField: INodeProperties = {
	displayName: 'Solve CAPTCHA',
	name: 'solveCaptcha',
	type: 'boolean',
	default: true,
	description:
		'Whether to solve a CAPTCHA when the destination presents one. Turn this off to fail fast instead.',
};

const ignoreCertificateErrorsField: INodeProperties = {
	displayName: 'Ignore Certificate Errors',
	name: 'ignoreCertificateErrors',
	type: 'boolean',
	default: false,
	description:
		'Whether to accept an expired, self-signed or mismatched TLS certificate. This drops the guarantee that the response came from the destination, so leave it off for anything you act on as authoritative.',
};

const markdownModeField: INodeProperties = {
	displayName: 'Markdown Mode',
	name: 'markdownMode',
	type: 'options',
	default: 'full',
	description: 'How much of the page structure to keep when converting to Markdown',
	options: [
		{ name: 'Full', value: 'full', description: 'Keep the whole document' },
		{ name: 'Readable', value: 'readable', description: 'Keep the prose and drop fine structure' },
	],
};

const mainContentOnlyField: INodeProperties = {
	displayName: 'Main Content Only',
	name: 'mainContentOnly',
	type: 'boolean',
	default: false,
	description:
		'Whether to drop navigation, headers and footers and keep the body of the page',
};

export const pageFetchFields: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/article',
		description: 'The HTTP or HTTPS address of the page to retrieve',
		displayOptions: { show: { resource: ['page'], operation: ['fetch'] } },
	},
	{
		displayName: 'Output Format',
		name: 'format',
		type: 'options',
		default: 'markdown',
		description: 'The shape the page is returned in',
		displayOptions: { show: { resource: ['page'], operation: ['fetch'] } },
		options: [
			{
				name: 'JSON',
				value: 'json',
				description: "An envelope with the destination's status, headers and body",
			},
			{ name: 'Markdown', value: 'markdown', description: 'Clean, LLM-ready Markdown' },
			{ name: 'Raw', value: 'raw', description: 'The original body, unchanged' },
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['page'], operation: ['fetch'] } },
		options: [
			countryCodeField,
			customHeadersField,
			ignoreCertificateErrorsField,
			mainContentOnlyField,
			markdownModeField,
			{
				displayName: 'Render JavaScript',
				name: 'executeJS',
				type: 'boolean',
				default: false,
				description:
					'Whether to load the page in a browser first, for content that is drawn by script. Cannot be combined with custom headers.',
			},
			solveCaptchaField,
		],
	},
];

export const pageSendRequestFields: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/api/orders',
		description: 'The HTTP or HTTPS address to send the request to',
		displayOptions: { show: { resource: ['page'], operation: ['sendRequest'] } },
	},
	{
		displayName: 'Method',
		name: 'method',
		type: 'options',
		default: 'POST',
		description: 'The HTTP method to send',
		displayOptions: { show: { resource: ['page'], operation: ['sendRequest'] } },
		options: [
			{ name: 'PATCH', value: 'PATCH' },
			{ name: 'POST', value: 'POST' },
			{ name: 'PUT', value: 'PUT' },
		],
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		placeholder: 'e.g. {"sku":"A-1","quantity":2}',
		description:
			'The request body, sent to the destination as typed. Leave empty to send no body.',
		displayOptions: { show: { resource: ['page'], operation: ['sendRequest'] } },
	},
	{
		displayName: 'Output Format',
		name: 'format',
		type: 'options',
		default: 'json',
		description: 'The shape the response is returned in',
		displayOptions: { show: { resource: ['page'], operation: ['sendRequest'] } },
		options: [
			{
				name: 'JSON',
				value: 'json',
				description: "An envelope with the destination's status, headers and body",
			},
			{ name: 'Markdown', value: 'markdown', description: 'Clean, LLM-ready Markdown' },
			{ name: 'Raw', value: 'raw', description: 'The original body, unchanged' },
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['page'], operation: ['sendRequest'] } },
		options: [
			countryCodeField,
			customHeadersField,
			ignoreCertificateErrorsField,
			solveCaptchaField,
		],
	},
];

export const webSearchFields: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. automation',
		description: 'The search query to run',
		displayOptions: { show: { resource: ['web'], operation: ['search'] } },
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		description:
			'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: { show: { resource: ['web'], operation: ['search'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['web'], operation: ['search'] } },
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				placeholder: 'e.g. GB',
				description: 'Two-letter ISO 3166-1 country used to localize the results',
			},
			{
				displayName: 'Engine',
				name: 'engine',
				type: 'options',
				default: 'google',
				description: 'The search engine to query',
				options: [
					{ name: 'Brave', value: 'brave' },
					{ name: 'DuckDuckGo', value: 'duckduckgo' },
					{ name: 'Google', value: 'google' },
					{ name: 'Mojeek', value: 'mojeek' },
				],
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'e.g. en',
				description: 'Language tag used to localize the results, such as "en" or "pt-br"',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
			},
		],
	},
];

export const siteMapFields: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com',
		description: 'Where the crawl starts. It stays on this hostname.',
		displayOptions: { show: { resource: ['site'], operation: ['map'] } },
	},
	{
		displayName: 'Max Pages',
		name: 'maxPages',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 10000 },
		default: 10,
		description: 'Most pages the crawl may retrieve. Every page retrieved is billed.',
		displayOptions: { show: { resource: ['site'], operation: ['map'] } },
	},
	{
		displayName: 'Start Crawl',
		name: 'approve',
		type: 'boolean',
		default: true,
		description:
			'Whether to accept the quote and run the crawl. Turn this off to return the quoted page count and cost without retrieving anything.',
		displayOptions: { show: { resource: ['site'], operation: ['map'] } },
	},
	{
		displayName: 'Wait for Completion',
		name: 'waitForCompletion',
		type: 'boolean',
		default: true,
		description:
			'Whether to wait for the crawl to finish and return the URLs it found. Turn this off to return the job straight away and collect the URLs in a later step.',
		displayOptions: { show: { resource: ['site'], operation: ['map'], approve: [true] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['site'], operation: ['map'] } },
		options: [
			{
				displayName: 'Budget (USD)',
				name: 'budgetUsd',
				type: 'number',
				typeOptions: { minValue: 0.0001, numberPrecision: 4 },
				default: 0.05,
				description:
					'Spend ceiling for this crawl. It stops early rather than pass this, and the pages it already found stay readable.',
			},
			{
				displayName: 'Max Depth',
				name: 'maxDepth',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 2,
				description: 'How many links away from the starting URL the crawl may go',
			},
			{
				displayName: 'Max Wait Time (Seconds)',
				name: 'maxWaitSeconds',
				type: 'number',
				typeOptions: { minValue: 5 },
				default: 300,
				description:
					'How long to wait for the crawl before returning the job as still running',
			},
			{
				displayName: 'Path Prefix',
				name: 'pathPrefix',
				type: 'string',
				default: '',
				placeholder: 'e.g. /docs',
				description: 'Only crawl URLs whose path starts with this prefix',
			},
			{
				displayName: 'Use Sitemap',
				name: 'useSitemap',
				type: 'boolean',
				default: false,
				description:
					"Whether to also seed the crawl from the site's own sitemap.xml, which finds pages that no internal link points at. It costs one extra page.",
			},
		],
	},
];
