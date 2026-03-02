Run a comprehensive code review on all staged/modified files before committing. Check each category systematically:

## SECURITY (Critical)
- SQL injection: Any raw SQL or unsanitized user input in queries?
- XSS: Any dangerouslySetInnerHTML or unescaped user content in JSX?
- Auth bypass: Are protected routes/endpoints properly authenticated?
- Data exposure: Any sensitive data (keys, passwords, tokens) in client-side code?
- HTTPS: Any http:// URLs that should be https://?

## CODE QUALITY
- Dead code: Unused imports, unreachable code, commented-out blocks?
- Debug artifacts: console.log, debugger statements, TODO comments left in?
- Magic numbers: Hardcoded values that should be constants or env vars?
- Error handling: Unhandled promise rejections, empty catch blocks?
- Type safety: Any `any` types that should be more specific?

## BEST PRACTICES
- Does new code follow existing patterns in the codebase?
- Are there obvious performance issues (unnecessary re-renders, N+1 queries)?
- Is error feedback shown to the user when operations fail?

Report findings as: ✅ OK, ⚠️ WARNING, or 🔴 CRITICAL for each check.
Then suggest fixes for any non-OK items.
