import json
from math import isclose, log10

EVENT_WEIGHTS = {
    "follow": 1.0,
    "like": 0.6,
    "save": 0.9,
    "click": 0.5,
    "add_to_cart": 1.2,
    "purchase": 1.5,
}


def update_profile(profile, event, influencer=None, product=None):
    weight = EVENT_WEIGHTS[event["event_type"]]

    if event["source_type"] == "influencer" and influencer:
        style = influencer.get("style_archetype")
        price = influencer.get("price_tier")
        category = influencer.get("category_focus")
        commerce = influencer.get("commerce_readiness_score", 0)

        if style:
            profile["style_layers"][style] += weight
        if price:
            profile["price_layers"][price] += weight
        if category:
            profile["category_layers"][category] += weight
        if commerce >= 20:
            profile["commerce_intent"] += 0.1

    if event["source_type"] == "product" and product:
        cat = product.get("category")
        price = product.get("price_tier")
        occ = product.get("occasion")
        if cat:
            profile["category_layers"][cat] += weight
        if price:
            profile["price_layers"][price] += weight
        if occ:
            profile["occasion_layers"][occ] += weight
        if event["event_type"] == "purchase":
            profile["commerce_intent"] += 0.2

    return profile


def normalize_layers(layer_map):
    max_val = max(layer_map.values()) if layer_map else 0
    if max_val <= 0:
        return layer_map
    for k in layer_map:
        layer_map[k] = round(layer_map[k] / max_val, 4)
    return layer_map


def compute_confidence(total_events):
    return min(1.0, log10(total_events + 1) / 2)


def approx_equal(a, b, tol=1e-6):
    return isclose(a, b, rel_tol=tol, abs_tol=tol)


def compute_delta(initial, updated):
    delta = {
        "style_layers": {},
        "price_layers": {},
        "category_layers": {},
        "occasion_layers": {},
        "commerce_intent": updated.get("commerce_intent", 0) - initial.get("commerce_intent", 0),
    }
    for group in ["style_layers", "price_layers", "category_layers", "occasion_layers"]:
        for k, v in updated[group].items():
            delta[group][k] = v - initial[group].get(k, 0)
    return delta


def check_expected_delta(delta, expected):
    failures = []

    for group_key in ["style_layers", "price_layers", "category_layers", "occasion_layers"]:
        if group_key in expected:
            for k, v in expected[group_key].items():
                if not approx_equal(delta[group_key].get(k, 0), v):
                    failures.append(f"{group_key}.{k} expected {v} got {delta[group_key].get(k, 0)}")

    if "commerce_intent" in expected:
        if not approx_equal(delta.get("commerce_intent", 0), expected["commerce_intent"]):
            failures.append(f"commerce_intent expected {expected['commerce_intent']} got {delta.get('commerce_intent', 0)}")

    return failures


def run_fixture(fx):
    initial = fx["initial_profile"]
    event = fx["event"]
    influencer = fx.get("influencer")
    product = fx.get("product")

    # Deep copy initial for update
    profile = json.loads(json.dumps(initial))
    profile = update_profile(profile, event, influencer, product)

    delta = compute_delta(initial, profile)

    # Normalized snapshot (informational)
    normalized = {
        "style_layers": normalize_layers(profile["style_layers"].copy()),
        "price_layers": normalize_layers(profile["price_layers"].copy()),
        "category_layers": normalize_layers(profile["category_layers"].copy()),
        "occasion_layers": normalize_layers(profile["occasion_layers"].copy()),
        "confidence": round(compute_confidence(1), 4),
    }

    return delta, normalized


def load_fixtures(paths):
    fixtures = []
    for p in paths:
        with open(p) as f:
            fixtures.extend(json.load(f)["fixtures"])
    return fixtures


def main():
    fixture_paths = [
        "style_profile_scoring_fixtures.json",
        "style_profile_scoring_fixtures_extra.json",
    ]
    fixtures = load_fixtures(fixture_paths)

    failures_total = 0
    for fx in fixtures:
        delta, _ = run_fixture(fx)
        expected = fx.get("expected_delta", {})
        failures = check_expected_delta(delta, expected)
        if failures:
            failures_total += 1
            print(f"FAIL {fx['id']}")
            for f in failures:
                print("  -", f)
        else:
            print(f"PASS {fx['id']}")

    print("---")
    if failures_total:
        print(f"{failures_total} fixtures failed")
    else:
        print("All fixtures passed")


if __name__ == "__main__":
    main()
