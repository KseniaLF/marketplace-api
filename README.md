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
