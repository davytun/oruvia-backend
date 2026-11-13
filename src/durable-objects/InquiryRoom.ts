import { DurableObject } from 'cloudflare:workers'

interface ParticipantAttachment {
  userId: string
  role: string
  name: string
}

/**
 * Cloudflare Durable Object managing real-time WebSocket connections
 * for a single Property Inquiry conversation (`inquiry_id`).
 * Uses the WebSocket Hibernation API so idle connections incur minimal cost.
 */
export class InquiryRoom extends DurableObject {
  private getParticipant(ws: WebSocket): ParticipantAttachment | null {
    try {
      const attachment = ws.deserializeAttachment() as ParticipantAttachment | null
      return attachment ?? null
    } catch {
      return null
    }
  }

  private broadcast(payload: unknown, excludeSocket?: WebSocket) {
    const serialized = JSON.stringify(payload)
    for (const socket of this.ctx.getWebSockets()) {
      if (excludeSocket && socket === excludeSocket) continue
      try {
        socket.send(serialized)
      } catch {
        // Socket may have closed unexpectedly; ignore send failure
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Internal broadcast triggered by REST API writes (new_message, messages_read, inquiry_closed)
    if (request.method === 'POST' && url.pathname === '/broadcast') {
      const event = await request.json()
      this.broadcast(event)
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // WebSocket upgrade from authenticated inquiry participant
    const upgradeHeader = request.headers.get('Upgrade')
    if (upgradeHeader?.toLowerCase() !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 })
    }

    const userId = request.headers.get('x-user-id') || ''
    const role = request.headers.get('x-user-role') || ''
    const name = request.headers.get('x-user-name') || 'User'

    const webSocketPair = new WebSocketPair()
    const [client, server] = Object.values(webSocketPair)

    const attachment: ParticipantAttachment = { userId, role, name }
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment(attachment)

    // Collect currently online participants in this room
    const onlineParticipants: ParticipantAttachment[] = []
    for (const socket of this.ctx.getWebSockets()) {
      const info = this.getParticipant(socket)
      if (info) {
        onlineParticipants.push(info)
      }
    }

    // Notify the newly connected client
    try {
      server.send(
        JSON.stringify({
          type: 'connected',
          online_participants: onlineParticipants,
          timestamp: new Date().toISOString(),
        })
      )
    } catch {
      // Ignore
    }

    // Notify other participants in the room of presence
    this.broadcast(
      {
        type: 'presence',
        user_id: userId,
        role,
        name,
        online: true,
        timestamp: new Date().toISOString(),
      },
      server
    )

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string') return

    let parsed: { type?: string; is_typing?: boolean }
    try {
      parsed = JSON.parse(message) as { type?: string; is_typing?: boolean }
    } catch {
      return
    }

    const participant = this.getParticipant(ws)
    const now = new Date().toISOString()

    if (parsed.type === 'ping') {
      try {
        ws.send(JSON.stringify({ type: 'pong', timestamp: now }))
      } catch {
        // Ignore
      }
      return
    }

    if (parsed.type === 'typing' && participant) {
      this.broadcast(
        {
          type: 'typing',
          user_id: participant.userId,
          role: participant.role,
          name: participant.name,
          is_typing: Boolean(parsed.is_typing),
          timestamp: now,
        },
        ws
      )
      return
    }

    if (parsed.type === 'read' && participant) {
      this.broadcast(
        {
          type: 'messages_read',
          reader_id: participant.userId,
          reader_role: participant.role,
          read_at: now,
        },
        ws
      )
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    const participant = this.getParticipant(ws)
    try {
      ws.close(code, reason)
    } catch {
      // Already closed
    }

    if (participant) {
      this.broadcast(
        {
          type: 'presence',
          user_id: participant.userId,
          role: participant.role,
          name: participant.name,
          online: false,
          timestamp: new Date().toISOString(),
        },
        ws
      )
    }
  }

  async webSocketError(ws: WebSocket) {
    const participant = this.getParticipant(ws)
    if (participant) {
      this.broadcast(
        {
          type: 'presence',
          user_id: participant.userId,
          role: participant.role,
          name: participant.name,
          online: false,
          timestamp: new Date().toISOString(),
        },
        ws
      )
    }
  }
}

