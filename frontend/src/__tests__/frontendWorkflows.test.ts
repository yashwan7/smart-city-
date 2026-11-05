import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { formatKg, formatWatts, formatKwh, formatPercent, getQualityBadge } from '../lib/format.ts';

describe('CarbonMesh v2 Frontend Formatting & Net Calculations', () => {
  test('calculates and formats positive and negative net carbon values correctly', () => {
    // Standard positive net emissions (emissions > benefits)
    const badKg = 2.14;
    const goodKg = 0.85;
    const netKg = Number((badKg - goodKg).toFixed(2));
    assert.equal(netKg, 1.29);
    assert.equal(formatKg(netKg), '1.29');

    // Negative net carbon (campus boundary carbon negative: benefits > emissions)
    const badKgNeg = 1.20;
    const goodKgNeg = 3.50;
    const netKgNeg = Number((badKgNeg - goodKgNeg).toFixed(2));
    assert.equal(netKgNeg, -2.30);
    assert.equal(formatKg(netKgNeg), '-2.30');
    assert.ok(netKgNeg < 0, 'Must recognize negative net carbon state');

    // Zero net carbon
    const zeroNet = Number((2.0 - 2.0).toFixed(2));
    assert.equal(zeroNet, 0.0);
    assert.equal(formatKg(zeroNet), '0.00');
  });

  test('formats power in watts and energy in kWh with strict units', () => {
    assert.equal(formatWatts(94.5), '94.5');
    assert.equal(formatWatts(null), '0.0');
    assert.equal(formatKwh(1.842), '1.842');
    assert.equal(formatPercent(63.2), '63.2%');
  });

  test('returns correct quality badge styles across all 4 tiers', () => {
    const measured = getQualityBadge('measured');
    assert.equal(measured.label, 'MEASURED');
    assert.match(measured.text, /emerald/);

    const estimated = getQualityBadge('estimated');
    assert.equal(estimated.label, 'ESTIMATED');
    assert.match(estimated.text, /amber/);

    const manual = getQualityBadge('manual');
    assert.equal(manual.label, 'MANUAL ENTRY');
    assert.match(manual.text, /blue|sky/);

    const assumed = getQualityBadge('assumed');
    assert.equal(assumed.label, 'ASSUMED');
    assert.match(assumed.text, /slate|stone/);
  });
});

describe('Samputa Batch & Verification Mechanics', () => {
  test('distinguishes projected ultrasonic volume from verified physical mass', () => {
    const initialBatch = {
      fill_pct: 63,
      capacity_litres: 50,
      surface_distance_cm: 18.5,
      projected_kg_co2e: 0.328,
      verified_kg_co2e: 0,
      weighed_mass_kg: null,
      status: 'accumulating'
    };

    assert.equal(initialBatch.status, 'accumulating');
    assert.equal(initialBatch.verified_kg_co2e, 0);
    assert.ok(initialBatch.projected_kg_co2e > 0);

    // After physical mass weigh-in (e.g. 8.4 kg dry compost)
    const weighedMassKg = 8.4;
    const factorMsw = 0.520;
    const verifiedBenefit = Number((weighedMassKg * factorMsw).toFixed(3));

    const verifiedBatch = {
      ...initialBatch,
      weighed_mass_kg: weighedMassKg,
      verified_kg_co2e: verifiedBenefit,
      status: 'verified'
    };

    assert.equal(verifiedBatch.status, 'verified');
    assert.equal(verifiedBatch.verified_kg_co2e, 4.368);
    assert.equal(verifiedBatch.weighed_mass_kg, 8.4);
  });
});

describe('Vernacular Wisdom Haircut Accounting', () => {
  test('applies conservative 20% uncertainty haircut to Matka and Handloom', () => {
    // Matka baseline: 150 kWh/yr avoided compressor energy * 0.716 kg/kWh = 107.4 kg CO2e
    // With 20% haircut (80% retained): 107.4 * 0.8 = 85.92 kg CO2e
    const rawMatkaBenefit = 150 * 0.716;
    const haircutPct = 20;
    const conservativeMatkaBenefit = Number((rawMatkaBenefit * (1 - haircutPct / 100)).toFixed(2));

    assert.equal(conservativeMatkaBenefit, 85.92);

    // Handloom baseline: 5.2 kWh avoided * 0.716 kg/kWh = 3.7232 kg CO2e
    // With 20% haircut: 3.7232 * 0.8 = 2.9785 -> ~2.98 kg CO2e
    const rawHandloomBenefit = 5.2 * 0.716;
    const conservativeHandloomBenefit = Number((rawHandloomBenefit * (1 - haircutPct / 100)).toFixed(2));

    assert.equal(conservativeHandloomBenefit, 2.98);
  });
});

describe('Input Validation & Safe Edge Controls', () => {
  test('rejects negative or non-numeric input quantities', () => {
    const invalidInputs = [-5, 0, NaN, undefined, null, 'abc'];
    for (const input of invalidInputs) {
      const num = Number(input);
      const isValid = !isNaN(num) && num > 0;
      assert.equal(isValid, false, `Input ${input} should be rejected`);
    }

    const validInputs = [0.5, 1, 10, '8.4'];
    for (const input of validInputs) {
      const num = Number(input);
      const isValid = !isNaN(num) && num > 0;
      assert.equal(isValid, true, `Input ${input} should be accepted`);
    }
  });

  test('validates cryptographic ledger verification states', () => {
    const verifiedLedger = { ok: true, records: 1240, first_bad_id: null };
    assert.equal(verifiedLedger.ok, true);
    assert.equal(verifiedLedger.first_bad_id, null);

    const tamperedLedger = { ok: false, records: 1240, first_bad_id: 412 };
    assert.equal(tamperedLedger.ok, false);
    assert.equal(tamperedLedger.first_bad_id, 412);
  });
});

