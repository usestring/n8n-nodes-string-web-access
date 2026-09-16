import type { IDataObject, IExecuteFunctions, IHttpRequestMethods, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError, sleep } from 'n8n-workflow';

export const BASE_URL = 'https://request.usestring.ai/v1';

export const CREDENTIAL_NAME = 'stringWebAccessApi';

type FullResponse = {
	body: unknown;
	headers: Record<string, string | string[] | undefined>;
	statusCode: number;
};

/**
 * Turns an API failure into an error that says what happened and how to get
 * unstuck, instead of surfacing a bare status code.
 */
function toNodeError(
	context: IExecuteFunctions,
	error: unknown,
	itemIndex: number,
): NodeApiError | NodeOperationError {
	const status = (error as { httpCode?: string; statusCode?: number }).httpCode
		? Number((error as { httpCode: string }).httpCode)
		: (error as { statusCode?: number }).statusCode;

	const guidance: Record<number, { message: string; description: string }> = {
		401: {
			message: 'String Web Access did not accept the API key',
			description:
				"Open this node's credential and check the 'API Key' value against the keys listed under Settings in the String portal. A revoked key returns this response.",
		},
		402: {
			message: 'The String account balance does not cover this request',
			description:
				'Top up the balance in the String portal, then run the workflow again. For a site map, lowering the "Max Pages" value also lowers the quote.',
		},
		403: {
			message: 'This destination is not enabled for your String organization',
			description:
				'Access to this domain is controlled per organization. Ask your String administrator to enable it, or use a destination that is already enabled.',
		},
		429: {
			message: 'String Web Access rate limit reached',
			description:
				'Wait for the limit to reset and retry. Setting "Retry On Fail" on this node, or adding a Wait node ahead of it, spreads out a large batch.',
		},
	};

	const known = status === undefined ? undefined : guidance[status];
	if (known !== undefined) {
		return new NodeApiError(context.getNode(), error as JsonObject, {
			message: known.message,
			description: known.description,
			itemIndex,
		});
	}

	return new NodeApiError(context.getNode(), error as JsonObject, { itemIndex });
}

/**
 * Sends one authenticated call to the Web Access API.
 *
 * The API key is supplied by n8n's credential helper and is never read into
 * node code, so it cannot reach a parameter, an output item or an error.
 */
export async function stringApiRequest(
	context: IExecuteFunctions,
	method: IHttpRequestMethods,
	path: string,
	itemIndex: number,
	options: { body?: IDataObject; qs?: IDataObject; expectJson?: boolean } = {},
): Promise<FullResponse> {
	const { body, qs, expectJson = true } = options;

	try {
		const response = (await context.helpers.httpRequestWithAuthentication.call(
			context,
			CREDENTIAL_NAME,
			{
				method,
				url: `${BASE_URL}${path}`,
				body,
				qs,
				json: expectJson,
				headers: { 'Content-Type': 'application/json' },
				returnFullResponse: true,
			},
		)) as FullResponse;

		return response;
	} catch (error) {
		throw toNodeError(context, error, itemIndex);
	}
}

function headerValue(response: FullResponse, name: string): string | undefined {
	const raw = response.headers[name];
	return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Shapes a /fetch response for the workflow, keyed on the format that was asked
 * for. The JSON envelope is passed through unchanged; the pass-through formats
 * carry the destination's status in a header instead of the body.
 */
export function formatFetchResponse(response: FullResponse, format: string): IDataObject {
	if (format === 'json') {
		return response.body as IDataObject;
	}

	const originStatus = headerValue(response, 'x-status-code');
	const statusCode = originStatus === undefined ? response.statusCode : Number(originStatus);
	const data = typeof response.body === 'string' ? response.body : String(response.body ?? '');

	return format === 'markdown' ? { statusCode, markdown: data } : { statusCode, data };
}

export type SitemapJob = {
	jobId: string;
	status: string;
	estimatedCostUsd?: string;
	estimatedPages?: number;
	pagesProcessed?: number;
	pending?: number;
	processed?: number;
	errorMessage?: string | null;
};

const TERMINAL_STATUSES = ['completed', 'failed', 'canceled', 'token_cap_exceeded'];

export function isTerminal(status: string): boolean {
	return TERMINAL_STATUSES.includes(status);
}

/**
 * Approves a quoted crawl. A 409 means an earlier approve was interrupted and
 * left the job in `partial_state`; the documented repair is to approve again.
 */
export async function approveSitemapJob(
	context: IExecuteFunctions,
	jobId: string,
	itemIndex: number,
): Promise<SitemapJob> {
	for (let attempt = 0; attempt < 3; attempt++) {
		const response = await stringApiRequest(
			context,
			'POST',
			`/sitemap/${jobId}/approve`,
			itemIndex,
		);
		const job = response.body as SitemapJob;

		if (job.status !== 'partial_state') {
			return job;
		}

		await sleep(1000);
	}

	throw new NodeOperationError(
		context.getNode(),
		`The crawl of job ${jobId} could not be started`,
		{
			description:
				'String reported an incomplete approval handoff three times in a row. Run the node again, or open the job in the String portal to approve it there.',
			itemIndex,
		},
	);
}

/**
 * Polls a running crawl until it reaches a terminal status or the wait budget
 * runs out. A timeout is not an error: the caller reports the job as still
 * running so the workflow can pick it up later.
 */
export async function waitForSitemapJob(
	context: IExecuteFunctions,
	jobId: string,
	maxWaitSeconds: number,
	itemIndex: number,
): Promise<SitemapJob> {
	const deadline = Date.now() + maxWaitSeconds * 1000;
	let job: SitemapJob = { jobId, status: 'running' };

	while (Date.now() < deadline) {
		await sleep(3000);

		const response = await stringApiRequest(context, 'GET', `/sitemap/${jobId}`, itemIndex);
		job = response.body as SitemapJob;

		if (job.status === 'partial_state') {
			job = await approveSitemapJob(context, jobId, itemIndex);
			continue;
		}

		if (isTerminal(job.status)) {
			return job;
		}
	}

	return job;
}

/**
 * Pages through every URL a crawl discovered. Results stay readable after a
 * budget stop, so this is worth calling for `token_cap_exceeded` too.
 */
export async function collectSitemapUrls(
	context: IExecuteFunctions,
	jobId: string,
	itemIndex: number,
): Promise<IDataObject[]> {
	const pageSize = 1000;
	const urls: IDataObject[] = [];
	let offset = 0;

	for (;;) {
		const response = await stringApiRequest(context, 'GET', `/sitemap/${jobId}/urls`, itemIndex, {
			qs: { limit: pageSize, offset },
		});
		const page = response.body as { total?: number; urls?: IDataObject[] };
		const batch = page.urls ?? [];

		urls.push(...batch);

		if (batch.length < pageSize || (page.total !== undefined && urls.length >= page.total)) {
			return urls;
		}

		offset += batch.length;
	}
}
