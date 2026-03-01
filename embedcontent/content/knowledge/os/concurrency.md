# Concurrency Fundamentals

Concurrency is about dealing with multiple things at once. Parallelism is about doing multiple things at once. You can have concurrency without parallelism.

## Threads vs Goroutines vs Processes

| | Process | Thread | Goroutine |
|--|---------|--------|-----------|
| Memory | Separate address space | Shared with other threads | Shared (managed by Go runtime) |
| Context switch | Expensive (kernel) | Moderate (kernel) | Cheap (user-space) |
| Stack size | MB | MB (fixed) | 2KB (grows dynamically) |
| Creation cost | High | Moderate | Very low |
| Typical count | Dozens | Hundreds | Millions |

## Synchronization Primitives

### Mutex (Mutual Exclusion)
Ensures only one goroutine/thread executes a critical section at a time.

```go
var mu sync.Mutex
var counter int

func increment() {
    mu.Lock()
    defer mu.Unlock()
    counter++
}
```

### RWMutex
Allows multiple readers or one writer — better for read-heavy workloads.

```go
var mu sync.RWMutex
var cache map[string]string

func read(key string) string {
    mu.RLock()         // multiple readers allowed
    defer mu.RUnlock()
    return cache[key]
}

func write(key, val string) {
    mu.Lock()          // exclusive writer
    defer mu.Unlock()
    cache[key] = val
}
```

### Channel (Go)
Go's preferred primitive — goroutines communicate by sharing memory through channels.

```go
ch := make(chan int)       // unbuffered — synchronous
ch := make(chan int, 100)  // buffered — async up to capacity

// Producer
go func() { ch <- 42 }()

// Consumer
val := <-ch
```

### WaitGroup
Wait for a group of goroutines to finish.

```go
var wg sync.WaitGroup
for i := 0; i < 5; i++ {
    wg.Add(1)
    go func(n int) {
        defer wg.Done()
        process(n)
    }(i)
}
wg.Wait()
```

## Race Conditions

A race condition occurs when two goroutines access shared data concurrently and at least one writes.

```go
// DANGEROUS — race condition
var count int
go func() { count++ }()
go func() { count++ }()
// count might be 1 instead of 2!
```

**Detection**: `go run -race main.go` or `go test -race ./...`

**Fix**: Protect with mutex, use atomic operations, or use channels.

```go
// Fix 1: atomic
var count int64
atomic.AddInt64(&count, 1)

// Fix 2: channel
countCh := make(chan struct{}, 1)
go func() { countCh <- struct{}{}; count++; <-countCh }()
```

## Deadlock

All goroutines are blocked waiting for each other — the program freezes.

```go
// Classic deadlock
mu1.Lock()
go func() {
    mu2.Lock()   // waits for mu1
    mu1.Lock()   // never reached
}()
mu2.Lock()       // waits for mu2 → deadlock
```

**Prevention**:
- Always acquire locks in the same order
- Use `tryLock` with timeouts where possible
- Prefer channels over shared memory

## Context and Cancellation

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

select {
case result := <-doWork(ctx):
    fmt.Println(result)
case <-ctx.Done():
    fmt.Println("timed out:", ctx.Err())
}
```

Always propagate `ctx` through function calls and check `ctx.Done()` in long-running operations.

## Worker Pool Pattern

```go
func workerPool(jobs <-chan Job, results chan<- Result, workers int) {
    var wg sync.WaitGroup
    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {  // range on channel blocks until closed
                results <- process(job)
            }
        }()
    }
    wg.Wait()
    close(results)
}
```

## Go Concurrency Patterns

### Fan-out / Fan-in
```go
// Fan-out: distribute work to multiple workers
for i := 0; i < numWorkers; i++ {
    go worker(jobs, results)
}

// Fan-in: merge multiple channels into one
func merge(cs ...<-chan int) <-chan int {
    out := make(chan int)
    for _, c := range cs {
        go func(ch <-chan int) {
            for v := range ch { out <- v }
        }(c)
    }
    return out
}
```

### Pipeline
```go
naturals := generate(2, 3, 5, 7)
doubled := double(naturals)
filtered := filter(doubled, 10)
```

Each stage is a goroutine reading from an input channel and writing to an output channel.

## Interview Questions

**Q: What is the difference between concurrency and parallelism?**
A: Concurrency is the composition of independently executing processes. Parallelism is their simultaneous execution. Concurrency is about structure, parallelism is about execution.

**Q: When should you use channels vs mutexes in Go?**
A: Channels for passing ownership of data between goroutines (pipelines, results). Mutexes for shared state that multiple goroutines need to read/modify (caches, counters).

**Q: What does "Don't communicate by sharing memory; share memory by communicating" mean?**
A: Instead of having goroutines share a variable protected by a mutex, pass the data through channels. The channel transfers ownership, eliminating the need for explicit locking.
