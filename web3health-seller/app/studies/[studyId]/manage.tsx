import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { useRouter } from 'expo-router';

type Study = {
    id: string; title: string; type: string; description: string; organizer: string; spots: number;
};

export default function StudyDetail() {
    const { studyId } = useLocalSearchParams() as { studyId: string };

    const router = useRouter();

    // In a real app, fetch study details using the studyId
    // For this example, we'll use static data
    const study: Study = {
        id: studyId,
        title: '4‑Week Physical Activity Study',
        type: 'Remote',
        description: 'A four-week study collecting step counts and activity patterns from participants who already use an activity tracker (phone or wearable).',
        organizer: 'Web3Health',
        spots: 500,
    };

    const handleUpdatePress = () => {
        // Navigate to a screen named 'ManageStudy', passing the study's ID
    };
    const [title, setTitle] = React.useState(study.title);
    const [type, setType] = React.useState(study.type);
    const [description, setDescription] = React.useState(study.description);
    const [spots, setSpots] = React.useState(study.spots);

    return (
        <SafeAreaView style={styles.root}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.heading}>Manage Study</Text>
                <Text style={styles.label}>Study Title</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                />
                <Text style={styles.label}>Study Type</Text>
                <TextInput
                    style={styles.input}
                    value={type}
                    onChangeText={setType}
                />
                <Text style={styles.label}>Study Description</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                />
                <Text style={styles.label}>Spots</Text>
                <TextInput
                    style={styles.input}
                    value={spots.toString()}
                    onChangeText={(text) => setSpots(parseInt(text))}
                    keyboardType="numeric"
                />
                <TouchableOpacity style={styles.btn} onPress={handleUpdatePress}>
                    <Text style={styles.btnText}>Save Changes</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#ffffff" },
    container: { padding: 16, paddingBottom: 48 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
    heading: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
    label: { fontSize: 14, marginTop: 12 },
    input: {
        borderWidth: 1,
        borderColor: "#e0e0e0",
        padding: 10,
        borderRadius: 8,
        marginTop: 6,
        backgroundColor: "#fff",
    },
    multiline: { height: 100, textAlignVertical: "top" as const },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
    participantRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f3f3",
    },
    removeBtn: { padding: 6 },
    removeText: { color: "#d00", fontWeight: "600" },
    actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
    muted: { color: "#888", marginTop: 8 },
    errorText: { color: "red", marginBottom: 12 },
    meta: { color: "#666", marginTop: 6 },
    btn: {
        backgroundColor: '#007bff',
        padding: 12,
        borderRadius: 4,
    },
    btnText: {
        color: '#ffffff',
        textAlign: 'center',
    },
});