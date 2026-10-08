import assert from "node:assert/strict";
import test from "node:test";
import { canvasGeometry, clampViewportWidth, readCanvasZoom, readViewportWidth, resizedViewportWidth, viewportBreakpoint } from "../../src/components/designer/viewport-model";

test("custom widths accept whole supported viewports without silently replacing invalid input", () => {
  assert.equal(readViewportWidth("320"), 320);
  assert.equal(readViewportWidth(" 1280 "), 1280);
  assert.equal(readViewportWidth("3840"), 3840);
  for (const value of ["", "319", "3841", "767.5", "1e3", "NaN", "Infinity", "-320", "1280px"]) assert.equal(readViewportWidth(value), null);
  assert.equal(clampViewportWidth(319), 320);
  assert.equal(clampViewportWidth(3841), 3840);
});
test("style breakpoints agree with exact source media boundaries", () => {
  for (const [width, breakpoint] of [[767, "base"], [768, "landscape"], [1023, "landscape"], [1024, "tablet"], [1279, "tablet"], [1280, "desktop"]] as const) assert.equal(viewportBreakpoint(width), breakpoint);
});
test("Fit and manual zoom reserve the grip without subtracting pixels from the source width", () => {
  const fit = canvasGeometry(1280, "fit", 972, 900);
  assert.equal(fit.scale, 0.75);
  assert.equal(fit.visualWidth, 960);
  assert.equal(fit.visualWidth / fit.scale, 1280);
  assert.equal(canvasGeometry(390, "fit", 972, 900).scale, 1);
  assert.equal(canvasGeometry(1280, 0.5, 972, 900).visualWidth, 640);
  assert.equal(readCanvasZoom("fit"), "fit");
  assert.equal(readCanvasZoom("0.5"), 0.5);
  for (const value of ["", "0", "0.1", "3", "NaN", "Infinity"]) assert.equal(readCanvasZoom(value), null);
});
test("physical drag distances produce logical widths at any visual scale and clamp at bounds", () => {
  assert.equal(resizedViewportWidth(768, 75, 0.75), 968);
  assert.equal(resizedViewportWidth(390, -40, 0.5), 320);
  assert.equal(resizedViewportWidth(3800, 100, 2), 3840);
});

test("zoom preserves logical height and canvas centering across fitted and overflowing widths", () => {
  const base = canvasGeometry(1280, 1, 972, 900);
  for (const zoom of [0.25, 0.5, 1, 2] as const) {
    const geometry = canvasGeometry(1280, zoom, 972, 900);
    assert.equal(geometry.logicalHeight, base.logicalHeight);
    assert.equal(geometry.marginLeft - geometry.scrollLeft + geometry.visualWidth / 2, 480);
    assert.equal(geometry.visualHeight, 900 * zoom);
  }
  assert.equal(canvasGeometry(3840, "fit", 500, 900).scale, 0.25);
});
