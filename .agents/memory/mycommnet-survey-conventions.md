---
name: MyCommNet survey/summary conventions
description: Conventions for how custom user-added survey options are stored/displayed, and how the two engagement questions combine into one summary field.
---

Custom options added via the onboarding survey's free-text/typeahead inputs are normalized to tag format (lowercase, spaces -> underscores) at the moment they're added, not just at display time.

**Why:** Keeps custom values consistent with the app's preset tag values (e.g. `technology`, `job_training`) so they compose cleanly with `generateTags()` and render consistently everywhere they're shown (survey chips + profile summary).

**How to apply:** Any new place that lets a user type a free-text option destined for a `Prefs` array field should normalize with `value.trim().toLowerCase().replace(/\s+/g, "_")` before storing (prefixed with `custom:` as already done), not just strip the prefix for display.

The two "community style" survey questions (`content_preference`: community/service/both, and `engagement_preference`: browse/groups/both) are combined into a single display string in the profile summary: `community_style: <content> / <engagement>`, or `community_style: all` if both answers are "both". This combined value is treated as a single tag-style chip labeled "Community Style" — keep this combination logic in sync if either question's options change.
