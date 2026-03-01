# Graph Theory and Graph Algorithms

Graphs model relationships between entities. From social networks to routing algorithms, graphs appear everywhere in software engineering.

## Graph Representations

**Adjacency List** (most common):
```go
// Undirected graph
graph := map[int][]int{
    0: {1, 2},
    1: {0, 3},
    2: {0, 3},
    3: {1, 2, 4},
    4: {3},
}
```
Space: O(V + E). Best for sparse graphs.

**Adjacency Matrix**:
```go
// grid[i][j] = 1 if edge from i to j
grid := [][]int{
    {0, 1, 1, 0, 0},
    {1, 0, 0, 1, 0},
    {1, 0, 0, 1, 0},
    {0, 1, 1, 0, 1},
    {0, 0, 0, 1, 0},
}
```
Space: O(V²). Fast edge lookup O(1). Best for dense graphs.

**Edge List**:
```go
edges := [][2]int{{0,1}, {0,2}, {1,3}, {2,3}, {3,4}}
```
Simple for algorithms that iterate over edges (Kruskal's MST).

## BFS — Breadth-First Search

Explores level by level. Uses a queue. Guarantees shortest path in unweighted graphs.

```go
func bfs(graph map[int][]int, start int) []int {
    visited := make(map[int]bool)
    order := []int{}
    queue := []int{start}
    visited[start] = true

    for len(queue) > 0 {
        node := queue[0]
        queue = queue[1:]
        order = append(order, node)

        for _, neighbor := range graph[node] {
            if !visited[neighbor] {
                visited[neighbor] = true
                queue = append(queue, neighbor)
            }
        }
    }
    return order
}
```

**Applications**:
- Shortest path in unweighted graphs
- Level-order tree traversal
- Finding all connected components
- Bipartite graph detection

## DFS — Depth-First Search

Explores as deep as possible before backtracking. Uses recursion (or explicit stack).

```go
func dfs(graph map[int][]int, node int, visited map[int]bool, order *[]int) {
    visited[node] = true
    *order = append(*order, node)

    for _, neighbor := range graph[node] {
        if !visited[neighbor] {
            dfs(graph, neighbor, visited, order)
        }
    }
}
```

**Applications**:
- Topological sort (DAGs)
- Cycle detection
- Finding strongly connected components (Tarjan, Kosaraju)
- Maze solving / flood fill
- Tree traversal (pre/in/post order)

## Shortest Path Algorithms

### Dijkstra's Algorithm — Weighted, Non-Negative
O((V + E) log V) with a priority queue.

```go
import "container/heap"

func dijkstra(graph map[int][][2]int, start, end, V int) int {
    dist := make([]int, V)
    for i := range dist { dist[i] = 1<<31 - 1 }
    dist[start] = 0

    pq := &PriorityQueue{}
    heap.Push(pq, [2]int{0, start})

    for pq.Len() > 0 {
        item := heap.Pop(pq).([2]int)
        cost, u := item[0], item[1]
        if cost > dist[u] { continue }

        for _, edge := range graph[u] {
            v, w := edge[0], edge[1]
            if dist[u]+w < dist[v] {
                dist[v] = dist[u] + w
                heap.Push(pq, [2]int{dist[v], v})
            }
        }
    }
    if dist[end] == 1<<31-1 { return -1 }
    return dist[end]
}
```

### Bellman-Ford — Negative Edges
O(V × E). Detects negative cycles.

```go
func bellmanFord(edges [][3]int, V, start int) []int {
    dist := make([]int, V)
    for i := range dist { dist[i] = 1<<31 - 1 }
    dist[start] = 0

    for i := 0; i < V-1; i++ {  // relax all edges V-1 times
        for _, e := range edges {
            u, v, w := e[0], e[1], e[2]
            if dist[u] != 1<<31-1 && dist[u]+w < dist[v] {
                dist[v] = dist[u] + w
            }
        }
    }
    return dist
}
```

## Topological Sort (DAG)

Order nodes such that all edges point "forward". Only valid for DAGs.

**Kahn's Algorithm (BFS-based)**:
```go
func topoSort(graph map[int][]int, V int) []int {
    inDegree := make([]int, V)
    for _, neighbors := range graph {
        for _, v := range neighbors { inDegree[v]++ }
    }

    queue := []int{}
    for u := 0; u < V; u++ {
        if inDegree[u] == 0 { queue = append(queue, u) }
    }

    result := []int{}
    for len(queue) > 0 {
        u := queue[0]; queue = queue[1:]
        result = append(result, u)
        for _, v := range graph[u] {
            inDegree[v]--
            if inDegree[v] == 0 { queue = append(queue, v) }
        }
    }
    if len(result) < V { return nil }  // cycle detected
    return result
}
```

**Applications**: Build systems (make), package dependency resolution, task scheduling.

## Minimum Spanning Tree (MST)

Find a tree that connects all vertices with minimum total edge weight.

### Kruskal's Algorithm
Sort edges by weight, add if it doesn't create a cycle (Union-Find).

```go
// Union-Find for cycle detection
parent := make([]int, V)
for i := range parent { parent[i] = i }

var find func(x int) int
find = func(x int) int {
    if parent[x] != x { parent[x] = find(parent[x]) }
    return parent[x]
}

sort.Slice(edges, func(i, j int) bool { return edges[i][2] < edges[j][2] })

mstWeight := 0
for _, e := range edges {
    u, v, w := e[0], e[1], e[2]
    if find(u) != find(v) {
        parent[find(u)] = find(v)
        mstWeight += w
    }
}
```

## Union-Find (Disjoint Set Union)

Efficiently tracks which set each element belongs to. Near O(1) per operation with path compression + union by rank.

```go
type UF struct{ parent, rank []int }

func NewUF(n int) *UF {
    p, r := make([]int, n), make([]int, n)
    for i := range p { p[i] = i }
    return &UF{p, r}
}

func (uf *UF) Find(x int) int {
    if uf.parent[x] != x { uf.parent[x] = uf.Find(uf.parent[x]) } // path compression
    return uf.parent[x]
}

func (uf *UF) Union(x, y int) bool {
    px, py := uf.Find(x), uf.Find(y)
    if px == py { return false }  // already same set
    if uf.rank[px] < uf.rank[py] { px, py = py, px }
    uf.parent[py] = px
    if uf.rank[px] == uf.rank[py] { uf.rank[px]++ }
    return true
}
```

## Interview Questions

**Q: BFS vs DFS — when to use which?**
A: BFS for shortest path (unweighted), level-by-level exploration, or when the answer is likely close to the start. DFS for exhaustive exploration, topological sort, cycle detection, backtracking, or when going deep first is natural (maze solving).

**Q: Why can't Dijkstra handle negative edge weights?**
A: Dijkstra relies on the invariant that once a node is settled (min distance found), it won't improve. Negative edges can create paths that get shorter as you traverse more edges, violating this invariant. Use Bellman-Ford for negative edges.

**Q: How do you detect a cycle in a directed graph?**
A: DFS with three-color marking: WHITE (unvisited), GRAY (in current DFS path), BLACK (fully processed). A back edge (to a GRAY node) indicates a cycle.
