# ✅ No Conflict: 'stm_customer' is Correct

You asked if using `stm_customer` instead of `db` causes a conflict.

## 🟢 Answer: NO Conflict (Koi conflict nahi hai)

- `db` in my example `postgresql://user:pass@postgres:5432/db` was just a **placeholder** (dummy text).
- `stm_customer` in your URL `.../stm_customer` is the **actual name** of your database.

### Explanation
When you configure a database service (like Postgres), you give it a name.
- In my example setup, I just lazily called it "db".
- In your real setup, it is named "stm_customer". 

This is exactly how it should be. The application does not care what the name is, as long as the URL matches the actual database created on the server.

### Conclusion
**Your URL is 100% Correct.** You can proceed without worry.
