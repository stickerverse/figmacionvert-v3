TITLE: Schema Design And Normalization

This file defines the intermediate json schema that represents a captured page between the capture stage and the Figma builder stage.

SECTION: Purpose

The schema isolates browser specific capture details from Figma specific building details.
It provides a stable contract that can be consumed by deterministic code or by an intelligent agent.
The schema must be explicit, versioned, and easy to extend.

SECTION: Top Level Structure

The schema contains meta data, a collection of nodes, a root node identifier, a resource manifest, and an error list.
Meta data includes url, viewport dimensions, device pixel ratio, user agent, schema version, and capture time.
Nodes are stored as a map from node identifier to node object for fast lookup.

SECTION: Node Object Structure

Each node object includes:
An identifier
A type such as element, text, or vector
A tag name for element nodes
Parent identifier and list of child identifiers
Layout information derived from box model
Style information in normalized form
Resolved style after inheritance
Content information, such as text string or svg data
Optional semantic hints such as role or inferred component type

SECTION: Layout Subsection

The layout subsection includes:
Position and size in pixels
Margin, padding, and border thickness in pixels
Overflow and clipping behavior
Position type such as static or absolute
Any other fields needed for layout mapping

SECTION: Style Subsection

The style subsection holds the normalized style result for this node.
This is a flat structure with primitive fields and small arrays that represent css properties in a consistent way.

SECTION: Resolved Style Subsection

The resolved style is created by the inheritance engine and includes fully filled values for inherited properties.
This is what builders use when setting visual properties on Figma nodes.

SECTION: Content Subsection

For text nodes, the content subsection contains the complete text string as it should appear.
For svg or other vector nodes, it contains structured or raw data sufficient for vector processing.

SECTION: Resources

The resource manifest collects information about images, fonts, and external vector assets.
Each resource entry includes an identifier, original url, content type, and any already computed hashes.

SECTION: Errors

The errors list contains structured records describing problems encountered during capture or normalization.
Each error record should include severity, node identifier when applicable, and a human readable message.

SECTION: Versioning And Extensibility

Include a schema version field so that future changes can be handled explicitly.
When adding new fields, ensure that existing consumers either ignore them safely or are updated to use them.
