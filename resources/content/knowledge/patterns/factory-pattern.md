# Factory Pattern

The Factory patterns delegate **object creation** to dedicated code rather than scattering `new` calls throughout the codebase. Three related patterns exist — Simple Factory, Factory Method, and Abstract Factory — each solving progressively harder creation problems.

## What It Is

| Pattern | One-line definition |
|---------|-------------------|
| **Simple Factory** | A single static function/class that decides which concrete type to instantiate |
| **Factory Method** | A base class declares a creation method; subclasses override it to produce different products |
| **Abstract Factory** | An interface for creating *families* of related objects without specifying their concrete classes |

> Core idea: separate "what to build" from "how to build it." Code that uses objects should not care how they are constructed.

## When to Use It

| Signal | Recommended Pattern |
|--------|-------------------|
| 1–3 types, creation logic unlikely to grow | Simple Factory |
| Subclasses should decide which object to create | Factory Method |
| Must create families of related objects that must match | Abstract Factory |
| Construction logic is complex or involves side effects | Any factory (hides complexity) |
| Want to swap implementations without touching callers | Factory Method or Abstract Factory |
| Writing a framework where plugins provide types | Factory Method |

## Structure

### Simple Factory
```
LoggerFactory
+ static create(type: string): Logger
  → returns FileLogger | ConsoleLogger | CloudLogger
```

### Factory Method
```
<<abstract>> LoggerCreator
+ createLogger(): Logger          ← factory method (subclasses override)
+ log(msg): void                  ← uses createLogger() internally

FileLoggerCreator extends LoggerCreator
+ createLogger(): FileLogger

CloudLoggerCreator extends LoggerCreator
+ createLogger(): CloudLogger
```

### Abstract Factory
```
<<interface>> UIFactory
+ createButton(): Button
+ createDialog(): Dialog

WindowsFactory implements UIFactory
MacOSFactory  implements UIFactory
WebFactory    implements UIFactory
```

## Code Example — Python Logger Factory

```python
from abc import ABC, abstractmethod
from datetime import datetime
import sys


# Product interface
class Logger(ABC):
    @abstractmethod
    def log(self, level: str, message: str) -> None: ...

    def info(self, msg: str)  -> None: self.log("INFO",  msg)
    def error(self, msg: str) -> None: self.log("ERROR", msg)
    def debug(self, msg: str) -> None: self.log("DEBUG", msg)


# Concrete products
class ConsoleLogger(Logger):
    def log(self, level: str, message: str) -> None:
        ts = datetime.utcnow().strftime("%H:%M:%S")
        stream = sys.stderr if level == "ERROR" else sys.stdout
        print(f"[{ts}] [{level}] {message}", file=stream)


class FileLogger(Logger):
    def __init__(self, path: str) -> None:
        self._path = path

    def log(self, level: str, message: str) -> None:
        ts = datetime.utcnow().isoformat()
        with open(self._path, "a") as fh:
            fh.write(f"{ts} [{level}] {message}\n")


class CloudLogger(Logger):
    def __init__(self, endpoint: str, api_key: str) -> None:
        self._endpoint = endpoint
        self._api_key  = api_key

    def log(self, level: str, message: str) -> None:
        import urllib.request, json
        payload = json.dumps({"level": level, "message": message}).encode()
        req = urllib.request.Request(
            self._endpoint,
            data=payload,
            headers={"Authorization": f"Bearer {self._api_key}",
                     "Content-Type": "application/json"},
        )
        urllib.request.urlopen(req)


# ── Simple Factory ────────────────────────────────────────────────────────────
class LoggerFactory:
    @staticmethod
    def create(logger_type: str, **kwargs: str) -> Logger:
        match logger_type:
            case "console":
                return ConsoleLogger()
            case "file":
                return FileLogger(path=kwargs["path"])
            case "cloud":
                return CloudLogger(endpoint=kwargs["endpoint"],
                                   api_key=kwargs["api_key"])
            case _:
                raise ValueError(f"Unknown logger type: {logger_type!r}")


# ── Factory Method ────────────────────────────────────────────────────────────
class Application(ABC):
    """Base class; subclasses choose the logger via factory method."""

    @abstractmethod
    def create_logger(self) -> Logger:   # factory method
        ...

    def run(self) -> None:
        logger = self.create_logger()
        logger.info("Application started")
        self._do_work(logger)

    def _do_work(self, logger: Logger) -> None:
        logger.debug("Doing work...")


class DevApplication(Application):
    def create_logger(self) -> Logger:
        return ConsoleLogger()


class ProdApplication(Application):
    def create_logger(self) -> Logger:
        return FileLogger("/var/log/app.log")


# Usage
env = "dev"  # from config / env var
app: Application = DevApplication() if env == "dev" else ProdApplication()
app.run()

# Simple factory usage
log = LoggerFactory.create("console")
log.info("Hello from simple factory")
```

## Abstract Factory Example Sketch

```python
# When you need entire families to match (e.g., all loggers for one environment)

class LoggingStack(ABC):
    @abstractmethod
    def app_logger(self)   -> Logger: ...
    @abstractmethod
    def audit_logger(self) -> Logger: ...
    @abstractmethod
    def perf_logger(self)  -> Logger: ...

class LocalStack(LoggingStack):
    def app_logger(self)   -> Logger: return ConsoleLogger()
    def audit_logger(self) -> Logger: return FileLogger("/tmp/audit.log")
    def perf_logger(self)  -> Logger: return ConsoleLogger()

class ProductionStack(LoggingStack):
    def app_logger(self)   -> Logger: return CloudLogger("https://logs.example.com", "key")
    def audit_logger(self) -> Logger: return CloudLogger("https://audit.example.com", "key")
    def perf_logger(self)  -> Logger: return CloudLogger("https://perf.example.com", "key")
```

## Trade-offs and Pitfalls

| Pro | Con |
|-----|-----|
| Centralizes creation logic — one place to change | Simple Factory violates Open/Closed (add case = edit factory) |
| Clients depend only on interface, not concrete class | Abstract Factory can balloon: N products × M variants = N×M classes |
| Makes construction testable via mock factories | Adds indirection — can confuse readers unfamiliar with the pattern |
| Enables runtime type selection from config/env | Over-use: `new MyThing()` is fine when there's no variation |

**Pitfall — Simple Factory bloat**: As `match`/`switch` grows, extract to Factory Method or a registry (`dict[str, type]`) instead.

**Pitfall — Confusing the three variants**: Interviewers often say "factory pattern" and mean Factory Method. Clarify which one before designing.

## Real-World Examples

| System | Factory Use |
|--------|------------|
| Java `Calendar.getInstance()` | Simple factory — returns locale-appropriate subclass |
| JDBC `DriverManager.getConnection()` | Returns correct `Connection` impl for the URL scheme |
| Python `logging.getLogger()` | Returns existing or new logger by name |
| React `createElement` / JSX transform | Factory method — creates element descriptors |
| Angular Dependency Injection | Abstract factory via provider tokens |
| AWS CDK `Construct` | Factory method pattern throughout CDK constructs |
| Mongoose `model()` | Returns a model class bound to a specific schema |
