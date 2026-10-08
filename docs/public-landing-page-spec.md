# InviteMe public landing page spec

## Scope

This document describes the **product marketing homepage** shown when someone first opens InviteMe at `/`: the navigation, first screen, page sections, and next actions. It does not describe an individual couple's public wedding website at `/wedding/[slug]`, or the private host dashboard.

The current app is an early frontend foundation. This spec separates the existing implementation from the proposed launch page so the design can be built without implying unfinished features are already available.

## Current frontend baseline

- `/` uses `PublicShell` and contains a GSAP hero, a three-card value section, and a development-status note. Template gallery, feature walkthrough, FAQ, and actual pricing content are still proposed. [Source: `src/app/(public)/page.tsx`]
- The full-width transparent header contains InviteMe, Tính năng, Bảng giá, Đăng nhập, and Bắt đầu miễn phí. Mobile keeps the brand and primary action. [Source: `src/shared/layout/public-shell.tsx`]
- `/pricing` and `/wedding/[slug]` are placeholders. Registration/recovery and most wedding workflows are also unfinished according to the README. [Source: `src/app/(public)/pricing/page.tsx`, `src/app/(public)/wedding/[slug]/page.tsx`, `README.md`]
- The visual tokens are warm ivory, sage/forest green, charcoal, and white. Headings use self-hosted Noto Serif; body/UI uses self-hosted Be Vietnam Pro. Both include Latin and Vietnamese subsets. Use the existing global tokens from `src/app/globals.css`.

### Implemented hero motion (2026-10-08)

- Desktop (width ≥1024px) always runs the intro, including when reduced-motion is enabled, per the user's updated decision: full-bleed video + white copy + dark gradient; transparent watercolor raster branches enter at about 0.7s; the same video DOM node shrinks into the invitation preview from 1.65s to 3.5s. The final state is cream, with dark copy/CTA left and the invitation preview right.
- Only transform and opacity are animated. The video crop is counter-scaled inside the transforming mask to preserve its aspect ratio; no video is duplicated or remounted during the sequence. Static border artwork fades in around the final card.
- Mobile (<1024px): render the final stacked poster layout immediately. No video node, MP4 request, or hero animation. No query parameter is required for desktop animation.
- Botanical artwork is transparent watercolor WebP generated for InviteMe, not SVG. Source/license details are in `public/images/hero/ASSETS.md` and `public/videos/ATTRIBUTION.md`.
- The document language is `vi`. The hidden white visual copy is decorative; only one heading and one set of CTA links are exposed to assistive technology.

## Audience and page goal

The primary visitor is a couple in Vietnam considering an online invitation and wedding planning tool. The page should answer, in this order:

1. What InviteMe does.
2. Whether it fits their wedding and guest-management needs.
3. What the invitation and guest experience looks like.
4. How to start, see a demo, or sign in.

Keep copy in Vietnamese for the Vietnam-facing product. Use clear benefit statements. The root layout declares `lang="vi"`.

## Navigation

Use one compact, readable header. On desktop, keep the brand on the left, section links in the middle, and account/actions on the right. On mobile, show the brand and a labeled menu button; the menu should reveal the same destinations and both account actions without crowding the hero.

| Item | Destination | Purpose |
| --- | --- | --- |
| InviteMe logo | `/` | Return to the homepage |
| Tính năng | `/#features` | Jump to the product capabilities |
| Mẫu thiệp | `/#templates` | See invitation/site previews |
| Cách hoạt động | `/#how-it-works` | Explain the setup flow |
| Bảng giá | `/pricing` | View plans; keep this link only when pricing has real content |
| Hỏi đáp | `/#faq` | Answer common setup/privacy/payment questions |
| Đăng nhập | `/login` | Existing account access |
| Tạo thiệp miễn phí | Real onboarding route | Primary conversion action after creation flow ships |

Use section anchors on `/` until dedicated routes exist; do not link `Mẫu thiệp`, `Bảng giá`, or other items to placeholder or nonexistent pages. During development, the primary CTA should reflect what works now, such as `Xem bản demo` when a demo exists or `Đăng nhập` to the available route. Do not promise “miễn phí” until the product's pricing and onboarding decision is confirmed.

## Recommended landing page order

The first screen should establish the product and show the experience. The rest of the page should move from benefits to proof, then answer objections and give the visitor a next step.

| Order | Section | What it contains | Main interaction |
| ---: | --- | --- | --- |
| 1 | Header/navigation | Logo, Tính năng, Mẫu thiệp, Cách hoạt động, Bảng giá, Hỏi đáp, Đăng nhập, primary CTA | In-page anchors or real routes; mobile menu |
| 2 | Hero | One short eyebrow, one specific H1, a two-line explanation, primary and secondary CTA, product preview | Start creating / view demo |
| 3 | Trust/benefit strip | Three or four concise benefits such as “RSVP tập trung”, “Chia sẻ qua Zalo”, “Dễ xem trên điện thoại” | No CTA needed; use only benefits the shipped product supports |
| 4 | Core features | Invitation/site builder, guest list and import, RSVP tracking, co-host planning | Jump to preview or relevant detail |
| 5 | How it works | Choose a design → add wedding details and guests → share the link and track replies | Start creating |
| 6 | Invitation/template gallery | Three to six real template previews with different visual directions; distinguish invitation from couple website if both exist | See all templates / open preview |
| 7 | Product preview / workflow | Show an actual or clearly labeled prototype of the invitation on mobile and guest-management view on desktop | View interactive demo |
| 8 | Vietnam-specific value | Vietnamese names/diacritics, nhà trai/nhà gái or customizable event labels, Zalo sharing, QR/link RSVP when implemented | See a Vietnam-relevant example |
| 9 | Social proof | Verified customer quotes, real review counts, or partner marks with permission | Optional; omit the section until proof exists |
| 10 | Pricing preview | Simple plan summary and what's included; do not hide critical limits | View pricing |
| 11 | FAQ | Free/paid terms, how guests RSVP, privacy, editing after sending, importing guest lists, support | Expand/collapse answers |
| 12 | Final CTA | Repeat the core promise and one primary action | Start creating / view demo |
| 13 | Footer | Product links, pricing, help/contact, privacy, terms, copyright | Navigate to real pages |

The page can launch with fewer sections. Prioritize header, hero, benefits, a product/template preview, FAQ, and footer; add social proof and pricing details only when the claims and policies are settled.

## First screen: content and composition

### Copy direction

- Eyebrow: identify the product category in plain language, for example `THIỆP CƯỚI ONLINE & QUẢN LÝ RSVP`.
- H1: state the job InviteMe helps with, for example `Tạo thiệp cưới online, quản lý khách mời dễ dàng.` Avoid abstract claims such as “mọi khoảnh khắc bắt đầu từ lời mời” as the only explanation.
- Supporting copy: say that couples can create a wedding page/invitation, organize guests, and collect replies in one place—but only include functions that are actually available or mark them as coming soon.
- Primary CTA: one action, visually strongest. Label it to match the current product state.
- Secondary CTA: `Xem mẫu thiệp` or `Xem demo`; it should lead to real examples, not an empty placeholder.
- Add two or three short reassurance points below the actions, such as mobile-friendly, easy-to-share link, or Vietnamese support, only when verified.

### Visual composition

- Use a two-column hero on desktop: copy and CTAs on the left, a believable product preview on the right. On mobile, stack copy/CTAs first and the preview next.
- Prefer a real product screenshot or a faithful invitation preview inside a phone frame. The preview should demonstrate the service rather than act as decoration.
- Use one authentic wedding photo inside a template preview when available. Do not put a full-bleed stock photo behind the hero text; keep the page canvas light and calm.
- Keep the ivory/sage/charcoal system. Pink may appear as a small template-specific accent, not the default page background or a large glowing surface.
- Keep the first screen focused: avoid floating statistic badges, multiple overlapping cards, decorative orbs, and several competing CTA buttons.

## Section content guidance

### Benefit strip and feature cards

Show three or four capabilities, each with a simple Lucide icon, a short title, and one sentence. Suggested categories: `Thiệp và website cưới`, `Danh sách khách mời`, `RSVP và số lượng tham dự`, `Cùng chuẩn bị với người thân`. Do not add metrics or feature claims that are not backed by a shipped workflow.

### How it works

Use three numbered steps with verbs and a concrete outcome. Keep the explanation short enough to scan. Do not show backend/import details in the marketing flow; lead with what the couple does and what the guest receives.

### Templates

Show actual examples, not empty gradient cards. Include enough visual variety (minimal, botanical, traditional/Vietnam-inspired) while preserving readable typography. Each card may show a thumbnail, template name/style, and `Xem mẫu`. Use photos/artwork only when the project has permission to use them. If there is no template library yet, label the cards as concepts or omit the gallery.

### Product workflow preview

Pair the mobile invitation view with one management view such as guest list/RSVP. This helps visitors understand that InviteMe serves both hosts and invitees. Use realistic, non-sensitive sample names and mark prototype data as sample data. Do not present fabricated user counts, RSVP totals, reviews, or uptime percentages as proof.

### FAQ

Start with questions that block conversion: Is the service available/free? How does a guest respond? Can a host manage separate events or guest groups? Can the invitation be shared privately? Can details be edited after sharing? How do guests contact support? Answer from current product rules; do not speculate in public copy.

## Responsive and interaction rules

- Keep the hero H1 to a readable measure and avoid forced line breaks that create awkward Vietnamese wrapping.
- At mobile widths, stack the hero, keep the primary CTA easy to reach, and scale the product preview without horizontal page overflow.
- Keep navbar labels and buttons large enough to tap. Use a real menu button with an accessible name, keyboard support, and visible focus.
- Use anchors with visible section headings and account for any sticky header when scrolling to a section.
- Provide keyboard-accessible controls for template carousels and FAQ accordions; do not make hover the only way to reveal a preview/action.
- The desktop hero explicitly runs regardless of reduced-motion preference, per the approved product behavior. Its video has a pause control; mobile stays static.

## Claims and release accuracy

The README states that the current FE has route scaffolds and that wedding creation, guest import, invitations, RSVP, and other business workflows are not implemented yet. The current `/pricing` and `/wedding/[slug]` pages are placeholders. Therefore:

- Do not publish “tạo thiệp miễn phí”, real-time RSVP, import, privacy/security, or support claims until the relevant flow, price, and policy are confirmed.
- Do not use the mockup's sample figures (for example, `15.000+`, `28.500+`, `99,8%`) as live social proof.
- Use a clearly labeled prototype/demo while screens are not functional.
- Keep CTA destinations real and review the page after registration/onboarding routes exist.

## Research notes

Official competitor landing pages show a repeated, useful marketing pattern: explain the wedding website/invitation offer, show templates, connect guest list and RSVP, demonstrate how guests use it, then address privacy/pricing questions. This is directional research, not a claim that every competitor uses the same layout.

- Zola presents template selection, adding details, sharing, integrations, privacy, and FAQs on its wedding website page: [Zola Wedding Websites](https://www.zola.com/wedding-planning/website).
- Joy positions its product around a wedding website plus guest list, RSVP, registry, and planning tools: [Joy homepage](https://withjoy.com/?l=en-US), [Joy website builder](https://withjoy.com/wedding-website/).
- The Knot emphasizes template choice, site creation, RSVP, registry, event details, and FAQs: [The Knot Wedding Websites](https://www.theknot.com/gs/wedding-websites).
- Minted highlights templates, guest lists, RSVPs, privacy, registries, URL choices, and the guest RSVP flow: [Minted wedding websites](https://www.minted.com/lp/ido).
- RSVPify's event landing page uses a clear product statement, capability list, trust cues, and primary/demo CTAs: [RSVPify Event Website Builder](https://rsvpify.com/event-website-builder/).

These are official marketing pages. Product claims above describe what those vendors say about their own offerings; they do not establish InviteMe capabilities.

## Source files in this FE

- `/` home: `src/app/(public)/page.tsx`
- Public header/footer: `src/shared/layout/public-shell.tsx`
- Pricing placeholder: `src/app/(public)/pricing/page.tsx`
- Couple wedding page placeholder: `src/app/(public)/wedding/[slug]/page.tsx`
- Current visual tokens: `src/app/globals.css`
- Scope and shipped/not-yet-implemented workflows: `README.md`


## Vòng đời lá độc lập

Lớp lá mở đầu thuộc hero, không thuộc khung video: 10 mảnh watercolor mọc lần lượt từ gốc, sau đó trôi xuống, xoay và biến mất khi video co. Lớp quanh thiệp gồm 10 phần tử mới từ 5 asset riêng (xanh sage và cành vàng); chỉ mọc sau khi video co xong. Một timeline GSAP điều phối toàn bộ, chỉ tween transform/opacity. Mobile hiển thị bố cục cuối bằng poster. Desktop tự chạy tại URL thường theo quyết định mới của người dùng.


## Phân tích bản quay Joy và nhịp cập nhật

Đã đọc bản quay tại 8 khung/giây trong đoạn chuyển cảnh. Mốc trong bản quay (có thời gian tải): khoảng 4.9s lá lớn bắt đầu lộ từ mép trên; 5.5–6.8s video co về bên phải, lá lớn vẫn phủ phía trước và trôi xuống; khoảng 6.8–7.4s lớp lá quanh thiệp lộ ra, lá mở đầu khuất khỏi viewport. Quan sát hình ảnh không chứng minh được cấu trúc DOM/z-index của Joy.

Timeline ứng dụng tính từ lúc khởi tạo: video riêng 0–1.2s; liễu mọc 1.2–3.15s; giữ tới 3.5s; video co và liễu trôi xuống 3.5–5.35s, chỉ fade cuối pha; lá thiệp mọc 5.35–6.95s. Lớp mở đầu ở trước video, lớp thiệp nằm sau khung. Mốc Joy là ước lượng từ bản quay, không phải số liệu nội bộ.


### Điều chỉnh: mọc từng lá
Thay ảnh nguyên cành bằng thân cành trống, 7 lá/hoa độc lập. Thân fade trước, lá scale nhẹ và fade lần lượt từ gốc ra ngọn; wrapper không scale. Lá quanh thiệp bắt đầu ở 4.35s, trong lúc video co 3.5–5.35s. Bản mới ưu tiên yêu cầu mọc từng lá và pha chồng lấn này thay cho lịch cũ.


### Gió và sự liên tục của cụm bên phải
Cụm bên trái xoay và trôi ngang ra ngoài viewport, không rơi thẳng xuống. Ba cành bên phải giữ nguyên các phần tử thân/lá, chuyển vị trí và kích thước về ba vị trí quanh thiệp đồng thời với video. Các slot đích không hiện thêm bản sao. Lớp chuyển tiếp hạ xuống sau khung khi video co xong; các cành mới khác mọc bổ sung trong pha co.
