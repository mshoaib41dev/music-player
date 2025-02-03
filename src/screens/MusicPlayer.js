import React, {useRef, useEffect, useCallback} from 'react';
import {StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';
import TrackPlayer, {Capability} from 'react-native-track-player';
import axiosInstance from '../api/axiosInatnce';

let _url = '';
let playing = false;

const MusicPlayer = () => {
  const webViewRef = useRef(null);

  // Set up the player once
  useEffect(() => {
    const setupPlayer = async () => {
      try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({
          stopWithApp: false,
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.Stop,
            Capability.SeekTo,
          ],
          compactCapabilities: [Capability.Play, Capability.Pause],
          notificationCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SeekTo,
            Capability.SkipToNext,
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

  // Fetch music data based on URL
  const getMusicData = async url => {
    try {
      const response = await axiosInstance.get(
        `related-posts/?url=${encodeURIComponent(url)}`,
      );

      const allSongs = response?.data.related_streams;

      const currentSongIndex = allSongs.findIndex(
        item => item.stream_url === url,
      );

      console.log({currentSongIndex});
      const remainingSongs = allSongs.length - currentSongIndex;
      const dynamicLength = Math.min(remainingSongs, 25);
      const nextSongs = allSongs.slice(
        currentSongIndex,
        currentSongIndex + dynamicLength,
      );

      console.log(nextSongs.length);

      const musicData = nextSongs.map(item => ({
        id: item.post_id,
        url: item.stream_url,
        artwork: item.thumbnail_url,
      }));

      return musicData;
    } catch (error) {
      console.error('Error fetching data:', error.response || error.message);
      throw error;
    }
  };

  // Play the song with the fetched data
  const playSong = useCallback(async musicData => {
    try {
      await TrackPlayer.reset(); // Reset the player
      await TrackPlayer.add(musicData); // Add music tracks
      await TrackPlayer.play(); // Start playback
    } catch (error) {
      console.error('Error playing song:', error);
    }
  }, []);

  // Handle the WebView messages and track the song state
  const handleMessage = async event => {
    try {
      let songObj = JSON.parse(event?.nativeEvent?.data);
      let url = songObj?.src;

      if (url && url !== _url) {
        _url = url;
        const musicData = await getMusicData(url); // Fetch the music data

        console.log({musicData});
        await playSong(musicData); // Play the song
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  // Injected JavaScript for WebView to track audio and send messages
  const injectedJavaScript = `
    (function() {
      let currentPageUrl = window.location.href;
      let hasSentAudioData = false;
      let audioFound = false;
      let currentAudioSrc = '';
      let intervalId;

      function sendAudioSrc() {
        const audio = document.querySelector('audio');
        if (audio && audio.src && audio.src !== currentAudioSrc) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            src: audio.src,
            state: 'playing',
            currentTime: audio.currentTime
          }));
          hasSentAudioData = true;
          audioFound = true;
          currentAudioSrc = audio.src;
          clearInterval(intervalId);
        } else {
          if (!hasSentAudioData) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              src: '',
              state: 'stopped',
              currentTime: 0
            }));
          }
        }
      }

      function checkInitialAudio() {
        sendAudioSrc();
      }

      function startAudioCheckLoop() {
        intervalId = setInterval(() => {
          sendAudioSrc();
        }, 500);
      }

      checkInitialAudio();
      startAudioCheckLoop();

      document.body.addEventListener('click', function() {
        audioFound = false;
        hasSentAudioData = false;
        clearInterval(intervalId);
        currentAudioSrc = '';
        startAudioCheckLoop();
      });

      function checkForPageChange() {
        if (window.location.href !== currentPageUrl) {
          currentPageUrl = window.location.href;
          audioFound = false;
          hasSentAudioData = false;
          currentAudioSrc = '';
          clearInterval(intervalId);
          startAudioCheckLoop();
        }
      }

      setInterval(checkForPageChange, 500);

      true;
    })();
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{uri: 'https://prettylightslive.com/station/2024-12-07-live-boston/?muted=true'}}
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