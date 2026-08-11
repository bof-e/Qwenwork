import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getToken } from './api';

/**
 * Connexion au namespace /threads du backend (chat.gateway.ts, Module M4).
 *
 * PAS encore utilisé par CollaboratifView.tsx : cet écran affiche
 * aujourd'hui un fil "Lot #2291" entièrement fictif (codé en dur), sans
 * thread_id réel issu de la base. Brancher ce hook dessus tel quel
 * connecterait un socket qui ne recevrait jamais aucun message — silencieux
 * et trompeur plutôt que cassé, donc plus difficile à repérer.
 *
 * À utiliser dès que CollaboratifView.tsx consomme un vrai thread_id (via
 * GET /threads, déjà implémenté côté backend) :
 *
 *   const { messages } = useThreadSocket(realThreadId);
 *
 * Usage prévu :
 *   const { connected, messages } = useThreadSocket(threadId);
 */
export function useThreadSocket<TMessage = unknown>(threadId: string | null) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<TMessage[]>([]);

  useEffect(() => {
    if (!threadId) return;

    const token = getToken();
    if (!token) return; // pas de socket sans authentification — cohérent avec le reste de l'app

    const socket: Socket = io('/threads', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_thread', threadId);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('new_message', (message: TMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.emit('leave_thread', threadId);
      socket.disconnect();
    };
  }, [threadId]);

  return { connected, messages };
}
