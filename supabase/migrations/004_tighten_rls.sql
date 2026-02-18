-- Migration 004: Tighten RLS policies to prevent cross-user data leaks
--
-- Fixes:
--   1. artifacts SELECT was using(true) — any user could read all artifacts
--   2. agent_messages SELECT was using(true) — any user could read all messages
--   3. agents UPDATE was using(true) — any user could modify any agent
--   4. sessions INSERT had no ownership check — user_id spoofing possible
--   5. agents/events/artifacts/messages INSERT had no ownership checks
--
-- All policies now use session-ownership subqueries consistent with the
-- existing agents/events SELECT pattern.

-- ============================================
-- SESSIONS
-- ============================================

-- INSERT: user_id must be the caller's own ID or null (no impersonation)
DROP POLICY IF EXISTS "Users can create sessions" ON sessions;
CREATE POLICY "Users can create their own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- SELECT and UPDATE are unchanged (auth.uid() = user_id OR user_id IS NULL)

-- ============================================
-- AGENTS
-- ============================================

-- UPDATE: was using(true), now scoped to session owner
DROP POLICY IF EXISTS "Users can update agents" ON agents;
CREATE POLICY "Users can update agents in their sessions" ON agents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = agents.session_id
        AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

-- INSERT: was with check(true), now scoped to session owner
DROP POLICY IF EXISTS "Users can create agents" ON agents;
CREATE POLICY "Users can create agents in their sessions" ON agents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = agents.session_id
        AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

-- ============================================
-- EVENTS
-- ============================================

-- INSERT: was with check(true), now scoped to session owner
DROP POLICY IF EXISTS "Events can be created" ON events;
CREATE POLICY "Users can create events in their sessions" ON events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = events.session_id
        AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

-- ============================================
-- ARTIFACTS
-- ============================================

-- SELECT: was using(true) — CRITICAL data leak
DROP POLICY IF EXISTS "Users can view artifacts" ON artifacts;
CREATE POLICY "Users can view artifacts in their sessions" ON artifacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = artifacts.session_id
        AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

-- INSERT: was with check(true), now scoped to session owner
DROP POLICY IF EXISTS "Artifacts can be created" ON artifacts;
CREATE POLICY "Users can create artifacts in their sessions" ON artifacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = artifacts.session_id
        AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

-- ============================================
-- AGENT MESSAGES
-- ============================================

-- SELECT: was using(true) — CRITICAL data leak
DROP POLICY IF EXISTS "Users can view agent messages" ON agent_messages;
CREATE POLICY "Users can view messages in their sessions" ON agent_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agents
      JOIN sessions ON sessions.id = agents.session_id
      WHERE agents.id = agent_messages.agent_id
        AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

-- INSERT: was with check(true), now scoped to session owner
DROP POLICY IF EXISTS "Messages can be created" ON agent_messages;
CREATE POLICY "Users can create messages in their sessions" ON agent_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      JOIN sessions ON sessions.id = agents.session_id
      WHERE agents.id = agent_messages.agent_id
        AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );
