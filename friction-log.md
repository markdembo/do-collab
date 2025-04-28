- https://github.com/cloudflare/workers-sdk/issues/5947#issuecomment-2394937326
- npm run dev won't work with workers bindings, no warning
- npm run preview says disconnected 
 ⛅️ wrangler 4.13.2
-------------------

Using vars defined in .dev.vars
Your Worker and resources are simulated locally via Miniflare. For more information, see: https://developers.cloudflare.com/workers/testing/local-development.

Your worker has access to the following bindings:
- Durable Objects:
  - PROJECT_STATE: ProjectStateObject (defined in lib/durable-objects/ProjectState.ts [not connected])
- Assets:
  - Binding: ASSETS
- Vars:
  - NEXTJS_ENV: "(hidden)"

Service bindings & durable object bindings connect to other `wrangler dev` processes running locally, with their connection status indicated by [connected] or [not connected]. For more details, refer to https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/#local-development

Follow link - not helpful
