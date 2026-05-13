import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = client.handshake.auth.token;

      if (!token) {
        throw new WsException('No token provided');
      }

      const user = await this.authService.validateToken(token);

      if (!user) {
        throw new WsException('Invalid token');
      }

      client.data.user = user;
      return true;
    } catch (error) {
      throw new WsException('Unauthorized');
    }
  }
}
