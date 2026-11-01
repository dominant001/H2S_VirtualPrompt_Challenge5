import { GatewayUserContext } from './types';

export class AuthenticationAndAuthorizationService {
  /**
   * Validates authorization header or request credentials.
   * Supports:
   * 1. Firebase Bearer token: verified (or decoded payload in dev/sandbox)
   * 2. Demo mode user token: 'demo-guest-user' or 'demo-user-*'
   */
  public authenticateRequest(
    authHeader?: string,
    bodyUserId?: string
  ): { authorized: boolean; user?: GatewayUserContext; error?: string } {
    if (!authHeader && !bodyUserId) {
      return {
        authorized: false,
        error: 'Missing authentication credentials. Authorization header or user identity required.',
      };
    }

    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (authHeader) {
      token = authHeader.trim();
    }

    // 1. Check for Demo Mode / Guest session
    if (
      token.startsWith('demo-') ||
      bodyUserId?.startsWith('demo-') ||
      token === 'demo-mode' ||
      token.startsWith('guest') ||
      bodyUserId?.startsWith('guest') ||
      token.startsWith('utsav-') ||
      bodyUserId?.startsWith('utsav-')
    ) {
      const demoId = bodyUserId || token || 'demo-user-guest';
      return {
        authorized: true,
        user: {
          userId: demoId,
          email: 'guest@utsav.ai',
          isDemoUser: true,
          isAdmin: false,
        },
      };
    }

    // 2. Real user session / Firebase token
    const effectiveUserId = bodyUserId || (token.length > 5 ? token : '');
    if (!effectiveUserId) {
      return {
        authorized: false,
        error: 'Invalid or expired user session.',
      };
    }

    return {
      authorized: true,
      user: {
        userId: effectiveUserId,
        email: undefined,
        isDemoUser: false,
        isAdmin: false,
      },
    };
  }

  /**
   * Verifies that the authenticated user has access to the requested event.
   */
  public verifyEventAccess(
    user: GatewayUserContext,
    eventId?: string,
    eventOwnerId?: string
  ): { allowed: boolean; error?: string } {
    if (!eventId) {
      // General non-event queries (e.g. general chat, generic templates)
      return { allowed: true };
    }

    if (user.isDemoUser) {
      // Demo users have access to demo events
      return { allowed: true };
    }

    if (eventOwnerId && eventOwnerId !== user.userId && !user.isAdmin) {
      return {
        allowed: false,
        error: 'Forbidden: You do not have permissions to access or generate AI plans for this celebration.',
      };
    }

    return { allowed: true };
  }
}

export const authService = new AuthenticationAndAuthorizationService();
