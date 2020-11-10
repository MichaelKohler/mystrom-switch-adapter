'use strict';

const {
  Adapter,
  Device,
  Property,
} = require('gateway-addon');
const fetch = require('node-fetch');

const config = require('./config');

const DEVICE_NAME = 'MyStrom Switch';

class SwitchProperty extends Property {
  constructor(device, name, propertyDescription) {
    super(device, name, propertyDescription);
    this.setCachedValue(propertyDescription.value);
    this.device.notifyPropertyChanged(this);
  }

  async setValue(value) {
    switch (this.name) {
      case 'on': {
        await this.device.adapter.sendValue(
          this.device.description,
          value
        );
        break;
      }
      default:
        break;
    }

    this.setCachedValueAndNotify(value);
    return this.value;
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

  async sendValue(deviceDescription, state) {
    // TODO: would it be allowed to set the IP as property on the device itself when creating it?
    const deviceIp = deviceDescription.replace(`${DEVICE_NAME} - `, '');
    const booleanState = state ? 1 : 0;
    const uri =
      `http://${deviceIp}/relay?state=${booleanState}`;

    try {
      await fetch(uri);
    } catch (error) {
      console.error(error);
    }
  }
}

module.exports = MyStromSwitchAdapter;
