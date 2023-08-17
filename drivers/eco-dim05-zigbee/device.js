'use strict';

const { ZigBeeDevice, Util } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

const { calculateLevelControlTransitionTime } = Util;
const { wait } = Util;

// const MAX_HUE = 254;
const MAX_DIM = 254;
// const MAX_SATURATION = 254;
// const CIE_MULTIPLIER = 65536;
const CURRENT_LEVEL = 'currentLevel';

class EcoDimDuoZigbeeDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Mark device as unavailable while configuring

    this.checkValidInclusion = true;

    // this.log('UTIL', Util);
    await this.setUnavailable(this.homey.__('pairing.pairing')).catch(this.error);

    // await super.onNodeInit({ zclNode });
    // enable debugging
    // this.enableDebug();

    // print the node's info to the console
    // this.printNode();

    // Register `onoff` and `dim` capabilities if device has both
    if (this.hasCapability('onoff') && this.hasCapability('dim')) {
      this.registerOnOffAndDimCapabilities({ zclNode });
    }

    await this.setAvailable().catch(this.error);
    this.log('EcoDim Duo Dimmer Zigbee', this.isSubDevice() ? '- Right' : '- Left', 'device has been inited');
  }

  get levelControlCluster() {
    const levelControlClusterEndpoint = this.getClusterEndpoint(CLUSTER.LEVEL_CONTROL);
    if (levelControlClusterEndpoint === null) throw new Error('missing_level_control_cluster');
    return this.zclNode.endpoints[this.isSubDevice() ? 1 : 2].clusters.levelControl;
  }

  get onOffCluster() {
    const onOffClusterEndpoint = this.getClusterEndpoint(CLUSTER.ON_OFF);
    if (onOffClusterEndpoint === null) throw new Error('missing_on_off_cluster');
    return this.zclNode.endpoints[this.isSubDevice() ? 1 : 2].clusters.onOff;
  }

  /**
   * This method handles registration of the `onoff` and `dim` capabilities.
   * @param {ZCLNode} zclNode
   */
  registerOnOffAndDimCapabilities({ zclNode }) {
    /**
     * `onoff` capability configuration used for {@link registerMultipleCapabilities}.
     * @type {MultipleCapabilitiesConfiguration}
     * @private
     */
    const onoffCapabilityDefinition = {
      capability: 'onoff',
      cluster: CLUSTER.ON_OFF,
      opts: {
        getOpts: {
          getOnStart: true,
          getOnOnline: true, // When the light is powered off, and powered on again it often issues
          // an end device announce, this is a good moment to update the capability value in Homey
        },
        endpoint: this.isSubDevice() ? 1 : 2,
      },
    };

    /**
     * `dim` capability configuration used for {@link registerMultipleCapabilities}.
     * @type {MultipleCapabilitiesConfiguration}
     * @private
     */
    const dimCapabilityDefinition = {
      capability: 'dim',
      cluster: CLUSTER.LEVEL_CONTROL,
      opts: {
        getOpts: {
          getOnStart: true,
          getOnOnline: true, // When the light is powered off, and powered on again it often issues
          // an end device announce, this is a good moment to update the capability value in Homey
        },
        endpoint: this.isSubDevice() ? 1 : 2,
      },
    };

    // Register multiple capabilities, they will be debounced when one of them is called
    this.registerMultipleCapabilities(
      [onoffCapabilityDefinition, dimCapabilityDefinition],
      // eslint-disable-next-line consistent-return
      (valueObj = {}, optsObj = {}) => {
        const onoffChanged = typeof valueObj.onoff === 'boolean';
        const dimChanged = typeof valueObj.dim === 'number';

        this.log('capabilities changed', { onoffChanged, dimChanged });

        if (onoffChanged && dimChanged) {
          if (valueObj.onoff && valueObj.dim > 0) {
            // Bulb is turned on and dimmed to a value, then just dim
            return this.changeDimLevel(valueObj.dim, { ...optsObj.dim });
          }
          if (valueObj.onoff === false) {
            // Bulb is turned off and dimmed to a value, then turn off
            return this.changeOnOff(false); // Turn off
          }
          if (valueObj.onoff === true && valueObj.dim === 0) {
            // Device is turned on and dimmed to zero, then just turn off
            return this.changeDimLevel(0, { ...optsObj.dim });
          }
        } else if (onoffChanged) {
          // Device is only turned on/off, request new dim level afterwards
          return this.changeOnOff(valueObj.onoff);
        } else if (dimChanged) {
          // Bulb is only dimmed
          return this.changeDimLevel(valueObj.dim, { ...optsObj.dim });
        }
      },
    );
  }

  /**
   * Sends a `setOn` or `setOff` command to the device in order to turn it on or off. After
   * successfully changing the on/off value, the `dim` capability value will be updated
   * accordingly. Additionally, if the device is turned on, the current dim level will be
   * requested and updated in the form of the `dim` capability value.
   * @param {boolean} onoff
   * @returns {Promise<any>}
   */
  async changeOnOff(onoff) {
    this.log('changeOnOff() →', onoff);
    return this.onOffCluster[onoff ? 'setOn' : 'setOff']()
      .then(async result => {
        if (onoff === false) {
          await this.setCapabilityValue('dim', 0).catch(this.error); // Set dim to zero when turned off
        } else if (onoff) {
          // Wait for a little while, some devices do not directly update their currentLevel
          await wait(1000)
            .then(async () => {
              // Get current level attribute to update dim level
              const { currentLevel } = await this.levelControlCluster.readAttributes(CURRENT_LEVEL);
              this.debug('changeOnOff() →', onoff, { currentLevel });
              // Always set dim to 0.01 or higher since bulb is turned on
              await this.setCapabilityValue('dim', Math.max(0.01, currentLevel / MAX_DIM)).catch(this.error);
            })
            .catch(err => {
              this.error('Error: could not update dim capability value after `onoff` change', err);
            });
        }
        return result;
      });
  }

  /**
   * Sends a `moveToLevelWithOnOff` command to the device in order to change the dim value.
   * After successfully changing the dim value, the `onoff` capability value will be updated
   * accordingly.
   * @param {number} dim - Range 0 - 1
   * @param {object} [opts]
   * @property {number} [opts.duration]
   * @returns {Promise<any>}
   */
  async changeDimLevel(dim, opts = {}) {
    this.log('changeDimLevel() →', dim);

    const moveToLevelWithOnOffCommand = {
      level: Math.round(dim * MAX_DIM),
      transitionTime: calculateLevelControlTransitionTime(opts),
    };

    // Execute dim
    this.debug('changeDimLevel() → ', dim, moveToLevelWithOnOffCommand);
    return this.levelControlCluster.moveToLevelWithOnOff(moveToLevelWithOnOffCommand)
      .then(async result => {
        // Update onoff value
        if (dim === 0) {
          await this.setCapabilityValue('onoff', false).catch(this.error);
        } else if (this.getCapabilityValue('onoff') === false && dim > 0) {
          await this.setCapabilityValue('onoff', true).catch(this.error);
        }
        return result;
      });
  }

}

module.exports = EcoDimDuoZigbeeDevice;
/*
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ------------------------------------------
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] Node: 144c4b6a-c483-4bcc-8d2f-df17eaf82053
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] - Battery: false
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] - Endpoints: 0
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] -- Clusters:
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- zapp
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genBasic
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genBasic
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- zclVersion : 6
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- appVersion : 1
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- stackVersion : 6
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- hwVersion : 1
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- manufacturerName : Ember
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- modelId : Dimmer-Switch-ZB3.0
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- dateCode :
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- powerSource : 0
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- swBuildId : 1.01
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genIdentify
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genIdentify
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- identifyTime : 0
2019-09-01 12:34:17 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genGroups
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genGroups
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- nameSupport : 0
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genScenes
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genScenes
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- count : 0
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- currentScene : 0
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- currentGroup : 0
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sceneValid : 0
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- nameSupport : 0
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genOnOff
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 16387 : 255
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genOnOff
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- onOff : 1
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genLevelCtrl
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genLevelCtrl
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- currentLevel : 254
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genOta
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genOta
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- haDiagnostic
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : haDiagnostic
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- lastMessageLqi : 188
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- lastMessageRssi : -53
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] - Endpoints: 1
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] -- Clusters:
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- zapp
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genGreenPowerProxy
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genGreenPowerProxy
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2019-09-01 12:34:18 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ------------------------------------------

2020 Zigbee only hwVersion

2020-03-14 20:48:27 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ------------------------------------------
2020-03-14 20:48:27 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] Node: d6f42e8f-3ad0-4fd3-aa01-472839e9ed69
2020-03-14 20:48:27 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] - Battery: false
2020-03-14 20:48:27 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] - Endpoints: 0
2020-03-14 20:48:27 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] -- Clusters:
2020-03-14 20:48:27 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- zapp
2020-03-14 20:48:27 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genBasic
2020-03-14 20:48:27 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2020-03-14 20:48:27 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genBasic
2020-03-14 20:48:27 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2020-03-14 20:48:27 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- zclVersion : 3
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- appVersion : 3
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- stackVersion : 6
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- hwVersion : 1
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- manufacturerName : EcoDim B.V
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- modelId : Dimmer-Switch-ZB3.0
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- dateCode : 20191105
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- powerSource : 1
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- swBuildId : 3.04
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genIdentify
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genIdentify
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- identifyTime : 0
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genGroups
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genGroups
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- nameSupport : 0
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genScenes
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genScenes
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- count : 0
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- currentScene : 0
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- currentGroup : 0
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sceneValid : 0
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- nameSupport : 0
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genOnOff
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 16387 : 0
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genOnOff
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- onOff : 0
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genLevelCtrl
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 15 : 0
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genLevelCtrl
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- currentLevel : 64
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genOta
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genOta
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- haDiagnostic
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : haDiagnostic
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- averageMacRetryPerApsMessageSent : 0
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- lastMessageLqi : 252
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- lastMessageRssi : -37
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- lightLink
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- 65533 : 1
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : lightLink
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] - Endpoints: 1
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] -- Clusters:
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- zapp
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] --- genGreenPowerProxy
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- cid : genGreenPowerProxy
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ---- sid : attrs
2020-03-14 20:48:28 [log] [ManagerDrivers] [eco-dim07-zigbee] [0] ------------------------------------------

*/
