import type { Socket } from 'socket.io';
import type { Request } from 'express';
import { supabase, isSupabaseAvailable } from '../config/supabase.js';

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

/**
 * Verify Supabase JWT token and return user if valid
 */
export async function verifyAuthToken(token: string | undefined): Promise<SupabaseUser | null> {
  if (!token || !isSupabaseAvailable()) {
    return null;
  }

  try {
    const { data, error } = await supabase!.auth.getUser(token);

    if (error || !data.user) {
      console.error('[AuthMiddleware] Token verification failed:', error?.message);
      return null;
    }

    return data.user as SupabaseUser;
  } catch (err) {
    console.error('[AuthMiddleware] Error verifying token:', err);
    return null;
  }
}

/**
 * Extract user from WebSocket handshake auth header
 */
export async function extractUserFromSocket(socket: Socket): Promise<SupabaseUser | null> {
  // Try to get token from handshake auth
  const token = socket.handshake.auth?.token;

  if (!token) {
    return null;
  }

  const user = await verifyAuthToken(token);

  if (user) {
    console.log(`[AuthMiddleware] Authenticated user connected: ${user.id} (${user.email})`);
  }

  return user;
}

/**
 * Get userId from socket data (if authenticated)
 */
export function getUserIdFromSocket(socket: Socket): string | undefined {
  return socket.data?.user?.id;
}

/**
 * Check if socket is authenticated
 */
export function isAuthenticatedSocket(socket: Socket): boolean {
  return !!socket.data?.user;
}

/**
 * Extract user from HTTP request Authorization header
 */
export async function getUserFromRequest(req: Request): Promise<SupabaseUser | null> {
  // Try to get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyAuthToken(token);
}
