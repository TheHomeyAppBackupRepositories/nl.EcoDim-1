'use strict';

const WallControllerDevice = require('../../lib/WallControllerDevice');

module.exports = class WallControllerED10012 extends WallControllerDevice {

  async onNodeInit({ zclNode }) {
    // Mark device as unavailable while configuring
    await this.setUnavailable(this.homey.__('pairing.configuring')).catch(this.error);

    // enable debugging
    // this.enableDebug();

    // print the node's info to the console
    // this.printNode();

    // supported scenes and their reported attribute numbers (all based on reported data)
    this.buttonMap = {
      1: 'Group1',
      2: 'Group2',
    };

    this.sceneMap = {
      on: 'Switched ON',
      off: 'Switched OFF',
      moveWithOnOff_move_up: 'Dimming UP',
      moveWithOnOff_move_down: 'Dimming DOWN',
      stopWithOnOff: 'Dimming STOP',
    };

    await super.onNodeInit({ zclNode });

    // Finally device is ready to be used, mark as available
    await this.setAvailable().catch(this.error);
  }

};
