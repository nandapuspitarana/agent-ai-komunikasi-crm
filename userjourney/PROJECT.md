# CEO SUITE Chatbot Project

Last updated: 2026-06-02

## Workspace

The active prototype is:

- `UserJourney.html`
- `UserJourney.css`
- `UserJourney.js`

The pricing and contact-number source document is:

- `KB - Pricing.docx`

## Prototype Goal

The prototype is a CEO SUITE chatbot user journey for workspace enquiries. It should feel consultative and customer-oriented, guiding users toward the right service, city, centre, pricing view, and next action.

## Current Service Rules

- `Private Office` was previously called `Serviced Office`.
- `Private Office`, `Dedicated Workstation`, and `Day Office` should go through `Request quotation`.
- `Day Office` has been added as a service option. The current pricing document does not include Day Office pricing, so show placeholder pricing and keep it enquiry/quotation based.
- `Coworking` and `Virtual Office` can use `Sign up online`.
- `Meeting Room` should use `Book online`.
- Coworking pricing should show both `Coworking Day Pass` and `Coworking Monthly Pass`. If `KB - Pricing.docx` does not provide monthly-pass pricing for a location, show `x.xxx` with `placeholder price`.
- Dedicated Workstation pricing periods should use `/desk/month` wording (`per desk / per month`) where the pricing source states per desk/month. Existing workstation-specific wording for Vietnam can remain `per workstation / per month`.
- Virtual Office package flow should avoid internal wording like `ecommerce`; customer-facing copy should refer to online sign-up or secure checkout.
- Virtual Office has four packages. `KB - Pricing.docx` only provides one Virtual Office price; treat that as the entry package price for `Mail-starter` and `Tel-starter`. Use `x.xxx` as placeholder pricing for `Virtual Office` and `International VO` until package-specific pricing is provided.
- Virtual Office prepaid discount copy should say 50%. Include the annual-billing note and yearly savings in the flow.
- After showing the four Virtual Office packages, include a `Not sure yet` option that recommends `Mail-starter` as a safe starting point, then asks the user to confirm before showing the pricing card.
- Similar `Not sure yet` recommendation paths should pause for `OK, continue` before showing the next card.
- Location `Not sure yet` should not recommend a specific centre, to avoid bias between centre managers. Ask only simple city-specific area questions where there is a clear mapping, then let the user review matching centres, ask other questions, or review all centres.
- City-specific area examples: Shanghai should ask Pudong/Lujiazui vs Puxi. Hong Kong should ask Central Hong Kong vs Tsim Sha Tsui.
- Do not ask broad criteria questions like closest to clients/team, best price/promotion, or facilities/view/building style unless there is a short and reliable matching rule. Avoid creating a long question loop.

## Customer-Facing Copy Preferences

- Avoid internal/business-system wording such as `ecommerce`.
- Use customer-oriented labels:
  - `I have other questions` for the AI-first question path
  - `Speak to our team` only after the AI has answered and the answer may not be satisfactory
  - `Book online` for Meeting Room
  - `Sign up online` for Coworking and Virtual Office
- For the quotation form Requirements placeholder, do not ask for preferred office size. Current placeholder:
  - `Tell us about your budget, preferred move-in date, lease term, or any special requirements.`

## AI Question And Human Agent Flow

- The question path should be labelled `I have other questions`, not `Ask AI Assistant`.
- The AI should answer first wherever possible. Do not offer human transfer immediately when the user opens the question path.
- Mock AI replies can be keyword/context based in the prototype. Unknown/general questions should use placeholder copy explaining that live answers will be generated from AI training data and the approved knowledge base, using selected service/location context where available.
- After the AI reply, ask whether the answer is satisfactory. Current options:
  - `Yes, this answers my question`
  - `Speak to our team`
- Follow-up questions should be typed in the normal text input; do not add a separate `Type a follow-up question` button.
- Human agents are not 24/7. Escalation copy should say the team will follow up during business hours.

The `Speak to our team` flow should not end with a simple thank-you message. It should mock sending the request to a human agent:

1. Ask for name, email, contact number, and question.
2. Validate that all four fields have content.
3. Show a sending/queueing status card.
4. Show a mock message confirming the question has been shared with the team for business-hours follow-up.

## Pricing

Pricing was refreshed from `KB - Pricing.docx`.

The prototype now keeps:

- City-level fallback pricing in `pricing`.
- Centre-specific pricing in `centrePricing`.

Centre-specific pricing matters because some cities have multiple centres with different rates, for example Hong Kong, Shanghai, Jakarta, Kuala Lumpur, and Seoul.

Centre cards and pricing/detail cards should not show contact-number lines.

Single-price pricing cards should not repeat the service label inside the card body. Multi-option cards, such as Coworking Day Pass plus Coworking Monthly Pass, should show labels for each option.

Pricing cards should include a starting-price disclaimer:

- Starting prices vary depending on package, location and/or ongoing promotion.
- All prices are in the relevant local currency and exclusive of applicable taxes.

## Verification Notes

Node.js is not available in the current shell, so `node --check UserJourney.js` could not be run. When possible, verify with:

```powershell
node --check UserJourney.js
```

Manual scans already performed:

- Old `Serviced Office` customer-facing wording removed.
- Old `Continue to ecommerce` wording removed.
- Requirements placeholder no longer asks for preferred office size.
- `Ask AI Assistant` wording replaced by `I have other questions`.
- AI question flow now answers first, asks if the answer is satisfactory, and only then offers `Speak to our team`.
- Human-agent escalation copy now notes business-hours follow-up because agents are not available 24/7.
- Coworking Monthly Pass appears for every location; missing monthly-pass prices use `x.xxx` / `placeholder price`.
- Dedicated Workstation periods were updated to `per desk / per month` where applicable.
- Delimiter counts in `UserJourney.js` were balanced after the latest edits.
