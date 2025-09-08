import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters, validateRequest, sanitizeParticipantData, participantSchema, logSecurityEvent } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    
    // Rate limiting
    try {
      await rateLimiters.api.consume(clientIp)
      await rateLimiters.form.consume(clientIp)
    } catch (rateLimiterRes) {
      logSecurityEvent('Rate limit exceeded', { ip: clientIp, endpoint: '/api/participants' })
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }
    
    // Request validation
    const validation = validateRequest(request)
    if (!validation.isValid) {
      logSecurityEvent('Invalid request', { ip: clientIp, errors: validation.errors })
      return NextResponse.json(
        { error: 'Invalid request', details: validation.errors },
        { status: 400 }
      )
    }
    
    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }
    
    // Sanitize and validate participant data
    const sanitizedData = sanitizeParticipantData(body)
    const validatedData = participantSchema.parse(sanitizedData)
    
    // Here you would normally save to database
    // For now, we'll just return the validated data
    const participant = {
      id: Date.now().toString(),
      ...validatedData,
      gamesPlayed: 0,
      createdAt: new Date().toISOString()
    }
    
    logSecurityEvent('Participant created', { participantId: participant.id, ip: clientIp })
    
    return NextResponse.json({
      success: true,
      participant
    }, { status: 201 })
    
  } catch (error) {
    const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    logSecurityEvent('API error', { error: error.message, ip: clientIp, endpoint: '/api/participants' })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    
    // Rate limiting
    try {
      await rateLimiters.api.consume(clientIp)
    } catch (rateLimiterRes) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }
    
    // Here you would normally fetch from database
    // For demonstration, return empty array
    return NextResponse.json({
      success: true,
      participants: []
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}