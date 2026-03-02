# Git Internals

Git is a **distributed version control system** that stores data as a series of snapshots, not diffs. Understanding its internals makes you a more effective developer.

## The Object Store

Git stores everything as **objects** in `.git/objects/`. There are four types:

### 1. Blob
Stores the raw contents of a file. Two files with identical content share one blob.

```
git cat-file -p HEAD:README.md   # view blob content
git cat-file -t <hash>           # check object type
```

### 2. Tree
A directory listing that maps filenames to blobs or other trees.

```
git ls-tree HEAD                 # list tree at HEAD
```

### 3. Commit
Points to a tree + parent commit(s) + author + message.

```
git cat-file -p HEAD             # view commit object
```

### 4. Tag
An annotated pointer to another object (usually a commit).

## The Three Trees

| Name | Description |
|------|-------------|
| Working Directory | Your actual files on disk |
| Index (Staging Area) | Snapshot staged for next commit |
| HEAD | Pointer to the last commit on the current branch |

```
Working Dir  →  git add  →  Index  →  git commit  →  HEAD
```

## Branches and HEAD

A branch is just a **file containing a commit hash**:
```
.git/refs/heads/main = a1b2c3d4...
```

`HEAD` is a special pointer that usually points to a branch:
```
.git/HEAD = ref: refs/heads/main
```

In **detached HEAD** state, HEAD points directly to a commit hash instead of a branch name.

## How git merge Works

### Fast-Forward Merge
When the target branch is directly ahead — just moves the pointer.

```
Before:  main → A → B
         feature --------→ B

After:   main → A → B (feature)
```

No merge commit created.

### 3-Way Merge
When branches have diverged — finds the common ancestor and creates a merge commit.

```
     A → B → C (main)
      \
       D → E (feature)

Merge: A → B → C → M (merge commit, has 2 parents)
                D → E ↗
```

## Rebase vs Merge

| | Merge | Rebase |
|--|-------|--------|
| History | Preserves exact history | Creates linear history |
| Commits | Adds merge commit | Rewrites commit hashes |
| Conflicts | Resolved once | Resolved per-commit |
| Best for | Public branches | Local cleanup before PR |

**Golden rule**: Never rebase commits that have been pushed to a shared branch.

## Key Internal Commands

```bash
# See the object graph
git log --oneline --graph --all

# Inspect any object
git cat-file -p <hash>

# Find which commit introduced a bug
git bisect start
git bisect bad HEAD
git bisect good v1.0

# Recover lost commits (30-day window)
git reflog
git checkout <hash>

# Undo staged changes
git restore --staged <file>

# Amend last commit (local only)
git commit --amend --no-edit
```

## Merge Conflict Resolution

```bash
# During a conflict, files contain markers:
<<<<<<< HEAD
  your changes
=======
  their changes
>>>>>>> feature-branch

# Resolve by editing, then:
git add <resolved-file>
git merge --continue
```

## Useful Plumbing Commands

```bash
git hash-object -w file.txt     # store file as object, print hash
git write-tree                  # create tree from index
git commit-tree <tree> -m "msg" # create commit manually
git update-ref refs/heads/main <hash>  # update branch
```

## Interview Questions

**Q: What is the difference between `git fetch` and `git pull`?**
A: `fetch` downloads changes without merging. `pull` = `fetch` + `merge`.

**Q: How do you undo the last commit without losing changes?**
A: `git reset --soft HEAD~1` — moves HEAD back but keeps changes staged.

**Q: What does `git stash` do?**
A: Saves your working directory changes to a temporary stack so you can switch branches cleanly.

**Q: What is a detached HEAD?**
A: HEAD points to a commit directly instead of a branch. Commits made here will be orphaned when you switch branches.
