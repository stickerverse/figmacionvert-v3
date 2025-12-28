export interface ImportOptions {
  createMainFrame: boolean;
  createVariantsFrame: boolean;
  createComponentsFrame: boolean;
  createDesignSystem: boolean;
  applyAutoLayout: boolean;
  createStyles: boolean;
  usePixelPerfectPositioning: boolean;
  createScreenshotOverlay: boolean;
  showValidationMarkers: boolean;
  enableDebugMode?: boolean;
  useHierarchyInference?: boolean; // Default: true - use hierarchy inference to improve tree structure
}
