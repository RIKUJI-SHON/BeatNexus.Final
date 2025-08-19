# BeatNexus Ranking System Specification (English)

## Document Info
- Version: 1.0 (EN initial) aligned with JP v1.1
- Last Update: Introduced losing streak decay scoring model (fixed_points_loss_decay_v1)
- Scope: Production & Development

## Overview
The BeatNexus ranking system visualizes competitive performance (battles) and community contribution (voting). This English document mirrors the Japanese canonical spec and highlights the updated season point allocation with losing streak decay.

## Season Ranking Key Changes (Aug 19 2025)
- New calculation method: fixed_points_loss_decay_v1
- Win: +16 / Draw: +8
- Loss with decay:
  - Previous consecutive losses = 0: +4
  - Previous consecutive losses = 1: +2
  - Previous consecutive losses >= 2: +0
- Loss streak resets on Win or Draw.
- Floor: season_points never below 1100.
- Function output now includes JSON fields: loss_streak_before, loss_streak_after per player.

## Rationale
- Reduces snowballing by preventing constant +4 during extended losing streaks.
- Preserves clarity (still a fixed table) while adding adaptive fairness.
- Requires no schema change: streak is computed from archived_battles via reverse scan.

## Function Notes
`update_season_points_after_battle` sets calculation_method = 'fixed_points_loss_decay_v1' and returns:
```json
{
  "calculation_method": "fixed_points_loss_decay_v1",
  "player1": {"season_points_delta": 16, "loss_streak_before": 0, "loss_streak_after": 0},
  "player2": {"season_points_delta": 0,  "loss_streak_before": 2, "loss_streak_after": 3}
}
```

## Retroactive Adjustment Policy
Historic battle entries are not recomputed. Only over-awarded users (where a 2nd+ consecutive loss previously granted +4 instead of +2/+0) received manual season_points corrections (e.g. -2). Analytical queries comparing OLD vs NEW logic may still display theoretical over_award values; these represent historical differences, not current outstanding corrections.

## Diff vs Previous Model (fixed_points_v1)
| Aspect | fixed_points_v1 | fixed_points_loss_decay_v1 |
|--------|-----------------|----------------------------|
| Loss points | Always +4 | +4 → +2 → +0 with streak |
| Comeback leverage | Lower | Higher (depressed gains while losing) |
| Snowball mitigation | Weak | Stronger |
| Extra columns | None | None (computed) |
| Migration | N/A | Helper + function rewrite |

## Planned Extensions
- Parameterize decay thresholds (settings table)
- Optional future win-streak bonuses

## Tie-break Order (Unchanged)
1. season_points DESC
2. weighted_vote_share DESC
3. sum_margin_ratio DESC
4. battles_played DESC
5. last_battle_at DESC
6. user_id ASC (stability)

## Change Log (English Extract)
- 2025-08-19: Introduced losing streak decay model and updated documentation.

---
Canonical Japanese document: `ランキングシステム仕様書.md` (section 4.3). This English file is an auxiliary translation; update both when modifying ranking logic.
