import React, {useRef, useEffect, useCallback} from 'react';
import {StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';
import TrackPlayer, {Capability, State, Event} from 'react-native-track-player';
import axiosInstance from '../api/axiosInatnce';

let _url = '';

const MusicPlayer = () => {
  const webViewRef = useRef(null);

  useEffect(() => {
    const setupPlayer = async () => {
      try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({
          stopWithApp: false,
          capabilities: [Capability.Play, Capability.Pause, Capability.SeekTo],
          compactCapabilities: [Capability.Play, Capability.Pause],
          notificationCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SeekTo,
          ],
        });
      } catch (error) {
        console.error('Error setting up TrackPlayer:', error);
      }
    };

    setupPlayer();

    return () => {
      TrackPlayer?.destroy();
    };
  }, []);

  // Sync TrackPlayer pause/play & progress with WebView
  useEffect(() => {
    const onTrackPlayerStateChange = async ({state}) => {
      if (state === State.Paused) {
        webViewRef.current?.injectJavaScript(
          "document.querySelector('audio')?.pause();",
        );
      } else if (state === State.Playing) {
        webViewRef.current?.injectJavaScript(
          "document.querySelector('audio')?.play();",
        );
      }
    };

    const onTrackPlayerProgress = async ({position}) => {
      console.log('==============postion', position);
      webViewRef.current?.injectJavaScript(`
        (function() {
          let audio = document.querySelector('audio');
          if (audio) { audio.currentTime = ${position}; }
        })();
      `);
    };

    const stateSubscription = TrackPlayer.addEventListener(
      Event.PlaybackState,
      onTrackPlayerStateChange,
    );
    const progressSubscription = TrackPlayer.addEventListener(
      Event.PlaybackProgressUpdated,
      onTrackPlayerProgress,
    );

    return () => {
      stateSubscription.remove();
      progressSubscription.remove();
    };
  }, []);

  const getTitleFromUrl = url => {
    const fileName = url?.split('/').pop(); // Get the file name (e.g., 'World-is-a-Cinema-1.mp3')
    const title = fileName?.replace(/\.mp3$/, ''); // Remove the '.mp3' extension
    return title;
  };

  const getMusicData = async url => {
    try {
      const response = await axiosInstance.get(
        `related-posts/?url=${encodeURIComponent(url)}`,
      );
      const allSongs = response?.data.related_streams;
      const currentSongIndex = allSongs.findIndex(
        item => item.stream_url === url,
      );
      const remainingSongs = allSongs.length - currentSongIndex;
      const dynamicLength = Math.min(remainingSongs, 25);
      const nextSongs = allSongs.slice(
        currentSongIndex,
        currentSongIndex + dynamicLength,
      );

      // return nextSongs.map(item => ({
      //   id: item.post_id,
      //   url: item.stream_url,
      //   artwork: item.thumbnail_url,
      // }));

      const musicDataWithTitle = nextSongs.map(item => ({
        id: item.post_id,
        url: item.stream_url,
        artwork: item.thumbnail_url,
        title: getTitleFromUrl(item.stream_url), // Add the title here
      }));

      return musicDataWithTitle;
    } catch (error) {
      console.error('Error fetching data:', error.response || error.message);
      throw error;
    }
  };

  const playSong = useCallback(async musicData => {
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add(musicData);
      await TrackPlayer.play();
    } catch (error) {
      console.error('Error playing song:', error);
    }
  }, []);

  const handleMessage = async event => {
    try {
      let songObj = JSON.parse(event?.nativeEvent?.data);
      let url = songObj?.src;
      const state = songObj?.state;
      const currentTime = songObj?.currentTime;

      if (url && url !== _url) {
        _url = url;
        const musicData = await getMusicData(url);
        await playSong(musicData);
      } else {
        if (state === 'paused') {
          await TrackPlayer.pause();
        } else if (state === 'playing') {
          await TrackPlayer.play();
          // if (currentTime) {
          //   await TrackPlayer.seekTo(currentTime);
          // }
        }
        if (currentTime !== undefined && currentTime !== null) {
          // Ensure we seek to the correct time
          await TrackPlayer.seekTo(currentTime);
        }
        // if (currentTime) {
        //   await TrackPlayer.seekTo(currentTime);
        // }

        // if (currentTime !== undefined && currentTime !== null) {
        //   const duration = await TrackPlayer.getDuration();
        //   const position = await TrackPlayer.getPosition();

        //   console.log(
        //     `Current Time: ${currentTime}, Position: ${position}, Duration: ${duration}`,
        //   );

        //   // Ensure the seek operation is only done if the time is within valid bounds
        //   if (currentTime >= 0 && currentTime <= duration) {
        //     console.log('Seeking TrackPlayer to:', currentTime);
        //     await TrackPlayer.seekTo(currentTime);
        //   }
        // }

        // if (currentTime !== undefined && currentTime !== null) {
        //   const duration = await TrackPlayer.getDuration();
        //   if (currentTime >= 0 && currentTime <= duration) {
        //     console.log('Seeking TrackPlayer to:', currentTime);

        //   }
        // }
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  // Full Injected JavaScript with Play/Pause & Progress Sync
  // const injectedJavaScript = `
  //   (function() {
  //     let currentPageUrl = window.location.href;
  //     let hasSentAudioData = false;
  //     let currentAudioSrc = '';
  //     let intervalId;

  //     function sendAudioState() {
  //       const audio = document.querySelector('audio');
  //       if (audio && audio.src !== currentAudioSrc) {
  //         window.ReactNativeWebView.postMessage(JSON.stringify({
  //           src: audio.src,
  //           state: audio.paused ? 'paused' : 'playing',
  //           currentTime: audio.currentTime
  //         }));
  //         hasSentAudioData = true;
  //         currentAudioSrc = audio.src;
  //       }
  //     }

  //     function startAudioCheckLoop() {
  //       intervalId = setInterval(() => {
  //         sendAudioState();
  //       }, 500);
  //     }

  //     startAudioCheckLoop();

  //     document.body.addEventListener('click', function() {
  //       hasSentAudioData = false;
  //       currentAudioSrc = '';
  //       clearInterval(intervalId);
  //       startAudioCheckLoop();
  //     });

  //     function checkForPageChange() {
  //       if (window.location.href !== currentPageUrl) {
  //         currentPageUrl = window.location.href;
  //         hasSentAudioData = false;
  //         currentAudioSrc = '';
  //         clearInterval(intervalId);
  //         startAudioCheckLoop();
  //       }
  //     }

  //     setInterval(checkForPageChange, 500);

  //     // Listen for play/pause & seek commands from React Native
  //     document.addEventListener("message", function(event) {
  //       try {
  //         const message = JSON.parse(event.data);
  //         if (message.command === "pauseWebAudio") {
  //           document.querySelector('audio')?.pause();
  //         } else if (message.command === "playWebAudio") {
  //           document.querySelector('audio')?.play();
  //         } else if (message.command === "seekWebAudio") {
  //           let audio = document.querySelector('audio');
  //           if (audio) {
  //             audio.currentTime = message.position;
  //           }
  //         }
  //       } catch (error) {
  //         console.error("Error parsing event message:", error);
  //       }
  //     });

  //     true;
  //   })();
  // `;
  const injectedJavaScript = `
  (function() {
    let currentPageUrl = window.location.href;
    let hasSentAudioData = false;
    let currentAudioSrc = '';
    let intervalId;

    // Listen to audio elements
    const audioElements = document.querySelectorAll('audio');
    
    audioElements.forEach(audio => {
      // Post a message when audio starts playing
      audio.addEventListener('play', () => {
        const state = {
          src: audio.src,
          currentTime: audio.currentTime,
          duration: audio.duration,
          state: 'playing',
        };
        window.ReactNativeWebView.postMessage(JSON.stringify(state));
      });

      // Post a message when audio is paused
      audio.addEventListener('pause', () => {
        const state = {
          src: audio.src,
          currentTime: audio.currentTime,
          duration: audio.duration,
          state: 'paused',
        };
        window.ReactNativeWebView.postMessage(JSON.stringify(state));
      });
    });

    // Start audio automatically if possible
    const firstAudio = document.querySelector('audio');
    if (firstAudio) {
      firstAudio.play().catch(error => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ error: error.message }));
      });
    }

    function sendAudioState() {
      const audio = document.querySelector('audio');
      if (audio && audio.src !== currentAudioSrc) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          src: audio.src,
          state: audio.paused ? 'paused' : 'playing',
          currentTime: audio.currentTime
        }));
        hasSentAudioData = true;
        currentAudioSrc = audio.src;
      }
    }

    function startAudioCheckLoop() {
      intervalId = setInterval(() => {
        sendAudioState();
      }, 500);
    }

    startAudioCheckLoop();

    document.body.addEventListener('click', function() {
      hasSentAudioData = false;
      currentAudioSrc = '';
      clearInterval(intervalId);
      startAudioCheckLoop();
    });

    function checkForPageChange() {
      if (window.location.href !== currentPageUrl) {
        currentPageUrl = window.location.href;
        hasSentAudioData = false;
        currentAudioSrc = '';
        clearInterval(intervalId);
        startAudioCheckLoop();
      }
    }

    setInterval(checkForPageChange, 500);

    // Listen for play/pause & seek commands from React Native
    document.addEventListener("message", function(event) {
      try {
        const message = JSON.parse(event.data);
        if (message.command === "pauseWebAudio") {
          document.querySelector('audio')?.pause();
        } else if (message.command === "playWebAudio") {
          document.querySelector('audio')?.play();
        } else if (message.command === "seekWebAudio") {
          let audio = document.querySelector('audio');
          if (audio) {
            audio.currentTime = message.position;
          }
        }
      } catch (error) {
        console.error("Error parsing event message:", error);
      }
    });

    true; // Ensure the script returns true
  })();
`;
  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{
          uri: 'https://prettylightslive.com/station/2024-12-07-live-boston/?muted=true',
        }}
        onMessage={handleMessage}
        style={styles.webView}
        startInLoadingState={true}
        cacheEnabled={false}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        onError={e => console.log('WebView Error:', e.nativeEvent)}
        onHttpError={e => console.log('HTTP Error:', e.nativeEvent)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
});

export default MusicPlayer;
