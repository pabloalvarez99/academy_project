# Clean Architecture

Clean Architecture (Robert C. Martin, 2017) is a set of principles for organizing code so that business logic is independent of frameworks, databases, and delivery mechanisms. It makes systems testable, maintainable, and resilient to change.

## The Core Problem It Solves

Most software architectures couple business logic to infrastructure — the database, the web framework, external APIs. This causes:
- Tests require a running database or HTTP server
- Swapping from PostgreSQL to MongoDB requires touching business logic
- Framework upgrades break domain code
- Business rules are buried inside controllers or ORM models

Clean Architecture enforces a strict boundary between what your system does (business logic) and how it does it (infrastructure).

## The Dependency Rule

> Source code dependencies must point only inward — toward higher-level policies.

```
    ┌─────────────────────────────────────┐
    │         Infrastructure              │  ← Express, PostgreSQL, Redis, Stripe
    │   ┌─────────────────────────────┐   │
    │   │       Interface Adapters    │   │  ← Controllers, Presenters, Gateways
    │   │   ┌─────────────────────┐   │   │
    │   │   │      Use Cases      │   │   │  ← Application business rules
    │   │   │   ┌─────────────┐   │   │   │
    │   │   │   │   Entities  │   │   │   │  ← Enterprise business rules
    │   │   │   └─────────────┘   │   │   │
    │   │   └─────────────────────┘   │   │
    │   └─────────────────────────────┘   │
    └─────────────────────────────────────┘
```

**Entities**: Core business objects and rules. Completely framework-agnostic. Change only when fundamental business rules change (rarely).

**Use Cases**: Application-specific business logic. Orchestrates entities. Defines the inputs and outputs (DTOs). Change when requirements change.

**Interface Adapters**: Convert data between use cases and the outside world. Controllers receive HTTP, call use cases, return responses. Repository implementations translate between use case interfaces and actual DB queries.

**Infrastructure**: Frameworks, databases, UI. The most volatile layer — lives at the outer ring. No inner layer knows it exists.

## Why It Matters

**Testability**: Business logic can be unit-tested with no database, no HTTP server, no network:

```typescript
// This test needs NO database, NO Express, NO external services
describe("PlaceOrder use case", () => {
  it("rejects order when inventory is insufficient", async () => {
    const mockInventory = new MockInventoryRepository({
      "SKU-001": 0  // out of stock
    });
    const useCase = new PlaceOrderUseCase(mockInventory, new MockOrderRepository());

    await expect(
      useCase.execute({ customerId: "c1", items: [{ sku: "SKU-001", qty: 1 }] })
    ).rejects.toThrow(InsufficientInventoryError);
  });
});
```

**Replaceability**: Swap PostgreSQL for MongoDB by writing a new repository implementation — zero changes to use cases or entities:

```typescript
// Use case depends on this interface — not on any concrete DB
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

// Implementation 1: PostgreSQL
class PostgresUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const row = await this.pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return row.rows[0] ? this.toDomain(row.rows[0]) : null;
  }
  // ...
}

// Implementation 2: MongoDB — swap with no use case changes
class MongoUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? this.toDomain(doc) : null;
  }
  // ...
}
```

## Folder Structure (TypeScript)

```
src/
├── domain/                        ← Entities layer
│   ├── entities/
│   │   ├── User.ts                ← User class with business rules
│   │   └── Order.ts
│   ├── errors/
│   │   ├── DomainError.ts
│   │   └── InsufficientInventoryError.ts
│   └── value-objects/
│       ├── Email.ts               ← Validated email value object
│       └── Money.ts
│
├── application/                   ← Use Cases layer
│   ├── use-cases/
│   │   ├── RegisterUser.ts
│   │   ├── PlaceOrder.ts
│   │   └── UpdateUserProfile.ts
│   ├── interfaces/                ← Port definitions (interfaces only)
│   │   ├── UserRepository.ts
│   │   ├── OrderRepository.ts
│   │   └── EmailService.ts
│   └── dtos/
│       ├── RegisterUserDTO.ts
│       └── PlaceOrderDTO.ts
│
├── adapters/                      ← Interface Adapters layer
│   ├── controllers/
│   │   ├── UserController.ts      ← Express route handlers
│   │   └── OrderController.ts
│   └── presenters/
│       └── UserPresenter.ts       ← Maps domain objects to response DTOs
│
└── infrastructure/                ← Infrastructure layer
    ├── repositories/
    │   ├── PostgresUserRepository.ts   ← Implements UserRepository interface
    │   └── PostgresOrderRepository.ts
    ├── services/
    │   └── SendgridEmailService.ts     ← Implements EmailService interface
    ├── http/
    │   └── server.ts                   ← Express setup, DI wiring
    └── config/
        └── database.ts
```

## The UserRepository Interface in Practice

```typescript
// application/interfaces/UserRepository.ts
// This lives in the inner layer — no imports from infrastructure
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
}

// application/use-cases/RegisterUser.ts
export class RegisterUserUseCase {
  constructor(
    private readonly users: UserRepository,      // injected interface
    private readonly emailSvc: EmailService,     // injected interface
    private readonly hasher: PasswordHasher,     // injected interface
  ) {}

  async execute(dto: RegisterUserDTO): Promise<RegisterUserResult> {
    if (await this.users.existsByEmail(dto.email)) {
      throw new EmailAlreadyRegisteredError(dto.email);
    }

    const user = User.create({
      email:        new Email(dto.email),  // validates format in constructor
      passwordHash: await this.hasher.hash(dto.password),
    });

    await this.users.save(user);
    await this.emailSvc.sendWelcome(user.email.value);

    return { userId: user.id };
  }
}

// infrastructure/repositories/PostgresUserRepository.ts
// Outer layer knows about inner interfaces — dependency points inward
import { UserRepository } from "../../application/interfaces/UserRepository";

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE email = $1", [email]
    );
    return result.rows[0] ? UserMapper.toDomain(result.rows[0]) : null;
  }
  // ... other methods
}
```

## Dependency Injection Wiring

The outermost layer wires everything together:

```typescript
// infrastructure/http/server.ts — the composition root
const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

// Infrastructure
const userRepo    = new PostgresUserRepository(dbPool);
const emailSvc    = new SendgridEmailService(process.env.SENDGRID_KEY);
const hasher      = new BcryptPasswordHasher({ rounds: 12 });

// Use cases (injected with concrete implementations)
const registerUser = new RegisterUserUseCase(userRepo, emailSvc, hasher);
const loginUser    = new LoginUserUseCase(userRepo, hasher, jwtService);

// Controllers
const userController = new UserController(registerUser, loginUser);

// Express routes
app.post("/auth/register", userController.register.bind(userController));
app.post("/auth/login",    userController.login.bind(userController));
```

## Over-Engineering Warning

Clean Architecture adds real complexity. Apply it proportionally:

| Scenario | Recommendation |
|---|---|
| Small script / utility | Plain functions, no layers needed |
| Simple CRUD REST API | Repository pattern, skip full layer separation |
| Business logic growing complex | Add use case layer, keep entities |
| Multiple delivery mechanisms (REST + CLI + jobs) | Full Clean Architecture worth it |
| Team > 5 engineers | Explicit boundaries prevent stepping on each other |
| High test coverage required | Full architecture enables fast, reliable unit tests |

The tell: if swapping your database or framework would require touching files in your business logic directory, you have the wrong architecture. If you have none of that logic, you may not need the architecture.

## Interview Questions

**Q: What's the difference between Clean Architecture and MVC?**
A: MVC is a UI pattern that separates view from controller from model. It says nothing about where business rules live — they often end up in fat controllers or "model" classes coupled to ORMs. Clean Architecture is a system-wide principle: business rules are in the center, completely decoupled from delivery (HTTP/CLI/queue) and data storage. You can use MVC for the adapter layer within Clean Architecture.

**Q: How do you handle cross-cutting concerns like logging and transactions?**
A: Via the infrastructure layer, without polluting business logic. Transactions: pass a `UnitOfWork` abstraction into use cases that coordinates multiple repositories. Logging: use structured logging in use cases via an injected `Logger` interface — the concrete logger (Winston, Pino) lives in infrastructure. Middleware handles HTTP-level concerns (request IDs, timing) before the use case is called.
