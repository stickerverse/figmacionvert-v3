TITLE: Svg Vector Processing

This file explains how svg content is converted into Figma vector representations.

SECTION: Svg Sources

Svg content may appear as inline elements in the dom or as external files referenced by image tags or css.
Both forms should be parsed and handled consistently.

SECTION: Parsing

Parse svg xml into a structured representation that exposes elements, attributes, and nesting.
Support key shape elements such as path, rect, circle, ellipse, line, polygon, polyline, and group.
Record transform attributes, style attributes, and presentation attributes for each element.

SECTION: Coordinate Systems

Respect the view box attribute, width, and height of the svg root to derive an initial coordinate system.
Apply transforms as matrices or decomposed operations as needed when combining nested transforms.
Coordinate conversion must ensure the final vector in Figma matches the visual appearance of the svg.

SECTION: Shape Conversion

Convert path commands into Figma vector path data by mapping move, line, curve, arc, and close commands.
Convert rect, circle, ellipse, line, polygon, and polyline into equivalent paths where needed.
Preserve relative and absolute commands during conversion.

SECTION: Fills And Strokes

Map fill attributes to Figma fills, including solid colors and gradients.
Map stroke attributes to Figma strokes with width, line cap, line join, dash pattern, and miter limit.
Opacity applied to fill or stroke should translate to alpha values in Figma.

SECTION: Grouping And Hierarchy

Svg group elements become Figma groups or frames that wrap their child vectors.
Maintain a hierarchy that allows designers to edit parts of the vector structure intuitively.
Use grouping to reflect logical structure rather than collapsing everything into a single path unless necessary.

SECTION: Reuse And Symbols

Svg use elements reference other shapes by identifier.
Resolve these references by cloning the underlying shapes while preserving transforms and styles.
When repeated patterns are detected, consider mapping them to Figma components and instances to improve editability.
