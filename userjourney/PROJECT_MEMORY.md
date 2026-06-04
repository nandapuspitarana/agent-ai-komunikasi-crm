# Project Memory

Use this as the compact working memory for future edits to the CEO SUITE chatbot prototype.

## Active Files

- Main HTML: `UserJourney.html`
- Main CSS: `UserJourney.css`
- Main JS: `UserJourney.js`
- Source pricing/contact document: `KB - Pricing.docx`

## Important Decisions

- Customer-facing service name is `Private Office`, not `Serviced Office`.
- Keep the internal service key `office` unless a broader refactor is requested.
- `Day Office` is available as an option but has no pricing in `KB - Pricing.docx`; show placeholder pricing and route it to quotation.
- `Meeting Room` uses `Book online`.
- `Coworking` and `Virtual Office` use `Sign up online`.
- Coworking should show both `Coworking Day Pass` and `Coworking Monthly Pass` for every location. If no monthly-pass price exists in `KB - Pricing.docx`, show `x.xxx` and `placeholder price`.
- Dedicated Workstation period wording should be `per desk / per month` where the KB states per desk/month. Existing Vietnam workstation wording can remain `per workstation / per month`.
- Avoid customer-facing terms like `ecommerce`.
- The AI question path should be labelled `I have other questions`, not `Ask AI Assistant`.
- The AI should answer questions first. Do not offer human transfer immediately when the user opens the question path.
- After a mock AI answer, ask whether the answer is satisfactory. Offer `Yes, this answers my question` and `Speak to our team`.
- Follow-up questions should be typed in the normal text input; do not add a separate `Type a follow-up question` button.
- Generic/unknown AI mock replies should use placeholder wording that live answers will be generated from AI training data and the approved knowledge base using selected service/location context where available.
- `Speak to our team` should collect contact details and question, then mock sending to a human agent for business-hours follow-up. Human agents are not 24/7.
- Virtual Office has four packages. The single Virtual Office price from `KB - Pricing.docx` is for the entry package price shown on `Mail-starter` and `Tel-starter`; show `x.xxx` for `Virtual Office` and `International VO` until exact package prices are provided.
- Virtual Office discount copy should use 50% for 12-month prepaid upfront.
- Virtual Office package selection should include `Not sure yet`, recommending `Mail-starter` as the starting point, then asking the user to confirm before showing the pricing card.
- Recommendation paths should ask for `OK, continue` before presenting the next card.
- Location `Not sure yet` must not suggest a specific centre. Ask only city-aware area questions with clear centre mapping, then show matching centres or offer `I have other questions` or `Show all centres`.
- Area examples: Shanghai = Pudong/Lujiazui or Puxi. Hong Kong = Central Hong Kong or Tsim Sha Tsui.
- Avoid broad location criteria questions that cannot be mapped cleanly, such as closest to clients/team, best price/promotion, or facilities/view/building style.
- Centre cards and pricing/detail cards should not show contact-number lines.
- Single-price cards should not repeat the service label inside the card body. Multi-option cards, such as coworking day/monthly pass, should show option labels.

## Data Model Notes

- `pricing` contains city-level fallback prices.
- `centrePricing` contains centre-specific prices from `KB - Pricing.docx`.
- Use `getPricingData()` so selected-centre pricing overrides city fallback pricing.

## UX Notes

- Keep actions customer-oriented and clear.
- Human escalation should be clear but secondary to AI-first answering.
- Human escalation should explain business-hours follow-up rather than implying 24/7 live chat.
- Quotation form Requirements placeholder should not ask about preferred office size.

## Current Verification Limitation

Node.js is unavailable in this shell, so JS syntax checks with `node --check` may fail until Node is installed or available on PATH.
