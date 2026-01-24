# Security Best Practices

## 🚨 CRITICAL: Environment Variables Exposed

**GitGuardian Alert:** Supabase service role keys were previously committed to GitHub.

### Immediate Actions Required

1. **Revoke Exposed Keys** (DO THIS FIRST!)
   - Go to [Supabase Dashboard](https://app.supabase.com/project/umoqzooipjnogjxbqgpm/settings/api)
   - Navigate to Settings → API
   - Click "Reset Service Role Key" (generates new key)
   - Click "Reset Anon Key" (generates new key)
   - Update your local `.env` files with new keys
   - Update Railway environment variables with new service role key
   - Update Vercel environment variables with new anon key

2. **Update Environment Variables**
   - Copy `.env.example` files to create your `.env` files
   - Fill in the new keys from Supabase
   - NEVER commit `.env` files to git

### Why This Matters

**Service Role Key = Full Database Access**
- Can bypass Row Level Security (RLS)
- Can read/write/delete ANY data
- Can create/drop tables
- If exposed: attackers can steal user data, delete your database, or rack up costs

**Anon Key = Public API Access**
- Limited by RLS policies
- Still allows unauthorized access to public endpoints
- Can be used to spam your API

---

## Environment Variable Security

### What Should NEVER Be Committed

❌ **NEVER commit these files:**
```
.env
.env.local
.env.development
.env.production
server/.env
client/.env.*
```

✅ **ALWAYS commit these files:**
```
.env.example
server/.env.example
client/.env.example
```

### Current Setup

**Server** (`server/.env`):
```bash
PORT=5001
JWT_SECRET=your-secret-key-here           # Used for session tokens
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx             # ADMIN ACCESS - NEVER SHARE
```

**Client** (`client/.env.development`):
```bash
VITE_WS_URL=http://localhost:5001
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx                # Public key - safe for client
```

---

## Git Security

### Checking What's Exposed

```bash
# List all tracked environment files
git ls-files | grep -E '\.env'

# Check git history for secrets
git log --all --full-history -- '*.env'
```

### Removing from Git History

**Option 1: BFG Repo-Cleaner (Recommended)**
```bash
# Install BFG
brew install bfg  # macOS
# or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Remove .env files from entire history
bfg --delete-files '.env' --delete-files '.env.*'

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (DESTRUCTIVE - coordinate with team!)
git push --force
```

**Option 2: git-filter-repo**
```bash
# Install
pip install git-filter-repo

# Remove files from history
git filter-repo --path server/.env --invert-paths
git filter-repo --path client/.env.development --invert-paths
git filter-repo --path client/.env.production --invert-paths

# Force push
git push --force
```

**⚠️ WARNING:** Force pushing rewrites history. Coordinate with team members!

---

## Deployment Security

### Railway (Server)

**Set Environment Variables:**
1. Go to Railway project settings
2. Navigate to "Variables" tab
3. Add:
   - `SUPABASE_URL=https://xxx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key>`
   - `JWT_SECRET=<random-strong-secret>`

**Generate Strong JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Vercel (Client)

**Set Environment Variables:**
1. Go to Vercel project settings
2. Navigate to "Environment Variables"
3. Add for "Production" and "Preview":
   - `VITE_SUPABASE_URL=https://xxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<new-anon-key>`
   - `VITE_WS_URL=https://your-railway-url.railway.app`

---

## Supabase Security

### Row Level Security (RLS)

Always enable RLS on all tables:

```sql
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Example policy: Users can only read their own data
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);
```

### API Access Levels

1. **Service Role Key** (Server only)
   - Bypasses RLS
   - Full admin access
   - NEVER expose to client

2. **Anon Key** (Client safe)
   - Respects RLS policies
   - Public API access
   - Safe to expose in client code

---

## Best Practices Checklist

- [x] .env files added to .gitignore
- [x] .env.example templates created
- [x] .env files removed from git tracking
- [ ] **Supabase keys revoked and regenerated** ← DO THIS NOW!
- [ ] Railway environment variables updated
- [ ] Vercel environment variables updated
- [ ] .env files removed from git history (optional but recommended)
- [ ] Team notified about new keys
- [ ] RLS policies verified on all Supabase tables

---

## Prevention

### Pre-commit Hook (Optional)

Create `.git/hooks/pre-commit`:
```bash
#!/bin/sh
if git diff --cached --name-only | grep -E '\.env$|\.env\.'; then
  echo "❌ ERROR: Attempting to commit .env file!"
  echo "Please remove it from staging: git reset HEAD <file>"
  exit 1
fi
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

### GitHub Secret Scanning

- GitGuardian already caught this (good!)
- Enable GitHub secret scanning in repo settings
- Set up notifications for security alerts

---

## Questions?

- Supabase Security: https://supabase.com/docs/guides/auth/row-level-security
- Git Secret Removal: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- Environment Variables: https://12factor.net/config
