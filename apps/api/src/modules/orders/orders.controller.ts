import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  Request,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ReconciliationService } from './reconciliation.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  SettleOrderDto,
  AdminRole,
  OrderStatus,
  PaymentMethod,
} from '@chai-partner/shared';
import { JwtService } from '@nestjs/jwt';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly reconciliationService: ReconciliationService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('reports/pending-reconciliation')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN)
  async getReconciliationReport() {
    return this.reconciliationService.generatePendingPaymentReport(2);
  }

  @Post()
  async placeOrder(
    @Headers('authorization') authHeader: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: CreateOrderDto,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Session token required to place order');
    }
    const token = authHeader.split(' ')[1];
    let sessionId: string;
    try {
      const decoded = this.jwtService.verify(token);
      sessionId = decoded.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired session token');
    }

    return this.ordersService.placeOrder(sessionId, dto, idempotencyKey);
  }

  @Get('queue')
  async getLiveQueue() {
    return this.ordersService.getLiveQueue();
  }

  @Get('history')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.CASHIER, AdminRole.KITCHEN)
  async getOrderHistory(
    @Query('search') search?: string,
    @Query('range') range?: 'day' | 'week' | 'month' | 'year' | 'all',
    @Query('status') status?: OrderStatus,
    @Query('payment_method') payment_method?: PaymentMethod,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.getOrderHistory({
      search,
      range,
      status,
      payment_method,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Patch(':id/status')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.KITCHEN, AdminRole.CASHIER)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req: any,
  ) {
    const adminId = req.user?.id || 'admin-staff';
    const adminName = req.user?.name || 'Staff Member';
    return this.ordersService.transitionStatus(
      id,
      dto.expected_status,
      dto.new_status,
      adminId,
      adminName,
    );
  }

  @Post(':id/settle')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.CASHIER)
  async settleOrder(
    @Param('id') id: string,
    @Body() dto: SettleOrderDto,
    @Request() req: any,
  ) {
    const adminId = req.user?.id || 'cashier-staff';
    const adminName = req.user?.name || 'Counter Cashier';
    return this.ordersService.settleOrder(
      id,
      dto.payment_method,
      adminId,
      adminName,
    );
  }
}
