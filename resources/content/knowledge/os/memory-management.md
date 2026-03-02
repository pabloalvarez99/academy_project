# Memory Management

Understanding how memory is managed is essential for writing efficient, bug-free systems.

## Memory Segments

A running process has distinct memory regions:

```
High addresses
┌─────────────────┐
│   Stack         │  ← grows downward; local vars, function frames
├─────────────────┤
│   ↕ (gap)       │
├─────────────────┤
│   Heap          │  ← grows upward; dynamic allocation
├─────────────────┤
│   BSS           │  uninitialized globals (zero-filled)
├─────────────────┤
│   Data          │  initialized globals and statics
├─────────────────┤
│   Text (code)   │  executable instructions (read-only)
└─────────────────┘
Low addresses
```

## Stack vs Heap

| | Stack | Heap |
|--|-------|------|
| Allocation | Automatic (push/pop frames) | Manual or GC |
| Deallocation | Automatic on function return | Manual / GC |
| Speed | Very fast (pointer adjustment) | Slower (allocator overhead) |
| Size | Limited (~1-8MB typically) | Limited by RAM |
| Fragmentation | No | Yes (over time) |
| Lifetime | Tied to scope | Controlled by programmer/GC |

## Manual Memory Management (C/C++)

```c
// Heap allocation
int *arr = malloc(10 * sizeof(int));   // allocate
if (arr == NULL) { /* handle OOM */ }
arr[0] = 42;
free(arr);                              // must free — or memory leak!
arr = NULL;                             // prevent dangling pointer

// Stack allocation
int local_arr[10];  // automatic, freed on function return
```

### Common Bugs
- **Memory leak**: Allocated memory never freed
- **Dangling pointer**: Pointer to freed memory
- **Double free**: Freeing the same pointer twice
- **Buffer overflow**: Writing beyond allocated bounds
- **Use after free**: Accessing freed memory

## Garbage Collection

Languages like Go, Java, Python, and JavaScript use automatic GC.

### Mark and Sweep (Go's GC)
1. **Mark**: Starting from roots (globals, stack), trace all reachable objects
2. **Sweep**: Free all unmarked (unreachable) objects

Go's GC is concurrent (runs alongside your program) and aims for < 1ms pause times.

### Reference Counting (Python, Swift)
Each object has a count of references. When count reaches 0, immediately freed.

```python
a = [1, 2, 3]   # refcount = 1
b = a            # refcount = 2
del a            # refcount = 1
del b            # refcount = 0 → freed immediately
```

**Problem**: Circular references can prevent collection:
```python
a = {}; b = {}
a['ref'] = b; b['ref'] = a  # circular — never freed without cycle detector
```
Python's cycle collector handles this, but it's slower.

## Go Memory Model

Go uses escape analysis to decide stack vs heap allocation:

```go
// Stays on stack (doesn't escape)
func sum(a, b int) int {
    result := a + b
    return result
}

// Escapes to heap (returned pointer outlives function)
func newInt(n int) *int {
    v := n          // v escapes to heap
    return &v
}
```

Check with: `go build -gcflags="-m" .`

### sync.Pool — Reusing allocations

```go
var pool = sync.Pool{
    New: func() interface{} { return &MyStruct{} },
}

obj := pool.Get().(*MyStruct)
// use obj
pool.Put(obj)  // return for reuse — avoids GC pressure
```

## Virtual Memory

Each process sees a contiguous virtual address space, even though physical RAM may be fragmented.

- **Pages**: Fixed-size memory blocks (typically 4KB)
- **TLB**: CPU cache for page table entries
- **Page fault**: Accessing a page not in RAM → OS loads it from disk (swapping)

```
Virtual Address → Page Table → Physical Address
      0x7fff0000   →    PTE    →   0x1234000 (RAM)
      0x8000000    →    PTE    →   [not in RAM → page fault → swap in]
```

## Memory-Mapped Files

```go
// Using mmap to read a large file without loading it all into RAM
data, err := os.ReadFile("large.bin")  // loads into RAM
// vs.
f, _ := os.Open("large.bin")
// mmap maps file into virtual address space — OS loads pages on demand
```

## Interview Questions

**Q: What is a memory leak and how do you detect one?**
A: Memory allocated but never freed, causing the process's heap to grow indefinitely. Detect with Valgrind (C/C++), Go's `pprof` heap profile, or JVM's heap dump analysis.

**Q: What's the difference between stack overflow and heap overflow?**
A: Stack overflow occurs when the call stack grows too large (infinite recursion, large local arrays). Heap overflow (buffer overflow) is writing past the end of a heap-allocated buffer — a common security vulnerability.

**Q: How does Go's garbage collector avoid stop-the-world pauses?**
A: Go's GC runs concurrently with the program using tri-color mark-and-sweep. Most marking happens while goroutines run. Stop-the-world pauses are minimized to < 1ms for write barrier setup and final sweeping.
