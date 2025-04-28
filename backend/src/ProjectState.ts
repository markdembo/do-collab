import { ProjectStateUpdate, validateProjectStateUpdate } from './validation';

import { DurableObject } from 'cloudflare:workers';

// Define available section types
export type SectionType = 'slogan' | 'emojis' | 'backgroundColor' | 'foregroundColor' | 'textSize';

interface User {
	name: string;
	color: string;
}

interface CursorPosition {
	x: number;
	y: number;
}

interface ProjectState {
	slogan: string;
	emojis: string[];
	backgroundColor: string;
	foregroundColor: string;
	textSize: string;
	activeUsers: User[];
	sectionLocks: Record<SectionType, string>;
}

// Define message types for type safety
type WebSocketMessage =
	| { type: 'cursor'; userName: string; position: CursorPosition }
	| { type: 'update'; state: Partial<ProjectState>; userName: string }
	| { type: 'join'; user: User }
	| { type: 'leave' }
	| { type: 'lock-section'; section: SectionType; userName: string }
	| { type: 'unlock-section'; section: SectionType; userName: string };

// Define response types
type WebSocketResponse =
	| { type: 'init'; state: ProjectState; cursors: Record<string, CursorPosition> }
	| { type: 'session'; id: string }
	| { type: 'state'; state: ProjectState }
	| { type: 'users'; users: User[] }
	| { type: 'cursors'; cursors: Record<string, CursorPosition> }
	| { type: 'error'; message?: string; error?: string; errors?: string[] };

export interface Env {
	PROJECT_STATE: DurableObjectNamespace;
}

export class ProjectStateObject extends DurableObject<Env> {
	private state: ProjectState;
	private cursors: Map<string, CursorPosition>;
	private sessions: Map<string, WebSocket>;
	private sessionToUser: Map<string, string>;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.state = {
			slogan: 'Durable Objects are sweet and so are you',
			emojis: [],
			backgroundColor: '#E3F2FD',
			foregroundColor: '#1A237E',
			textSize: 'medium',
			activeUsers: [],
			sectionLocks: {} as Record<SectionType, string>,
		};
		this.cursors = new Map();
		this.sessions = new Map();
		this.sessionToUser = new Map();
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// WebSocket upgrade request
		if (path.endsWith('/ws')) {
			return this.handleWebSocketUpgrade();
		}

		// HTTP API routes
		if (path.endsWith('/state')) {
			if (request.method === 'GET') {
				return Response.json(this.state);
			} else if (request.method === 'POST') {
				return this.handleStateUpdate(request);
			}
		}

		return new Response('Not found', { status: 404 });
	}

	private async handleStateUpdate(request: Request): Promise<Response> {
		const updates = (await request.json()) as ProjectStateUpdate;
		const userName = request.headers.get('X-User-Name');

		// Validate updates before applying them
		const validationResult = validateProjectStateUpdate(updates);
		if (!validationResult.valid) {
			return Response.json(
				{
					success: false,
					errors: validationResult.errors,
				},
				{ status: 400 }
			);
		}

		// Check for section locks
		const lockError = this.checkSectionLocks(updates, userName || '');
		if (lockError) {
			return Response.json(
				{
					success: false,
					error: lockError,
				},
				{ status: 403 }
			);
		}

		this.updateState(updates);
		this.broadcastState();
		return Response.json({ success: true, state: this.state });
	}

	private handleWebSocketUpgrade(): Response {
		// Create WebSocket pair
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		// Accept the WebSocket connection
		this.ctx.acceptWebSocket(server);

		// Send initial state to the client
		const initialData: WebSocketResponse = {
			type: 'init',
			state: this.state,
			cursors: Object.fromEntries(this.cursors),
		};
		server.send(JSON.stringify(initialData));

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	// WebSocket message handler
	async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
		try {
			const data = JSON.parse(message) as WebSocketMessage;

			switch (data.type) {
				case 'cursor':
					this.updateCursor(data.userName, data.position);
					this.broadcastCursors();
					break;

				case 'update':
					await this.handleStateUpdateMessage(ws, data);
					break;

				case 'join':
					this.handleUserJoin(ws, data.user);
					break;

				case 'leave':
					this.handleUserLeave(ws);
					break;

				case 'lock-section':
					this.lockSection(data.section, data.userName);
					this.broadcastState();
					break;

				case 'unlock-section':
					this.unlockSection(data.section, data.userName);
					this.broadcastState();
					break;
			}
		} catch (error) {
			console.error('Error processing WebSocket message:', error);
			this.sendErrorResponse(ws, 'Failed to process message', error);
		}
	}

	private async handleStateUpdateMessage(ws: WebSocket, data: { state: Partial<ProjectState>; userName: string }): Promise<void> {
		// Validate updates before applying them
		const validationResult = validateProjectStateUpdate(data.state);
		if (!validationResult.valid) {
			const errorResponse: WebSocketResponse = {
				type: 'error',
				errors: validationResult.errors,
			};
			ws.send(JSON.stringify(errorResponse));
			return;
		}

		// Check for section locks
		const lockError = this.checkSectionLocks(data.state, data.userName || '');
		if (lockError) {
			const errorResponse: WebSocketResponse = {
				type: 'error',
				error: lockError,
			};
			ws.send(JSON.stringify(errorResponse));
			return;
		}

		this.updateState(data.state);
		this.broadcastState();
	}

	private handleUserJoin(ws: WebSocket, user: User): void {
		const sessionId = crypto.randomUUID();
		this.sessions.set(sessionId, ws);
		this.sessionToUser.set(sessionId, user.name);
		this.addUser(user);

		// Send session ID back to the client
		const sessionResponse: WebSocketResponse = {
			type: 'session',
			id: sessionId,
		};
		ws.send(JSON.stringify(sessionResponse));

		// Broadcast updated state and users
		this.broadcastState();
		this.broadcastUsers();
	}

	private handleUserLeave(ws: WebSocket): void {
		// Find the session ID
		let sessionId = this.findSessionIdByWebSocket(ws);
		if (sessionId) {
			this.removeSession(sessionId);
		}

		this.broadcastUsers();
		this.broadcastState();
	}

	private findSessionIdByWebSocket(ws: WebSocket): string | null {
		for (const [id, socket] of this.sessions.entries()) {
			if (socket === ws) {
				return id;
			}
		}
		return null;
	}

	private removeSession(sessionId: string): void {
		const userName = this.sessionToUser.get(sessionId);
		if (userName) {
			// Release any locks held by this user
			this.releaseUserLocks(userName);
			// Remove user
			this.removeUser(userName);
			// Remove session tracking
			this.sessionToUser.delete(sessionId);
		}
		this.sessions.delete(sessionId);
	}

	private sendErrorResponse(ws: WebSocket, message: string, error: unknown): void {
		const errorResponse: WebSocketResponse = {
			type: 'error',
			message,
			error: error instanceof Error ? error.message : String(error),
		};
		ws.send(JSON.stringify(errorResponse));
	}

	// WebSocket close handler
	async webSocketClose(ws: WebSocket): Promise<void> {
		// Find which session is being closed
		let sessionId = this.findSessionIdByWebSocket(ws);
		if (sessionId) {
			this.removeSession(sessionId);
		}

		// Broadcast updated users and state
		this.broadcastUsers();
		this.broadcastState();
	}

	// WebSocket error handler
	async webSocketError(ws: WebSocket, error: Error): Promise<void> {
		console.error('WebSocket error:', error);
	}

	// Section lock methods
	private lockSection(section: SectionType, userName: string): void {
		// Check if the section is already locked by someone else
		const currentOwner = this.state.sectionLocks[section];
		if (currentOwner && currentOwner !== userName) {
			console.log('Section already locked by another user:', section, currentOwner);
			return; // Cannot lock a section that's already locked by another user
		}

		// Set the lock
		const updatedLocks = { ...this.state.sectionLocks, [section]: userName };
		console.log('Locking section:', section, userName);
		this.state = { ...this.state, sectionLocks: updatedLocks };
	}

	private unlockSection(section: SectionType, userName: string): void {
		// Only the user who locked a section can unlock it
		const currentOwner = this.state.sectionLocks[section];
		if (currentOwner !== userName) {
			console.log('Section not locked by this user:', section, currentOwner);
			return;
		}

		// Create a copy of the locks
		const updatedLocks = { ...this.state.sectionLocks };
		// Remove the lock
		delete updatedLocks[section];
		console.log('Unlocking section:', section, userName);
		// Update the state
		this.state = { ...this.state, sectionLocks: updatedLocks };
	}

	private releaseUserLocks(userName: string): void {
		// Create a copy of the locks
		const updatedLocks = { ...this.state.sectionLocks };
		let hasChanges = false;

		// Find all sections locked by this user and remove them
		for (const section of Object.keys(updatedLocks) as SectionType[]) {
			if (updatedLocks[section] === userName) {
				delete updatedLocks[section];
				hasChanges = true;
			}
		}

		// Only update if there were changes
		if (hasChanges) {
			console.log('Releasing locks for user:', userName);
			this.state = { ...this.state, sectionLocks: updatedLocks };
		}
	}

	private checkSectionLocks(updates: Partial<ProjectState>, userName: string): string | null {
		// Check each section that's being updated against the locks
		const sections: SectionType[] = ['slogan', 'emojis', 'backgroundColor', 'foregroundColor', 'textSize'];

		for (const section of sections) {
			if (updates[section] !== undefined) {
				const owner = this.state.sectionLocks[section];
				if (owner && owner !== userName) {
					return `This section is being edited by another user`;
				}
			}
		}

		return null; // No locks preventing this update
	}

	// State management methods
	private updateState(updates: Partial<ProjectState>): void {
		this.state = { ...this.state, ...updates };
	}

	private addUser(user: User): void {
		// Remove the user first to avoid duplicates
		this.removeUser(user.name);
		this.state.activeUsers.push(user);
	}

	private removeUser(userName: string): void {
		this.state.activeUsers = this.state.activeUsers.filter((user) => user.name !== userName);
		this.cursors.delete(userName);
	}

	private updateCursor(userName: string, position: CursorPosition): void {
		this.cursors.set(userName, position);
	}

	// Broadcasting methods
	private broadcastState(): void {
		this.broadcastToAll({
			type: 'state',
			state: this.state,
		});
	}

	private broadcastUsers(): void {
		this.broadcastToAll({
			type: 'users',
			users: this.state.activeUsers,
		});
	}

	private broadcastCursors(): void {
		this.broadcastToAll({
			type: 'cursors',
			cursors: Object.fromEntries(this.cursors),
		});
	}

	private broadcastToAll(data: WebSocketResponse): void {
		const message = JSON.stringify(data);

		for (const ws of this.sessions.values()) {
			try {
				ws.send(message);
			} catch (error) {
				console.error('Error sending message:', error);
			}
		}
	}
}
