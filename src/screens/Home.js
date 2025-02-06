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

  // Sync TrackPlayer pause/play state with WebView
  useEffect(() => {
    const onTrackPlayerStateChange = async ({state}) => {
      if (state === State.Paused) {
        webViewRef.current?.injectJavaScript(`
          (function() {
            const audio = document.querySelector('audio');
            if (audio) { audio.pause(); }
          })();
        `);
      } else if (state === State.Playing) {
        webViewRef.current?.injectJavaScript(`
          (function() {
            const audio = document.querySelector('audio');
            if (audio) { audio.play(); }
          })();
        `);
      }
    };

    const subscription = TrackPlayer.addEventListener(
      Event.PlaybackState,
      onTrackPlayerStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);

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

      return nextSongs.map(item => ({
        id: item.post_id,
        url: item.stream_url,
        artwork: item.thumbnail_url,
      }));
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

      console.log('====state', state, currentTime);

      if (url && url !== _url) {
        _url = url;
        const musicData = await getMusicData(url);
        await playSong(musicData);
      } else {
        if (state === 'paused') {
          await TrackPlayer.pause();
        } else if (state === 'playing') {
          await TrackPlayer.play();
          if (currentTime) {
            await TrackPlayer.seekTo(currentTime);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  // Full Injected JavaScript with Play & Pause Sync
  const injectedJavaScript = `
    (function() {
      let currentPageUrl = window.location.href;
      let hasSentAudioData = false;
      let currentAudioSrc = '';
      let intervalId;

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

      // Listen for play/pause commands from React Native
      document.addEventListener("message", function(event) {
        if (event.data === "pauseWebAudio") {
          const audio = document.querySelector('audio');
          if (audio) { audio.pause(); }
        } else if (event.data === "playWebAudio") {
          const audio = document.querySelector('audio');
          if (audio) { audio.play(); }
        }
      });

      true;
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
