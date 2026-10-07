# Hirevelo 3D landing-page icons

Generated with the built-in imagegen tool for the public homepage. These are
original illustrations with transparent backgrounds, not emoji or emoticons.
Next.js Image serves appropriately sized versions. UI-control chevrons remain SVG.
The current green frontend redesign uses 2D Lucide icons throughout. The unused
3D PNG assets and their unused rendering branch have been removed during repository
cleanup. This Markdown document remains as the generation history; PNG exports
in this directory are ignored by Git.

The previous homepage animated these icons with short CSS transform sequences
when entering the viewport:
briefcase sway, document lift, candidate float, conversation pulse, and decision
confirmation. Each sequence lasts 3.8 seconds, stops offscreen, and replays on
re-entry. Reduced motion disables both icon animation and section reveals.

Previous files: briefcase.png, document.png, candidate.png, conversation.png, decision.png.

## Generation prompts

Each icon used this prompt, substituting its subject below:

> Create one isolated premium 3D icon for the Hirevelo recruiting website: {subject}. Art direction: sophisticated miniature product render, smooth matte ceramic with gentle satin highlights, visibly extruded thickness, softly beveled edges, three-quarter front view, subtle ambient occlusion, soft studio lighting from upper left. Consistent family palette cobalt #2563EB, teal #20B49B, pale blue and white. Centered single object occupying 80% of square canvas, complete silhouette with generous transparent padding. Genuinely transparent background, no backdrop, no floor, no frame, no captions, no letters, no logo, no watermark, no emoji, no emoticon, no cartoon face, no facial expression. Must read clearly as a polished dimensional business UI icon at 48 to 80 pixels. Save the generated file and provide its local path.

- briefcase: a professional compact blue briefcase with a curved handle, pale blue inset front panel and small silver clasp
- document: a white CV document with folded top corner, thick cobalt blue back plate and three raised pale blue lines, no writing
- candidate: an abstract professional profile bust silhouette, head and shoulders in teal and pale cyan, no facial features, no eyes, no mouth
- conversation: two overlapping dimensional speech bubbles, one teal and one pale mint, empty interiors without dots or writing
- decision: a chunky cobalt blue checkmark seated on a pale blue rounded square approval tile
