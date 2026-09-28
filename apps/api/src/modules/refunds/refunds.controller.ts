import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RefundsService, ProcessRefundDto } from './refunds.service';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { AdminRole } from '@chai-partner/shared';

export interface CancelOrderWithRefundDto extends ProcessRefundDto {
  order_id?: string;
}

@Controller('admin/refunds')
@UseGuards(AdminAuthGuard, RolesGuard)
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  /**
   * BRAIN Rule 7: Process refund and cancel order
   * Allowed for Admin and Cashier roles
   */
  @Post('cancel-order/:orderId')
  @Roles(AdminRole.ADMIN, AdminRole.CASHIER)
  async cancelOrderWithParam(
    @Param('orderId') orderId: string,
    @Body() dto: ProcessRefundDto,
    @Request() req: any,
  ) {
    const processedBy = req.user?.name || req.user?.id || 'admin';
    return this.refundsService.processRefundAndCancelOrder(orderId, dto, processedBy);
  }

  @Post('cancel-order')
  @Roles(AdminRole.ADMIN, AdminRole.CASHIER)
  async cancelOrderWithBody(
    @Body() dto: CancelOrderWithRefundDto,
    @Request() req: any,
  ) {
    const orderId = dto.order_id!;
    const processedBy = req.user?.name || req.user?.id || 'admin';
    return this.refundsService.processRefundAndCancelOrder(
      orderId,
      { amount: dto.amount, reason: dto.reason },
      processedBy,
    );
  }

  @Get('order/:orderId')
  @Roles(AdminRole.ADMIN, AdminRole.CASHIER, AdminRole.KITCHEN)
  async getRefundsByOrderId(@Param('orderId') orderId: string) {
    return this.refundsService.getRefundsByOrderId(orderId);
  }
}
