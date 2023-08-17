'use strict';

const Homey = require('homey');

class EcoDimApp extends Homey.App {

  onInit() {
    this.log('EcoDim app is running...');

    // WallController scene trigger cards
    this.triggerWallController_scene = this.homey.flow
      .getDeviceTriggerCard('wall_controller_scene');
    this.triggerWallController_scene
      // .register()
      .registerRunListener((args, state) => Promise.resolve(args.button.id === state.button && args.scene.id === state.scene));

    this.triggerWallController_scene
      .getArgument('scene')
      .registerAutocompleteListener((query, args, callback) => args.device.onSceneAutocomplete(query, args, callback));
    this.triggerWallController_scene
      .getArgument('button')
      .registerAutocompleteListener((query, args, callback) => args.device.onButtonAutocomplete(query, args, callback));

    // WallController button trigger cards
    this.triggerWallController_button = this.homey.flow
      .getDeviceTriggerCard('wall_controller_button');
  }

}

module.exports = EcoDimApp;
