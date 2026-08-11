import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  data: { userId?: string; orgId?: string };
}

/**
 * Diffusion temps réel des messages de chat (Chapitre 6.3, M4) — comble le
 * TODO laissé dans threads.service.ts ("nécessite un RedisModule + gateway
 * WebSocket, non implémenté ici").
 *
 * npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
 *
 * Authentification : le client doit fournir le JWT dans
 * `socket.handshake.auth.token` (pas de header Authorization possible en
 * WebSocket natif) — vérifié en RS256 avec la même clé publique que l'API
 * REST (JWT_PUBLIC_KEY).
 *
 * Passage à l'échelle multi-instance : ce gateway utilise l'adaptateur
 * mémoire de Socket.io par défaut (suffisant pour une seule instance de
 * serveur). Pour plusieurs instances derrière un load balancer, brancher
 * @socket.io/redis-adapter (déjà ajouté aux dépendances) dans main.ts via
 * `app.useWebSocketAdapter(new RedisIoAdapter(app))` — non fait ici pour
 * rester dans le périmètre du chat seul.
 */
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' },
  namespace: 'threads',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new UnauthorizedException('Token manquant.');

      const publicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
      if (!publicKey) throw new Error('JWT_PUBLIC_KEY non configuré.');

      const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as { sub: string; org_id?: string };
      client.data.userId = payload.sub;
      client.data.orgId = payload.org_id;
    } catch (err) {
      this.logger.warn(`Connexion WebSocket rejetée : ${err instanceof Error ? err.message : err}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.debug(`Déconnexion : ${client.data.userId ?? 'inconnu'}`);
  }

  /** Le client rejoint la "room" du fil pour recevoir ses messages en direct. */
  @SubscribeMessage('join_thread')
  onJoinThread(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() threadId: string) {
    if (!client.data.userId) return; // non authentifié, déjà déconnecté par handleConnection
    client.join(`thread:${threadId}`);
  }

  @SubscribeMessage('leave_thread')
  onLeaveThread(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() threadId: string) {
    client.leave(`thread:${threadId}`);
  }

  /** Appelé par ThreadsService.postMessage() après écriture en base — jamais depuis le client directement. */
  broadcastMessage(threadId: string, message: unknown) {
    this.server.to(`thread:${threadId}`).emit('new_message', message);
  }
}
