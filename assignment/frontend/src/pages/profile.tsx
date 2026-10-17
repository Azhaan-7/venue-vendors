import { useEffect, useState } from "react";
import { Box, Heading, VStack, Text, Spinner, Alert, AlertIcon } from "@chakra-ui/react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/services/api";
import { useRouter } from "next/router";
import { requestError } from "@/utils/requestError";

interface UserProfile {
  id: number;
  email: string;
  role: string;
  name: string;
  dateJoined: string;
}

export default function Profile() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;

            setLoading(true);
            setError("");
            try {
                const profileData = await authApi.getProfile(user.id);
                setProfile(profileData);
            } catch (error) {
                setError(requestError(error, "Could not load your profile. Please try again."));
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    useEffect(() => {
        if (!isLoading && !user) void router.replace("/signin");
    }, [isLoading, router, user]);

    if (isLoading || loading) {
        return <Spinner display="block" mx="auto" my={12} />;
    }

    if (!profile) {
        return <Alert status="error" my={6}><AlertIcon />{error || "Profile not found"}</Alert>;
    }

    return (
        <Box p={4}>
            <Heading mb={4}>Profile</Heading>
            <VStack align="start" spacing={2}>
                <Text><strong>Name:</strong> {profile.name}</Text>
                <Text><strong>Email:</strong> {profile.email}</Text>
                <Text><strong>Role:</strong> {profile.role}</Text>
                <Text><strong>Date Joined:</strong> {profile && new Date(profile.dateJoined).toLocaleDateString()}</Text>
            </VStack>
        </Box>
    );
}
