import assert from "node:assert/strict";
import test from "node:test";
import {colorHex} from "../../src/components/designer/style-values";
test("computed RGB and CSS variables display their actual color in native swatches",()=>{
 assert.equal(colorHex("rgb(255, 255, 255)"),"#ffffff");
 assert.equal(colorHex("rgb(10 20 30 / 0.8)"),"#0a141e");
 assert.equal(colorHex("#abc"),"#aabbcc");
 assert.equal(colorHex("var(--color-ink)","rgb(12, 18, 24)"),"#0c1218");
 assert.equal(colorHex("invalid","#fff"),"#ffffff");
});
