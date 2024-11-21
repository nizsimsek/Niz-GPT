import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, { useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { onBoardingData } from "@/configs/constants";
import { scale, verticalScale } from "react-native-size-matters";
import { useFonts } from "expo-font";
import AntDesign from "@expo/vector-icons/AntDesign";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export default function OnBoardingScreen() {
  let [fontsLoaded, fontError] = useFonts({
    SegoeUI: require("../assets/fonts/Segoe-UI.ttf"),
  });
  AsyncStorage.removeItem("onboarding");

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(
      contentOffsetX / event.nativeEvent.layoutMeasurement.width
    );

    setActiveIndex(currentIndex);
  };

  const handleSkip = async () => {
    const nextIndex = activeIndex + 1;

    if (nextIndex < onBoardingData.length) {
      scrollViewRef.current?.scrollTo({
        x: Dimensions.get("window").width * nextIndex,
        animated: true,
      });
    } else {
      await AsyncStorage.setItem("onboarding", "true");
      router.push("/(routes)/home");
    }
  };

  return (
    <LinearGradient
      colors={["#250152", "#000000"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <Pressable style={styles.skipContainer} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
        <AntDesign name="arrowright" size={scale(18)} color="#ffffff" />
      </Pressable>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        ref={scrollViewRef}
      >
        {onBoardingData.map((item: onBoardingDataType, index: number) => (
          <View key={index} style={styles.slide}>
            {item.image}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.paginationContainer}>
        {onBoardingData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                opacity: index === activeIndex ? 1 : 0.3,
              },
            ]}
          />
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  slide: {
    width: Dimensions.get("window").width,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: scale(23),
    fontFamily: "SegoeUI",
    fontWeight: "500",
    textAlign: "center",
  },
  subtitle: {
    marginHorizontal: "auto",
    width: scale(290),
    color: "#9a9999",
    fontSize: scale(14),
    fontFamily: "SegoeUI",
    fontWeight: "400",
    textAlign: "center",
    paddingTop: verticalScale(10),
  },
  paginationContainer: {
    position: "absolute",
    bottom: verticalScale(70),
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(8),
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: 100,
    backgroundColor: "#ffffff",
    marginHorizontal: scale(2),
  },
  skipContainer: {
    zIndex: 1,
    position: "absolute",
    top: verticalScale(45),
    right: scale(30),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
  },
  skipText: {
    color: "#ffffff",
    fontSize: scale(16),
    fontFamily: "SegoeUI",
    fontWeight: "400",
    lineHeight: scale(19),
  },
});
