TITLE: Css Normalization Rules

This file defines how raw computed css values from the browser are transformed into a clean, schema friendly representation.

SECTION: Goals

Remove ambiguity from css by expanding shorthands and resolving units.
Represent all values in a flat, machine friendly structure.
Preserve enough detail to accurately map styles to Figma properties.

SECTION: Property Expansion

For every element, expand shorthand properties into their longhand equivalents.
This applies to margin, padding, border, background, font, transition, and animation.
Store margin and padding for each side separately.
Store border width, style, and color separately per side.
Split background into color, image, position, size, repeat, and additional layers when needed.

SECTION: Unit Resolution

Convert all length units to pixels by using browser computed values.
This includes em, rem, percentage based dimensions, viewport units, and any other supported type.
Store a numeric pixel value and optionally the original raw string for debugging.
Internal calculations and mapping must always use the pixel value.

SECTION: Color Normalization

Convert all colors to a common representation such as red, green, blue, alpha with values between zero and one.
Resolve named colors into numeric values.
Resolve current color and inherited color properly.
Store opacity consistently with other alpha channels.

SECTION: Font And Text Properties

Normalize font family as an ordered list of families with the primary chosen explicitly.
Convert font weight to a numeric value between one hundred and nine hundred.
Convert font size to pixels.
Represent line height as both a classification, such as normal or fixed, and a numeric pixel value when available.
Convert letter spacing to pixels, allowing negative values.

SECTION: Display And Position

Normalize display to the final used value, such as block, inline, flex, or grid.
Normalize position to static, relative, absolute, fixed, or sticky.
Derive a layout mode field that summarises how the element behaves for the builder.

SECTION: Shadows, Radii, And Borders

Parse box shadow strings into structured shadow objects with offset, blur, spread, color, and inset flag.
Normalize border radius for each corner into pixel values.
Ensure that complex radius expressions with percentages are converted into precise numeric values based on the element geometry.

SECTION: Opacity And Visibility

Normalize opacity into a numeric value between zero and one.
Represent visibility states such as visible and hidden directly.
Elements with display none are generally excluded from layout and building unless explicitly configured otherwise.

SECTION: Transforms

If a transform is defined, normalize it into either a matrix representation or decomposed translate, scale, rotate, and skew components.
Store transform origin as pixel coordinates if available.
Transform data can later be used to apply rotation or other transformations in Figma.

SECTION: Normalized Style Shape

The normalized style for a node should be a flat object with primitive values and small arrays.
Example fields include widthPixels, heightPixels, marginTopPixels, backgroundColor, boxShadows, and similar.
Complex nested structures should be reserved for arrays of similar items such as multiple shadows or gradient stops.
