# Marketplace API

## 1. Service overview

Marketplace API is a backend service for buyers and independent sellers.
Buyers can browse products and place orders, while sellers can publish products,
manage their availability, and process received orders.

The first version focuses on a reliable order flow: checking product availability,
preserving purchase-time prices, preventing duplicate orders, tracking payment
and delivery states, and notifying participants about important changes.

### User stories

- As a buyer, I want to browse available products and view their details.
- As a buyer, I want to place an order without risking duplicate charges when a request is retried.
- As a buyer, I want to track the payment and delivery state of my order.
- As a seller, I want to publish products and update their price and available stock.
- As a seller, I want to prepare and ship paid orders or report that an order cannot be fulfilled.

## 2. Domain

The Marketplace domain consists of the following core entities:

- **User** represents a buyer or seller.
- **Product** belongs to a seller and contains its current price, available stock, description, and images.
- **Order** belongs to one buyer and one seller and tracks the overall order state.
- **OrderItem** connects an order with a product and stores the quantity and purchase-time price.
- **Payment** tracks payment, refund, and seller payout states for an order.
- **Shipment** stores the delivery address, provider, tracking number, and delivery state.

An order contains products from only one seller. If a buyer checks out products
from different sellers, the system creates a separate order for each seller.

### Entity relationships

```text
User (seller) 1 ─── * Product
User (buyer)  1 ─── * Order
User (seller) 1 ─── * Order
Order         1 ─── * OrderItem
Product       1 ─── * OrderItem
Order         1 ─── 1 Payment
Order         1 ─── 1 Shipment
```

### Domain suitability check

| Requirement                                       | How the domain satisfies it                                                        |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| At least two roles with different permissions     | Buyers place orders; sellers manage products and process received orders           |
| A limited resource with concurrent access         | Product stock can be requested by multiple buyers simultaneously                   |
| An operation with an irreversible external effect | Payment, refund, and seller payout operations affect money                         |
| An event that requires notification               | Buyers and sellers are notified when payment, order, or delivery states change     |
| An entity containing files                        | Products contain images stored in object storage                                   |
| Frequently read and rarely changed data           | The product catalogue is read much more frequently than it is updated              |
| Related entities and a complex query              | An order details query joins buyer, seller, items, products, payment, and shipment |

## 3. Architecture decisions

- **Compute model:** The initial application will be a modular monolith built with
  Node.js and NestJS. Products, orders, payments, and shipments remain separate
  modules inside one deployable application.
- **Database:** PostgreSQL will be the primary database because order creation and
  stock reservation require transactions and consistent updates under concurrent
  requests.
- **Asynchronous processing:** External payment, delivery, and notification work
  will be processed asynchronously through events and queues. Transactional
  events will later use the outbox pattern.
- **Authentication and authorization:** The planned API will use token-based
  authentication and role-based access for buyers and sellers. Authentication is
  intentionally excluded from the initial HW-09 OpenAPI contract.
- **Deployment:** The application will be packaged with Docker and initially
  deployed as a single service with its supporting database and infrastructure.
- **Order consistency:** Creating an order reserves product stock for 30 minutes.
  Successful payment confirms the reservation; payment timeout cancels the order
  and releases the stock.

## 4. Trade-offs

- One order contains products from one seller. A checkout involving several
  sellers creates separate orders, simplifying shipment, cancellation, refund,
  and payout handling.
- The initial version has no server-side cart. The client sends selected product
  identifiers and quantities when creating an order.
- The server determines current product prices and stores purchase-time price
  snapshots in order items. Client-provided prices and totals are not trusted.
- The project starts as a modular monolith instead of microservices. This reduces
  operational complexity while preserving clear module boundaries.
- Real card payments and courier integrations are outside the initial scope.
  Payment and delivery providers will first be represented by replaceable test
  adapters.
- Advanced marketplace features such as recommendations, advertising, loyalty
  programmes, and international taxation are outside the course scope.

## 5. API contract and request validation

The application is implemented with NestJS.

The OpenAPI document is stored in `openapi/openapi.yaml` and validated statically with Redocly:

```bash
npm run lint:openapi
npm run bundle:openapi
```

Incoming request bodies are validated at runtime using NestJS `ValidationPipe`, `class-validator`, and DTO classes.

The global validation pipe:

- rejects unknown properties;
- validates required fields and their types;
- validates nested order items;
- requires at least one order item;
- transforms incoming objects into DTO instances.

The required `Idempotency-Key` header is validated separately by the orders controller.

A valid order request returns `201 Created`:

```bash
curl -i -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: order-demo-1" \
  -d '{"buyer_id":"buyer-1","delivery_address":"Amsterdam","items":[{"product_id":"product-1","quantity":2}]}'
```

A request without `Idempotency-Key` returns `400 Bad Request`:

```bash
curl -i -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"buyer_id":"buyer-1","delivery_address":"Amsterdam","items":[{"product_id":"product-1","quantity":2}]}'
```

An empty `items` array also returns `400 Bad Request`:

```bash
curl -i -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: empty-items-1" \
  -d '{"buyer_id":"buyer-1","delivery_address":"Amsterdam","items":[]}'
```

## Configuration

The application validates its environment variables during startup using Zod. If a required variable is missing or invalid, the application fails fast before accepting requests.

| Variable           | Required | Default               | Description                                                        |
| ------------------ | -------- | --------------------- | ------------------------------------------------------------------ |
| `PORT`             | No       | `3000`                | HTTP port used by the API. Must be an integer between 1 and 65535. |
| `DB_URL`           | Yes      | —                     | PostgreSQL connection URL without a password.                      |
| `DB_PASSWORD_FILE` | No       | `secrets/db_password` | Path to the file containing the PostgreSQL password.               |
| `LOG_LEVEL`        | No       | `info`                | Application log level: `debug`, `info`, `warn`, or `error`.        |

The database password must not be included in `DB_URL`. It is stored in a separate file so the running application can read an updated password when the connection pool creates a new database connection.

Create the local environment file:

```bash
cp .env.example .env
```

Create the password file before the first PostgreSQL startup:

```bash
mkdir -p secrets
printf '%s' 'change-me-locally' > secrets/db_password
```

The `.env` file and the contents of `secrets/` are excluded from Git and the Docker build context. Never commit real credentials.

> Changing the password file after PostgreSQL has initialized its data volume does not change the database role password automatically. Use `rotate.sh` for password rotation.

## Running with Docker Compose

Build and start the API and PostgreSQL:

```bash
docker compose up -d --build
```

Check the container status:

```bash
docker compose ps
```

The services use the following addresses:

- API from the host: `http://localhost:3000`;
- PostgreSQL from the host: `localhost:21110`;
- PostgreSQL from the API container: `db:5432`.

Inside the Compose network, `db` is resolved through Docker DNS to the PostgreSQL container. `localhost` inside the API container would refer to the API container itself.

Check the API:

```bash
curl http://localhost:3000/health
```

Check the database connection:

```bash
curl http://localhost:3000/db
```

A successful response contains the PostgreSQL role and the current database time:

```json
{
  "current_user": "app_user",
  "now": "2026-10-20 09:06:47.467123+00"
}
```

Stop the services:

```bash
docker compose down
```

To remove the PostgreSQL data volume as well:

```bash
docker compose down -v
```

Warning: removing the volume permanently deletes the local database data.

## Database Password Rotation

The PostgreSQL password can be rotated without restarting the API:

```bash
./rotate.sh
```

If the script is not executable yet:

```bash
chmod +x rotate.sh
```

The rotation script:

1. generates a new random password;
2. changes the password of the PostgreSQL `app_user` role;
3. writes the same password to `secrets/db_password`;
4. terminates old `app_user` database connections.

The NestJS process keeps one long-lived `pg.Pool`. The pool uses a password callback that reads `DB_PASSWORD_FILE` whenever it creates a new physical connection. Existing connections do not need to authenticate again, while new connections use the updated password.

Verify that the API still works after rotation:

```bash
curl http://localhost:3000/db
curl http://localhost:3000/health
docker compose ps
```

The API uptime and container creation time should continue increasing, proving that password rotation did not restart the application.

## Validation

Run the TypeScript check:

```bash
npm run typecheck
```

Verify that `.env.example` contains the same variable names as the Zod schema:

```bash
npm run check:env
```

Validate the OpenAPI document:

```bash
npm test
```
