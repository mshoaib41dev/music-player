/**
 * @format
 */

import {AppRegistry} from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import {name as appName} from './app.json';

// Register the playback service
TrackPlayer.registerPlaybackService(() => require('./service'));

// Register the main application component
AppRegistry.registerComponent(appName, () => App);
