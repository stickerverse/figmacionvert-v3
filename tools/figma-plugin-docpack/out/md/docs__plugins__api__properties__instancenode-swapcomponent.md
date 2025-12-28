# swapComponent | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/InstanceNode-swapcomponent/
scraped_at: 2025-12-22T03:30:52.174Z
---

On this page

Swaps this instance's current main component with `componentNode` and preserves overrides using the same heuristics as instance swap in the Figma editor UI. Note that we may update these override preservation heuristics from time to time.

Supported on:

*   [InstanceNode](/docs/plugins/api/InstanceNode/)

## Signature[​](#signature "Direct link to Signature")

### [swapComponent](/docs/plugins/api/properties/InstanceNode-swapcomponent/)(componentNode: [ComponentNode](/docs/plugins/api/ComponentNode/)): void

## Remarks[​](#remarks "Direct link to Remarks")

Learn more about instance swap and override preservation in our [help center](https://help.figma.com/hc/en-us/articles/360039150413-Swap-between-component-instances-in-a-file). If you do not want to preserve overrides when swapping, you should assign to [`mainComponent`](/docs/plugins/api/InstanceNode/#maincomponent), which sets the instance's main component directly and clears all overrides.

*   [Signature](#signature)
*   [Remarks](#remarks)
