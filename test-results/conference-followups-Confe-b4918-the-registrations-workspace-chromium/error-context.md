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
          - text: Email or Employee ID
          - textbox "you@example.com or EMP-001" [ref=e13]
        - generic [ref=e14]:
          - text: Password
          - generic [ref=e15]:
            - textbox "••••••••" [ref=e16]
            - button [ref=e17]:
              - img
          - link "Forgot Password?" [ref=e21] [cursor=pointer]:
            - /url: /forgot-password
        - button "Sign In" [ref=e22]
      - generic [ref=e23]:
        - text: Don't have an account?
        - link "Create one" [ref=e24] [cursor=pointer]:
          - /url: /register
      - generic [ref=e25]:
        - paragraph [ref=e26]: Troubleshooting
        - button "Clear saved sessions & reset app" [ref=e27]
    - generic [ref=e28]: © 2026 STM Management. All rights reserved.
```