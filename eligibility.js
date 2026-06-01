// 2026 FPL: $1,330/month base, +$473.33 per additional person (HHS ASPE, March 2026)
const FPL_BASE = 1330;
const FPL_PER_PERSON = 473.33;

function fpl(size) {
  return FPL_BASE + (size - 1) * FPL_PER_PERSON;
}

const steps = [
  {
    id: 'residency',
    question: 'Do you currently live in Indiana?',
    type: 'yesno',
    failMsg: 'Indiana Medicaid is only for Indiana residents. If you recently moved here, you may still qualify — contact FSSA at 800-403-0864.',
  },
  {
    id: 'age',
    question: 'How old are you?',
    type: 'number',
    placeholder: 'Enter your age',
    min: 0,
    max: 120,
  },
  {
    id: 'pregnant',
    question: 'Are you currently pregnant?',
    type: 'yesno',
    showIf: (state) => state.age >= 0 && state.age < 65,
  },
  {
    id: 'disability',
    question: 'Do you have a disability, or do you receive SSI or SSDI?',
    type: 'yesno',
  },
  {
    id: 'householdSize',
    question: 'How many people are in your household (including yourself)?',
    type: 'number',
    placeholder: 'Number of people',
    min: 1,
    max: 20,
  },
  {
    id: 'income',
    question: 'What is your total household gross monthly income (before taxes)?',
    type: 'number',
    placeholder: 'Monthly income in dollars',
    min: 0,
    max: 99999,
  },
];

let currentStep = 0;
const state = {};

function renderStep() {
  const step = steps[currentStep];
  if (!step) { showResults(); return; }

  // Skip steps that don't apply
  if (step.showIf && !step.showIf(state)) {
    state[step.id] = null;
    currentStep++;
    renderStep();
    return;
  }

  const container = document.getElementById('screener');
  const progress = Math.round((currentStep / steps.length) * 100);

  container.innerHTML = `
    <div class="card">
      <p style="font-size:13px; color:var(--muted); margin:0 0 10px;">Step ${currentStep + 1} of ${steps.length}</p>
      <div style="height:4px; background:var(--ring); border-radius:2px; margin-bottom:16px;">
        <div style="height:4px; background:var(--accent); border-radius:2px; width:${progress}%;"></div>
      </div>
      <h2 style="margin:0 0 14px;">${step.question}</h2>
      ${step.type === 'yesno' ? `
        <div style="display:flex; gap:10px;">
          <button onclick="answer(true)" class="btn-yes" style="flex:1; padding:12px; border-radius:10px; border:1px solid var(--ring); background:var(--card); color:var(--ink); font-size:16px; cursor:pointer; font-weight:600;">Yes</button>
          <button onclick="answer(false)" class="btn-no" style="flex:1; padding:12px; border-radius:10px; border:1px solid var(--ring); background:var(--card); color:var(--ink); font-size:16px; cursor:pointer; font-weight:600;">No</button>
        </div>
      ` : `
        <input type="number" id="numInput" min="${step.min}" max="${step.max}" placeholder="${step.placeholder}"
          style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--ring); background:var(--card); color:var(--ink); font-size:16px; margin-bottom:10px;"
          onkeydown="if(event.key==='Enter') submitNumber()"/>
        <div id="inputError" style="color:#f87171; font-size:13px; min-height:18px;"></div>
        <button onclick="submitNumber()" style="margin-top:8px; width:100%; padding:12px; border-radius:10px; border:none; background:var(--accent); color:#000; font-size:16px; cursor:pointer; font-weight:700;">Next →</button>
      `}
    </div>
  `;

  if (step.type === 'number') {
    document.getElementById('numInput').focus();
  }
}

function answer(val) {
  const step = steps[currentStep];
  state[step.id] = val;

  if (step.failMsg && !val) {
    showMessage(step.failMsg, 'neutral');
    return;
  }

  currentStep++;
  renderStep();
}

function submitNumber() {
  const step = steps[currentStep];
  const input = document.getElementById('numInput');
  const val = parseFloat(input.value);

  if (isNaN(val) || val < step.min || val > step.max) {
    document.getElementById('inputError').textContent = 'Please enter a valid number.';
    return;
  }

  state[step.id] = val;
  currentStep++;
  renderStep();
}

function showResults() {
  const { age, pregnant, disability, householdSize, income } = state;
  const size = Math.max(1, Math.round(householdSize));
  const monthlyFPL = fpl(size);
  const pct = income / monthlyFPL;
  const results = [];

  // Adults 19-64 — HIP
  if (age >= 19 && age < 65 && !disability) {
    if (pct <= 1.38) {
      results.push({
        program: 'HIP — Healthy Indiana Plan',
        likely: true,
        note: pct <= 1.0
          ? 'Your income suggests HIP Plus with a $1/month POWER contribution.'
          : 'Your income suggests HIP Plus with a small monthly POWER contribution.',
        link: 'hip.html',
      });
    }
  }

  // Children under 19 — Hoosier Healthwise
  if (age < 19 && pct <= 2.0) {
    results.push({
      program: 'Hoosier Healthwise',
      likely: true,
      note: 'Coverage for children under 19.',
      link: 'hoosier-healthwise.html',
    });
  }

  // Pregnant
  if (pregnant && pct <= 2.0) {
    results.push({
      program: 'Pregnancy Medicaid',
      likely: true,
      note: 'Covers prenatal care and delivery. Continues 60 days postpartum.',
      link: 'who-qualifies.html',
    });
  }

  // ABD
  if (age >= 65 || disability) {
    results.push({
      program: 'ABD Medicaid (Aged, Blind, Disabled)',
      likely: null,
      note: 'Different income and asset rules apply. Call FSSA at 800-403-0864 for a full assessment.',
      link: 'who-qualifies.html',
    });
  }

  // Former foster youth
  if (age >= 18 && age <= 26) {
    results.push({
      program: 'Former Foster Youth Medicaid',
      likely: null,
      note: 'If you were in Indiana foster care after age 13 and aged out, you may qualify regardless of income.',
      link: 'who-qualifies.html',
    });
  }

  const container = document.getElementById('screener');

  if (results.length === 0) {
    container.innerHTML = `
      <div class="card">
        <h2>You may not qualify right now</h2>
        <p>Based on what you entered, you may be over the income limit for Indiana Medicaid programs. But this is only an estimate.</p>
        <p>Income rules change, and there may be programs this tool does not cover. <strong>Call FSSA at 800-403-0864</strong> to get a real determination.</p>
        <p>If you lost Medicaid, you may qualify for a Marketplace plan at <a href="https://healthcare.gov" target="_blank" rel="noopener">healthcare.gov</a>.</p>
        <button onclick="restart()" style="margin-top:12px; padding:10px 18px; border-radius:10px; border:1px solid var(--ring); background:var(--card); color:var(--ink); font-size:14px; cursor:pointer;">Start Over</button>
      </div>`;
    return;
  }

  const cards = results.map(r => `
    <div class="card" style="margin-bottom:0;">
      <h2 style="font-size:17px;">${r.likely ? '✓ ' : ''}${r.program}</h2>
      <p>${r.note}</p>
      <a href="/${r.link}">Learn more →</a>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="card">
      <h2>You may qualify for:</h2>
      <p style="color:var(--muted); font-size:13px;">This is an estimate only — not a decision. Apply at <a href="https://gateway.in.gov" target="_blank" rel="noopener">gateway.in.gov</a> or call <strong>800-403-0864</strong> to find out for sure.</p>
    </div>
    <div class="grid" style="margin-top:0;">${cards}</div>
    <div style="margin-top:12px; text-align:center;">
      <button onclick="restart()" style="padding:10px 18px; border-radius:10px; border:1px solid var(--ring); background:var(--card); color:var(--ink); font-size:14px; cursor:pointer;">Start Over</button>
    </div>
  `;
}

function showMessage(msg, type) {
  const container = document.getElementById('screener');
  container.innerHTML = `
    <div class="card">
      <p>${msg}</p>
      <a href="/apply.html">How to Apply →</a>
      <br/><br/>
      <button onclick="restart()" style="padding:10px 18px; border-radius:10px; border:1px solid var(--ring); background:var(--card); color:var(--ink); font-size:14px; cursor:pointer;">Start Over</button>
    </div>`;
}

function restart() {
  currentStep = 0;
  Object.keys(state).forEach(k => delete state[k]);
  renderStep();
}

document.addEventListener('DOMContentLoaded', renderStep);
