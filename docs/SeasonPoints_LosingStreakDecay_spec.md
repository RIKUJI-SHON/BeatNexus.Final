## Season Points Losing Streak Decay Specification (v1)

Updated: 2025-08-19

Core rule: Win +16 / Draw +8 (reset losing streak). Loss points depend on consecutive prior losses (L): L=0 -> +4, L=1 -> +2, L>=2 -> +0. Deleted users excluded. Floor 1100 preserved.

Helper: get_loss_streak_before_battle(user_id, season_id, battle_original_id) scanning archived_battles descending excluding current battle.

Function updated: update_season_points_after_battle returns extra fields loss_streak_before/after per player; calculation_method = fixed_points_loss_decay_v1.

See migration 20250819120000_add_losing_streak_decay_season_points.sql and dev log 2025-08-19_losing_streak_decay.mdc.
