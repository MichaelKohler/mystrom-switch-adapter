'use strict';

const {
  Adapter,
  Device,
  Property,
} = require('gateway-addon');
const fetch = require('node-fetch');

const config = require('./config');

const DEVICE_NAME = 'MyStrom Switch';
const REPORT_MAP = {
  on: 'relay',
  power: 'power',
  temperature: 'temperature',
};

class SwitchProperty extends Property {
  constructor(device, name, propertyDescription, pollIntervalMS) {
    super(device, name, propertyDescription);
    this.setCachedValue(propertyDescription.value);
    this.device.notifyPropertyChanged(this);
    setInterval(() => this.updateProperty(), pollIntervalMS);
    this.updateProperty();
  }

  async setValue(value) {
    switch (this.name) {
      case 'on': {
        await this.device.adapter.sendValue(
          this.device.ip,
          value
        );
        break;
      }
      default:
        break;
    }

    this.setCachedValueAndNotify(value);
    setTimeout(() => this.updateProperty(), 2000);
    return this.value;
  }

  async updateProperty() {
    // TODO: only update if device actually added?
    const uri = `http://${this.device.ip}/report`;

    try {
      const response = await fetch(uri);
      const data = await response.json();

      const resultProperty = REPORT_MAP[this.name];
      const reportedValue = data[resultProperty];

      // TODO: only set if difference above given threshold?
      if (reportedValue !== this.value) {
        this.setCachedValueAndNotify(reportedValue);
      }
    } catch (error) {
      console.error(error);
    }
  }
}

class MyStromSwitchDevice extends Device {
  constructor(adapter, id, deviceDescription) {
    super(adapter, id);
    this.ip = deviceDescription.ip;
    this.title = deviceDescription.title;
    this.type = deviceDescription.type;
    this['@type'] = deviceDescription['@type'];
    this.description = deviceDescription.description;
    for (const propertyName in deviceDescription.properties) {
      const propertyDescription = deviceDescription.properties[propertyName];
      const property = new SwitchProperty(this, propertyName, propertyDescription, deviceDescription.pollIntervalMS);
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
    const {
      devices = [],
      pollIntervalMS = 15 * 1000,
    } = await config.load(manifest);

    for (const deviceConfig of devices) {
      const device = new MyStromSwitchDevice(this, `mystrom-switch-${deviceConfig.ip}`, {
        ip: deviceConfig.ip,
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
          power: {
            '@type': 'InstantaneousPowerProperty',
            title: 'Power',
            type: 'number',
            value: 0,
          },
        },
        pollIntervalMS,
      });

      this.handleDeviceAdded(device);

      const temperatureDevice = new MyStromSwitchDevice(this, `mystrom-switch-temperature-${deviceConfig.ip}`, {
        ip: deviceConfig.ip,
        title: `${DEVICE_NAME} - Temperature - ${deviceConfig.ip}`,
        '@type': ['TemperatureSensor'],
        description: `${DEVICE_NAME} - Temperature - ${deviceConfig.ip}`,
        properties: {
          temperature: {
            '@type': 'TemperatureProperty',
            title: 'Temperature',
            type: 'number',
            value: -1,
          },
        },
        pollIntervalMS,
      });

      this.handleDeviceAdded(temperatureDevice);
    }
  }

  async sendValue(deviceIp, state) {
    const booleanState = state ? 1 : 0;
    const uri = `http://${deviceIp}/relay?state=${booleanState}`;

    try {
      await fetch(uri);
    } catch (error) {
      console.error(error);
    }
  }
}

module.exports = MyStromSwitchAdapter;
