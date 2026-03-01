# Big O Notation

Big O notation describes the **upper bound** of an algorithm's time or space complexity as the input size grows toward infinity. It answers: "How does the algorithm scale?"

## Why It Matters

When choosing between algorithms, Big O helps you predict performance at scale:
- An O(n²) sort on 1000 items = ~1,000,000 operations
- An O(n log n) sort on 1000 items = ~10,000 operations

## Common Complexities (Best to Worst)

| Notation | Name | Example |
|----------|------|---------|
| O(1) | Constant | Hash table lookup, array index access |
| O(log n) | Logarithmic | Binary search, balanced BST operations |
| O(n) | Linear | Linear search, single array traversal |
| O(n log n) | Linearithmic | Merge sort, heap sort, quicksort (avg) |
| O(n²) | Quadratic | Bubble sort, selection sort, nested loops |
| O(2ⁿ) | Exponential | Recursive Fibonacci, power set |
| O(n!) | Factorial | Brute-force permutations, TSP naive |

## Rules for Calculating Big O

### 1. Drop Constants
`O(2n)` → `O(n)` — constants don't matter at scale.

### 2. Drop Lower-Order Terms
`O(n² + n)` → `O(n²)` — the dominant term wins.

### 3. Different Inputs = Different Variables
```python
def func(a, b):
    for x in a:    # O(n)
        for y in b: # O(m)
            ...
# Total: O(n * m), NOT O(n²)
```

### 4. Sequential Steps Add
```python
for x in arr:   # O(n)
    ...
for y in arr:   # O(n)
    ...
# Total: O(n) + O(n) = O(2n) → O(n)
```

### 5. Nested Steps Multiply
```python
for x in arr:       # O(n)
    for y in arr:   # O(n)
        ...
# Total: O(n) × O(n) = O(n²)
```

## Space Complexity

Big O also applies to memory usage:

```python
def double(arr):        # O(n) space — creates new array
    return [x * 2 for x in arr]

def double_inplace(arr):  # O(1) space — modifies in place
    for i in range(len(arr)):
        arr[i] *= 2
```

## Sorting Algorithm Comparison

| Algorithm | Best | Average | Worst | Space |
|-----------|------|---------|-------|-------|
| Quicksort | O(n log n) | O(n log n) | O(n²) | O(log n) |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) |
| Heapsort | O(n log n) | O(n log n) | O(n log n) | O(1) |
| Bubble Sort | O(n) | O(n²) | O(n²) | O(1) |
| Insertion Sort | O(n) | O(n²) | O(n²) | O(1) |
| Counting Sort | O(n+k) | O(n+k) | O(n+k) | O(k) |

## Amortized Complexity

Some operations are occasionally expensive but cheap on average:

- **Dynamic array append**: Usually O(1), occasionally O(n) for resize → **amortized O(1)**
- **Go's built-in `append`**: Same pattern — amortized O(1)

## Practical Tips

1. **Avoid premature optimization** — profile before optimizing
2. **O(n²) is fine for n < 1000** — only optimize when it matters
3. **Constants matter in practice** — O(n log n) with huge constants can be slower than O(n²) for small n
4. **Cache efficiency matters** — O(n²) with sequential access can beat O(n log n) with random access

## Interview Quick Reference

> **Binary search**: O(log n) — halves the search space each step
> **HashMap**: O(1) average for get/put — worst case O(n) with collisions
> **Tree traversal**: O(n) — visits every node once
> **Dijkstra's (with heap)**: O((V+E) log V)
