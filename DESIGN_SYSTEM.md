# Street Tasks UI Design System

## Purpose

Street Tasks is a map-first WeChat mini program for short-lived neighborhood information. The UI should feel quick, local, trustworthy, and easy to scan while someone is outside or moving.

## Visual Direction

Use a warm, restrained local-life tool style. Avoid marketing-page hero layouts, glossy glass effects, heavy blue-purple gradients, oversized shadows, and decorative shapes that do not carry information.

## TDesign Strategy

The project currently has no frontend build step and no mini program npm dependency pipeline. Keep the implementation native by default, but follow TDesign-style rules:

- Components should have predictable states: default, active, disabled, loading, empty, and error.
- Touch targets should be at least `72rpx` high for primary actions and at least `44rpx` for small icon controls.
- Card radius should stay at or below `16rpx`.
- Use semantic colors instead of one-off values.
- If `tdesign-miniprogram` is introduced later, map these tokens to TDesign theme variables first, then replace native controls incrementally.

## Tokens

- Background: `#F4F1EA`
- Surface: `#FFFEFA`
- Surface muted: `#F7F3EA`
- Text strong: `#14211D`
- Text normal: `#2E423A`
- Text muted: `#697970`
- Border: `rgba(31, 63, 52, 0.12)`
- Primary: `#1F6658`
- Primary dark: `#143E37`
- Accent: `#D7673F`
- Warning: `#B9791F`
- Danger: `#A73527`
- Success surface: `#E4F0E9`
- Warning surface: `#FFF2DA`
- Danger surface: `#FFE9E2`

## Typography

- Page title: `40-44rpx`, `font-weight: 900`, line-height `1.12-1.18`.
- Section title: `30-32rpx`, `font-weight: 900`, line-height `1.25`.
- Body text: `28-30rpx`, line-height `1.5-1.6`.
- Meta text: `22-24rpx`, line-height `1.35-1.5`.

## Layout Rules

- Map remains the first-viewport experience.
- Lists open as bottom drawers or compact cards, not full marketing sections.
- Forms use grouped fields and clear labels; helper text goes below the relevant control.
- Repeated items should be compact cards with image, title, tags, and one clear next action.
- The custom tab bar should be docked to the bottom with an opaque surface. Avoid floating gaps on form or list pages because content can show through behind the navigation.
- Keep all user-facing copy in Chinese.

## Component Patterns

- `BottomAction`: fixed above the custom tab bar, opaque, with one short title, one helper line, and one primary action. Use it for page-level submit actions so primary buttons do not hide behind the tab bar.
- `FormSection`: grouped form area with a section title, helper note, and related fields. Use it instead of one long undifferentiated form card.
- `CategoryOption`: two-column direct-choice buttons for small option sets such as task categories. Prefer this over a picker when the choices are few and user-facing.
- `DrawerCounter`: compact number block in bottom drawers to make counts scannable without adding another sentence.
- `SignalPill`: small metric tile for repeated task-card signals such as confirmation count, stale count, and remaining time.
- `TrustInsight`: detail-page section placed before trust actions. Summarize confirmations, stale reports, reports, and comment count into one status sentence, then show compact segmented metrics and the next sensible action. Use it to explain the counts instead of making users infer trust from numbers alone.

## QA Checklist

- Check the map page, publish page, detail page, admin page, and profile page.
- Check 375px-equivalent narrow screens for text overflow.
- Verify buttons do not overlap safe areas or the custom tab bar.
- Verify empty, loading, disabled, and active states still have visible styling.
