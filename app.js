const express = require("express");
const path = require("node:path");
const OpenApiValidator = require("express-openapi-validator");
const { STATUS_CODES } = require("node:http");

const app = express();
const port = 3000;

app.use(express.json());

app.use(
  OpenApiValidator.middleware({
    apiSpec: path.join(__dirname, "openapi/openapi.yaml"),
    validateRequests: true,
    validateResponses: true,
  }),
);

app.get("/products", (_req, res) => {
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
  res.status(200).json({ items, next_cursor: null });
});

app.post("/orders", (req, res) => {
  const { buyer_id, delivery_address, items: orderItems } = req.body;

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

  res.status(201).json(order);
});

app.use((err, req, res, _next) => {
  res.type("application/problem+json");

  const status = err.status || 500;
  res.status(status).json({
    errors: err.errors,
    type: "/errors/validation",
    title: STATUS_CODES[status],
    status,
    detail: err.message,
    instance: req.originalUrl,
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
