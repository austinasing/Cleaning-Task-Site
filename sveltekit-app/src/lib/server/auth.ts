/**
 * Authentication Helpers
 *
 * Handles password hashing (bcrypt) and JWT token management.
 *
 * HOW IT WORKS:
 * - bcrypt: One-way hashing for passwords. You can verify a password against
 *   a hash, but you can never reverse the hash back to the password.
 * - JWT (JSON Web Token): A signed token containing user data (id, role).
 *   The server signs it with a secret key. If anyone tampers with the token,
 *   the signature won't match and the server rejects it.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';
import type { ObjectId } from 'mongodb';

// Number of salt rounds for bcrypt (higher = more secure but slower)
// 12 is a good balance for a small app
const SALT_ROUNDS = 12;

// JWT expiration time (7 days)
const JWT_EXPIRATION = '30d';

// ===================================
// PASSWORD FUNCTIONS
// ===================================

/**
 * Hash a plaintext password
 * Used when creating or updating a user's password
 *
 * Example:
 *   const hash = await hashPassword("mySecretPassword");
 *   // hash = "$2b$12$LJ3..." (60 character string)
 */
export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a stored hash
 * Returns true if they match, false otherwise
 *
 * Example:
 *   const isValid = await verifyPassword("mySecretPassword", storedHash);
 *   if (isValid) { // login success }
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

// ===================================
// JWT FUNCTIONS
// ===================================

/**
 * Payload stored inside the JWT token
 * This is the user data we attach to every authenticated request
 */
export interface JwtPayload {
	userId: string; // ObjectId as string
	name: string;
	role: 'member' | 'admin' | 'accountant';
}

/**
 * Create a signed JWT token for a user
 * Called after successful login
 *
 * Example:
 *   const token = createToken(user._id, user.name, user.role);
 *   // token = "eyJhbGc..." (long encoded string)
 */
export function createToken(userId: ObjectId, name: string, role: string): string {
	const payload: JwtPayload = {
		userId: userId.toString(),
		name,
		role: role as JwtPayload['role']
	};

	return jwt.sign(payload, getJwtSecret(), {
		expiresIn: JWT_EXPIRATION
	});
}

/**
 * Verify and decode a JWT token
 * Returns the payload if valid, null if expired or tampered
 *
 * Example:
 *   const payload = verifyToken(tokenFromCookie);
 *   if (payload) {
 *     console.log(payload.userId, payload.name, payload.role);
 *   }
 */
export function verifyToken(token: string): JwtPayload | null {
	try {
		const decoded = jwt.verify(token, getJwtSecret());
		return decoded as JwtPayload;
	} catch {
		// Token is expired, invalid, or tampered with
		return null;
	}
}

/**
 * Get the JWT secret from environment variables
 */
function getJwtSecret(): string {
	const secret = env.JWT_SECRET;
	if (!secret) {
		throw new Error('JWT_SECRET environment variable is not set');
	}
	return secret;
}
