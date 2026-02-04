# Style Profile Scoring Simulation

Date: 2026-02-03

## Goal
Demonstrate how a series of events updates a user’s Style Profile over time.

## Simulation Inputs
User starts with an empty profile (all zeros).

Events:
1) Follow influencer A (minimal, premium, workwear, commerce_readiness=20)
2) Like influencer B (streetwear, mid, shoes, commerce_readiness=0)
3) Save influencer A
4) Click product P (category: workwear, price: premium, occasion: work)
5) Purchase product Q (category: bags, price: premium, occasion: event)

## Weights
- follow: +1.0
- like: +0.6
- save: +0.9
- click: +0.5
- purchase: +1.5

## Step-by-step Updates

### After 1) Follow influencer A
- style: minimal +1.0
- price: premium +1.0
- category: workwear +1.0
- commerce_intent +0.1

### After 2) Like influencer B
- style: streetwear +0.6
- price: mid +0.6
- category: shoes +0.6

### After 3) Save influencer A
- style: minimal +0.9 (total 1.9)
- price: premium +0.9 (total 1.9)
- category: workwear +0.9 (total 1.9)
- commerce_intent +0.1 (total 0.2)

### After 4) Click product P
- category: workwear +0.5 (total 2.4)
- price: premium +0.5 (total 2.4)
- occasion: work +0.5

### After 5) Purchase product Q
- category: bags +1.5
- price: premium +1.5 (total 3.9)
- occasion: event +1.5
- commerce_intent +0.2 (total 0.4)

## Normalized Snapshot (illustrative)
- style: minimal 1.0, streetwear 0.32
- price: premium 1.0, mid 0.15
- category: workwear 1.0, bags 0.62, shoes 0.25
- occasion: work 0.25, event 1.0
- commerce_intent: 0.4
- confidence: 0.65

## Resulting UX Copy (examples)
- "Your style snapshot: Clean lines and neutral basics"
- "Premium workwear + statement bags"

