'use strict';

const MyStromSwitchAdapter = require('./mystrom-switch-adapter');

module.exports = (addonManager, manifest) => {
  new MyStromSwitchAdapter(addonManager, manifest);
};
