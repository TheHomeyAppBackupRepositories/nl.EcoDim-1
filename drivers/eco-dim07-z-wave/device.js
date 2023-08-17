'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');
const util = require('../../node_modules/homey-zwavedriver/lib/util');

class EcoDim07ZwaveDevice extends ZwaveDevice {

  async onNodeInit({ node }) {
    // Mark device as unavailable while configuring
    await this.setUnavailable(this.homey.__('pairing.configuring')).catch(this.error);

    // enable debugging
    // this.enableDebug();

    // print the node's info to the console
    // this.printNode();

    this.registerCapability('onoff', 'SWITCH_MULTILEVEL', {
      setParserV2(value, options) {
        const duration = (options.hasOwnProperty('duration') ? util.calculateDimDuration(options.duration) : 'Factory default');
        // << containment for not reporting state after Z-wave command
        if (this.hasCapability('dim')) {
          this.setCapabilityValue('dim', (value) ? (this.getStoreValue('previous_dim_level') || null) : 0).catch(this.error);
        }
        // containment >>
        return {
          Value: (value) ? 'on/enable' : 'off/disable',
          'Dimming Duration': duration,
        };
      },
    });

    this.registerCapability('dim', 'SWITCH_MULTILEVEL', {
      setParserV2(value, options) {
        const duration = (options.hasOwnProperty('duration') ? util.calculateDimDuration(options.duration) : 'Factory default');
        if (this.hasCapability('onoff')) this.setCapabilityValue('onoff', value > 0).catch(this.error);

        // << containment for not reporting state after Z-wave command
        this.setStoreValue('previous_dim_level', value).catch(this.error);
        // containment >>
        return {
          Value: Math.round(value * 99),
          'Dimming Duration': duration,
        };
      },
      reportParserV1(report) {
        if (report && report.hasOwnProperty('Value (Raw)')) {
          if (this.hasCapability('onoff')) this.setCapabilityValue('onoff', report['Value (Raw)'][0] > 0).catch(this.error);

          // << containment for not reporting state after Z-wave command
          this.setStoreValue('previous_dim_level', (report['Value (Raw)'][0] === 255) ? 1 : report['Value (Raw)'][0] / 99).catch(this.error);
          // containment >>

          if (report['Value (Raw)'][0] === 255) return 1;
          return report['Value (Raw)'][0] / 99;
        }
        return null;
      },
    });
    await this.setAvailable().catch(this.error);
    this.log('EcoDim.07 Z-wave device has been inited');
  }

}

module.exports = EcoDim07ZwaveDevice;

/*
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] ------------------------------------------
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] Node: 663d41e0-ff5b-456b-8849-78cd797b04b6
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - Battery: false
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - DeviceClassGeneric: GENERIC_TYPE_SWITCH_MULTILEVEL
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_ZWAVEPLUS_INFO
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 2
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ZWAVEPLUS_INFO_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ZWAVEPLUS_INFO_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_SWITCH_MULTILEVEL
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 2
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SWITCH_MULTILEVEL_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SWITCH_MULTILEVEL_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SWITCH_MULTILEVEL_SET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SWITCH_MULTILEVEL_START_LEVEL_CHANGE
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SWITCH_MULTILEVEL_STOP_LEVEL_CHANGE
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_SCENE_ACTIVATION
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SCENE_ACTIVATION_SET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_SCENE_ACTUATOR_CONF
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SCENE_ACTUATOR_CONF_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SCENE_ACTUATOR_CONF_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SCENE_ACTUATOR_CONF_SET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_CONFIGURATION
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- CONFIGURATION_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- CONFIGURATION_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- CONFIGURATION_SET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_ASSOCIATION
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 2
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUPINGS_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUPINGS_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_REMOVE
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_SET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_SPECIFIC_GROUP_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_SPECIFIC_GROUP_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_ASSOCIATION_GRP_INFO
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUP_NAME_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUP_NAME_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUP_INFO_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUP_INFO_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUP_COMMAND_LIST_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUP_COMMAND_LIST_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_TRANSPORT_SERVICE
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 2
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- COMMAND_FIRST_SEGMENT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- COMMAND_SEGMENT_COMPLETE
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- COMMAND_SEGMENT_REQUEST
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- COMMAND_SEGMENT_WAIT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- COMMAND_SUBSEQUENT_SEGMENT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_VERSION
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 2
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- VERSION_COMMAND_CLASS_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- VERSION_COMMAND_CLASS_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- VERSION_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- VERSION_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_MANUFACTURER_SPECIFIC
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 2
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- MANUFACTURER_SPECIFIC_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- MANUFACTURER_SPECIFIC_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- DEVICE_SPECIFIC_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- DEVICE_SPECIFIC_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_DEVICE_RESET_LOCALLY
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- DEVICE_RESET_LOCALLY_NOTIFICATION
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_POWERLEVEL
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- POWERLEVEL_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- POWERLEVEL_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- POWERLEVEL_SET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- POWERLEVEL_TEST_NODE_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- POWERLEVEL_TEST_NODE_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- POWERLEVEL_TEST_NODE_SET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_SECURITY
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- NETWORK_KEY_SET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- NETWORK_KEY_VERIFY
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_COMMANDS_SUPPORTED_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_COMMANDS_SUPPORTED_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_MESSAGE_ENCAPSULATION
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_MESSAGE_ENCAPSULATION_NONCE_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_NONCE_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_NONCE_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_SCHEME_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_SCHEME_INHERIT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_SCHEME_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_SECURITY_2
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_NONCE_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_NONCE_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_MESSAGE_ENCAPSULATION
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- KEX_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- KEX_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- KEX_SET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- KEX_FAIL
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- PUBLIC_KEY_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_NETWORK_KEY_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_NETWORK_KEY_REPORT
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_NETWORK_KEY_VERIFY
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_TRANSFER_END
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_COMMANDS_SUPPORTED_GET
2019-09-01 12:26:49 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_COMMANDS_SUPPORTED_REPORT
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_CAPABILITIES_GET
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_CAPABILITIES_REPORT
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_SUPERVISION
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SUPERVISION_GET
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SUPERVISION_REPORT
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_FIRMWARE_UPDATE_MD
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 4
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_MD_GET
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_MD_REPORT
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_UPDATE_MD_GET
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_UPDATE_MD_REPORT
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_UPDATE_MD_REQUEST_GET
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_UPDATE_MD_REQUEST_REPORT
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_UPDATE_MD_STATUS_REPORT
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_UPDATE_ACTIVATION_SET
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_UPDATE_ACTIVATION_STATUS_REPORT
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_BASIC
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- BASIC_GET
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- BASIC_REPORT
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- BASIC_SET
2019-09-01 12:26:50 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] ------------------------------------------

>> 2020 version:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] ------------------------------------------
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] Node: 39
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - Manufacturer id: 1073
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - ProductType id: 514
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - Product id: 2
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - Firmware Version: 1.8
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - Hardware Version: 1
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - Firmware id: 2
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - Secure: ⨯
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - Battery: false
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - DeviceClassBasic: BASIC_TYPE_ROUTING_SLAVE
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - DeviceClassGeneric: GENERIC_TYPE_SWITCH_MULTILEVEL
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - DeviceClassSpecific: SPECIFIC_TYPE_POWER_SWITCH_MULTILEVEL
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - Token: 20937295-602c-41c2-8434-787ba25a4533
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_ZWAVEPLUS_INFO
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 2
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ZWAVEPLUS_INFO_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ZWAVEPLUS_INFO_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_SWITCH_MULTILEVEL
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 2
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SWITCH_MULTILEVEL_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SWITCH_MULTILEVEL_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SWITCH_MULTILEVEL_SET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SWITCH_MULTILEVEL_START_LEVEL_CHANGE
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SWITCH_MULTILEVEL_STOP_LEVEL_CHANGE
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_METER
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 3
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- METER_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- METER_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- METER_RESET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- METER_SUPPORTED_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- METER_SUPPORTED_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_CONFIGURATION
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- CONFIGURATION_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- CONFIGURATION_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- CONFIGURATION_SET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_ASSOCIATION
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 2
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUPINGS_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUPINGS_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_REMOVE
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_SET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_SPECIFIC_GROUP_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_SPECIFIC_GROUP_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_ASSOCIATION_GRP_INFO
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUP_NAME_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUP_NAME_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUP_INFO_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUP_INFO_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUP_COMMAND_LIST_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- ASSOCIATION_GROUP_COMMAND_LIST_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_TRANSPORT_SERVICE
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 2
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- COMMAND_FIRST_SEGMENT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- COMMAND_SEGMENT_COMPLETE
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- COMMAND_SEGMENT_REQUEST
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- COMMAND_SEGMENT_WAIT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- COMMAND_SUBSEQUENT_SEGMENT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_VERSION
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 2
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- VERSION_COMMAND_CLASS_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- VERSION_COMMAND_CLASS_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- VERSION_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- VERSION_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_MANUFACTURER_SPECIFIC
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 2
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- MANUFACTURER_SPECIFIC_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- MANUFACTURER_SPECIFIC_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- DEVICE_SPECIFIC_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- DEVICE_SPECIFIC_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_DEVICE_RESET_LOCALLY
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- DEVICE_RESET_LOCALLY_NOTIFICATION
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_POWERLEVEL
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- POWERLEVEL_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- POWERLEVEL_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- POWERLEVEL_SET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- POWERLEVEL_TEST_NODE_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- POWERLEVEL_TEST_NODE_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- POWERLEVEL_TEST_NODE_SET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_SECURITY
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- NETWORK_KEY_SET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- NETWORK_KEY_VERIFY
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_COMMANDS_SUPPORTED_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_COMMANDS_SUPPORTED_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_MESSAGE_ENCAPSULATION
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_MESSAGE_ENCAPSULATION_NONCE_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_NONCE_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_NONCE_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_SCHEME_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_SCHEME_INHERIT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_SCHEME_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_SECURITY_2
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_NONCE_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_NONCE_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_MESSAGE_ENCAPSULATION
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- KEX_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- KEX_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- KEX_SET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- KEX_FAIL
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- PUBLIC_KEY_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_NETWORK_KEY_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_NETWORK_KEY_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_NETWORK_KEY_VERIFY
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_TRANSFER_END
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_COMMANDS_SUPPORTED_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_COMMANDS_SUPPORTED_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_CAPABILITIES_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SECURITY_2_CAPABILITIES_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_SUPERVISION
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SUPERVISION_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- SUPERVISION_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_FIRMWARE_UPDATE_MD
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 4
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_MD_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_MD_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_UPDATE_MD_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_UPDATE_MD_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_UPDATE_MD_REQUEST_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_UPDATE_MD_REQUEST_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_UPDATE_MD_STATUS_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_UPDATE_ACTIVATION_SET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- FIRMWARE_UPDATE_ACTIVATION_STATUS_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] - CommandClass: COMMAND_CLASS_BASIC
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Version: 1
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] -- Commands:
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- BASIC_GET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- BASIC_REPORT
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] --- BASIC_SET
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0] ------------------------------------------
2020-03-14 18:32:24 [log] [ManagerDrivers] [eco-dim07-z-wave] [0]

*/
