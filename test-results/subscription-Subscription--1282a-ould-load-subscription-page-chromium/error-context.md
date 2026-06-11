# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e6]:
    - generic [ref=e7]:
      - generic [ref=e8]:
        - heading "Welcome Back" [level=1] [ref=e9]
        - paragraph [ref=e10]: Sign in to your account to continue
      - generic [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]: Email
          - textbox "you@example.com" [ref=e14]
        - generic [ref=e15]:
          - generic [ref=e16]: Password
          - generic [ref=e17]:
            - textbox "••••••••" [ref=e18]
            - button [ref=e19] [cursor=pointer]:
              - img [ref=e20]
          - link "Forgot Password?" [ref=e24] [cursor=pointer]:
            - /url: /forgot-password
        - button "Sign In" [ref=e25] [cursor=pointer]
      - generic [ref=e26]:
        - text: Don't have an account?
        - link "Create one" [ref=e27] [cursor=pointer]:
          - /url: /register
      - generic [ref=e28]:
        - paragraph [ref=e29]: Troubleshooting
        - button "Clear saved sessions & reset app" [ref=e30] [cursor=pointer]
    - generic [ref=e31]: © 2026 STM Management. All rights reserved.
  - button "Open Next.js Dev Tools" [ref=e37] [cursor=pointer]:
    - img [ref=e38]
  - alert [ref=e41]
```