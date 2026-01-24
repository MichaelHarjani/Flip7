# Script References

## Main Simulation

### flip7_simulation.py
**Namespace:** `flip7_simulation`
**Description:** Core Flip 7 game simulation for bot strategy testing. Recreates the complete Flip 7 card game with various bot strategies including BustProbability, CardCount, HybridStrategy, ExpectedValue, and more. Includes ELO tournament system, legendary hands tracking, and YOLO mode.
**Location:** `/Users/michael/Projects/flip7-webapp/flip7_simulation.py`

---

## Test Scripts

### test_new_features.py
**Namespace:** `test_new_features`
**Description:** Comprehensive test script for new simulation features including corrected bust probability calculation, variable goal scores (100, 200, 500), Flip 3 strategies (Self, Leader, Highest Bust, Smart Hybrid), and ELO ranking system.
**Location:** `/Users/michael/Projects/flip7-webapp/test_new_features.py`

### test_ev_strategy.py
**Namespace:** `test_ev_strategy`
**Description:** Tests the Expected Value Strategy with different thresholds. Evaluates EV-based decision making that calculates the expected value of the next card draw against other strategies.
**Location:** `/Users/michael/Projects/flip7-webapp/test_ev_strategy.py`

### test_yolo_legendary.py
**Namespace:** `test_yolo_legendary`
**Description:** Tests YOLO mode and legendary hands tracking. When a bot has Second Chance, they ignore their strategy and keep hitting until they bust or achieve legendary scores.
**Location:** `/Users/michael/Projects/flip7-webapp/test_yolo_legendary.py`

### verify_ev_calculation.py
**Namespace:** `verify_ev_calculation`
**Description:** Manual verification that EV calculations match spreadsheet logic. Validates the expected value computation against known scenarios.
**Location:** `/Users/michael/Projects/flip7-webapp/verify_ev_calculation.py`

### test_simulation_quick.py
**Namespace:** `test_simulation_quick`
**Description:** Quick test of the simulation to verify basic functionality. Runs a small number of games (100) with 5 different strategies and exports results to Excel.
**Location:** `/Users/michael/Projects/flip7-webapp/test_simulation_quick.py`

### quick_test.py
**Namespace:** `quick_test`
**Description:** Quick verification test for all new features. Ensures corrected bust probability calculation, variable goal scores, Flip 3 strategies, and ELO rankings work correctly.
**Location:** `/Users/michael/Projects/flip7-webapp/quick_test.py`

---

## Utility Scripts

### extract_icons.py
**Namespace:** `extract_icons`
**Description:** Extracts individual character icons from the AI characters sprite sheet. Processes 'ai-characters.png' and outputs individual PNG files for each unique character (Wall-E, R2-D2, Herbie, C-3PO, EVE, Baymax, 7 of 9, T-800, HAL 9000, Ben 10).
**Location:** `/Users/michael/Projects/flip7-webapp/extract_icons.py`

### extract_icons_advanced.py
**Namespace:** `extract_icons_advanced`
**Description:** Advanced version of the icon extraction script that attempts to automatically detect circular icons in the sprite sheet image using grayscale analysis.
**Location:** `/Users/michael/Projects/flip7-webapp/extract_icons_advanced.py`

---

## Authentication & Database

### server/src/config/supabase.ts
**Namespace:** `supabase_config`
**Description:** Supabase client configuration for server-side operations. Uses service role key for admin access to database. Includes graceful fallback if Supabase is not configured (auth features disabled).
**Location:** `/Users/michael/Projects/flip7-webapp/server/src/config/supabase.ts`
**Status:** ✅ Configured (requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars)

### client/src/lib/supabase.ts
**Namespace:** `supabase_client`
**Description:** Supabase client configuration for client-side operations. Uses anonymous key for public operations and user authentication. Handles session persistence and auto-refresh.
**Location:** `/Users/michael/Projects/flip7-webapp/client/src/lib/supabase.ts`
**Status:** ✅ Configured (requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars)

### server/src/db/migrations/001_auth_schema.sql
**Namespace:** `auth_schema_migration`
**Description:** Database schema migration for user authentication and persistent sessions. Creates tables: user_profiles, user_sessions, rooms, room_participants, game_history. Includes RLS policies, indexes, triggers, and cleanup functions.
**Location:** `/Users/michael/Projects/flip7-webapp/server/src/db/migrations/001_auth_schema.sql`
**Status:** ✅ Ready to run (requires Supabase project)

---

## Dependencies

### flatted.py (External)
**Namespace:** `flatted`
**Description:** External library for JSON flattening (node_modules dependency).
**Location:** `/Users/michael/Projects/flip7-webapp/client/node_modules/flatted/python/flatted.py`
