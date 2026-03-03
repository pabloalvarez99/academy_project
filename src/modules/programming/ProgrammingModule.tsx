import { useEffect, useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import {
  GetProgrammingExercise,
  SubmitCode,
  CheckRuntimes,
  RecordAttempt,
} from '../../lib/ipc'
import type { Exercise, SubmitResult } from '../../lib/types'
import { CheckCircle, Circle, Lock, ChevronRight, RotateCcw, BookOpen } from 'lucide-react'

// ── Curriculum ────────────────────────────────────────────────────────────────

interface ExRef { id: string; title: string; difficulty: number }
interface Concept { id: string; name: string; description: string; exercises: ExRef[] }
interface Level  { level: number; name: string; concepts: Concept[] }
interface Lang   { id: string; label: string; monacoLang: string; levels: Level[] }

const CURRICULUM: Lang[] = [
  {
    id: 'go', label: 'Go', monacoLang: 'go',
    levels: [
      { level: 1, name: 'Basics', concepts: [
        { id: 'go-vars', name: 'Hello & Variables',
          description: 'Go programs begin with a package declaration. fmt.Println() writes output. Variables use := for short declaration or var for explicit types. Go is statically typed with type inference.',
          exercises: [
            { id: 'go-basics-001', title: 'Hello, World!', difficulty: 1 },
            { id: 'go-basics-002', title: 'Variables & Types', difficulty: 1 },
            { id: 'go-basics-003', title: 'Sum of Numbers', difficulty: 1 },
          ] },
        { id: 'go-flow', name: 'Control Flow',
          description: 'Go\'s for loop is the only looping construct — it covers while, do-while, and range. Functions support multiple return values. Slices and maps are Go\'s primary built-in collections.',
          exercises: [
            { id: 'go-basics-004', title: 'Fibonacci', difficulty: 1 },
            { id: 'go-basics-005', title: 'Reverse Slice', difficulty: 1 },
            { id: 'go-basics-006', title: 'Palindrome Check', difficulty: 1 },
          ] },
      ] },
      { level: 2, name: 'Data Structures', concepts: [
        { id: 'go-linear', name: 'Linear Structures',
          description: 'Go uses slices as dynamic arrays and maps as hash tables. Linked lists and stacks require struct definitions with pointer fields. Generics (Go 1.18+) enable type-safe containers.',
          exercises: [
            { id: 'go-ds-001', title: 'Linked List', difficulty: 2 },
            { id: 'go-ds-003', title: 'Min Stack', difficulty: 2 },
            { id: 'go-ds-004', title: 'Generic Stack', difficulty: 2 },
          ] },
        { id: 'go-trees', name: 'Trees & Graphs',
          description: 'Binary trees use struct Node with Left and Right pointers. BFS uses a queue (slice with append/[1:]), DFS uses recursion. Go\'s lack of built-in queue means using slices efficiently.',
          exercises: [
            { id: 'go-ds-002', title: 'Binary Tree BFS', difficulty: 2 },
          ] },
      ] },
      { level: 3, name: 'Core Algorithms', concepts: [
        { id: 'go-search', name: 'Search & Sort',
          description: 'Binary search requires sorted input and achieves O(log n). Two-pointer and hashmap techniques reduce O(n²) to O(n). Merge sort guarantees O(n log n) with stable ordering.',
          exercises: [
            { id: 'go-algorithms-001', title: 'Binary Search', difficulty: 2 },
            { id: 'go-algorithms-002', title: 'Two Sum', difficulty: 2 },
            { id: 'go-algorithms-004', title: 'Merge Sort', difficulty: 2 },
            { id: 'go-algorithms-014', title: 'Two Sum (HashMap)', difficulty: 2 },
          ] },
        { id: 'go-strings', name: 'Strings & Sets',
          description: 'Strings in Go are UTF-8 byte slices. Use maps for frequency counting, strings.Split for tokenizing. Valid parentheses is solved with a stack. Anagram detection uses sorted or counted chars.',
          exercises: [
            { id: 'go-algorithms-003', title: 'Valid Parentheses', difficulty: 2 },
            { id: 'go-algorithms-005', title: 'Anagram Check', difficulty: 2 },
            { id: 'go-algorithms-011', title: 'Word Frequency', difficulty: 2 },
          ] },
      ] },
      { level: 4, name: 'Advanced', concepts: [
        { id: 'go-dp', name: 'Dynamic Programming',
          description: 'DP solves overlapping subproblems once and stores results. Bottom-up (tabulation) builds from base cases. Classic problems: Coin Change, Knapsack, LCS, Climbing Stairs, Sliding Window.',
          exercises: [
            { id: 'go-algorithms-006', title: 'Coin Change', difficulty: 3 },
            { id: 'go-algorithms-007', title: 'Max Subarray', difficulty: 2 },
            { id: 'go-algorithms-008', title: 'Longest Common Subsequence', difficulty: 3 },
            { id: 'go-algorithms-009', title: 'Climbing Stairs', difficulty: 2 },
            { id: 'go-algorithms-010', title: 'Longest Without Repeat', difficulty: 2 },
          ] },
        { id: 'go-graphs', name: 'Graphs & Heaps',
          description: 'Dijkstra finds shortest paths using a priority queue (min-heap). Tries are prefix trees for efficient string lookups. A min-heap supports O(log n) insert and O(log n) extract-min.',
          exercises: [
            { id: 'go-algorithms-012', title: 'Dijkstra', difficulty: 3 },
            { id: 'go-algorithms-013', title: 'Trie', difficulty: 3 },
            { id: 'go-algorithms-016', title: 'Min Heap', difficulty: 3 },
          ] },
        { id: 'go-concurrency', name: 'Concurrency',
          description: 'Goroutines are lightweight threads scheduled by the Go runtime. Channels coordinate goroutines safely without shared memory. Rate limiters use time.Ticker. sync.WaitGroup waits for completion.',
          exercises: [
            { id: 'go-algorithms-015', title: 'Producer-Consumer', difficulty: 3 },
            { id: 'go-algorithms-017', title: 'Rate Limiter', difficulty: 3 },
          ] },
      ] },
    ],
  },

  {
    id: 'python', label: 'Python', monacoLang: 'python',
    levels: [
      { level: 1, name: 'Basics', concepts: [
        { id: 'py-basics', name: 'Python Basics',
          description: 'Python uses indentation for blocks — no braces. print() outputs, input() reads. Lists are dynamic arrays with append(), slicing, and len(). Strings are immutable; f-strings format them cleanly.',
          exercises: [
            { id: 'py-basics-001', title: 'Hello, World!', difficulty: 1 },
            { id: 'py-basics-002', title: 'Sum of List', difficulty: 1 },
            { id: 'python-basics-003', title: 'Fibonacci', difficulty: 1 },
            { id: 'python-basics-004', title: 'Palindrome Check', difficulty: 1 },
          ] },
      ] },
      { level: 2, name: 'Algorithms & Data Structures', concepts: [
        { id: 'py-alg', name: 'Core Algorithms',
          description: 'dict (hash map) gives O(1) lookups. sorted() with key= is flexible. Binary search reduces O(n) to O(log n). collections.Counter makes frequency counting trivial.',
          exercises: [
            { id: 'python-basics-005', title: 'Word Count', difficulty: 1 },
            { id: 'py-algorithms-001', title: 'Two Sum', difficulty: 2 },
            { id: 'py-algorithms-002', title: 'Binary Search', difficulty: 2 },
          ] },
        { id: 'py-ds', name: 'Data Structures',
          description: 'Python\'s list works as stack (append/pop). collections.deque works as queue (appendleft/popleft). BFS uses deque, DFS uses recursion or explicit stack.',
          exercises: [
            { id: 'py-data-structures-001', title: 'Stack & Queue', difficulty: 2 },
            { id: 'py-algorithms-003', title: 'Graph BFS', difficulty: 2 },
          ] },
      ] },
      { level: 3, name: 'Problem Solving', concepts: [
        { id: 'py-adv-alg', name: 'Advanced Algorithms',
          description: 'Matrix traversal with nested loops and direction arrays. DFS for connected component counting (flood fill). Memoization with functools.lru_cache or a manual dict.',
          exercises: [
            { id: 'py-algorithms-004', title: 'Matrix Spiral', difficulty: 3 },
            { id: 'py-algorithms-005', title: 'DFS Islands', difficulty: 3 },
            { id: 'python-algorithms-001', title: 'Memoization', difficulty: 2 },
          ] },
      ] },
      { level: 4, name: 'Pythonic Code', concepts: [
        { id: 'py-oop', name: 'OOP & Classes',
          description: 'Python classes use __init__ for constructors, self for instance reference. @property creates computed attributes. @dataclass auto-generates boilerplate. Abstract classes enforce interfaces via abc.ABC.',
          exercises: [
            { id: 'py-oop-001', title: 'Class Shapes', difficulty: 2 },
            { id: 'py-advanced-001', title: 'Decorators', difficulty: 3 },
            { id: 'py-advanced-004', title: 'Dataclasses', difficulty: 2 },
            { id: 'py-advanced-005', title: 'Abstract Classes', difficulty: 2 },
          ] },
        { id: 'py-func', name: 'Functional & Async',
          description: 'Generators yield values lazily — great for large datasets. Context managers use __enter__/__exit__ or @contextmanager. asyncio enables concurrent I/O without threads. functools: partial, reduce, lru_cache.',
          exercises: [
            { id: 'py-advanced-002', title: 'Generators', difficulty: 2 },
            { id: 'py-advanced-003', title: 'Context Managers', difficulty: 2 },
            { id: 'py-advanced-009', title: 'asyncio Basics', difficulty: 3 },
            { id: 'py-advanced-007', title: 'functools', difficulty: 2 },
          ] },
      ] },
    ],
  },

  {
    id: 'typescript', label: 'TypeScript', monacoLang: 'typescript',
    levels: [
      { level: 1, name: 'Core TS', concepts: [
        { id: 'ts-core', name: 'Basics & Types',
          description: 'TypeScript adds static types to JavaScript. Type annotations: let x: number. Interfaces define object shapes. Type inference means you rarely need explicit annotations for local variables.',
          exercises: [
            { id: 'ts-basics-001', title: 'Hello, World!', difficulty: 1 },
            { id: 'ts-basics-002', title: 'Fibonacci', difficulty: 1 },
            { id: 'ts-algorithms-001', title: 'Two Sum', difficulty: 2 },
            { id: 'ts-algorithms-002', title: 'Valid Parentheses', difficulty: 2 },
          ] },
      ] },
      { level: 2, name: 'Algorithms & Generics', concepts: [
        { id: 'ts-alg', name: 'Classic Algorithms',
          description: 'Use Map<K,V> for O(1) lookups. Dynamic programming with typed arrays. LRU cache combines Map (insertion-ordered) with a size limit. Word frequency counting with reduce().',
          exercises: [
            { id: 'ts-algorithms-003', title: 'Climbing Stairs', difficulty: 2 },
            { id: 'ts-algorithms-004', title: 'Word Frequency', difficulty: 2 },
            { id: 'ts-algorithms-005', title: 'LRU Cache', difficulty: 3 },
            { id: 'ts-algorithms-006', title: 'Generic Queue', difficulty: 2 },
          ] },
        { id: 'ts-async', name: 'Async & Type Guards',
          description: 'Promise chains with .then()/.catch(). async/await simplifies async code. Type guards (typeof, instanceof, is predicates) narrow types at runtime. Generics enable type-safe containers.',
          exercises: [
            { id: 'ts-algorithms-007', title: 'Promise Chain', difficulty: 2 },
            { id: 'ts-advanced-010', title: 'Type Guards', difficulty: 2 },
            { id: 'ts-advanced-011', title: 'Observer Pattern', difficulty: 3 },
          ] },
      ] },
      { level: 3, name: 'Design Patterns', concepts: [
        { id: 'ts-patterns', name: 'Patterns & Advanced Generics',
          description: 'The retry pattern handles transient failures. Generic TTL cache maps keys to {value, expiry}. Discriminated unions (type A = {kind:\'a\',...}|{kind:\'b\',...}) enable exhaustive switch statements.',
          exercises: [
            { id: 'ts-012', title: 'Async Retry', difficulty: 2 },
            { id: 'ts-013', title: 'Generic TTL Cache', difficulty: 3 },
            { id: 'ts-014', title: 'Discriminated Union', difficulty: 2 },
          ] },
      ] },
      { level: 4, name: 'Advanced Types', concepts: [
        { id: 'ts-type-sys', name: 'Type System',
          description: 'Mapped types transform every property of an object type. Template literal types combine string types at the type level. DeepReadonly<T> recursively marks nested objects as readonly using conditional mapped types.',
          exercises: [
            { id: 'ts-015', title: 'Mapped Types', difficulty: 3 },
            { id: 'ts-020', title: 'Deep Readonly', difficulty: 3 },
            { id: 'ts-021', title: 'Template Literal Types', difficulty: 3 },
          ] },
        { id: 'ts-meta', name: 'Meta-Programming',
          description: 'Decorators are functions that wrap classes/methods — useful for logging, validation, and DI. Async generators combine async iteration with lazy evaluation. Builder pattern uses method chaining returning this.',
          exercises: [
            { id: 'ts-016', title: 'Class Decorator', difficulty: 3 },
            { id: 'ts-017', title: 'Async Generator', difficulty: 2 },
            { id: 'ts-018', title: 'Builder Pattern', difficulty: 2 },
            { id: 'ts-019', title: 'Event Emitter', difficulty: 3 },
          ] },
      ] },
    ],
  },

  {
    id: 'java', label: 'Java', monacoLang: 'java',
    levels: [
      { level: 1, name: 'Basics', concepts: [
        { id: 'java-basics', name: 'Java Foundation',
          description: 'Java programs start with a public class containing static void main(). System.out.println() outputs. Scanner reads from stdin. Primitive types: int, long, double, boolean. Strings are objects.',
          exercises: [
            { id: 'java-basics-001', title: 'Hello, World!', difficulty: 1 },
            { id: 'java-basics-002', title: 'Sum of Numbers', difficulty: 1 },
            { id: 'java-basics-003', title: 'Fibonacci', difficulty: 1 },
            { id: 'java-basics-004', title: 'Palindrome Check', difficulty: 1 },
          ] },
      ] },
      { level: 2, name: 'Core Algorithms', concepts: [
        { id: 'java-alg', name: 'Classic Problems',
          description: 'Binary search on sorted arrays. HashMap<K,V> gives O(1) average lookup. ArrayDeque works as both stack and queue. Floyd\'s two-pointer detects linked list cycles in O(1) space.',
          exercises: [
            { id: 'java-algorithms-001', title: 'Binary Search', difficulty: 2 },
            { id: 'java-algorithms-002', title: 'Linked List Cycle', difficulty: 2 },
            { id: 'java-algorithms-003', title: 'HashMap Frequency', difficulty: 2 },
            { id: 'java-algorithms-004', title: 'Stack Operations', difficulty: 2 },
          ] },
      ] },
      { level: 3, name: 'Java Features', concepts: [
        { id: 'java-streams', name: 'Streams & Collections',
          description: 'Java Streams: source → intermediate ops (filter, map, sorted) → terminal op (collect, count, reduce). Lazy evaluation means only what\'s needed is computed. Method references (ClassName::method) are concise.',
          exercises: [
            { id: 'java-algorithms-005', title: 'Streams Basics', difficulty: 2 },
            { id: 'java-algorithms-008', title: 'Streams Advanced', difficulty: 2 },
            { id: 'java-algorithms-014', title: 'Stream Pipeline', difficulty: 2 },
            { id: 'java-algorithms-016', title: 'Functional Interfaces', difficulty: 2 },
          ] },
        { id: 'java-oop', name: 'OOP & Design Patterns',
          description: 'Interfaces define contracts; classes implement. Strategy pattern injects behavior as an object. Generics: class Pair<A,B>. Factory pattern creates objects by type string. Comparator.comparing() enables flexible sorting.',
          exercises: [
            { id: 'java-algorithms-007', title: 'Strategy Interface', difficulty: 2 },
            { id: 'java-algorithms-010', title: 'Generic Pair', difficulty: 2 },
            { id: 'java-algorithms-011', title: 'Factory Pattern', difficulty: 2 },
            { id: 'java-algorithms-012', title: 'Comparator Sort', difficulty: 2 },
          ] },
      ] },
      { level: 4, name: 'Advanced', concepts: [
        { id: 'java-adv-alg', name: 'Algorithms & Recursion',
          description: 'DP Knapsack: 2D array dp[i][w] = max value with i items and capacity w, optimisable to 1D. BFS with Queue<Integer>, DFS with recursion. Hanoi uses the classic 3-step recursion.',
          exercises: [
            { id: 'java-algorithms-006', title: 'DP Knapsack', difficulty: 3 },
            { id: 'java-algorithms-009', title: 'Graph BFS & DFS', difficulty: 3 },
            { id: 'java-algorithms-017', title: 'Tower of Hanoi', difficulty: 2 },
          ] },
        { id: 'java-modern', name: 'Modern Java',
          description: 'Optional<T> replaces null: map, flatMap, orElse chain safely. AtomicInteger provides thread-safe incrementing without synchronized. CountDownLatch coordinates N threads. Optional.chain avoids NPE.',
          exercises: [
            { id: 'java-algorithms-013', title: 'Optional Chain', difficulty: 1 },
            { id: 'java-algorithms-015', title: 'Concurrent Counter', difficulty: 3 },
          ] },
      ] },
    ],
  },

  {
    id: 'rust', label: 'Rust', monacoLang: 'rust',
    levels: [
      { level: 1, name: 'Ownership & Basics', concepts: [
        { id: 'rust-basics', name: 'First Steps',
          description: 'Rust programs use fn main(). let binds immutable values; let mut for mutable. println! is a macro. The compiler is strict — no null, no data races, no use-after-free by design.',
          exercises: [
            { id: 'rust-basics-001', title: 'Hello, World!', difficulty: 1 },
            { id: 'rust-basics-002', title: 'Variables', difficulty: 1 },
            { id: 'rust-basics-003', title: 'Sum of Numbers', difficulty: 1 },
            { id: 'rust-basics-004', title: 'Fibonacci', difficulty: 1 },
          ] },
        { id: 'rust-ownership', name: 'Ownership Model',
          description: 'Each value has one owner; assignment moves ownership. Borrow (&T) for read-only access, &mut T for exclusive mutable. Structs group related data. Result<T,E> and Option<T> replace exceptions and null.',
          exercises: [
            { id: 'rust-basics-005', title: 'Structs', difficulty: 2 },
            { id: 'rust-basics-006', title: 'Ownership', difficulty: 2 },
            { id: 'rust-basics-007', title: 'Error Handling', difficulty: 2 },
          ] },
      ] },
      { level: 2, name: 'Rust Idioms', concepts: [
        { id: 'rust-idioms', name: 'Traits, Enums & Iterators',
          description: 'Traits define shared behavior (like interfaces). Enums with data are algebraic types — match on them exhaustively. Iterator trait enables functional-style chains: .map().filter().collect().',
          exercises: [
            { id: 'rust-basics-008', title: 'Iterators', difficulty: 2 },
            { id: 'rust-basics-009', title: 'Enums', difficulty: 2 },
            { id: 'rust-basics-010', title: 'Traits', difficulty: 2 },
          ] },
      ] },
      { level: 3, name: 'Algorithms', concepts: [
        { id: 'rust-alg', name: 'Search & Sort',
          description: 'Rust\'s match is exhaustive — great for algorithm branches. Binary search with lo/hi i64 pointers avoids overflow. Merge sort leverages Vec<T> for safe mutations. Kadane\'s algorithm tracks running max.',
          exercises: [
            { id: 'rust-algorithms-001', title: 'Binary Search', difficulty: 2 },
            { id: 'rust-algorithms-002', title: 'Two Sum', difficulty: 2 },
            { id: 'rust-algorithms-003', title: 'Merge Sort', difficulty: 2 },
            { id: 'rust-algorithms-008', title: 'Valid Parentheses', difficulty: 2 },
            { id: 'rust-algorithms-009', title: 'Max Subarray', difficulty: 2 },
          ] },
      ] },
      { level: 4, name: 'Advanced', concepts: [
        { id: 'rust-ds', name: 'Data Structures',
          description: 'Box<T> allocates heap memory — essential for recursive types like linked lists. Reverse a linked list by relinking Box nodes iteratively. BFS uses VecDeque as a queue.',
          exercises: [
            { id: 'rust-algorithms-004', title: 'Linked List Reverse', difficulty: 2 },
            { id: 'rust-algorithms-007', title: 'Graph BFS', difficulty: 3 },
          ] },
        { id: 'rust-dp', name: 'DP & Utilities',
          description: 'Coin change bottom-up DP with vec! initialization. Climbing stairs is a Fibonacci variant. HashMap<String, usize> for word frequency counting from stdin lines.',
          exercises: [
            { id: 'rust-algorithms-005', title: 'Coin Change', difficulty: 3 },
            { id: 'rust-algorithms-006', title: 'Climbing Stairs', difficulty: 2 },
            { id: 'rust-algorithms-010', title: 'Word Count', difficulty: 2 },
          ] },
      ] },
    ],
  },

  {
    id: 'c', label: 'C', monacoLang: 'c',
    levels: [
      { level: 1, name: 'C Basics', concepts: [
        { id: 'c-foundation', name: 'Foundation',
          description: 'C programs start with #include directives and int main(). printf() formats output with specifiers (%d, %s, %f). scanf() reads input. Functions must be declared before use. main() returns 0 on success.',
          exercises: [
            { id: 'c-basics-001', title: 'Hello, World!', difficulty: 1 },
            { id: 'c-basics-002', title: 'Sum of Numbers', difficulty: 1 },
            { id: 'c-basics-003', title: 'Factorial', difficulty: 1 },
            { id: 'c-basics-006', title: 'String Reverse', difficulty: 1 },
          ] },
      ] },
      { level: 2, name: 'Data Structures', concepts: [
        { id: 'c-sort', name: 'Sorting & Matrices',
          description: 'Bubble sort compares adjacent elements and swaps. Arrays in C are contiguous in memory. Matrix multiplication: C[i][j] = Σ A[i][k] * B[k][j]. 2D arrays: arr[i][j] with explicit dimensions.',
          exercises: [
            { id: 'c-basics-004', title: 'Bubble Sort', difficulty: 2 },
            { id: 'c-basics-007', title: 'Matrix Multiply', difficulty: 2 },
          ] },
        { id: 'c-pointers', name: 'Pointers & Memory',
          description: 'Pointers store addresses: *ptr dereferences, &var takes address. malloc() allocates heap memory; free() releases it. Linked lists use struct Node with a *next pointer. Trees extend this to *left and *right.',
          exercises: [
            { id: 'c-basics-005', title: 'Linked List', difficulty: 2 },
            { id: 'c-basics-008', title: 'Binary Tree', difficulty: 3 },
          ] },
      ] },
    ],
  },

  {
    id: 'cpp', label: 'C++', monacoLang: 'cpp',
    levels: [
      { level: 1, name: 'C++ Basics', concepts: [
        { id: 'cpp-foundation', name: 'Foundation',
          description: 'C++ adds classes, references, and the standard library to C. cout << writes output, cin >> reads. References (&) bind to existing variables without pointer syntax. const correctness prevents unintended mutation.',
          exercises: [
            { id: 'cpp-basics-001', title: 'Hello, World!', difficulty: 1 },
            { id: 'cpp-basics-002', title: 'Sum of Numbers', difficulty: 1 },
            { id: 'cpp-basics-003', title: 'Vector Sum', difficulty: 1 },
            { id: 'cpp-basics-004', title: 'Palindrome Check', difficulty: 1 },
          ] },
      ] },
      { level: 2, name: 'STL & OOP', concepts: [
        { id: 'cpp-stl', name: 'STL & Templates',
          description: 'std::vector<T> is a resizable array. std::sort() with a custom comparator lambda. Function and class templates enable type-generic code. std::map<K,V> is a sorted tree map with O(log n) operations.',
          exercises: [
            { id: 'cpp-basics-005', title: 'Templates', difficulty: 2 },
            { id: 'cpp-basics-006', title: 'STL Sort', difficulty: 2 },
            { id: 'cpp-basics-007', title: 'Map Grouping', difficulty: 2 },
          ] },
        { id: 'cpp-oop', name: 'OOP',
          description: 'Classes encapsulate data and behavior. Inheritance (class D : public B) and virtual functions enable runtime polymorphism. Smart pointers (unique_ptr, shared_ptr) automate memory management — prefer them over raw new/delete.',
          exercises: [
            { id: 'cpp-basics-008', title: 'Inheritance', difficulty: 2 },
            { id: 'cpp-basics-009', title: 'Smart Pointers', difficulty: 3 },
          ] },
      ] },
    ],
  },
]

// ── Progress ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'programming-progress-v1'
interface Progress { passed: Record<string, boolean> }

function loadProgress(): Progress {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"passed":{}}') }
  catch { return { passed: {} } }
}
function saveProgress(p: Progress) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) }

function conceptProgress(concept: Concept, progress: Progress) {
  const total = concept.exercises.length
  const done = concept.exercises.filter(ex => progress.passed[ex.id]).length
  return { done, total }
}
function levelUnlocked(idx: number, levels: Level[], progress: Progress): boolean {
  if (idx === 0) return true
  const prev = levels[idx - 1]
  const total = prev.concepts.reduce((s, c) => s + c.exercises.length, 0)
  const done = prev.concepts.reduce((s, c) => s + c.exercises.filter(ex => progress.passed[ex.id]).length, 0)
  return done >= Math.ceil(total * 0.6)
}
function conceptUnlocked(idx: number, concepts: Concept[], progress: Progress): boolean {
  if (idx === 0) return true
  const prev = concepts[idx - 1]
  const { done, total } = conceptProgress(prev, progress)
  return done >= Math.ceil(total * 0.5)
}

function langProgress(lang: Lang, progress: Progress) {
  const total = lang.levels.flatMap(l => l.concepts).flatMap(c => c.exercises).length
  const done  = lang.levels.flatMap(l => l.concepts).flatMap(c => c.exercises).filter(ex => progress.passed[ex.id]).length
  return { done, total }
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function ProgrammingModule() {
  const [runtimes, setRuntimes] = useState<Record<string, boolean>>({})
  const [progress, setProgress]       = useState<Progress>(loadProgress)
  const [activeLangId, setActiveLangId]   = useState('go')
  const [activeLevelIdx, setActiveLevelIdx] = useState(0)
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null)
  const [view, setView] = useState<'tree' | 'exercise'>('tree')

  // Exercise state
  const [exercise, setExercise]   = useState<Exercise | null>(null)
  const [exerciseId, setExerciseId] = useState<string | null>(null)
  const [code, setCode]           = useState('')
  const [result, setResult]       = useState<SubmitResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingEx, setLoadingEx] = useState(false)

  useEffect(() => {
    CheckRuntimes().then(setRuntimes).catch(() => setRuntimes({}))
  }, [])

  // Reset tree view when language changes
  useEffect(() => {
    setActiveLevelIdx(0)
    setSelectedConcept(null)
    if (view === 'exercise') setView('tree')
  }, [activeLangId])

  const markPassed = useCallback((id: string) => {
    setProgress(prev => {
      const next = { passed: { ...prev.passed, [id]: true } }
      saveProgress(next)
      return next
    })
  }, [])

  async function openExercise(id: string) {
    setExerciseId(id)
    setExercise(null)
    setResult(null)
    setLoadingEx(true)
    setView('exercise')
    try {
      const ex = await GetProgrammingExercise(activeLangId, id)
      setExercise(ex)
      setCode(ex.starterCode || '')
    } catch { setExercise(null) }
    finally { setLoadingEx(false) }
  }

  async function handleSubmit() {
    if (!exercise || !code.trim()) return
    setSubmitting(true)
    setResult(null)
    try {
      const r = await SubmitCode({ exerciseId: exercise.id, language: activeLangId, code })
      setResult(r)
      RecordAttempt(exercise.id, 'programming', r.passed ? 'passed' : 'failed', r.score ?? 0).catch(() => {})
      if (r.passed && exerciseId) markPassed(exerciseId)
    } catch (e: unknown) {
      setResult({ passed: false, score: 0, testResults: [], error: String(e) } as SubmitResult)
    } finally { setSubmitting(false) }
  }

  function resetProgress() {
    const empty = { passed: {} }
    saveProgress(empty)
    setProgress(empty)
    setSelectedConcept(null)
    setView('tree')
  }

  const activeLang = CURRICULUM.find(l => l.id === activeLangId)!
  const activeLevel = activeLang.levels[activeLevelIdx]
  const runtimeOk = runtimes[activeLangId] !== false

  return (
    <div className="flex h-full overflow-hidden">
      {/* Language sidebar */}
      <div className="w-36 bg-surface-800 border-r border-surface-600 flex flex-col py-3 px-2 shrink-0">
        <p className="text-xs text-gray-600 uppercase tracking-wider px-2 mb-2">Language</p>
        {CURRICULUM.map(lang => {
          const { done, total } = langProgress(lang, progress)
          const pct = total > 0 ? Math.round((done / total) * 100) : 0
          const rtStatus = runtimes[lang.id]
          return (
            <button key={lang.id}
              onClick={() => setActiveLangId(lang.id)}
              className={`text-left rounded px-3 py-2 mb-0.5 transition-colors ${
                activeLangId === lang.id ? 'bg-accent text-white' : 'text-gray-400 hover:bg-surface-700 hover:text-gray-200'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{lang.label}</span>
                <span className={`text-[10px] ${rtStatus === true ? 'text-green-500' : rtStatus === false ? 'text-red-500' : 'text-gray-700'}`}>
                  {rtStatus === true ? '✓' : rtStatus === false ? '✗' : '?'}
                </span>
              </div>
              <div className="mt-1 h-1 bg-surface-600 rounded-full overflow-hidden">
                <div className="h-full bg-accent/60 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </button>
          )
        })}
        <div className="mt-auto pt-3 border-t border-surface-600 px-2">
          <button onClick={resetProgress}
            className="flex items-center gap-1 text-xs text-gray-700 hover:text-gray-500 transition-colors">
            <RotateCcw size={10} /> Reset
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        {view === 'tree' ? (
          <ProgSkillTree
            lang={activeLang}
            levelIdx={activeLevelIdx}
            progress={progress}
            selectedConcept={selectedConcept}
            onLevelChange={(idx) => { setActiveLevelIdx(idx); setSelectedConcept(null) }}
            onSelectConcept={setSelectedConcept}
            onOpenExercise={openExercise}
          />
        ) : (
          <ProgExercisePanel
            exercise={exercise}
            loading={loadingEx}
            exerciseId={exerciseId}
            lang={activeLang}
            code={code}
            setCode={setCode}
            result={result}
            submitting={submitting}
            runtimeOk={runtimeOk}
            passed={!!exerciseId && !!progress.passed[exerciseId]}
            onSubmit={handleSubmit}
            onBack={() => setView('tree')}
          />
        )}
      </div>
    </div>
  )
}

// ── Skill Tree ────────────────────────────────────────────────────────────────

function ProgSkillTree({ lang, levelIdx, progress, selectedConcept, onLevelChange, onSelectConcept, onOpenExercise }: {
  lang: Lang; levelIdx: number; progress: Progress
  selectedConcept: Concept | null
  onLevelChange: (idx: number) => void
  onSelectConcept: (c: Concept) => void
  onOpenExercise: (id: string) => void
}) {
  const level = lang.levels[levelIdx]
  return (
    <div className="p-6">
      {/* Level tabs */}
      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {lang.levels.map((lvl, idx) => {
          const unlocked = levelUnlocked(idx, lang.levels, progress)
          const total = lvl.concepts.reduce((s, c) => s + c.exercises.length, 0)
          const done  = lvl.concepts.reduce((s, c) => s + c.exercises.filter(ex => progress.passed[ex.id]).length, 0)
          const pct   = total > 0 ? Math.round((done / total) * 100) : 0
          return (
            <button key={lvl.level} disabled={!unlocked}
              onClick={() => onLevelChange(idx)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                levelIdx === idx
                  ? 'bg-accent text-white'
                  : unlocked
                  ? 'bg-surface-700 text-gray-300 hover:bg-surface-600'
                  : 'bg-surface-800 text-gray-700 cursor-not-allowed'
              }`}>
              {!unlocked && <Lock size={10} />}
              <span>Level {lvl.level}: {lvl.name}</span>
              {unlocked && pct > 0 && <span className="text-[10px] opacity-70">{pct}%</span>}
            </button>
          )
        })}
      </div>

      {/* Concepts (horizontal flow) */}
      <div className="flex items-start gap-3 overflow-x-auto pb-4">
        {level.concepts.map((concept, idx) => {
          const unlocked = conceptUnlocked(idx, level.concepts, progress)
          const { done, total } = conceptProgress(concept, progress)
          const completed = done === total && total > 0
          const isSelected = selectedConcept?.id === concept.id
          return (
            <div key={concept.id} className="flex items-center gap-2 shrink-0">
              {idx > 0 && (
                <div className={`w-6 h-0.5 shrink-0 mt-8 ${unlocked ? 'bg-accent/40' : 'bg-surface-600'}`} />
              )}
              <button disabled={!unlocked} onClick={() => unlocked && onSelectConcept(concept)}
                className={`w-44 rounded-lg border p-3 text-left transition-all ${
                  isSelected ? 'border-accent bg-accent/10'
                  : completed ? 'border-green-700 bg-green-950/30 hover:border-green-500'
                  : unlocked ? 'border-surface-600 bg-surface-800 hover:border-accent/50'
                  : 'border-surface-700 bg-surface-800/50 opacity-50 cursor-not-allowed'
                }`}>
                <div className="flex justify-between items-start mb-2">
                  {completed ? <CheckCircle size={14} className="text-green-400" />
                    : unlocked ? <Circle size={14} className="text-accent" />
                    : <Lock size={14} className="text-gray-700" />}
                  <span className="text-xs text-gray-600">{done}/{total}</span>
                </div>
                <p className="text-xs font-medium text-gray-100 leading-snug mb-2">{concept.name}</p>
                <div className="flex gap-0.5">
                  {concept.exercises.map(ex => (
                    <div key={ex.id}
                      className={`h-1 flex-1 rounded-full ${progress.passed[ex.id] ? 'bg-green-500' : 'bg-surface-600'}`}
                    />
                  ))}
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Concept detail */}
      {selectedConcept && (
        <ProgConceptDetail
          concept={selectedConcept}
          progress={progress}
          onOpenExercise={onOpenExercise}
        />
      )}
    </div>
  )
}

// ── Concept Detail ────────────────────────────────────────────────────────────

function ProgConceptDetail({ concept, progress, onOpenExercise }: {
  concept: Concept; progress: Progress
  onOpenExercise: (id: string) => void
}) {
  return (
    <div className="mt-8 max-w-2xl">
      <div className="card mb-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={13} className="text-accent" />
          <h3 className="text-base font-semibold text-gray-100">{concept.name}</h3>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">{concept.description}</p>
      </div>
      <h4 className="text-xs text-gray-600 uppercase tracking-wider mb-3">Exercises</h4>
      <div className="flex flex-col gap-2">
        {concept.exercises.map((ex, idx) => {
          const passed = progress.passed[ex.id]
          const accessible = idx === 0 || !!progress.passed[concept.exercises[idx - 1].id]
          return (
            <button key={ex.id} disabled={!accessible && !passed}
              onClick={() => onOpenExercise(ex.id)}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                passed ? 'border-green-700 bg-green-950/20 hover:border-green-500'
                : accessible ? 'border-surface-600 bg-surface-800 hover:border-accent/50'
                : 'border-surface-700 bg-surface-800/40 opacity-50 cursor-not-allowed'
              }`}>
              {passed ? <CheckCircle size={15} className="text-green-400 shrink-0" />
                : accessible ? <Circle size={15} className="text-accent shrink-0" />
                : <Lock size={15} className="text-gray-700 shrink-0" />}
              <span className="text-sm text-gray-200">{ex.title}</span>
              <DifficultyBadge level={ex.difficulty} />
              {accessible && !passed && <ChevronRight size={13} className="text-gray-600 shrink-0 ml-auto" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Exercise Panel ────────────────────────────────────────────────────────────

function ProgExercisePanel({ exercise, loading, exerciseId, lang, code, setCode, result,
  submitting, runtimeOk, passed, onSubmit, onBack }: {
  exercise: Exercise | null; loading: boolean; exerciseId: string | null
  lang: Lang; code: string; setCode: (v: string) => void
  result: SubmitResult | null; submitting: boolean; runtimeOk: boolean
  passed: boolean; onSubmit: () => void; onBack: () => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-surface-600 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Skill Tree
        </button>
        <span className="text-gray-700">·</span>
        {loading ? (
          <span className="text-sm text-gray-500">Loading...</span>
        ) : exercise ? (
          <>
            <h2 className="text-sm font-semibold text-gray-200">{exercise.title}</h2>
            {passed && <CheckCircle size={14} className="text-green-400" />}
            <DifficultyBadge level={exercise.difficulty} />
          </>
        ) : (
          <span className="text-sm text-red-400">Exercise not found</span>
        )}
      </div>

      {/* Description + hints */}
      {exercise && (
        <div className="px-6 pt-3 pb-2 border-b border-surface-600 shrink-0">
          <p className="text-xs text-gray-500 leading-relaxed">{exercise.description}</p>
          {exercise.hints && exercise.hints.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400">
                Hints ({exercise.hints.length})
              </summary>
              <ul className="mt-1 text-xs text-gray-600 list-disc list-inside space-y-0.5">
                {exercise.hints.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Runtime warning */}
      {!runtimeOk && (
        <div className="px-6 py-2 bg-yellow-950/30 border-b border-yellow-900/50 text-xs text-yellow-400 shrink-0">
          ⚠ {lang.label} runtime not found on PATH — install it to run tests.
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Editor
          language={lang.monacoLang}
          value={code}
          onChange={(v) => setCode(v || '')}
          theme="vs-dark"
          options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: 'on', tabSize: 2 }}
        />
      </div>

      {/* Submit bar */}
      <div className="border-t border-surface-600 px-4 py-2 flex items-center gap-3 bg-surface-800 shrink-0">
        <button onClick={onSubmit} disabled={submitting || !runtimeOk || !exercise}
          className="btn-primary disabled:opacity-50"
          title={!runtimeOk ? `${lang.label} runtime not found` : undefined}>
          {submitting ? 'Running...' : '▶ Run Tests'}
        </button>
        {result && (
          <>
            <span className={result.passed ? 'badge-green' : 'badge-red'}>
              {result.passed ? '✓ All passed' : '✗ Failed'}
            </span>
            <span className="text-xs text-gray-500">Score: {result.score}/100</span>
          </>
        )}
        {result?.error && (
          <span className="text-xs text-red-400 truncate max-w-xs">{result.error}</span>
        )}
      </div>

      {/* Test results */}
      {result?.testResults && result.testResults.length > 0 && (
        <div className="border-t border-surface-600 max-h-48 overflow-y-auto bg-surface-800 shrink-0">
          {result.testResults.map((tr, i) => (
            <div key={i} className={`px-4 py-2 border-b border-surface-700 text-xs ${tr.passed ? 'bg-green-950/20' : 'bg-red-950/20'}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={tr.passed ? 'text-green-400' : 'text-red-400'}>{tr.passed ? '✓' : '✗'}</span>
                <span className="text-gray-400">Test #{tr.testIndex + 1}</span>
                <span className="text-gray-600">{tr.timeMs}ms</span>
                {tr.timedOut && <span className="badge-yellow">timeout</span>}
              </div>
              {!tr.passed && (
                <div className="grid grid-cols-2 gap-2 mt-1 font-mono">
                  <div>
                    <span className="text-gray-600">Expected: </span>
                    <code className="text-green-400 whitespace-pre-wrap">{tr.expectedOutput}</code>
                  </div>
                  <div>
                    <span className="text-gray-600">Got: </span>
                    <code className="text-red-400 whitespace-pre-wrap">{tr.actualOutput}</code>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────

function DifficultyBadge({ level }: { level: number }) {
  if (level <= 1) return <span className="badge-green">Easy</span>
  if (level <= 2) return <span className="badge-yellow">Medium</span>
  return <span className="badge-red">Hard</span>
}
