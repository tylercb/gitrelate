# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version  | Supported          |
| -------- | ------------------ |
| Latest   | :white_check_mark: |
| < Latest | :x:                |

As GitRelate(d) is actively developed, we recommend always using the latest version deployed at [gitrelated.com](https://gitrelated.com).

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow responsible disclosure practices:

### 🔒 **For Security Issues:**

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities privately by:

1. **Email**: Send details to **x.com/tylerhanway**
2. **Subject Line**: `[SECURITY] GitRelate(d) Vulnerability Report`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
   - Your contact information

### 📧 **What to Include:**

- **Vulnerability Type**: (e.g., XSS, SQL injection, authentication bypass)
- **Affected Component**: (frontend, backend, API, etc.)
- **Reproduction Steps**: Clear instructions to reproduce the issue
- **Impact Assessment**: Potential damage or data exposure
- **Environment**: Browser, OS, or other relevant details

## 🕐 **Response Timeline**

- **Initial Response**: Within 48 hours
- **Status Update**: Within 1 week
- **Fix Timeline**: Depends on severity
  - **Critical**: 24-48 hours
  - **High**: 1 week
  - **Medium**: 2-4 weeks
  - **Low**: Next release cycle

## 🛡️ **Security Measures**

GitRelate(d) implements several security measures:

- **Input Validation**: All user inputs are validated and sanitized
- **HTTPS Only**: All communications are encrypted
- **No Stored User Data**: We don't store personal information
- **Rate Limiting**: API calls are rate-limited to prevent abuse
- **Content Security Policy**: CSP headers protect against XSS
- **Dependency Scanning**: Regular security audits of dependencies

## 🔍 **Scope**

Security vulnerabilities we're interested in:

- **Cross-Site Scripting (XSS)**
- **Cross-Site Request Forgery (CSRF)**
- **Server-Side Request Forgery (SSRF)**
- **Injection attacks** (SQL, NoSQL, Command injection)
- **Authentication/Authorization bypasses**
- **Data exposure** or information leakage
- **Denial of Service (DoS)** vulnerabilities
- **Client-side vulnerabilities**

## ❌ **Out of Scope**

The following are generally not considered security vulnerabilities:

- **Brute force attacks** on public APIs
- **Social engineering** attacks
- **Physical access** to user devices
- **Issues requiring physical access** to our infrastructure
- **Spam or abuse** of the service
- **Rate limiting bypasses** that don't cause service disruption

## 🏆 **Recognition**

We believe in recognizing security researchers who help keep GitRelate(d) secure:

- **Security Acknowledgments**: We maintain a list of security contributors
- **Public Thanks**: Recognition in release notes (with your permission)
- **Direct Communication**: We'll keep you updated on fix progress

## 📞 **Contact**

For any security-related questions or concerns:

- **Security Email**: x.com/tylerhanway
- **General Contact**: Through GitHub issues (for non-security matters only)
- **Website**: [gitrelated.com](https://gitrelated.com)

Thank you for helping keep GitRelate(d) safe and secure! 🙏
