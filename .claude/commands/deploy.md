Run the full deployment pipeline:

1. **Build check**: Run the project's build command (check CLAUDE.md for the correct command). If build fails, fix errors before continuing.

2. **Git status**: Show what files changed. Review if any sensitive files (.env, credentials) are staged.

3. **Commit**: Stage all relevant files (NOT .env or node_modules). Create a descriptive commit message following conventional commits (feat:, fix:, chore:, refactor:).

4. **Push**: Push to the main branch to trigger auto-deploy.

5. **Verify**: Check deployment status if tools are available.

6. **Bitacora**: Update `bitacora.md` with a summary of what was deployed.

IMPORTANT: Never commit .env files, secrets, or API keys.
