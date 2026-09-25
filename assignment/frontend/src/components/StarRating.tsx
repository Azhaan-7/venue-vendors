import { HStack, Text } from "@chakra-ui/react";

type StarRatingProps = {
    rating: number | null;
};

export function StarRating({rating}: StarRatingProps) {
    if (rating === null) {
        return <Text fontSize= "sm" color="gray.400">No rating</Text>
    }
    return (
        <HStack spacing={1}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Text key={star} color={star <= rating ? "yellow.500" : "gray.400"} fontSize="lg">
                    *
                </Text>
            ))}
        </HStack>
    );
}