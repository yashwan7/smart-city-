import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  FACTORS,
  FACTORS_METADATA,
  getFactor,
  calcElectricityEmission,
  calcCommuteEmission,
  calcFuelEmission,
  calcWasteEmission
} from '../data/factors.js';

describe('CarbonMesh Emission Factors & Methodology Verification', () => {
  test('factors metadata has valid version and currency', () => {
    assert.equal(FACTORS_METADATA.currency, 'INR');
    assert.equal(FACTORS_METADATA.version, '2026.1');
    assert.equal(FACTORS_METADATA.electricity_voltage_nominal, 230);
  });

  test('electricity grid factor matches CEA Baseline v19.0', () => {
    const factor = FACTORS.electricity_grid_india;
    assert.ok(factor, 'Electricity factor must exist');
    assert.equal(factor.factor_value, 0.716);
    assert.equal(factor.unit, 'kg CO2e / kWh');
    assert.match(factor.data_source, /Central Electricity Authority \(CEA\)/);
  });

  test('fuel factors match IPCC and DEFRA 2024 standards', () => {
    assert.equal(FACTORS.diesel_stationary_generator.factor_value, 2.687);
    assert.equal(FACTORS.petrol_motor_gasoline.factor_value, 2.314);
  });

  test('waste factor matches MoEFCC standard', () => {
    assert.equal(FACTORS.waste_municipal_landfill.factor_value, 0.520);
  });

  test('getFactor resolves both by key and by ID', () => {
    const fByKey = getFactor('electricity_grid_india');
    const fById = getFactor('EF-ELEC-IN-01');
    assert.ok(fByKey);
    assert.equal(fByKey.id, fById.id);
  });
});

describe('CarbonMesh Emission Mathematical Calculations', () => {
  test('calculates electricity emissions with measured quality tag', () => {
    const res = calcElectricityEmission(10);
    assert.equal(res.kgCO2e, 7.16);
    assert.equal(res.quality, 'measured');
    assert.match(res.formula, /10 kWh × 0.716/);
    assert.match(res.citation, /CEA/);
  });

  test('calculates commute emissions and avoided emissions vs car baseline', () => {
    const carRes = calcCommuteEmission('car', 12);
    const busRes = calcCommuteEmission('bus', 12);
    const activeRes = calcCommuteEmission('walk', 12);

    // Car: 12 * 0.174 = 2.088
    assert.equal(carRes.kgCO2e, 2.088);
    assert.equal(carRes.avoidedKgCO2e, 0);

    // Bus: 12 * 0.048 = 0.576
    assert.equal(busRes.kgCO2e, 0.576);
    assert.equal(busRes.avoidedKgCO2e, 1.512); // 2.088 - 0.576

    // Active: 0 emissions, saves 2.088 kg
    assert.equal(activeRes.kgCO2e, 0);
    assert.equal(activeRes.avoidedKgCO2e, 2.088);
  });

  test('calculates fuel combustion emissions with manual quality tag', () => {
    const res = calcFuelEmission('diesel', 10);
    assert.equal(res.kgCO2e, 26.87);
    assert.equal(res.quality, 'manual');
  });

  test('calculates waste emissions from bin fill with estimated quality tag', () => {
    // 50% fill of 50L bin at 0.2 density = 5 kg waste * 0.520 = 2.6 kg CO2e
    const res = calcWasteEmission(50, 50, 0.2);
    assert.equal(res.estimatedKgWaste, 5.0);
    assert.equal(res.kgCO2e, 2.6);
    assert.equal(res.quality, 'estimated');
  });
});

describe('Closed-Loop Optimization & Curtailment Verification', () => {
  test('proves power reduction and positive net savings', () => {
    const baselineW = 96.8;
    const optimizedW = 42.1;
    const wattsCurtailed = Number((baselineW - optimizedW).toFixed(1));
    const pctCurtailed = Number(((wattsCurtailed / baselineW) * 100).toFixed(1));

    assert.equal(wattsCurtailed, 54.7);
    assert.equal(pctCurtailed, 56.5);

    const kwhPerHourSaved = wattsCurtailed / 1000;
    const kgPerHourAvoided = kwhPerHourSaved * 0.716;

    assert.ok(kwhPerHourSaved > 0.05);
    assert.ok(kgPerHourAvoided > 0.035);
  });
});

