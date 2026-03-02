# Processes and Threads

## Process

A **process** is an independent program in execution with its own memory space.

### Process Components
- **Virtual address space** — isolated memory (code, heap, stack)
- **File descriptors** — open files, sockets
- **Process ID (PID)**
- **Environment variables**
- **At least one thread** (the main thread)

### Process Creation

**Unix/Linux:** `fork()` creates a copy-on-write clone of the parent process.
```c
pid_t pid = fork();
if (pid == 0) {
    // Child process
    execv("/bin/ls", args);
} else {
    // Parent process
    wait(NULL);
}
```

**Windows:** `CreateProcess()` starts a new process directly.

## Thread

A **thread** is a unit of execution within a process. Threads share the same memory space.

### What threads share:
- Heap memory
- Code (text segment)
- File descriptors
- Global variables

### What threads have independently:
- Stack
- Program counter (PC)
- Registers
- Thread ID

## Concurrency vs Parallelism

| Concept     | Definition                                           |
|-------------|------------------------------------------------------|
| Concurrency | Multiple tasks making progress (may interleave on 1 CPU) |
| Parallelism | Multiple tasks running simultaneously (requires multiple CPUs) |

```
Concurrency (1 core):   Task1--Task2--Task1--Task2
Parallelism (2 cores):  Task1--Task1--Task1
                        Task2--Task2--Task2
```

## Synchronization Primitives

### Mutex (Mutual Exclusion)
```go
var mu sync.Mutex
mu.Lock()
// critical section
mu.Unlock()
```

### Semaphore
Controls access to a resource pool. A semaphore with value N allows N concurrent accesses.

### Deadlock Conditions (Coffman Conditions)
All four must be present for deadlock:
1. **Mutual exclusion** — resource held exclusively
2. **Hold and wait** — process holds resources while waiting
3. **No preemption** — resources can't be forcibly taken
4. **Circular wait** — circular chain of waiting processes

## Goroutines (Go's Lightweight Threads)

Go uses goroutines — green threads multiplexed onto OS threads via the Go runtime scheduler (M:N threading).

```go
// Start a goroutine
go func() {
    fmt.Println("concurrent")
}()

// Communicate via channels (CSP model)
ch := make(chan int)
go func() { ch <- 42 }()
val := <-ch
```

**Key properties:**
- Initial stack: ~2KB (grows dynamically up to 1GB)
- OS threads: reused across goroutines (GOMAXPROCS)
- No need to manage thread pools manually
