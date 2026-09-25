import { useEffect, useState } from "react";
import { Box, Heading, VStack, Text, Spinner } from "@chakra-ui/react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/services/api";

interface UserProfile {
  id: number;
  email: string;
  role: string;
  name: string;
  dateJoined: string;
}

export default function Profile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;

            setLoading(true);
            try {
                const profileData = await authApi.getProfile(user.id);
                setProfile(profileData);
                console.log(profileData);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    if (loading) {
        return <Spinner />;
    }

    if (!profile) {
        return <Text>Profile not found</Text>;
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