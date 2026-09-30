import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS, TableStatus, OrderStatus } from '@chai-partner/shared';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    // Rooms can be joined for table or admin: client.join('table_1') or client.join('admin')
    const { room } = client.handshake.query;
    if (room && typeof room === 'string') {
      client.join(room);
    }
  }

  handleDisconnect(client: Socket) {
    // Handled automatically by socket.io
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
    return { status: 'joined', room };
  }

  emitTableStatusChanged(tableId: string, status: TableStatus) {
    this.server.emit(SOCKET_EVENTS.TABLE_STATUS_CHANGED, { tableId, status });
  }

  emitOrderStatusChanged(orderId: string, newStatus: OrderStatus, sessionId?: string) {
    this.server.emit(SOCKET_EVENTS.ORDER_STATUS_CHANGED, { orderId, newStatus });
  }

  emitNewOrder(order: any) {
    this.server.emit(SOCKET_EVENTS.ORDER_NEW, { order });
  }

  emitOrderUpdated(orderId: string, changedFields: Record<string, any>) {
    this.server.emit(SOCKET_EVENTS.ORDER_UPDATED, { orderId, changedFields });
  }

  emitAdminAlert(alert: { type: string; title: string; message: string; tableNumber?: number }) {
    this.server.to('admin').emit('admin:alert', alert);
  }
}
