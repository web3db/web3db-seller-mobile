import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "../hooks/AuthContext";
import StudyCard from "../components/StudyCard";

// --- Data ---
type Study = {
  id: string;
  title: string;
  type: string;
  description: string;
  organizer: string;
  spots: number;
};

const sampleStudies: Study[] = [
  {
    id: "pa1",
    title: "4‑Week Physical Activity Study",
    type: "Remote",
    description:
      "A four-week study collecting step counts and activity patterns from participants who already use an activity tracker (phone or wearable).",
    organizer: "Web3Health",
    spots: 500,
  },
  {
    id: "cd2",
    title: "Heart Health Study",
    type: "In-Person",
    description:
      "A study examining the effects of diet and exercise on heart health among different demographics.",
    organizer: "Web3Health",
    spots: 300,
  },
];

const StudiesScreen: React.FC = () => {
  const auth = useAuth();
  const { width } = useWindowDimensions();

  // responsive title size
  const titleFontSize = width < 420 ? 28 : 40;
  const headerPaddingVertical = width < 420 ? 24 : 48;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.homeRoot}>
        <View style={[styles.header, { paddingVertical: headerPaddingVertical }]}>
          {/* left column: allow shrinking on small screens */}
          <View style={styles.leftColumn}>
            <Text style={[styles.title, { fontSize: titleFontSize }]}>Your Studies</Text>
            <Text style={styles.subtitle}>
              Below are the studies your organization currently manages. Click a study to view
              details or manage recruitment.
            </Text>
          </View>

          {/* button placed to the right, but won't push the left column off-screen */}
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, styles.addButton]}
            onPress={() => auth.logout()}
          >
            <Text style={styles.btnTextPrimary}>+ Add Study</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stats}>
          <View style={styles.statBox}>
            <Text style={{ fontSize: 32, fontWeight: "bold", margin: 16 }}>2</Text>
            <Text style={{ fontSize: 14, color: "gray", marginBottom: 16 }}>Active Studies</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={{ fontSize: 32, fontWeight: "bold", margin: 16 }}>800</Text>
            <Text style={{ fontSize: 14, color: "gray", marginBottom: 16 }}>Total Participants</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={{ fontSize: 32, fontWeight: "bold", margin: 16 }}>120</Text>
            <Text style={{ fontSize: 14, color: "gray", marginBottom: 16 }}>Open Spots</Text>
          </View>
        </View>

        <View>
          {sampleStudies.map((study) => (
            <StudyCard key={study.id} study={study} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  homeRoot: {
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  header: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.04)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
  },
  // left column must be able to shrink; minWidth: 0 is necessary on RN to allow text wrapping
  leftColumn: {
    flex: 1,
    minWidth: 0,
    marginRight: 12, // spacing between text and button
  },
  stats: {
    flexDirection: "row",
    marginHorizontal: 16,
    justifyContent: "space-between",
    marginVertical: 10,
    gap: 12,
  },
  statBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.04)",
    alignItems: "center",
    flex: 1,
  },
  title: {
    // fontSize set dynamically
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "gray",
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  btnPrimary: {
    backgroundColor: "#4f46e5",
  },
  btnTextPrimary: {
    color: "white",
    fontWeight: "600",
  },
  // ensure the button sizes to its content and stays visible on narrow screens
  addButton: {
    alignSelf: "flex-start",
  },
});

export default StudiesScreen;
