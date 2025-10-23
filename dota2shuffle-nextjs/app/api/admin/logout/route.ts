import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'

export async function POST() {
  try {
    await destroySession()

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
