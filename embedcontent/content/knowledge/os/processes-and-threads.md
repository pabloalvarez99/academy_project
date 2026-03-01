# Processes and Threads

Understanding process and thread models is fundamental for systems programming and performance optimization.

## Process

A process is an instance of a running program — isolated memory space, file descriptors, and state.

```
Process:
  ┌──────────────────────────────────┐
  │ Virtual Address Space (4GB)      │
  │  ├── Text (code)                 │
  │  ├── Data (globals)              │
  │  ├── Heap (dynamic allocation)   │
  │  └── Stack (call frames)         │
  ├─────────────────────────────────-│
  │ File Descriptors (0=stdin, ...)  │
  │ PID, PPID, UID, GID              │
  │ Signal handlers                  │
  └──────────────────────────────────┘
```

### Process Creation

**fork()**: Creates exact copy of parent process (copy-on-write).
```c
pid_t pid = fork();
if (pid == 0) {
    // child process
    execve("/bin/ls", args, env);  // replace with new program
} else {
    // parent process (pid = child's PID)
    wait(NULL);  // wait for child to finish
}
```

**exec()**: Replaces current process image with a new program (no new PID).

**spawn** (Windows): Creates a new process directly (no fork+exec overhead).

### Process States
```
New → Ready → Running → Terminated
              ↕
           Waiting (blocked on I/O, sleep, lock)
```

## Threads

Threads share the same memory space within a process. Lighter weight than processes.

```
Process (shared: code, heap, globals, file descriptors)
  ├── Thread 1: own stack + registers + PC
  ├── Thread 2: own stack + registers + PC
  └── Thread 3: own stack + registers + PC
```

### Thread vs Process Comparison

| | Process | Thread |
|--|---------|--------|
| Memory | Isolated | Shared |
| Creation cost | Heavy (fork/exec) | Light |
| Communication | IPC (pipes, sockets) | Shared memory |
| Crash isolation | Yes (one crash doesn't kill others) | No (one crash kills all) |
| Context switch | Expensive | Cheap |

### POSIX Threads (pthreads)
```c
#include <pthread.h>

void* worker(void *arg) {
    printf("Thread %d running\n", *(int*)arg);
    return NULL;
}

pthread_t t;
int id = 1;
pthread_create(&t, NULL, worker, &id);
pthread_join(t, NULL);  // wait for thread
```

## Synchronization Primitives

### Mutex (Mutual Exclusion Lock)
Ensures only one thread accesses a resource at a time.

```go
var mu sync.Mutex
var counter int

func increment() {
    mu.Lock()
    counter++
    mu.Unlock()
}
```

**Deadlock** — two threads each waiting for the other's lock:
```
Thread A: lock(X) → waiting for lock(Y)
Thread B: lock(Y) → waiting for lock(X)  → ∞ deadlock
```
Prevention: always acquire locks in the same order.

### Read-Write Lock
Multiple readers OR one writer — not both.
```go
var rw sync.RWMutex

func read() {
    rw.RLock()   // multiple goroutines can hold RLock simultaneously
    defer rw.RUnlock()
    // read data
}

func write() {
    rw.Lock()    // exclusive — no readers or other writers
    defer rw.Unlock()
    // modify data
}
```

### Semaphore
Counter that controls access to a pool of resources.
```go
// Limit to 5 concurrent database connections
sem := make(chan struct{}, 5)

func query() {
    sem <- struct{}{}   // acquire (blocks if full)
    defer func() { <-sem }()  // release
    // use connection
}
```

### Condition Variable
Block until a condition becomes true.
```go
var mu sync.Mutex
var cond = sync.NewCond(&mu)
var ready bool

// Waiter goroutine
mu.Lock()
for !ready {
    cond.Wait()  // releases lock and blocks; reacquires on wake
}
mu.Unlock()

// Signaler goroutine
mu.Lock()
ready = true
cond.Signal()  // wake one waiter (or Broadcast() for all)
mu.Unlock()
```

## Goroutines vs OS Threads

Go's goroutines are **green threads** — managed by the Go runtime, not the OS.

| | OS Thread | Goroutine |
|--|-----------|-----------|
| Stack size | 1-8 MB (fixed) | 2KB (grows dynamically) |
| Creation cost | ~1ms, ~1MB | ~1µs, ~2KB |
| Scheduling | OS kernel | Go runtime (M:N scheduling) |
| Typical count | Hundreds | Hundreds of thousands |

**M:N scheduling**: M goroutines multiplexed onto N OS threads (GOMAXPROCS controls N).

```
OS Threads (N=4, one per CPU):
  Thread 1 ← [G1, G5, G9, ...]  ← Go scheduler assigns goroutines
  Thread 2 ← [G2, G6, G10, ...]
  Thread 3 ← [G3, G7, G11, ...]
  Thread 4 ← [G4, G8, G12, ...]
```

When a goroutine blocks on I/O, the Go runtime parks it and runs another goroutine on the same OS thread — no OS thread wasted!

## Context Switching

The OS saves the current process/thread state and loads another.

**Full context switch (process)**:
1. Save registers, PC, stack pointer
2. Save TLB state
3. Switch memory map (flush TLB)
4. Load new process state
- Cost: ~1-10 µs

**Thread switch (same process)**:
1. Save registers, PC, stack pointer
2. Load new thread state
- Cost: ~0.5-1 µs (no TLB flush)

**Goroutine switch**:
- User-space only, no kernel involvement
- Cost: ~100 ns

## Interview Questions

**Q: What's the difference between a process and a thread?**
A: A process has its own isolated memory space and resources. Threads within a process share memory and file descriptors. Threads are lighter and communicate via shared memory, while processes use IPC (pipes, sockets, shared memory segments).

**Q: What is a race condition?**
A: When two or more threads access shared data concurrently and at least one modifies it without proper synchronization. The result depends on scheduling order — non-deterministic and hard to reproduce. Fix with mutexes, atomic operations, or channels.

**Q: How does Go handle millions of concurrent connections?**
A: Goroutines start with only 2KB of stack (vs 1MB for OS threads), and the Go scheduler multiplexes many goroutines onto few OS threads. Goroutines blocked on I/O are parked cheaply without burning an OS thread. This enables handling 100k+ goroutines on a single machine.
