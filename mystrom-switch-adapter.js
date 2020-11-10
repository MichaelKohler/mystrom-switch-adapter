'use strict';

const {
  Adapter,
  Device,
  Property,
} = require('gateway-addon');

const config = require('./config');

const DEVICE_NAME = 'MyStrom Switch';

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
    this.title = deviceDescription.title;
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
      // Note: the IP is part of the name as it needs to be unique. MAC would be better, but it
      // doesn't seem to be possible to get the MAC from the MyStrom device.
      const device = new MyStromSwitchDevice(this, `mystrom-switch-${deviceConfig.ip}`, {
        title: `${DEVICE_NAME} - ${deviceConfig.ip}`,
        '@type': ['OnOffSwitch', 'SmartPlug'],
        description: `${DEVICE_NAME} - ${deviceConfig.ip}`,
        properties: {
          on: {
            '@type': 'OnOffProperty',
            title: 'On/Off',
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
