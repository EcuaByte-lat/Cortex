# Security Policy

## Supported Versions

Currently, only the latest version of Cortex receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Cortex, please report it responsibly.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security issues via:

1. **Email:** security@cortex-project.dev (preferred)
2. **GitHub Security Advisory:** [Create a private security advisory](https://github.com/EcuaByte-lat/Cortex/security/advisories/new)

### What to Include

Please include the following information in your report:

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** of the vulnerability
- **Suggested fix** (if you have one)
- **Your contact information** for follow-up

### Example Report

```
Subject: [SECURITY] SQL Injection vulnerability in search function

Description:
The search function in @cortex/core does not properly sanitize user input...

Steps to Reproduce:
1. Call MemoryStore.search() with malicious input: "'; DROP TABLE memories; --"
2. Observe that...

Impact:
An attacker could potentially delete all memories or access unauthorized data.

Suggested Fix:
Use parameterized queries instead of string concatenation.
```

## Response Timeline

- **Acknowledgment:** Within 24 hours of report
- **Initial Assessment:** Within 3 business days
- **Status Updates:** Weekly until resolved
- **Fix & Disclosure:** Coordinated with reporter

## Security Update Process

1. **Validation** - We verify the reported vulnerability
2. **Fix Development** - We develop and test a fix
3. **Release** - We release a patched version
4. **Disclosure** - We publish a security advisory (after users have time to update)

## Security Best Practices for Users

### Local Storage Security

Cortex stores data locally in `~/.cortex/memories.db`:

- ✅ **Permissions:** File is readable only by your user (Unix systems)
- ✅ **Encryption:** Consider encrypting your home directory
- ⚠️ **Backups:** Ensure backups are secured
- ⚠️ **Sensitive Data:** Avoid storing API keys, passwords, or secrets in memories

### MCP Server Security

When configuring MCP server for AI tools:

- ✅ **Stdio Transport:** Uses standard input/output (secure)
- ✅ **Local Only:** MCP server runs locally, not exposed to network
- ⚠️ **File Paths:** Use absolute paths in configurations
- ⚠️ **Permissions:** Ensure proper file permissions on configuration files

### VS Code Extension Security

- ✅ **No Network Calls:** Extension operates entirely locally
- ✅ **Sandboxed:** Runs in VS Code's extension sandbox
- ⚠️ **Webview:** Webview content is sanitized

## Known Security Considerations

### SQLite Injection

**Status:** Mitigated

All database queries use parameterized statements to prevent SQL injection:

```typescript
// ✅ Safe - uses parameters
db.prepare('SELECT * FROM memories WHERE id = ?').get(id);

// ❌ Unsafe - would be vulnerable (not used)
db.query(`SELECT * FROM memories WHERE id = ${id}`);
```

### Path Traversal

**Status:** Mitigated

Database path is restricted to user's home directory:

```typescript
// ✅ Safe - normalized and restricted
const dbPath = join(homedir(), '.cortex', 'memories.db');
```

### Memory Content XSS (VS Code Extension)

**Status:** Mitigated

Webview content is sanitized and uses Content Security Policy:

```typescript
// ✅ Safe - HTML is escaped
webviewPanel.webview.html = escapeHtml(memory.content);
```

## Security Updates & Advisories

Security advisories are published at:
- [GitHub Security Advisories](https://github.com/EcuaByte-lat/Cortex/security/advisories)
- [CHANGELOG.md](./CHANGELOG.md) (for released patches)

## Vulnerability Disclosure Policy

We follow coordinated vulnerability disclosure:

1. Reporter notifies us privately
2. We acknowledge and validate
3. We develop and test a fix
4. We release a patched version
5. We publish an advisory (after users have time to update)
6. Reporter receives credit (if desired)

## Bug Bounty

We currently do not have a formal bug bounty program. However, we deeply appreciate security researchers who report vulnerabilities responsibly and will:

- Acknowledge you in release notes (if desired)
- Fast-track your contributor status
- Consider financial compensation for critical vulnerabilities (case-by-case basis)

## Security Hall of Fame

We'll recognize security researchers who responsibly disclose vulnerabilities:

*No vulnerabilities have been reported yet.*

## Questions?

For security-related questions that are not vulnerabilities:
- Open a [GitHub Discussion](https://github.com/EcuaByte-lat/Cortex/discussions)
- Email: security@cortex-project.dev

---

**Thank you for helping keep Cortex secure!** 🔒
