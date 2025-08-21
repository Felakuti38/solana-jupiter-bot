import test from 'ava';

test('smoke: require utils module', t => {
  t.notThrows(() => {
    const utils = require('../src/utils/index.js');
    if (!utils || typeof utils.loadConfigFile !== 'function') {
      throw new Error('utils not loaded');
    }
  });
});

