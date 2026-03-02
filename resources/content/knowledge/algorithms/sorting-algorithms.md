# Sorting Algorithms

Understanding sorting algorithms reveals algorithmic thinking patterns: divide-and-conquer, recursion, comparison trees, and time-space trade-offs.

## Complexity Overview

| Algorithm | Best | Average | Worst | Space | Stable |
|-----------|------|---------|-------|-------|--------|
| Bubble Sort | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Selection Sort | O(n²) | O(n²) | O(n²) | O(1) | No |
| Insertion Sort | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes |
| Quick Sort | O(n log n) | O(n log n) | O(n²) | O(log n) | No |
| Heap Sort | O(n log n) | O(n log n) | O(n log n) | O(1) | No |
| Tim Sort | O(n) | O(n log n) | O(n log n) | O(n) | Yes |

**Stable sort**: Equal elements maintain their relative order. Important when sorting by multiple keys.

## Simple Sorts — O(n²)

### Bubble Sort
Repeatedly swap adjacent elements that are out of order.

```go
func bubbleSort(arr []int) {
    n := len(arr)
    for i := 0; i < n-1; i++ {
        swapped := false
        for j := 0; j < n-1-i; j++ {
            if arr[j] > arr[j+1] {
                arr[j], arr[j+1] = arr[j+1], arr[j]
                swapped = true
            }
        }
        if !swapped { break }  // early exit: already sorted
    }
}
```

### Insertion Sort
Build sorted array one element at a time, inserting each into its correct position.

```go
func insertionSort(arr []int) {
    for i := 1; i < len(arr); i++ {
        key := arr[i]
        j := i - 1
        for j >= 0 && arr[j] > key {
            arr[j+1] = arr[j]
            j--
        }
        arr[j+1] = key
    }
}
```

**Best for**: Nearly sorted data (O(n)), small arrays. Used by Tim Sort for small runs.

## Merge Sort — O(n log n) Stable

Divide-and-conquer: split in half, sort each half, merge.

```go
func mergeSort(arr []int) []int {
    if len(arr) <= 1 {
        return arr
    }
    mid := len(arr) / 2
    left := mergeSort(arr[:mid])
    right := mergeSort(arr[mid:])
    return merge(left, right)
}

func merge(left, right []int) []int {
    result := make([]int, 0, len(left)+len(right))
    i, j := 0, 0
    for i < len(left) && j < len(right) {
        if left[i] <= right[j] {
            result = append(result, left[i]); i++
        } else {
            result = append(result, right[j]); j++
        }
    }
    result = append(result, left[i:]...)
    result = append(result, right[j:]...)
    return result
}
```

**Guaranteed O(n log n)** — no worst case. Preferred for linked lists (no random access needed for merge). Used by Java's Arrays.sort (for objects) and Python's sorted().

## Quick Sort — O(n log n) Average

Divide-and-conquer: pick a pivot, partition around it, recurse.

```go
func quickSort(arr []int, lo, hi int) {
    if lo >= hi { return }
    pivot := partition(arr, lo, hi)
    quickSort(arr, lo, pivot-1)
    quickSort(arr, pivot+1, hi)
}

func partition(arr []int, lo, hi int) int {
    pivot := arr[hi]
    i := lo
    for j := lo; j < hi; j++ {
        if arr[j] <= pivot {
            arr[i], arr[j] = arr[j], arr[i]
            i++
        }
    }
    arr[i], arr[hi] = arr[hi], arr[i]
    return i
}
```

**Worst case O(n²)**: sorted array with last-element pivot. Fix with random pivot or median-of-three.

**In practice**: Fastest in-place sort due to cache friendliness. Go's `sort.Slice` uses a hybrid (pattern-defeating quicksort).

## Heap Sort — O(n log n), O(1) Space

Build a max-heap, repeatedly extract max.

```go
func heapSort(arr []int) {
    n := len(arr)
    // Build max-heap
    for i := n/2 - 1; i >= 0; i-- {
        heapify(arr, n, i)
    }
    // Extract elements
    for i := n - 1; i > 0; i-- {
        arr[0], arr[i] = arr[i], arr[0]  // move max to end
        heapify(arr, i, 0)                // re-heapify
    }
}

func heapify(arr []int, n, i int) {
    largest := i
    left, right := 2*i+1, 2*i+2
    if left < n && arr[left] > arr[largest] { largest = left }
    if right < n && arr[right] > arr[largest] { largest = right }
    if largest != i {
        arr[i], arr[largest] = arr[largest], arr[i]
        heapify(arr, n, largest)
    }
}
```

**Advantage**: O(1) extra space. **Disadvantage**: Poor cache performance; rarely faster than quicksort in practice.

## Tim Sort (Python, Java)

Hybrid of merge sort and insertion sort. Identifies natural "runs" (pre-sorted sequences), extends short ones with insertion sort, then merges runs.

- Min run size: 32-64 elements
- Best case O(n) for nearly-sorted data
- Stable, O(n log n) worst case

Used by: Python `sorted()`, Java `Arrays.sort()` (for objects).

## Non-Comparison Sorts

These break the O(n log n) comparison sort lower bound by exploiting key structure.

### Counting Sort — O(n + k)
Count occurrences of each value. Only works for small integer ranges.
```go
func countingSort(arr []int, k int) []int {
    count := make([]int, k+1)
    for _, v := range arr { count[v]++ }
    result := make([]int, 0, len(arr))
    for v, c := range count {
        for ; c > 0; c-- { result = append(result, v) }
    }
    return result
}
```

### Radix Sort — O(d × n)
Sort by individual digits/characters. Used for integers and strings.

## Choosing a Sort Algorithm

```
Is the data nearly sorted?
  → Yes: Insertion Sort or Tim Sort

Do you need O(1) extra space?
  → Yes: Heap Sort or Quick Sort in-place

Do you need stability?
  → Yes: Merge Sort or Tim Sort

General purpose?
  → Quick Sort (fastest in practice) or library sort (Tim Sort)

Integer keys with small range?
  → Counting Sort or Radix Sort
```

## Interview Questions

**Q: Why is quicksort faster than merge sort in practice despite same big-O?**
A: Quicksort has better cache locality (in-place, sequential access patterns). Merge sort requires O(n) extra space and more memory allocations. The constant factors matter: quicksort's inner loop is very tight.

**Q: When would you use merge sort over quicksort?**
A: When you need guaranteed O(n log n) (no worst case), when sorting linked lists (merge is natural, quicksort needs random access), or when stability is required.

**Q: What is the lower bound for comparison-based sorting?**
A: O(n log n). Any comparison-based sort must make at least log₂(n!) ≈ n log n comparisons. This is proven via decision tree argument — you need enough comparisons to distinguish all n! permutations.
