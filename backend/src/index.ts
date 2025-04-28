export { ProjectStateObject } from './ProjectState';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware to all routes
app.use('*', cors());

// Route to generate a new project ID
app.post('/generate', async (c) => {
	const id = c.env.PROJECT_STATE.newUniqueId().toString();
	return c.json({ id });
});

// Route to handle project requests
app.all('/:projectId/*', async (c) => {
	try {
		const projectId = c.req.param('projectId');

		let id: DurableObjectId;
		if (projectId) {
			id = c.env.PROJECT_STATE.idFromName(projectId);
		} else {
			// Create a new project state instance if no project ID is provided
			id = c.env.PROJECT_STATE.newUniqueId();
		}

		const stub = c.env.PROJECT_STATE.get(id);
		// Methods on the Durable Object are invoked via the stub
		return await stub.fetch(c.req.url, c.req.raw);
	} catch (error: unknown) {
		console.error('Error in handler:', error);
		return c.json({ error: 'Internal Server Error' }, 500);
	}
});

app.notFound((c) => {
	return c.json({ error: 'Not Found' }, 404);
});

export default {
	fetch: app.fetch,
} satisfies ExportedHandler<Env>;
