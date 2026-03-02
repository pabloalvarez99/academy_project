Use a systematic debugging framework for the issue described. Follow these steps IN ORDER - do not skip any:

## Step 1: REPRODUCE
- What are the exact steps to reproduce the bug?
- What is the expected behavior vs actual behavior?
- Does it happen consistently or intermittently?

## Step 2: HYPOTHESIZE
List 3-5 possible root causes, ordered by likelihood:
1. [Most likely cause]
2. [Second most likely]
3. [Third]
Consider: frontend or backend? Client or server? Data issue or logic issue?

## Step 3: INVESTIGATE
For each hypothesis, identify the specific file and line to check.
Read the relevant code. Don't assume — verify.

## Step 4: ROOT CAUSE
State the definitive root cause. Explain WHY it happens, not just WHAT happens.

## Step 5: FIX
Implement the minimal fix. Do not refactor unrelated code.

## Step 6: VERIFY
- Run the build to verify no errors
- Explain exactly how to manually test the fix

## Step 7: PREVENT
- Should this be added to CLAUDE.md gotchas to avoid repeating?
- Is there a pattern here that should be checked in /review?
