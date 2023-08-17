'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const OnOffBoundCluster = require('./OnOffBoundCluster');
const LevelControlBoundCluster = require('./LevelControlBoundCluster');

module.exports = class WallControllerDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
      getOpts: {
        getOnStart: true,
      },
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 0, // No minimum reporting interval
          maxInterval: 60000, // Maximally every ~16 hours
          minChange: 5, // Report when value changed by 5
        },
      },
    });

    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      getOpts: {
        getOnStart: true,
      },
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 0, // No minimum reporting interval
          maxInterval: 60000, // Maximally every ~16 hours
          minChange: 5, // Report when value changed by 5
        },
      },
    });

    Object.keys(this.zclNode.endpoints)
      .forEach(endpoint => {
        // Bind on/off button commands
        zclNode.endpoints[endpoint].bind(CLUSTER.ON_OFF.NAME, new OnOffBoundCluster({
          onSetOff: this._commandHandler.bind(this, 'off', endpoint),
          onSetOn: this._commandHandler.bind(this, 'on', endpoint),
        }));

        // Bind long press on/off button commands
        zclNode.endpoints[endpoint].bind(CLUSTER.LEVEL_CONTROL.NAME, new LevelControlBoundCluster({
          onStop: this._commandHandler.bind(this, 'stop', endpoint),
          onStopWithOnOff: this._commandHandler.bind(this, 'stopWithOnOff', endpoint),
          onMove: this._commandHandler.bind(this, ',move', endpoint),
          onMoveWithOnOff: this._commandHandler.bind(this, 'moveWithOnOff', endpoint),
        }));
      });
  }

  /**
   * Trigger a Flow based on the `type` parameter.
   */
  _commandHandler(command, endpoint, payload) {
    let remoteValue = {};
    if (command === 'moveWithOnOff') {
      remoteValue = {
        button: this.buttonMap[endpoint],
        scene: this.sceneMap[`${command}_move_${payload.moveMode}`],
      };
    } else {
      remoteValue = {
        button: this.buttonMap[endpoint],
        scene: this.sceneMap[`${command}`],
      };
    }
    this.log('Triggering sequence: remoteValue', remoteValue);

    // Trigger the trigger card with 2 dropdown option
    this.triggerFlow({
      id: 'wall_controller_scene',
      tokens: null,
      state: remoteValue,
    })
      .catch(err => this.error('Error triggering wall_controller_scene', err));

    // Trigger the trigger card with tokens
    this.triggerFlow({
      id: 'wall_controller_button',
      tokens: remoteValue,
      state: remoteValue,
    })
      .catch(err => this.error('Error triggering wall_controller_button', err));
  }

  onSceneAutocomplete(query, args, callback) {
    let resultArray = [];
    for (const sceneID in this.sceneMap) {
      resultArray.push({
        id: this.sceneMap[sceneID],
        name: this.homey.__(this.sceneMap[sceneID]),
      });
    }
    // filter for query
    resultArray = resultArray.filter(result => {
      return result.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
    });
    this.log(resultArray);
    return Promise.resolve(resultArray);
  }

  onButtonAutocomplete(query, args, callback) {
    let resultArray = [];
    for (const sceneID in this.buttonMap) {
      resultArray.push({
        id: this.buttonMap[sceneID],
        name: this.homey.__(this.buttonMap[sceneID]),
      });
    }

    // filter for query
    resultArray = resultArray.filter(result => {
      return result.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
    });
    this.log(resultArray);
    return Promise.resolve(resultArray);
  }

};
