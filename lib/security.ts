import { RateLimiterMemory } from 'rate-limiter-flexible'
import sanitizeHtml from 'sanitize-html'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

// Rate limiting configurations
export const rateLimiters = {
  // General API rate limiter: 100 requests per 15 minutes
  api: new RateLimiterMemory({
    keyPrefix: 'api',
    points: 100,
    duration: 900, // 15 minutes
  }),
  
  // Auth rate limiter: 5 attempts per 15 minutes
  auth: new RateLimiterMemory({
    keyPrefix: 'auth',
    points: 5,
    duration: 900, // 15 minutes
  }),
  
  // Form submission: 10 per minute
  form: new RateLimiterMemory({
    keyPrefix: 'form',
    points: 10,
    duration: 60,
  })
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  }).trim()
}

export function sanitizeParticipantData(data: any) {
  return {
    name: sanitizeInput(data.name || ''),
    skillLevel: Math.max(1, Math.min(10, Number(data.skillLevel) || 5))
  }
}

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// JWT utilities
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-jwt-secret-change-in-production'
)

export async function createToken(payload: any, expirationTime: string = '24h'): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret)
}

export async function verifyToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch (error) {
    throw new Error('Invalid token')
  }
}

// Request validation
export function validateRequest(req: Request): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      errors.push('Invalid Content-Type header')
    }
  }
  
  // Check for required security headers in production
  if (process.env.NODE_ENV === 'production') {
    const origin = req.headers.get('origin')
    const referer = req.headers.get('referer')
    
    if (!origin && !referer) {
      errors.push('Missing origin or referer header')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Session security
export interface SecureSession {
  id: string
  userId?: string
  createdAt: number
  lastActivity: number
  ipAddress?: string
  userAgent?: string
}

export class SessionManager {
  private sessions = new Map<string, SecureSession>()
  private readonly maxAge = 24 * 60 * 60 * 1000 // 24 hours
  
  createSession(userId?: string, ipAddress?: string, userAgent?: string): SecureSession {
    const session: SecureSession = {
      id: crypto.randomUUID(),
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ipAddress,
      userAgent
    }
    
    this.sessions.set(session.id, session)
    return session
  }
  
  getSession(sessionId: string): SecureSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    
    // Check if session expired
    if (Date.now() - session.lastActivity > this.maxAge) {
      this.sessions.delete(sessionId)
      return null
    }
    
    // Update last activity
    session.lastActivity = Date.now()
    return session
  }
  
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }
  
  cleanup(): void {
    const now = Date.now()
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.maxAge) {
        this.sessions.delete(sessionId)
      }
    }
  }
}

export const sessionManager = new SessionManager()

// Security audit logging
export function logSecurityEvent(event: string, details: any = {}) {
  const timestamp = new Date().toISOString()
  console.warn(`[SECURITY] ${timestamp}: ${event}`, details)
  
  // In production, you might want to send this to a logging service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Implement proper logging service integration
  }
}

// Input validation schemas using Zod (already installed)
import { z } from 'zod'

export const participantSchema = z.object({
  name: z.string().min(1, '姓名不能為空').max(50, '姓名長度不能超過50個字符').regex(/^[a-zA-Z\u4e00-\u9fff\s\-\.]+$/, '姓名只能包含中英文字母、空格、連字號和點號'),
  skillLevel: z.number().int().min(1).max(10)
})

export const courtSchema = z.object({
  name: z.string().min(1).max(30),
  isActive: z.boolean()
})

// Environment variable validation
export function validateEnvironmentVariables() {
  const requiredVars = ['NODE_ENV']
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }
  
  // Warn about using default JWT secret
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'default-jwt-secret-change-in-production') {
    console.warn('[SECURITY WARNING] Using default JWT secret. Please set JWT_SECRET environment variable.')
  }
}