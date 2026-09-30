import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService, VerifyClientPaymentDto } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('razorpay/order')
  async createRazorpayOrder(@Body('order_id') orderId: string) {
    if (!orderId) {
      throw new BadRequestException('order_id is required');
    }
    return this.paymentsService.createRazorpayOrder(orderId);
  }

  @Post('razorpay/verify')
  async verifyClientSignature(@Body() dto: VerifyClientPaymentDto) {
    return this.paymentsService.verifyClientSignature(dto);
  }

  @Post('razorpay/failed')
  async markPaymentFailed(
    @Body('order_id') orderId: string,
    @Body('error_code') errorCode?: string,
    @Body('error_description') errorDescription?: string,
  ) {
    if (!orderId) {
      throw new BadRequestException('order_id is required');
    }
    return this.paymentsService.markPaymentFailed(orderId, errorCode, errorDescription);
  }

  @Post('razorpay/webhook')
  async handleWebhook(
    @Req() req: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    return this.paymentsService.handleWebhook(rawBody, signature);
  }
}

