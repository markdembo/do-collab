import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

// Define the WebSocket message types
export interface WebSocketMessage {
  type: string;
  // Allow specific known message properties
  state?: ProjectState;
  cursors?: Record<string, CursorPosition>;
  users?: User[];
  user?: User;
  userName?: string;
  position?: CursorPosition;
  id?: string;
  errors?: string[];
  error?: string;
  message?: string;
  // Remove locks property since it's now part of state
  section?: SectionType;
  // Allow additional string-indexed properties
  [key: string]: unknown;
}

export interface User {
  name: string;
  color: string;
}

// Section lock types
export type SectionType = "slogan" | "emojis" | "backgroundColor" | "foregroundColor" | "textSize";

export interface ProjectState {
  slogan: string;
  emojis: string[];
  backgroundColor: string;
  foregroundColor: string;
  textSize: string;
  activeUsers: User[];
  // Add section locks to main state
  sectionLocks: Record<SectionType, string>;
}

export interface CursorPosition {
  x: number;
  y: number;
}

// Error response interface
interface ErrorResponse {
  success: boolean;
  errors?: string[];
  message?: string;
  error?: string;
}

export class ProjectAPI {
  private projectId: string;
  private baseUrl: string;
  private socket: WebSocket | null = null;
  private listeners = new Set<(data: WebSocketMessage) => void>();
  private userName: string = "";
  private userColor: string = "";
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;

  constructor(projectId: string) {
    this.projectId = projectId;

    this.baseUrl = `https://do-collab-backend.not-a-single-bug.com/${projectId}`;
  }

  // Set user information
  setUser(userName: string, userColor: string): void {
    this.userName = userName;
    this.userColor = userColor;
  }

  // HTTP API methods
  async getState(): Promise<ProjectState> {
    const response = await fetch(`${this.baseUrl}/state`);
    if (!response.ok) {
      throw new Error(`Failed to get state: ${response.statusText}`);
    }
    return response.json();
  }

  async updateState(updates: Partial<ProjectState>): Promise<boolean> {
    // Try to use WebSocket for updates if available
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "update",
          state: updates,
          userName: this.userName,
        })
      );
      return true; // Assume success for WebSocket, errors will come back via messages
    }

    // Fall back to HTTP
    try {
      const response = await fetch(`${this.baseUrl}/state`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Name": this.userName,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ErrorResponse;
        if (errorData.errors && Array.isArray(errorData.errors)) {
          // Show each validation error as a toast
          errorData.errors.forEach((error: string) => {
            toast.error(error);
          });
        } else if (errorData.error) {
          toast.error(errorData.error);
        } else {
          toast.error(`Failed to update state: ${response.statusText}`);
        }
        return false;
      }
      return true;
    } catch (error) {
      toast.error(
        `Error updating state: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  async updateCursor(position: CursorPosition): Promise<void> {
    // Prefer WebSocket for cursor updates if connected
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "cursor",
          userName: this.userName,
          position,
        })
      );
      return;
    }
  }

  // Section lock functions
  lockSection(section: SectionType): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "lock-section",
          section,
          userName: this.userName,
        })
      );
    }
  }

  unlockSection(section: SectionType): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "unlock-section",
          section,
          userName: this.userName,
        })
      );
    }
  }

  // WebSocket methods
  connectWebSocket(): void {
    // Don't try to reconnect if we're already in the process
    if (this.isReconnecting) return;

    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close existing connection if any
    if (this.socket) {
      this.socket.close();
    }

    // Using the catch-all route, the WebSocket uses the same URL as the API
    const wsUrl = `wss://do-collab-backend.not-a-single-bug.com/${this.projectId}/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log("WebSocket connection established");
        this.isReconnecting = false;

        // Send join message once connected
        if (this.socket?.readyState === WebSocket.OPEN && this.userName) {
          this.socket.send(
            JSON.stringify({
              type: "join",
              user: { name: this.userName, color: this.userColor },
            })
          );
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle error messages
          if (data.type === "error") {
            if (data.errors && Array.isArray(data.errors)) {
              // Show each validation error as a toast
              data.errors.forEach((error: string) => {
                toast.error(error);
              });
            } else if (data.message) {
              toast.error(data.message);
            } else if (data.error) {
              toast.error(data.error);
            } else {
              toast.error("An error occurred");
            }
          }

          this.notifyListeners(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.socket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        this.socket = null;

        // Attempt to reconnect after a delay if it wasn't intentionally closed
        if (!this.isReconnecting) {
          this.isReconnecting = true;
          this.reconnectTimeout = setTimeout(() => {
            this.connectWebSocket();
          }, 2000);
        }
      };

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast.error("Connection error. Trying to reconnect...");
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      toast.error("Failed to connect. Retrying...");
      // Try to reconnect after a delay
      this.isReconnecting = true;
      this.reconnectTimeout = setTimeout(() => {
        this.connectWebSocket();
      }, 3000);
    }
  }

  disconnectWebSocket(): void {
    // Cancel any pending reconnect attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isReconnecting = false;

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Event listener management
  addListener(callback: (data: WebSocketMessage) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(data: WebSocketMessage): void {
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error("Error in listener:", error);
      }
    }
  }
}

// React hook for using the ProjectAPI
export function useProjectService(projectId: string, userName: string, userColor: string) {
  const [state, setState] = useState<ProjectState | null>(null);
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});
  const [isConnected, setIsConnected] = useState(false);
  const apiRef = useRef<ProjectAPI | null>(null);

  // Initialize the API
  useEffect(() => {
    // Skip initialization if no userName
    if (!userName) return;

    const api = new ProjectAPI(projectId);
    apiRef.current = api;

    // Set user information
    api.setUser(userName, userColor);

    // Connect WebSocket first
    api.connectWebSocket();
    setIsConnected(true);

    // Add WebSocket event listener - must be added before getState
    const removeListener = api.addListener((data) => {
      if (data.type === "state" && data.state) {
        setState(data.state);
      } else if (data.type === "cursors" && data.cursors) {
        setCursors(data.cursors);
      } else if (data.type === "users" && data.users) {
        // Update state with new users list
        setState((currentState) =>
          currentState
            ? {
                ...currentState,
                activeUsers: Array.isArray(data.users) ? data.users : [],
              }
            : null
        );
      } else if (data.type === "init") {
        if (data.state) setState(data.state);
        if (data.cursors) setCursors(data.cursors);
      }
    });

    // Get initial state as a fallback
    // WebSocket "init" message will be received first in most cases
    api
      .getState()
      .then((initialState) => {
        // Only use this if we don't have state yet
        setState((currentState) => currentState || initialState);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to load initial state");
      });

    // Cleanup function
    return () => {
      removeListener();
      api.disconnectWebSocket();
      setIsConnected(false);
    };
  }, [projectId, userName, userColor]);

  // Update state method
  const updateState = useCallback(async (updates: Partial<ProjectState>) => {
    if (apiRef.current) {
      try {
        const success = await apiRef.current.updateState(updates);
        return success;
      } catch (error) {
        console.error("Failed to update state:", error);
        toast.error("Failed to update state");
        return false;
      }
    }
    return false;
  }, []);

  // Update cursor position method
  const updateCursor = useCallback((position: CursorPosition) => {
    if (apiRef.current) {
      apiRef.current.updateCursor(position).catch(console.error);
    }
  }, []);

  // Lock section method (send to server)
  const lockSection = useCallback((section: SectionType) => {
    if (apiRef.current) {
      apiRef.current.lockSection(section);
    }
  }, []);

  // Unlock section method (send to server)
  const unlockSection = useCallback((section: SectionType) => {
    if (apiRef.current) {
      apiRef.current.unlockSection(section);
    }
  }, []);

  // Helper to check if a section is locked by current user
  const isSectionLockedByMe = useCallback(
    (section: SectionType): boolean => {
      return state?.sectionLocks?.[section] === userName;
    },
    [state, userName]
  );

  // Helper to check if a section is locked by another user
  const isSectionLockedByOthers = useCallback(
    (section: SectionType): { locked: boolean; userName?: string; userColor?: string } => {
      const lockOwner = state?.sectionLocks?.[section];
      if (!lockOwner || lockOwner === userName) return { locked: false };

      const user = state?.activeUsers.find((u) => u.name === lockOwner);
      return {
        locked: true,
        userName: lockOwner,
        userColor: user?.color,
      };
    },
    [state, userName]
  );

  return {
    state,
    cursors,
    isConnected,
    updateState,
    updateCursor,
    lockSection,
    unlockSection,
    isSectionLockedByMe,
    isSectionLockedByOthers,
  };
}
