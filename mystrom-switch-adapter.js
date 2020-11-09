'use strict';

const {
  Adapter,
  Device,
  Property,
} = require('gateway-addon');

const manifest = require('./manifest.json');
const config = require('./config');

class SwitchProperty extends Property {
  constructor(device, name, propertyDescription) {
    super(device, name, propertyDescription);
    this.setCachedValue(propertyDescription.value);
    this.device.notifyPropertyChanged(this);
  }

  setValue(value) {
    return new Promise((resolve, reject) => {
      super.setValue(value).then((updatedValue) => {
        resolve(updatedValue);
        this.device.notifyPropertyChanged(this);
      }).catch((err) => {
        reject(err);
      });
    });
  }
}

class MyStromSwitchDevice extends Device {
  constructor(adapter, id, deviceDescription) {
    super(adapter, id);
    this.name = deviceDescription.name;
    this.type = deviceDescription.type;
    this['@type'] = deviceDescription['@type'];
    this.description = deviceDescription.description;
    for (const propertyName in deviceDescription.properties) {
      const propertyDescription = deviceDescription.properties[propertyName];
      const property = new SwitchProperty(this, propertyName, propertyDescription);
      this.properties.set(propertyName, property);
    }
  }
}

class MyStromSwitchAdapter extends Adapter {
  constructor(addonManager, manifest) {
    super(addonManager, 'MyStromSwitchAdapter', manifest.id);
    addonManager.addAdapter(this);

    this.createSwitches(manifest);
  }

  async createSwitches(manifest) {
    const { devices = []} = await config.load(manifest);

    for (const deviceConfig of devices) {
      const device = new MyStromSwitchDevice(this, 'mystrom-switch', {
        name: `MyStrom Switch - ${deviceConfig.ip}`,
        '@type': ['OnOffSwitch', 'SmartPlug'],
        description: `MyStrom Switch - ${deviceConfig.ip}`,
        properties: {
          on: {
            '@type': 'OnOffProperty',
            label: 'On/Off',
            name: 'on',
            type: 'boolean',
            value: false,
          },
        },
      });

      this.handleDeviceAdded(device);
    }
  }
}

module.exports = MyStromSwitchAdapter;
