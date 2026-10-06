# Design notes

How the Figma design was used, and where the implementation deliberately differs from it.

Design tokens (colors, type styles, spacing), the logo, illustration and icons come from the Figma
file. Sizes that differ between the 390px and 1440px frames are `clamp()` values running between
the two, so the layout is fluid; every length is in `rem`. The Figma API limit on the free plan cut
the extraction short, so the mobile report and the High report were built from the same tokens and
from screenshots rather than from exact values.

Deliberate differences from the design:

- Inputs have visible labels and a "Show" control for the password; the design has placeholders
  only.
- One input style and one button size on all screens; the design varies them between screens.
- On mobile, the sign-in button sits under the fields instead of at the bottom of the screen, where
  the keyboard would cover it.
- The progress bar fills with the question number; the design shows the same fill everywhere.
- The quiz arrows are darker and sit higher than in the design, to be easier to see and reach.
- The gauge needle follows the score linearly; in the design it does not match the number.
- Links the flows need but the design lacks: "Sign in" / "My report" in the header, "Retake test"
  on the report, and links between the two account pages.
- "Focus" instead of the design's "Focuse".
- FAQ answers: the design has an answer only for the first question of each report; the other
  answers were written for this implementation.
