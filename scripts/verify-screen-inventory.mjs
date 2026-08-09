import { readFileSync } from "node:fs";

const inventory = JSON.parse(
  readFileSync("tests/e2e/screen-inventory.json", "utf8"),
);
const requiredViewports = [360, 390, 768, 1280];
const requiredFields = [
  "id",
  "route",
  "description",
  "auth",
  "fixture",
  "state",
  "ready",
  "viewports",
  "visualSnapshot",
  "axe",
  "overflow",
  "console",
];

if (inventory.states.length !== 55) {
  throw new Error(
    `Screen inventory must contain exactly 55 states, found ${inventory.states.length}.`,
  );
}
if (new Set(inventory.states.map((state) => state.id)).size !== 55) {
  throw new Error("Every screen inventory id must be unique.");
}
for (const state of inventory.states) {
  for (const field of requiredFields) {
    if (!(field in state)) throw new Error(`${state.id} is missing ${field}.`);
  }
  if (JSON.stringify(state.viewports) !== JSON.stringify(requiredViewports)) {
    throw new Error(`${state.id} does not cover the required viewport matrix.`);
  }
  for (const gate of ["visualSnapshot", "axe", "overflow", "console"]) {
    if (state[gate] !== true)
      throw new Error(`${state.id} must enable ${gate}.`);
  }
}

console.log(
  `SCREEN_INVENTORY=PASS STATES=${inventory.states.length} VIEWPORTS=${requiredViewports.join(",")}`,
);
