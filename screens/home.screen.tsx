import {
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { scale, verticalScale } from "react-native-size-matters";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import axios from "axios";
import LottieView from "lottie-react-native";
import * as Speech from "expo-speech";
import Regenerate from "@/assets/svgs/regenerate";
import Reload from "@/assets/svgs/reload";
import { AntDesign, FontAwesome } from "@expo/vector-icons";

export default function HomeScreen() {
  const [text, setText] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [AIResponse, setAIResponse] = useState<boolean>(false);
  const [AISpeaking, setAISpeaking] = useState<boolean>(false);

  const lottieRef = useRef<LottieView>(null);

  const getMicrophonePermission = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();

      if (!granted) {
        Alert.alert(
          "Permission required",
          "Please allow microphone permission to continue."
        );
        return false;
      }

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  /**
   * Recording Options like Documentations for Android, iOS and Web but it's not working
   * @see https://docs.expo.dev/versions/latest/sdk/audio/#constants
   */
  /*
  const recordingOptions: Audio.RecordingOptions = {
    android: {
      extension: ".m4a",
      outputFormat: Audio.AndroidOutputFormat.MPEG_4,
      audioEncoder: Audio.AndroidAudioEncoder.AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: ".m4a",
      outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
      audioQuality: Audio.IOSAudioQuality.MAX,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: "audio/webm",
      bitsPerSecond: 128000,
    },
  };
  */

  const recordingOptions: any = {
    android: {
      extension: ".wav",
      outPutFormat: Audio.AndroidOutputFormat.MPEG_4,
      androidEncoder: Audio.AndroidAudioEncoder.AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: ".wav",
      audioQuality: Audio.IOSAudioQuality.HIGH,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  };

  const startRecording = async () => {
    const hasPermission = await getMicrophonePermission();

    if (!hasPermission) {
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      setIsRecording(true);

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(recording);
    } catch (error) {
      console.log("Failed to start recording : ", error);
      Alert.alert("Error", "Failed to start recording.");
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setLoading(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS:  InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        playThroughEarpieceAndroid: false,
      });
      await recording?.stopAndUnloadAsync();

      const uri = recording?.getURI();

      // Send audio to Whisper API for Transcription
      const transcript = await sendAudioToWhisper(uri!);

      setText(transcript);

      // Send Transcription to OpenAI for Response
      const gptResponse = await sendToGPT(transcript);
      setAIResponse(true);
      await speakText(gptResponse);

      // Set AI Response to state
    } catch (error) {
      console.log("Failed to stop recording : ", error);
      Alert.alert("Error", "Failed to stop recording.");
    }
  };

  const sendAudioToWhisper = async (uri: string) => {
    try {
      const formData: any = new FormData();
      formData.append("file", {
        uri,
        type: "audio/wav",
        name: "recording.wav",
      });
      formData.append("model", "whisper-1");

      const response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data.text;
    } catch (error) {
      console.log("Failed to send audio to Whisper : ", error);
      Alert.alert("Error", "Failed to send audio to Whisper.");
    }
  };

  const sendToGPT = async (text: string) => {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content:
                "You are Niz, a friendly AI assistant who responds naturally and referes to yourself as Niz when asked for your name. You are a helpful assistant who can answer questions and help with tasks. You must always respond in Turkish, no matter the input language, and provide helpful, clear answers.",
            },
            {
              role: "user",
              content: text,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      setText(response.data.choices[0].message.content);
      setLoading(false);

      return response.data.choices[0].message.content;
    } catch (error) {
      console.log("Failed to send text to GPT4 : ", error);
      Alert.alert("Error", "Failed to send text to GPT4.");
    }
  };

  const speakText = async (text: string) => {
    setAISpeaking(true);

    const options: Speech.SpeechOptions = {
      // voice: "com.apple.ttsbundle.Samantha-compact",
      voice: "com.apple.ttsbundle.Yelda-compact",
      language: "tr-TR",
      pitch: 1,
      rate: 1.06,
      onDone: () => {
        setAISpeaking(false);
      },
    };

    Speech.speak(text, options);
  };

  useEffect(() => {
    if (AISpeaking) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.reset();
    }
  }, [AISpeaking]);

  return (
    <LinearGradient
      colors={["#250152", "#000000"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <Image
        source={require("@/assets/main/blur.png")}
        style={{
          position: "absolute",
          top: 0,
          right: scale(-15),
          width: scale(240),
        }}
      />
      <Image
        source={require("@/assets/main/purple-blur.png")}
        style={{
          position: "absolute",
          bottom: verticalScale(100),
          left: scale(-15),
          width: scale(210),
        }}
      />
      {AIResponse && (
        <TouchableOpacity
          style={{
            position: "absolute",
            top: verticalScale(50),
            left: scale(20),
          }}
          onPress={() => {
            setIsRecording(false);
            setAIResponse(false);
            setText("");
          }}
        >
          <AntDesign name="arrowleft" size={scale(20)} color="#ffffff" />
        </TouchableOpacity>
      )}
      <View
        style={{
          marginTop: verticalScale(-40),
        }}
      >
        {loading ? (
          <TouchableOpacity>
            <LottieView
              source={require("@/assets/animations/loading.json")}
              autoPlay
              loop
              speed={1.3}
              style={{
                width: scale(270),
                height: scale(270),
              }}
            />
          </TouchableOpacity>
        ) : isRecording ? (
          <TouchableOpacity onPress={stopRecording}>
            <LottieView
              source={require("@/assets/animations/animation.json")}
              autoPlay
              loop
              speed={1.3}
              style={{
                width: scale(250),
                height: scale(250),
              }}
            />
          </TouchableOpacity>
        ) : AIResponse ? (
          <View>
            <LottieView
              source={require("@/assets/animations/ai-speaking.json")}
              autoPlay
              loop={false}
              ref={lottieRef}
              style={{
                width: scale(250),
                height: scale(250),
              }}
            />
          </View>
        ) : (
          <TouchableOpacity
            style={{
              width: scale(110),
              height: scale(110),
              backgroundColor: "#ffffff",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: scale(100),
            }}
            onPress={startRecording}
            // onPress={async () => {
            //   await Audio.setAudioModeAsync({
            //     allowsRecordingIOS: true,
            //     staysActiveInBackground: true,
            //   });
            //   const { recording } = await Audio.Recording.createAsync(
            //     recordingOptions
            //   );
            //   await recording?.stopAndUnloadAsync().then(() => {
            //     Audio.setAudioModeAsync({
            //       allowsRecordingIOS: false,
            //       staysActiveInBackground: true,
            //       interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            //       playsInSilentModeIOS: true,
            //       shouldDuckAndroid: true,
            //       interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
            //       playThroughEarpieceAndroid: false,
            //     });

            //     Speech.speak(
            //       "Merhaba, ben Niz. Size nasıl yardımcı olabilirim?",
            //       {
            //         voice: "com.apple.ttsbundle.Yelda-compact",
            //         language: "tr-TR",
            //         pitch: 1,
            //         rate: 1.06,
            //       }
            //     );
            //   });
            // }}
          >
            <FontAwesome name="microphone" size={scale(50)} color="#2b3356" />
          </TouchableOpacity>
        )}
      </View>

      <View
        style={{
          alignItems: "center",
          width: scale(350),
          position: "absolute",
          bottom: verticalScale(90),
        }}
      >
        <Text
          style={{
            color: "#ffffff",
            fontSize: 16,
            width: scale(260),
            textAlign: "center",
            lineHeight: 25,
          }}
        >
          {loading ? null : text || "Press the microphone to start recording."}
        </Text>
      </View>
      {AIResponse && (
        <View
          style={{
            position: "absolute",
            bottom: verticalScale(40),
            left: 0,
            paddingHorizontal: scale(30),
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: scale(360),
          }}
        >
          <TouchableOpacity onPress={() => sendToGPT(text)}>
            <Regenerate />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => speakText(text)}>
            <Reload />
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#131313",
  },
});
