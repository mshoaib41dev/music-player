import React, {useRef, useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';
import TrackPlayer, {Capability} from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInatnce';

let _url = '';
let playing = false;

console.log({_url});

const MusicPlayer = () => {
  const webViewRef = useRef(null);

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
          // notificationCapabilities: [
          //   Capability.Play,
          //   Capability.Pause,
          //   Capability.SkipToNext,
          //   Capability.SkipToPrevious,
          // ],
        });
      } catch (error) {
        console.error('Error setting up TrackPlayer:', error);
      }
    };

    setupPlayer();

    return () => {
      TrackPlayer.destroy();
    };
  }, []);
  const getMusicData = async url => {
    try {
      console.log('FUNCTION');
      const response = await axiosInstance.get(`related-posts/?url=${url}`);
      console.log('Music Data Response', response);
      const musicData = response?.data.related_streams.map(item => ({
        id: item.post_id,
        url: item.stream_url,
        artwork: item.thumbnail_url,
      }));
      return musicData; // Return the response data from API
    } catch (error) {
      console.error('Error fetching data:', error.response || error.message);
      throw error; // Handle errors as needed
    }
  };
  const injectedJavaScript = `
    (function() {
      // Listen to all audio elements
      // document.body.style.backgroundColor = 'red'; 
      const audioElements = document.querySelectorAll('audio');
      // setTimeout(function() { window.alert(audio) }, 2000);

      audioElements.forEach(audio => {
        // Post message when audio starts playing

        audio.addEventListener('play', () => {
          const state = {
            src: audio.src,
            currentTime: audio.currentTime,
            duration: audio.duration,
            state: 'playing',
          };
          window.ReactNativeWebView.postMessage(JSON.stringify(state));
        });

        // Post message when audio pauses
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

      // Attempt to autoplay the first audio element
      const firstAudio = document.querySelector('audio');
      if (firstAudio) {
        firstAudio.play().catch(error => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ error: error.message }));
        });
      }
    })();
    true; // Ensure script completion
  `;
  const saveUrl = async url => {
    try {
      await AsyncStorage.setItem('currentUrl', url);
    } catch (error) {
      console.error('Error saving URL to AsyncStorage:', error);
    }
  };

  const getUrl = async () => {
    try {
      return await AsyncStorage.getItem('currentUrl');
    } catch (error) {
      console.error('Error retrieving URL from AsyncStorage:', error);
      return null;
    }
  };
  useEffect(() => {
    const fetchUrl = async () => {
      try {
        const url = await getUrl(); // Replace with your async function
        console.log('Fetched URL:', url);
      } catch (error) {
        console.error('Error fetching URL:', error);
      }
    };

    fetchUrl(); // Call the async function
  }, []); // Dependency array

  const handleMessage = async event => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      const url = message?.src || null;
      const state = message?.state || null;
      const currentTime = message?.currentTime || null;

      if (!url) {
        console.warn('No URL received from WebView.');
        return;
      }

      // Retrieve the previous URL from AsyncStorage
      const previousUrl = await getUrl();

      if (previousUrl !== url) {
        // Save the new URL
        saveUrl(url);

        if (state !== 'paused') {
          playing = true;
          await playSong(url); // Play the new track
        }
      } else {
        if (state === 'paused') {
          playing = false;
          await TrackPlayer.pause();
        } else if (state === 'playing' && !playing) {
          playing = true;
          await TrackPlayer.play();
          if (currentTime) {
            await TrackPlayer.seekTo(currentTime); // Sync playback position
          }
        }
      }
    } catch (error) {
      console.error('Error in handleMessage:', error);
    }
  };

  const playSong = async url => {
    console.log({url});

    try {
      await TrackPlayer.reset(); // Reset the player
      const music = await getMusicData();
      await TrackPlayer.add(music);
      await TrackPlayer.play(); // Start playback
    } catch (error) {
      console.error('Error playing song:', error);
    }
  };
  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{uri: 'https://prettylightslive.com'}}
        onMessage={handleMessage}
        style={styles.webView}
        startInLoadingState={true}
        cacheEnabled={false}
        injectedJavaScript={injectedJavaScript}
        // allowsInlineMediaPlayback={true}
        // mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
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
