TITLE: Dom Capture Pipeline Using Chrome Devtools Protocol

This file describes how to capture a stable snapshot of a webpage using the browser engine via Chrome Devtools Protocol.

SECTION: Goals

Produce a deterministic snapshot of the page that includes
Dom tree and hierarchy
Computed styles for each element
Layout metrics and box model information
Scroll positions and viewport data
References to images, fonts, and vector graphics
The snapshot must be usable without accessing a live browser.

SECTION: High Level Stages

Launch a browser instance that exposes a Devtools protocol connection.
Navigate to the target url with a fixed viewport size and device pixel ratio.
Wait for page load events and network idleness using clear criteria.
Stabilize the page by pausing animations and optional dynamic content.
Collect dom, style, layout, and resource data.
Assemble and return a structured json capture.

SECTION: Browser Setup

Enable relevant Devtools domains such as Page, Dom, Css, Network, and Runtime.
Configure viewport size and device pixel ratio explicitly.
Set a known user agent string for consistent rendering behavior.
Ensure that security and sandbox settings still allow dom inspection for the target page.

SECTION: Navigation And Readiness

Use Page domain commands to navigate to the url.
Wait for events such as load event fired.
Use a network idle heuristic such as no in flight requests for a defined period.
Optionally, poll a readiness condition in the page, for example the presence of a specific root element, using Runtime evaluation.

SECTION: Dom Extraction

Use Dom domain commands such as getDocument and getNodes to obtain the dom tree.
For each node, record node id, node type, tag name, attributes, text content, and parent child relationships.
Text nodes should be normalized but not stripped of meaningful whitespace unless configured.
Dom traversal order should be deterministic.

SECTION: Computed Style Collection

For each element node, request computed styles using Css devtools commands.
Store the full set of properties, not just a subset, to allow future rule changes without recapture.
Style data will later be normalized and flattened, but capture should preserve raw values for traceability.

SECTION: Layout And Box Model

Use Dom devtools commands such as getBoxModel to retrieve content, padding, border, and margin boxes.
Record x, y, width, and height for each box in device pixels.
Capture scroll offsets both for the document and for individual scrollable containers.
This information is critical for accurate positioning in the final Figma document.

SECTION: Resource Tracking

Enable Network devtools domain to track requests and responses while the page loads.
Record the mapping between dom references and network resources, including images, fonts, and external vector files.
Store resolved urls, mime types, and identifiers needed to later download or upload the assets.

SECTION: Stabilizing Dynamic Content

After initial load, inject a script into the page using Runtime evaluate that pauses animations and transitions.
The script can set animation play state to paused and disable transitions via global styles.
Optionally disable known autoplay carousels or animated components when they would break deterministic capture.

SECTION: Snapshot Schema Outline

The capture result should include
Meta data such as url, viewport size, device pixel ratio, timestamp, and user agent
Dom nodes as a tree or flat map
Style information keyed by node identifier
Layout and box model data keyed by node identifier
Resource manifest for images, fonts, and vector graphics
Error list and warnings for diagnostics

SECTION: Determinism And Failures

The capture process must detect and handle timeouts and navigation errors.
On failure, it must return a structured error rather than partial or ambiguous data.
Configuration of timeouts and readiness conditions should be explicit and not hidden in code.
