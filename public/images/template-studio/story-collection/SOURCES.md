# Wedding Story collection — original assets

Created 2026-10-14 with the built-in imagegen tool. All depicted people are fictional adults. No reference-site people, art, text, logos, audio or image files were copied. The Cinelove pages below were inspected for composition and section hierarchy only.

## Templates and references

| InviteMe ID          | Reference                                  |
| -------------------- | ------------------------------------------ |
| `story-editorial-61` | https://cinelove.me/template/thiep-cuoi-61 |
| `story-garden-02`    | https://cinelove.me/template/thiep-cuoi-2  |
| `story-seaside-01`   | https://cinelove.me/template/thiep-cuoi-1  |
| `story-scarlet-39`   | https://cinelove.me/template/thiep-cuoi-39 |
| `story-sage-53`      | https://cinelove.me/template/thiep-cuoi-53 |

## Base image prompt set

Every base request specified original photorealistic wedding imagery, completely fictional adult Vietnamese people with no real-person likeness, vertical 2:3 composition, no text, logo or border.

- `photo-61.webp`: bride in ivory silk gown and groom in charcoal suit, cream architectural studio with tall window, strong afternoon side light, cinematic fashion editorial, full length with room for large typography.
- `photo-2.webp`: bride in white lace and veil, groom in cream linen, holding hands on a stone garden path, olive trees and white hydrangeas, warm morning sun, full length, airy natural mood.
- `photo-1.webp`: bride in flowing ivory dress and groom in beige linen, barefoot at turquoise seaside with pale cliffs, soft waves and sunrise, veil in the wind, full length, visible faces and ocean horizon.
- `photo-39.webp`: bride in ivory satin with burgundy bouquet, groom in black tuxedo, white seamless studio with soft shadows, clean modern editorial, full length.
- `photo-53.webp`: bride in ivory silk with white bouquet, groom in taupe suit, seated on stone garden bench by sage foliage and cream villa, soft overcast light and analog colors.

## Companion / portrait edit prompts

Each edit referenced its own generated base image, never an image of another couple or an external photograph.

- `photo-{1,2,39,53,61}-walk.webp`: preserve both fictional identities, hairstyles, outfits and setting; change pose/framing to a relaxed candid walk together, wider view and three-quarter camera angle, hands linked, landscape 4:3; no text/logo/border.
- `photo-{1,39}-groom.webp`: solo head-and-shoulders portrait of the groom in that same base image; preserve identity, hairstyle, outfit, light and background, remove the bride entirely; centered face, portrait 3:4.
- `photo-{1,39}-bride.webp`: solo head-and-shoulders portrait of the bride in that same base image; preserve identity, hairstyle, outfit, light and background, remove the groom entirely; centered face, portrait 3:4.

The 14 final images were resized to at most 1100px wide and encoded as WebP quality 86 with Sharp. Originals remain in Codex's generated-images directory; every application-referenced output is saved beside this document. No runtime path depends on the Codex directory.

## Intentional differences

These are editable original adaptations, not pixel-identical reproductions. Text and demo identities are original. EB Garamond replaces reference fonts. Gallery, countdown, calendar, maps, RSVP, gift and wishes use InviteMe's shared widgets. Interview is an editable paginated Q&A widget, not a copied source video. Timeline is a shared editable event list. Cover starts disabled for these Stories; motion uses the existing shared reveal system. No reference music or intro assets are included.

EB Garamond is provided by the existing `@fontsource/eb-garamond` dependency under `OFL-1.1`, as recorded in that package's `package.json`. No reference-site font file was downloaded.

The four default album slots use two distinct photographs of the same fictional couple; users can replace, add or remove slots. Scene/identity consistency is best-effort AI imagery rather than a real wedding photo session.
