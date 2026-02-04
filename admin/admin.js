const expForm = document.getElementById("expForm");
const expId = document.getElementById("expId");
const nameInput = document.getElementById("name");
const statusInput = document.getElementById("status");
const hypothesisInput = document.getElementById("hypothesis");
const placementsInput = document.getElementById("placements");
const primaryMetricInput = document.getElementById("primaryMetric");
const assignmentInput = document.getElementById("assignment");
const eligibilityInput = document.getElementById("eligibility");
const variantsList = document.getElementById("variantsList");
const addVariantBtn = document.getElementById("addVariant");
const experimentsList = document.getElementById("experimentsList");
const resetBtn = document.getElementById("resetBtn");

function createVariantRow(variant = {}) {
  const row = document.createElement("div");
  row.className = "variant-row";

  const name = document.createElement("input");
  name.placeholder = "variant name";
  name.value = variant.name || "";

  const split = document.createElement("input");
  split.placeholder = "traffic %";
  split.type = "number";
  split.min = "0";
  split.max = "100";
  split.value = variant.trafficSplit ?? "";

  const params = document.createElement("input");
  params.placeholder = '{"model_version":"v3"}';
  params.value = variant.params ? JSON.stringify(variant.params) : "";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => row.remove());

  row.appendChild(name);
  row.appendChild(split);
  row.appendChild(params);
  row.appendChild(removeBtn);

  return row;
}

function resetForm() {
  expId.value = "";
  nameInput.value = "";
  statusInput.value = "DRAFT";
  hypothesisInput.value = "";
  placementsInput.value = "";
  primaryMetricInput.value = "add_to_cart";
  assignmentInput.value = "user_id_then_session_id";
  eligibilityInput.value = "";
  variantsList.innerHTML = "";
  variantsList.appendChild(createVariantRow({ name: "control", trafficSplit: 90, params: { model_version: "v1" } }));
  variantsList.appendChild(createVariantRow({ name: "treatment_a", trafficSplit: 10, params: { model_version: "v2" } }));
}

function readVariants() {
  const rows = Array.from(variantsList.querySelectorAll(".variant-row"));
  return rows.map((row) => {
    const inputs = row.querySelectorAll("input");
    let params = {};
    try {
      params = inputs[2].value ? JSON.parse(inputs[2].value) : {};
    } catch (e) {
      params = { _error: "invalid_json" };
    }
    return {
      name: inputs[0].value.trim(),
      trafficSplit: Number(inputs[1].value || 0),
      params,
    };
  });
}

async function fetchExperiments() {
  const res = await fetch("/api/experiments");
  const data = await res.json();
  return data.experiments || [];
}

function renderExperiments(experiments) {
  experimentsList.innerHTML = "";
  if (experiments.length === 0) {
    experimentsList.innerHTML = "<div class=\"card\">No experiments yet.</div>";
    return;
  }

  experiments.forEach((exp) => {
    const card = document.createElement("div");
    card.className = "card";

    const header = document.createElement("div");
    header.className = "card-header";

    const title = document.createElement("h3");
    title.textContent = exp.name || exp.id;

    const status = document.createElement("span");
    status.className = "tag";
    status.textContent = exp.status || "DRAFT";

    header.appendChild(title);
    header.appendChild(status);

    const meta = document.createElement("div");
    meta.className = "card-meta";
    meta.textContent = `Placements: ${(exp.placements || []).join(", ")} | Primary: ${exp.primaryMetric || "add_to_cart"}`;

    const hypothesis = document.createElement("div");
    hypothesis.textContent = exp.hypothesis || "";

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => loadExperiment(exp));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      await fetch(`/api/experiments/${exp.id}`, { method: "DELETE" });
      await refresh();
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(hypothesis);
    card.appendChild(actions);

    experimentsList.appendChild(card);
  });
}

function loadExperiment(exp) {
  expId.value = exp.id;
  nameInput.value = exp.name || "";
  statusInput.value = exp.status || "DRAFT";
  hypothesisInput.value = exp.hypothesis || "";
  placementsInput.value = (exp.placements || []).join(", ");
  primaryMetricInput.value = exp.primaryMetric || "add_to_cart";
  assignmentInput.value = exp.assignmentStrategy || "user_id_then_session_id";
  eligibilityInput.value = exp.eligibility ? JSON.stringify(exp.eligibility) : "";

  variantsList.innerHTML = "";
  (exp.variants || []).forEach((v) => variantsList.appendChild(createVariantRow(v)));
}

async function refresh() {
  const experiments = await fetchExperiments();
  renderExperiments(experiments);
}

expForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  let eligibility = null;
  if (eligibilityInput.value.trim()) {
    try {
      eligibility = JSON.parse(eligibilityInput.value);
    } catch (e) {
      eligibility = { _error: "invalid_json" };
    }
  }

  const payload = {
    name: nameInput.value.trim(),
    status: statusInput.value,
    hypothesis: hypothesisInput.value.trim(),
    placements: placementsInput.value.split(",").map((s) => s.trim()).filter(Boolean),
    primaryMetric: primaryMetricInput.value.trim() || "add_to_cart",
    assignmentStrategy: assignmentInput.value.trim() || "user_id_then_session_id",
    eligibility,
    variants: readVariants(),
  };

  if (expId.value) {
    await fetch(`/api/experiments/${expId.value}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } else {
    await fetch("/api/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  resetForm();
  await refresh();
});

addVariantBtn.addEventListener("click", () => {
  variantsList.appendChild(createVariantRow());
});

resetBtn.addEventListener("click", resetForm);

resetForm();
refresh();
