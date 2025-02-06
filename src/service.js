import TrackPlayer, { Event }  from 'react-native-track-player';


module.exports = async function () {

  try {
    TrackPlayer.addEventListener('remote-play', () => {
      TrackPlayer.play()
    })

    TrackPlayer.addEventListener('remote-pause', () => {
      TrackPlayer.pause()
    });

    TrackPlayer.addEventListener('remote-next', () => {
      TrackPlayer.skipToNext()
    });

    TrackPlayer.addEventListener('remote-previous', () => {
      TrackPlayer.skipToPrevious()
    });

    // TrackPlayer.addEventListener('remote-stop', () => {
    //   TrackPlayer.stop()
    // });

    // TrackPlayer.addEventListener('remote-seek', (event) => {
    //   TrackPlayer.seekTo(event.position);
    // });

    // new code
    // TrackPlayer.addEventListener(Event.RemotePlay, () => {
    //   TrackPlayer.play();
    // });
  
    // TrackPlayer.addEventListener(Event.RemotePause, () => {
    //   TrackPlayer.pause();
    // });
  
    // TrackPlayer.addEventListener(Event.RemoteStop, () => {
    //   TrackPlayer.stop();
    // });
  
    // TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => {
    //   TrackPlayer.seekTo(position);
    // });
  } catch (error) { }

};