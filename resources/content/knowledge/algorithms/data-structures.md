# Core Data Structures

Understanding data structures is essential for writing efficient programs and passing technical interviews.

## Arrays and Slices

The most fundamental data structure — contiguous memory.

| Operation | Time |
|-----------|------|
| Access by index | O(1) |
| Search (unsorted) | O(n) |
| Search (sorted, binary) | O(log n) |
| Insert at end (amortized) | O(1) |
| Insert at beginning | O(n) |
| Delete at end | O(1) |
| Delete at beginning | O(n) |

```go
// Go slice
s := []int{1, 2, 3}
s = append(s, 4)        // O(1) amortized
s = append(s[1:], s...) // avoid — O(n)
```

## Linked List

Chain of nodes, each holding data and a pointer to the next node.

| Operation | Singly | Doubly |
|-----------|--------|--------|
| Access by index | O(n) | O(n) |
| Insert at head | O(1) | O(1) |
| Insert at tail | O(n)* | O(1) |
| Delete at head | O(1) | O(1) |
| Search | O(n) | O(n) |

*O(1) if tail pointer maintained

**When to use:** Frequent insertions/deletions at arbitrary positions; queues; undo history.

## Stack

Last In, First Out (LIFO).

| Operation | Time |
|-----------|------|
| Push | O(1) |
| Pop | O(1) |
| Peek | O(1) |

**Use cases:** Function call stack, undo/redo, expression parsing, DFS.

```python
stack = []
stack.append(1)   # push
stack.pop()       # pop
stack[-1]         # peek
```

## Queue

First In, First Out (FIFO).

| Operation | Time |
|-----------|------|
| Enqueue | O(1) |
| Dequeue | O(1) |
| Peek | O(1) |

**Use cases:** BFS, task scheduling, message queues.

```python
from collections import deque
q = deque()
q.append(1)     # enqueue
q.popleft()     # dequeue — O(1)!
```

## Hash Map (Hash Table)

Key-value store using a hash function to map keys to indices.

| Operation | Average | Worst |
|-----------|---------|-------|
| Get | O(1) | O(n) |
| Put | O(1) | O(n) |
| Delete | O(1) | O(n) |

Worst case occurs with hash collisions (all keys map to same bucket).

**Collision resolution:**
- **Chaining**: Each bucket holds a linked list
- **Open addressing**: Linear/quadratic probing for next empty slot

```go
// Go map
m := map[string]int{"a": 1, "b": 2}
v, ok := m["a"]   // ok = true if key exists
delete(m, "a")
```

## Binary Search Tree (BST)

Each node: left subtree < node < right subtree.

| Operation | Average | Worst (unbalanced) |
|-----------|---------|-------------------|
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |

**Self-balancing trees** (AVL, Red-Black) guarantee O(log n) by maintaining balance invariants.

## Heap (Priority Queue)

Complete binary tree satisfying heap property: parent ≥ children (max-heap) or parent ≤ children (min-heap).

| Operation | Time |
|-----------|------|
| Get min/max | O(1) |
| Insert | O(log n) |
| Delete min/max | O(log n) |
| Build heap | O(n) |

**Use cases:** Priority queues, heap sort, Dijkstra's algorithm, top-K problems.

```python
import heapq
h = [3, 1, 4, 1, 5]
heapq.heapify(h)        # O(n) — min-heap
heapq.heappush(h, 2)    # O(log n)
heapq.heappop(h)        # O(log n) — returns smallest
```

## Graph

Vertices (nodes) connected by edges.

| Representation | Space | Add Edge | Check Edge |
|----------------|-------|----------|-----------|
| Adjacency Matrix | O(V²) | O(1) | O(1) |
| Adjacency List | O(V+E) | O(1) | O(degree) |

**Traversal algorithms:**
- **BFS** (Breadth-First): Uses queue; finds shortest path in unweighted graphs
- **DFS** (Depth-First): Uses stack/recursion; useful for cycle detection, topological sort

## Choosing the Right Structure

| Need | Use |
|------|-----|
| Fast key-value lookup | HashMap |
| Ordered data with fast search | BST / sorted array + binary search |
| LIFO access | Stack |
| FIFO access | Queue (deque) |
| Top-K elements | Heap |
| Frequent middle insertions | Linked List |
| Numeric range lookup | Array (with binary search) |
| Shortest path (unweighted) | BFS on graph |
| Shortest path (weighted) | Dijkstra (heap + graph) |

## Memory Layout

```
Array:       [1][2][3][4][5]  ← contiguous, cache-friendly
Linked List: [1]→[2]→[3]     ← scattered, pointer chasing
```

Cache efficiency often makes arrays faster than linked lists in practice even when Big-O is the same.
