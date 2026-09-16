# n8n-nodes-string-web-access

String Web Access turns any page on the web into LLM-ready Markdown. Best for: scraping sites that
block bots, live web search, writing to APIs behind a bot wall, mapping a site's URLs. Handles
proxies, CAPTCHAs and JavaScript rendering. Add web data to any n8n workflow.

Search the web, fetch any URL or send it a write request, and map a site's URLs — all returned
as clean, LLM-ready Markdown. Proxy rotation, anti-bot handling, CAPTCHA solving and JavaScript
rendering happen server-side, so the agent gets the page instead of a block screen. Best for
sites that rate-limit, geo-gate or block automated traffic.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow
automation platform.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) ·
[Examples](#examples) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

Follow the
[community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation-and-management/)
and install `n8n-nodes-string-web-access`.

On a self-hosted instance you can also install it from the command line:

```sh
npm install n8n-nodes-string-web-access
```

## Credentials

The node authenticates with a String Web Access API key.

1. Sign in at [portal.usestring.ai](https://portal.usestring.ai/settings) and open **Settings**.
2. Create a Web Access API key, or copy an existing one.
3. In n8n, add a **String Web Access API** credential and paste the key into **API Key**.

The key is stored encrypted by n8n and sent as a bearer token on each request. It is held only in
the credential, never in a node parameter, and the node's own code never reads it, so it cannot
reach an output item, an execution log or an error message.

Selecting **Test** on the credential lists your account's crawl jobs. That call is authenticated
but fetches no page, so testing a credential is never billed.

## Operations

### Page

- **Fetch** — retrieve a URL as Markdown, as a JSON envelope carrying the destination's status,
  headers and body, or as its original body. Options cover JavaScript rendering, proxy country,
  CAPTCHA solving, custom headers and how much page structure to keep.
- **Send Request** — send a POST, PUT or PATCH with a body to a URL and return the response. Use
  this for a GraphQL query, a search backend that takes a body, or any API that refuses GET.

### Web

- **Search** — run a query against Google, Bing, Brave, DuckDuckGo or Mojeek and return the ranked
  organic results. **Simplify** is on by default and emits one item per result; turn it off to get
  the whole response, including the answer panels, related searches and ads that the engine drew
  around the results.

### Site

- **Map** — discover every URL on one site from a single starting point. The crawl is quoted
  first, and **Start Crawl** is what accepts the quote. Turn **Start Crawl** off to return the
  quoted page count and cost without retrieving anything. **Max Pages** and **Budget (USD)** both
  cap the spend, and a crawl that stops on its budget still returns the URLs it already found.

## Examples

**Turn a URL into Markdown for a summarizer.** Set *Resource* to **Page**, *Operation* to
**Fetch**, *URL* to the page, and leave *Output Format* on **Markdown**. The Markdown arrives on
the `markdown` field, ready to hand to an LLM node.

**Research a topic, then read the top result.** Chain a **Web → Search** node into a
**Page → Fetch** node and set the second node's *URL* to `={{ $json.url }}`. Search emits one item
per result, so the fetch runs once per result; add a Limit node between them to cap it.

**List a documentation site before crawling it.** Use **Site → Map** with *URL* set to the site,
*Max Pages* to the ceiling you will pay for, and *Path Prefix* (under Options) set to `/docs`. Each
discovered URL arrives as its own item with its depth and the page it was found on.

**Post to an API that blocks datacentre traffic.** Use **Page → Send Request** with *Method*
**POST**, the payload in *Body*, and *Output Format* on **JSON** so you can branch on the
destination's own status code.

**Give an AI Agent live web access.** This node sets `usableAsTool`, so it can be attached to an
AI Agent node directly and the model chooses the operation.

## Compatibility

Tested against n8n 1.x with Node.js 22. The package has no runtime dependencies; all HTTP calls go
through n8n's own request helper.

## Resources

- [String Web Access documentation](https://portal.usestring.ai/docs)
- [Web Access API reference](https://portal.usestring.ai/docs/api-reference/overview)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

### Using String Web Access without this node

String also runs a hosted MCP server at `https://mcp.usestring.ai/v1/mcp`, which exposes the same
capabilities — search, fetch, write requests and site mapping — to any MCP client. In n8n you can
reach it with the built-in **MCP Client Tool** node: set *Server Transport* to **HTTP Streamable**,
*Endpoint* to the URL above, and *Authentication* to **Bearer Auth** with your API key. That route
is agent-only, because the MCP Client Tool node attaches to an AI Agent rather than sitting in a
workflow on its own. Use this node when you want the capability as an ordinary workflow step, with
each parameter pinned.

## License

[MIT](LICENSE.md)
