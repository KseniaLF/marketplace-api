import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Headers,
  BadRequestException,
} from "@nestjs/common";
import { CreateOrderDto } from "./orders/dto/create-order.dto";

type Health = {
  status: string;
  uptimeSec: number;
};

@Controller()
export class AppController {
  @Get("health")
  health(): Health {
    return {
      status: "ok",
      uptimeSec: Math.round(process.uptime()),
    };
  }

  @Get("products")
  products() {
    const items = [
      {
        id: "id",
        seller_id: "sellerId",
        name: "Product name",
        price_cents: 20,
        currency: "EUR",
        stock: 5,
        image_urls: [],
      },
    ];

    return {
      items,
      next_cursor: null,
    };
  }

  @Post("orders")
  @HttpCode(201)
  orders(
    @Body() body: CreateOrderDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException("Idempotency-Key header is required");
    }

    const { buyer_id, delivery_address, items: orderItems } = body;

    let total_cents = 0;

    const items = orderItems.map((item) => {
      const unit_price_cents = 5;
      total_cents = total_cents + item.quantity * unit_price_cents;

      return {
        ...item,
        product_name: "TEST",
        unit_price_cents,
      };
    });

    const order = {
      buyer_id,
      delivery_address,
      items,
      id: "order-1",
      seller_id: "seller_id",
      status: "pending_payment",
      payment_status: "pending",
      shipment_status: "not_started",
      total_cents,
      currency: "EUR",
      created_at: new Date().toISOString(),
    };

    return order;
  }
}
