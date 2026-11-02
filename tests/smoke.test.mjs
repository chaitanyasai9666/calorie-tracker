// Loads the built page in jsdom (no Claude runtime, so it runs on browser storage) and drives the main flow.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";

function load() {
  const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
  const errors = [], failedAsserts = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", e => errors.push(String(e?.detail ?? e?.message ?? e)));
  const dom = new JSDOM(html, {
    url: "https://example.test/", runScripts: "dangerously", virtualConsole,
    beforeParse(window) {
      // The page's self-checks use console.assert; collect any that fail.
      window.console.assert = (cond, ...msg) => { if (!cond) failedAsserts.push(msg.join(" ")); };
    },
  });
  return { dom, w: dom.window, $: id => dom.window.document.getElementById(id), errors, failedAsserts };
}

test("page loads with no script errors and all self-checks pass", () => {
  const { dom, errors, failedAsserts, $ } = load();
  assert.deepEqual(errors, []);
  assert.deepEqual(failedAsserts, []);
  assert.equal($("login").hidden, false, "login screen shows first");
  assert.equal($("app").hidden, true);
  dom.window.close();
});

test("create profile, quick add a food, totals update", () => {
  const { dom, w, $, errors } = load();
  $("pfName").value = "Test";
  $("profileForm").dispatchEvent(new w.Event("submit", { cancelable: true }));
  assert.equal($("app").hidden, false, "app opens after creating a profile");
  assert.equal($("meName").textContent, "Test");

  $("qaName").value = "Apple"; $("qaKcal").value = "95"; $("qaFib").value = "4.4";
  $("qa").dispatchEvent(new w.Event("submit", { cancelable: true }));
  assert.equal($("totKcal").textContent, "95");
  assert.match($("totFib").textContent, /^4\.4 g of \d+ g$/);
  assert.equal($("log").children.length, 1);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test("marking the day complete starts a streak", () => {
  const { dom, w, $ } = load();
  $("pfName").value = "Test";
  $("profileForm").dispatchEvent(new w.Event("submit", { cancelable: true }));
  $("completeBtn").click();
  assert.equal($("streakNum").textContent, "1");
  assert.match($("completeBtn").textContent, /Day complete/);
  dom.window.close();
});
