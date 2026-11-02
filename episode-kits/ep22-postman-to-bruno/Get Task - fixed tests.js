// After import, "Get Task" fails: the Postman Package Library helper does not exist in Bruno.
// Fix: inline the helper (or move it into a collection-level script).
function isValidTask(t) {
  expect(t.id).to.be.a("string");
  expect(t.title).to.be.a("string").with.length.of.at.least(3);
  expect(["low", "medium", "high"]).to.include(t.priority);
  expect(t.done).to.be.a("boolean");
}

test("found", function () {
  expect(res.getStatus()).to.equal(200);
  isValidTask(res.getBody());
});
