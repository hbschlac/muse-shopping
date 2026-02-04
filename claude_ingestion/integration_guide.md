# Integration Guide (Claude)

## Objective
Integrate Muse style profile scoring into the existing recommendation service.

## Steps
1) Load schema and scoring spec
- `style_profile_schema.json`
- `style_profile_scoring_function_spec.md`

2) Add StyleProfile to user model
- Store `style_layers`, `price_layers`, `category_layers`, `occasion_layers`, `commerce_intent`, `confidence`.

3) Ingest events and update StyleProfile
- On follow/like/save/click/add_to_cart/purchase, update layers and commerce_intent per spec.

4) Use StyleProfile in ranking
- Boost items and creators that match top style/category/price layers.

5) Use copy map
- Convert top layers into UI copy using `style_profile_copy_map.md`.

6) Validate with fixtures
- Run `style_profile_scoring_test_runner.py` on both fixtures.

## Notes
- Use raw delta updates for correctness; normalization is for display/ranking only.
