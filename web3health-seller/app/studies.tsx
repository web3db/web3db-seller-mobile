import React, { useState, useCallback } from "react";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
// Assuming these context and navigation hooks exist:
import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect, useRouter } from "expo-router";
import StudyCard from "../components/StudyCard"; 
import { useAuth as localAuth } from "@/hooks/AuthContext";

// --- API Imports ---
// This file now uses the raw fetch implementation
import { listTrnPostings } from "./services/postings/api";
import type { Study } from "./services/postings/types"; 

const StudiesScreen: React.FC = () => {
    // --- Hooks ---
    const { isSignedIn } = useAuth();
    const router = useRouter();
    const [studies, setStudies] = useState<Study[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = localAuth();

    useFocusEffect(
        useCallback(() => {
            const loadStudies = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    // --- FETCH API CALL ---
                    const fetchedStudies = await listTrnPostings(user?.id ? Number(user.id) : -1);
                    setStudies(fetchedStudies); 
                } catch (e: any) {
                    console.error("Failed to load studies from API:", e);
                    setError(`Failed to load studies: ${e.message || 'Unknown network error'}`);
                    setStudies([]); 
                } finally {
                    setIsLoading(false);
                }
            };

            loadStudies();
        }, [])
    );

    // --- Dynamic Stats Calculation ---
    const totalActiveStudies = studies.length;
    const totalParticipants = studies.reduce((sum, study) => sum + study.spots, 0); 
    const totalOpenSpots = studies.reduce((sum, study) => sum + study.spots, 0); 

    // --- Render Logic ---
    return (
        <SafeAreaView style={styles.root}>
            <ScrollView contentContainerStyle={styles.homeRoot}>
                <View style={styles.header}>
                    <View style={styles.leftColumn}>
                        <Text style={styles.title}>Your Studies</Text>
                        <Text style={styles.subtitle}>Below are the studies your organization currently manages. Click a study to view details or manage recruitment.</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.btn, styles.btnPrimary, styles.addButton]}
                        onPress={() => router.push('/addstudy')} 
                    >
                        <Text style={styles.btnTextPrimary}>+ Add Study</Text>
                    </TouchableOpacity>
                </View>
                
                {/* Stats Section */}
                <View style={styles.stats}>
                    <StatBox label="Active Studies" value={isLoading ? '...' : totalActiveStudies} />
                    <StatBox label="Total Participants" value={isLoading ? '...' : totalParticipants} />
                    <StatBox label="Open Spots" value={isLoading ? '...' : totalOpenSpots} />
                </View>

                {/* Loading/Error/Data Display */}
                <View style={styles.listContainer}>
                    {isLoading && <Text style={styles.message}>Loading studies via fetch...</Text>}
                    {error && <Text style={[styles.message, styles.errorText]}>⚠️ {error}</Text>}
                    
                    {!isLoading && studies.length === 0 && !error && (
                        <Text style={styles.message}>No studies found. Start by adding a new one!</Text>
                    )}

                    {/* Map over the fetched studies */}
                    {studies.map((study) => (
                        <StudyCard 
                            key={study.id} 
                            study={study} 
                            onPress={() => router.push(`/studies/${study.id}`)}
                        />
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

// --- Helper Component for Statistics ---
const StatBox: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <View style={styles.statBox}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

// --- Styles ---
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    homeRoot: {
        paddingVertical: 32,
    },
    listContainer: {
        paddingHorizontal: 16,
    },
    header: {
        backgroundColor: "#f8fafc",
        padding: 16, 
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.04)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: 16,
        marginBottom: 16, 
    },
    leftColumn: {
        flex: 1,
        minWidth: 0,
        marginRight: 12,
    },
    stats: {
        flexDirection: "row",
        marginHorizontal: 16,
        justifyContent: "space-between",
        marginVertical: 10,
        gap: 12,
        marginBottom: 20,
    },
    statBox: {
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.04)",
        alignItems: "center",
        flex: 1,
        padding: 8, 
    },
    statValue: { 
        fontSize: 32, 
        fontWeight: 'bold', 
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: { 
        fontSize: 14, 
        color: 'gray', 
        marginBottom: 8 
    },
    title: {
        fontWeight: "bold",
        fontSize: 24, 
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
    addButton: {
        alignSelf: "flex-start",
    },
    message: {
        textAlign: 'center',
        padding: 20,
        fontSize: 16,
        color: 'gray',
    },
    errorText: {
        color: 'red',
        fontWeight: 'bold',
    }
});

export default StudiesScreen;