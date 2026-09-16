import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class StringWebAccessApi implements ICredentialType {
	name = 'stringWebAccessApi';

	displayName = 'String Web Access API';

	icon = {
		light: 'file:../icons/stringWebAccess.svg',
		dark: 'file:../icons/stringWebAccess.dark.svg',
	} as const;

	documentationUrl =
		'https://github.com/usestring/n8n-nodes-string-web-access?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Web Access API key. Create one under Settings in the String portal at https://portal.usestring.ai/settings.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// Lists the account's sitemap jobs. Chosen because it is authenticated but
	// does not fetch a page, so testing a credential is never billed.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://request.usestring.ai/v1',
			url: '/sitemap',
			method: 'GET',
			qs: { limit: 1 },
		},
	};
}
