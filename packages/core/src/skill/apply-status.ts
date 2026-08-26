import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { listSkills } from './manager.js';
import { listAgents } from '../agent/registry.js';

/**
 * Per-cell state for a (skill, agent) pair, derived from the actual filesystem
 * and cross-referenced with the `resource_agent` apply records.
 *
 * - `applied`:     a symlink exists in the agent's skill dir pointing at the
 *                  Master Workspace trusted source, and a DB apply record exists.
 * - `missing`:     a DB apply record exists but nothing (or a broken symlink) is
 *                  on disk — drift that a re-sync will fix.
 * - `orphan`:      a symlink exists on disk but there is no DB apply record (the
 *                  skill was applied outside Workspace Switch).
 * - `conflict`:    a real directory (or a symlink to an unexpected target) sits at
 *                  the skill path, shadowing the Workspace Switch skill.
 * - `notApplied`:  neither a DB record nor anything on disk — simply not deployed.
 */
export type SkillApplyState = 'applied' | 'missing' | 'orphan' | 'conflict' | 'notApplied';

export interface SkillApplyCell {
  agentId: string;
  state: SkillApplyState;
  /** Agent-local path where the skill would (or does) live. */
  targetPath: string;
  /** Resolved symlink target, when the entry is a symlink. */
  symlinkTarget: string | null;
}

export interface SkillApplyRow {
  skillId: string;
  skillName: string;
  /** Whether the trusted source exists in the Master Workspace. */
  hasSource: boolean;
  /** One cell per agent, aligned with {@link SkillApplyScanResult.agents}. */
  cells: SkillApplyCell[];
}

export interface SkillApplyScanResult {
  agents: Array<{ agentId: string; agentName: string }>;
  rows: SkillApplyRow[];
  counts: {
    applied: number;
    missing: number;
    orphan: number;
    conflict: number;
    notApplied: number;
  };
}

/**
 * Scans every known skill against every enabled agent that has a skill directory
 * configured, and annotates which skills already exist in which agents.
 *
 * Unlike {@link getAppliedAgentsForSkill} (which only reflects DB records), this
 * inspects the real filesystem so drift between the database and disk is visible.
 */
export function scanSkillApplyStatus(
  db: Database.Database,
  workspaceDir: string,
): SkillApplyScanResult {
  const agents = listAgents(db).filter((a) => a.enabled && a.skillDir && a.userRoot);
  const skills = listSkills(db);

  const rows: SkillApplyRow[] = skills.map((skill) => {
    const trustedSource = path.join(workspaceDir, 'skills', skill.name);
    const hasSource = fs.existsSync(trustedSource);

    const cells: SkillApplyCell[] = agents.map((agent) => {
      const targetPath = path.join(agent.userRoot!, agent.skillDir!, skill.name);

      const dbApplied =
        db
          .prepare(
            `SELECT 1 FROM resource_agent
             WHERE resource_type = 'skill' AND resource_id = ? AND agent_id = ?`,
          )
          .get(skill.id, agent.id) !== undefined;

      let state: SkillApplyState;
      let symlinkTarget: string | null = null;

      if (!fs.existsSync(targetPath)) {
        state = dbApplied ? 'missing' : 'notApplied';
      } else {
        const stat = fs.lstatSync(targetPath);
        if (stat.isSymbolicLink()) {
          symlinkTarget = fs.readlinkSync(targetPath);
          const resolved = path.resolve(path.dirname(targetPath), symlinkTarget);
          const pointsToSource = path.resolve(trustedSource) === resolved;
          if (pointsToSource) {
            if (hasSource) {
              state = dbApplied ? 'applied' : 'orphan';
            } else {
              // Symlink points at the expected location but the source is gone.
              state = dbApplied ? 'missing' : 'orphan';
            }
          } else {
            state = 'conflict';
          }
        } else if (stat.isDirectory()) {
          // A real (non-managed) directory shadows the Workspace Switch skill.
          state = 'conflict';
        } else {
          state = 'conflict';
        }
      }

      return { agentId: agent.id, state, targetPath, symlinkTarget };
    });

    return { skillId: skill.id, skillName: skill.name, hasSource, cells };
  });

  const counts = { applied: 0, missing: 0, orphan: 0, conflict: 0, notApplied: 0 };
  for (const row of rows) {
    for (const cell of row.cells) counts[cell.state]++;
  }

  return {
    agents: agents.map((a) => ({ agentId: a.id, agentName: a.name })),
    rows,
    counts,
  };
}
