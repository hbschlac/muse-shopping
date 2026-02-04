# Claude Ingestion Package

This folder contains structured assets for integrating Muse influencer signals into the recommendation system.

## Contents
- `manifest.json`: machine-readable index of all files and their purpose
- `style_profile_schema.json`: JSON Schema for the user Style Profile
- `style_profile_scoring_function_spec.md`: scoring logic and update rules
- `style_profile_scoring_fixtures.json`: test fixtures
- `style_profile_scoring_fixtures_extra.json`: edge case fixtures
- `style_profile_scoring_test_runner.py`: test runner (all fixtures pass)
- `style_profile_sample_users.json`: example user profiles + UX examples
- `style_profile_sample_users.csv`: flattened examples
- `style_profile_copy_map.md`: tag-to-copy mapping for UI
- `style_profile_ux_blueprint.md`: product surfaces and UX flow
- `influencer_shopper_signal_map.md`: influencer → shopper signal mapping rules
- `style_profile_spec.md`: spec narrative

## Notes
- All weights and scoring logic are defined in `style_profile_scoring_function_spec.md`.
- Fixtures are designed to validate raw delta updates (not normalized values).
