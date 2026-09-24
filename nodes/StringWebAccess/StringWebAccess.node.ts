import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	operationFields,
	pageFetchFields,
	pageSendRequestFields,
	resourceField,
	siteMapFields,
	webSearchFields,
} from './descriptions';
import {
	approveSitemapJob,
	collectSitemapUrls,
	formatFetchResponse,
	isTerminal,
	stringApiRequest,
	waitForSitemapJob,
	type SitemapJob,
} from './transport';

type HeaderEntry = { name: string; value: string };

function buildHeaders(options: IDataObject): IDataObject | undefined {
	const collection = options.headers as { header?: HeaderEntry[] } | undefined;
	const entries = collection?.header ?? [];

	const headers: IDataObject = {};
	for (const entry of entries) {
		if (entry.name !== '') {
			headers[entry.name] = entry.value;
		}
	}

	return Object.keys(headers).length === 0 ? undefined : headers;
}

/**
 * Copies the shared /fetch options onto a request body, leaving out anything
 * the operator did not set so the API's own defaults apply.
 */
function applyFetchOptions(body: IDataObject, options: IDataObject): void {
	const headers = buildHeaders(options);
	if (headers !== undefined) {
		body.headers = headers;
	}
	if (options.countryCode !== undefined && options.countryCode !== '') {
		body.countryCode = options.countryCode;
	}
	if (options.solveCaptcha !== undefined) {
		body.solveCaptcha = options.solveCaptcha;
	}
	if (options.ignoreCertificateErrors === true) {
		body.ignoreCertificateErrors = true;
	}
	if (options.executeJS === true) {
		body.executeJS = true;
	}
	if (options.markdownMode !== undefined) {
		body.markdownMode = options.markdownMode;
	}
	if (options.mainContentOnly !== undefined) {
		body.mainContentOnly = options.mainContentOnly;
	}
}

export class StringWebAccess implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'String Web Access',
		name: 'stringWebAccess',
		icon: {
			light: 'file:../../icons/stringWebAccess.svg',
			dark: 'file:../../icons/stringWebAccess.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Search the web, fetch any URL and map a site as clean, LLM-ready Markdown',
		defaults: {
			name: 'String Web Access',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'stringWebAccessApi',
				required: true,
			},
		],
		properties: [
			resourceField,
			...operationFields,
			...pageFetchFields,
			...pageSendRequestFields,
			...webSearchFields,
			...siteMapFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				if (resource === 'page' && operation === 'fetch') {
					const options = this.getNodeParameter('options', i, {}) as IDataObject;
					const format = this.getNodeParameter('format', i) as string;

					if (options.executeJS === true && buildHeaders(options) !== undefined) {
						throw new NodeOperationError(
							this.getNode(),
							"'Render JavaScript' and 'Custom Headers' cannot be used together",
							{
								description:
									'A browser-rendered fetch sends its own headers. Remove the custom headers, or turn off "Render JavaScript" to send them.',
								itemIndex: i,
							},
						);
					}

					const body: IDataObject = { url: this.getNodeParameter('url', i), format };
					applyFetchOptions(body, options);

					const response = await stringApiRequest(this, 'POST', '/fetch', i, {
						body,
						expectJson: format === 'json',
					});

					returnData.push({
						json: formatFetchResponse(response, format),
						pairedItem: { item: i },
					});
					continue;
				}

				if (resource === 'page' && operation === 'sendRequest') {
					const options = this.getNodeParameter('options', i, {}) as IDataObject;
					const format = this.getNodeParameter('format', i) as string;
					const requestBody = this.getNodeParameter('body', i) as string;

					const body: IDataObject = {
						url: this.getNodeParameter('url', i),
						method: this.getNodeParameter('method', i),
						format,
					};
					if (requestBody !== '') {
						body.body = requestBody;
					}
					applyFetchOptions(body, options);

					const response = await stringApiRequest(this, 'POST', '/fetch', i, {
						body,
						expectJson: format === 'json',
					});

					returnData.push({
						json: formatFetchResponse(response, format),
						pairedItem: { item: i },
					});
					continue;
				}

				if (resource === 'web' && operation === 'search') {
					const options = this.getNodeParameter('options', i, {}) as IDataObject;
					const simple = this.getNodeParameter('simple', i) as boolean;

					const body: IDataObject = { query: this.getNodeParameter('query', i) };
					if (options.engine !== undefined) {
						body.engine = options.engine;
					}
					if (options.country !== undefined && options.country !== '') {
						body.country = options.country;
					}
					if (options.language !== undefined && options.language !== '') {
						body.language = options.language;
					}

					const response = await stringApiRequest(this, 'POST', '/search', i, { body });
					const payload = response.body as IDataObject;

					if (!simple) {
						returnData.push({ json: payload, pairedItem: { item: i } });
						continue;
					}

					const limit = options.limit as number | undefined;
					const results = (payload.results ?? []) as IDataObject[];
					const trimmed = limit === undefined ? results : results.slice(0, limit);

					for (const result of trimmed) {
						returnData.push({ json: result, pairedItem: { item: i } });
					}
					continue;
				}

				if (resource === 'site' && operation === 'map') {
					const options = this.getNodeParameter('options', i, {}) as IDataObject;

					const body: IDataObject = {
						url: this.getNodeParameter('url', i),
						maxPages: this.getNodeParameter('maxPages', i),
					};
					if (options.maxDepth !== undefined) {
						body.maxDepth = options.maxDepth;
					}
					if (options.pathPrefix !== undefined && options.pathPrefix !== '') {
						body.pathPrefix = options.pathPrefix;
					}
					if (options.budgetUsd !== undefined) {
						body.budgetUsd = options.budgetUsd;
					}
					if (options.useSitemap === true) {
						body.useSitemap = true;
					}

					const quoteResponse = await stringApiRequest(this, 'POST', '/sitemap', i, { body });
					const quote = quoteResponse.body as SitemapJob;

					// Nothing is crawled or charged until the quote is approved, so
					// the quote itself is the result when the operator has not asked
					// for the crawl to start.
					if (this.getNodeParameter('approve', i) !== true) {
						returnData.push({
							json: quote as unknown as IDataObject,
							pairedItem: { item: i },
						});
						continue;
					}

					const approved = await approveSitemapJob(this, quote.jobId, i);

					if (this.getNodeParameter('waitForCompletion', i) !== true) {
						returnData.push({
							json: { ...quote, ...approved } as unknown as IDataObject,
							pairedItem: { item: i },
						});
						continue;
					}

					const maxWaitSeconds = (options.maxWaitSeconds as number | undefined) ?? 300;
					const job = await waitForSitemapJob(this, quote.jobId, maxWaitSeconds, i);

					if (!isTerminal(job.status)) {
						returnData.push({
							json: {
								...job,
								message: `The crawl is still running after ${maxWaitSeconds} seconds. Collect its URLs in a later step using this job ID.`,
							} as unknown as IDataObject,
							pairedItem: { item: i },
						});
						continue;
					}

					if (job.status === 'failed' || job.status === 'canceled') {
						returnData.push({
							json: job as unknown as IDataObject,
							pairedItem: { item: i },
						});
						continue;
					}

					// `completed` and `token_cap_exceeded` both leave the URLs found
					// so far readable.
					const urls = await collectSitemapUrls(this, quote.jobId, i);

					for (const url of urls) {
						returnData.push({
							json: { jobId: quote.jobId, ...url },
							pairedItem: { item: i },
						});
					}
					continue;
				}

				throw new NodeOperationError(
					this.getNode(),
					`This node cannot run '${operation}' on a ${resource}`,
					{
						description:
							'Pick one of the listed operations for the chosen resource. If the workflow sets these with an expression, check that it produces a supported pair.',
						itemIndex: i,
					},
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}

				// Validation and transport already raise node errors that carry a
				// description; anything else is an unexpected failure to wrap.
				const failure =
					error instanceof NodeApiError || error instanceof NodeOperationError
						? error
						: new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });

				throw failure;
			}
		}

		return [returnData];
	}
}
