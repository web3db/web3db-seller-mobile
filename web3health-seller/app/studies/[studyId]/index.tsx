import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
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

    const handleManagePress = () => {
    // Navigate to a screen named 'ManageStudy', passing the study's ID
    router.push({
      pathname: "/studies/[studyId]/manage",
      params: { studyId: study.id },
    });
  };

    return (
        <SafeAreaView style={styles.root}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>{study.title}</Text>
                <Text style={styles.type}>{study.type}</Text>
                <Text style={styles.description}>{study.description}</Text>
                <Text style={styles.meta}>Organizer: {study.organizer}</Text>
                <Text style={styles.meta}>Spots: {study.spots}</Text>
                <TouchableOpacity style={styles.btn} onPress={handleManagePress}>
                    <Text style={styles.btnText}>Manage</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    container: {
        paddingVertical: 32,
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    type: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        marginBottom: 16,
    },
    meta: {
        fontSize: 14,
        marginBottom: 4,
        color: 'gray',
    },
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